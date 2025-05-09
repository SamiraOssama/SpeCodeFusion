import os
import json
import logging
import time
import requests
from typing import Dict, List, Any, Optional, Tuple
import concurrent.futures
import re

class OpenRouterClient:
    """Client for OpenRouter API to interact with various LLMs."""
    
    BASE_URL = "https://openrouter.ai/api/v1"
    
    # List of known working models
    SUPPORTED_MODELS = {
        "anthropic/claude-3-haiku": "Fast, efficient model for analysis",
        "anthropic/claude-3-opus": "Most powerful Claude model for deep analysis",
        "anthropic/claude-3-sonnet": "Balanced model for analysis",
        "nousresearch/deephermes-3-mistral-24b-preview": "Free preview of DeepHermes 3 Mistral",
        "google/gemini-pro": "Google's Gemini Pro model",
        "meta-llama/llama-2-70b-chat": "Meta's Llama 2 model"
    }
    
    def __init__(self, api_keys: List[str], default_model: str = "anthropic/claude-3-haiku"):
        """
        Initialize OpenRouter client with API keys.
        
        Args:
            api_keys: List of OpenRouter API keys
            default_model: Default model to use (must be available on OpenRouter)
        """
        self.api_keys = api_keys
        self.current_key_index = 0
        
        if not api_keys:
            raise ValueError("At least one API key must be provided")
            
        # Validate and set the default model
        self.default_model = self._validate_model(default_model)
        
        logging.info(f"OpenRouter client initialized with {len(api_keys)} API keys")
        if default_model in self.SUPPORTED_MODELS:
            logging.info(f"Using model: {default_model} - {self.SUPPORTED_MODELS[default_model]}")
        else:
            logging.warning(f"Using custom model: {default_model} - Not in list of known supported models")
    
    def _validate_model(self, model: str) -> str:
        """
        Validate the model name and return it if valid.
        
        Args:
            model: Model name to validate
            
        Returns:
            Validated model name
            
        Raises:
            ValueError: If model name is invalid
        """
        if not model:
            logging.warning("No model specified, using default: anthropic/claude-3-haiku")
            return "anthropic/claude-3-haiku"
            
        # Clean up model name
        model = model.strip().lower()
        
        # Check if it's a known model (case-insensitive)
        for supported_model in self.SUPPORTED_MODELS:
            if model == supported_model.lower():
                return supported_model
        
        # If not a known model, validate format
        if not re.match(r'^[\w-]+/[\w-]+(?:-[\w-]+)*$', model):
            raise ValueError(
                f"Invalid model name format: {model}\n"
                "Model name should be in format: 'provider/model-name'\n"
                f"Supported models: {list(self.SUPPORTED_MODELS.keys())}"
            )
        
        # Allow custom models but warn
        logging.warning(f"Using custom model: {model} - Not in list of known supported models")
        return model
    
    def _get_next_api_key(self) -> str:
        """Get the next API key in rotation."""
        key = self.api_keys[self.current_key_index]
        self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
        return key
    
    def predict_file_paths(self, requirement: str, code_tree: Dict[str, Any], 
                          max_files: int = 5, model: Optional[str] = None) -> Dict[str, Any]:
        """
        Predict which files are most likely to implement a requirement.
        
        Args:
            requirement: The functional requirement text
            code_tree: Code structure tree
            max_files: Maximum number of files to return
            model: Model to use (defaults to self.default_model)
            
        Returns:
            Dictionary with predicted file paths and confidence scores
        """
        model = model or self.default_model
        
        # Extract file paths from the code tree
        simplified_tree = []
        
        def extract_files(node):
            if isinstance(node, dict):
                if node.get("type") == "file" and "path" in node:
                    simplified_tree.append(node["path"])
                elif node.get("type") == "directory" and "children" in node:
                    for child in node.get("children", []):
                        extract_files(child)
        
        # Handle different possible code tree structures
        if isinstance(code_tree, dict):
            if "tree" in code_tree:
                # Format: {"tree": {...}, "stats": {...}}
                extract_files(code_tree.get("tree", {}))
            elif "name" in code_tree and "type" in code_tree:
                # Format: {"name": "root", "type": "directory", ...}
                extract_files(code_tree)
        elif isinstance(code_tree, list):
            # Format: [{"name": "file1", "type": "file", ...}, ...]
            for item in code_tree:
                extract_files(item)
        
        # If we couldn't extract any files, create a simple placeholder
        if not simplified_tree:
            logging.warning("Could not extract file paths from code tree, using placeholder")
            simplified_tree = ["file1.py", "file2.js", "file3.html"]
        
        # Limit to 100 files to reduce token usage
        if len(simplified_tree) > 100:
            simplified_tree = simplified_tree[:100]
        
        logging.info(f"Extracted {len(simplified_tree)} file paths from code tree")
        
        prompt = f"""
Requirement: "{requirement}"

Files in project (partial list):
{json.dumps(simplified_tree, indent=2)}

List {max_files} files most likely to implement this requirement. Return JSON:
{{
  "predicted_files": [
    {{
      "file_path": "path/to/file.ext",
      "confidence": 85,
      "reasoning": "Brief reason"
    }}
  ]
}}
"""
        
        # Default response in case of failure
        default_response = {
            "predicted_files": [
                {
                    "file_path": "unknown",
                    "confidence": 0,
                    "reasoning": "Failed to get prediction from API"
                }
            ]
        }
        
        # Implement retry logic
        max_retries = 3
        retry_delay = 2  # seconds
        
        for retry in range(max_retries):
            try:
                # Get a fresh API key for each retry
                api_key = self._get_next_api_key()
                
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                
                data = {
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2
                }
                
                response = requests.post(
                    f"{self.BASE_URL}/chat/completions", 
                    headers=headers, 
                    json=data,
                    timeout=30  # Add timeout to prevent hanging
                )
                response.raise_for_status()
                
                result = response.json()
                if "choices" not in result or not result["choices"]:
                    if retry < max_retries - 1:
                        logging.warning(f"Empty response from OpenRouter API, retrying ({retry+1}/{max_retries})...")
                        time.sleep(retry_delay)
                        continue
                    else:
                        # If all retries fail, return a default response
                        logging.error(f"Empty response from OpenRouter API after {max_retries} retries")
                        return default_response
                    
                content = result["choices"][0]["message"]["content"]
                
                # Extract JSON from the response
                try:
                    predictions = json.loads(content)
                    
                    # Validate the structure
                    if not isinstance(predictions, dict):
                        logging.warning(f"API returned non-dictionary response: {predictions}")
                        return default_response
                        
                    if "predicted_files" not in predictions:
                        logging.warning("API response missing predicted_files key")
                        predictions["predicted_files"] = default_response["predicted_files"]
                        
                    if not isinstance(predictions["predicted_files"], list):
                        logging.warning(f"predicted_files is not a list: {predictions['predicted_files']}")
                        predictions["predicted_files"] = default_response["predicted_files"]
                    
                    # Validate each predicted file
                    for i, file_info in enumerate(predictions["predicted_files"]):
                        if not isinstance(file_info, dict):
                            logging.warning(f"File info at index {i} is not a dictionary: {file_info}")
                            predictions["predicted_files"][i] = default_response["predicted_files"][0]
                            continue
                            
                        if "file_path" not in file_info:
                            logging.warning(f"File info missing file_path: {file_info}")
                            file_info["file_path"] = "unknown"
                            
                        if "confidence" not in file_info:
                            file_info["confidence"] = 0
                            
                        if "reasoning" not in file_info:
                            file_info["reasoning"] = "No reasoning provided"
                    
                    return predictions
                except json.JSONDecodeError:
                    # If the content isn't valid JSON, try to extract it from the text
                    import re
                    json_match = re.search(r'({[\s\S]*})', content)
                    if json_match:
                        try:
                            predictions = json.loads(json_match.group(1))
                            # Apply the same validation as above
                            if not isinstance(predictions, dict):
                                logging.warning(f"Extracted non-dictionary response: {predictions}")
                                return default_response
                                
                            if "predicted_files" not in predictions:
                                logging.warning("Extracted response missing predicted_files key")
                                predictions["predicted_files"] = default_response["predicted_files"]
                                
                            if not isinstance(predictions["predicted_files"], list):
                                logging.warning(f"Extracted predicted_files is not a list: {predictions['predicted_files']}")
                                predictions["predicted_files"] = default_response["predicted_files"]
                            
                            return predictions
                        except:
                            pass
                    
                    if retry < max_retries - 1:
                        logging.warning(f"Failed to parse JSON from response, retrying ({retry+1}/{max_retries})...")
                        time.sleep(retry_delay)
                        continue
                    else:
                        # If all retries fail, return a structured error
                        logging.error(f"Failed to parse JSON from response after {max_retries} retries: {content}")
                        return default_response
                
            except requests.exceptions.RequestException as e:
                if retry < max_retries - 1:
                    logging.warning(f"Error making OpenRouter API request: {e}, retrying ({retry+1}/{max_retries})...")
                    time.sleep(retry_delay)
                    continue
                else:
                    logging.error(f"Error making OpenRouter API request after {max_retries} retries: {e}")
                    return default_response
        
        # This should never be reached, but just in case
        return default_response
    
    def analyze_file_implementation(self, requirement: str, file_path: str, file_content: str, 
                                   model: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze whether a file implements a specific requirement.
        
        Args:
            requirement: The functional requirement text
            file_path: Path to the file
            file_content: Content of the file
            model: Model to use (defaults to self.default_model)
            
        Returns:
            Dictionary with analysis results
        """
        model = model or self.default_model
        
        # Default response in case of failure
        default_response = {
            "implements_requirement": False,
            "confidence": 0,
            "implementation_details": "Failed to analyze file"
        }
        
        # Truncate file content if too large (to avoid token limits)
        max_content_length = 8000  # Reduced limit to avoid token issues
        if len(file_content) > max_content_length:
            truncated_content = file_content[:max_content_length] + "\n... [content truncated for length]"
        else:
            truncated_content = file_content
        
        prompt = f"""
Requirement: "{requirement}"
File: {file_path}

Content:
```
{truncated_content}
```

Does this file implement the requirement? Return JSON:
{{
  "implements_requirement": true/false,
  "confidence": 0-100,
  "implementation_details": "Brief explanation"
}}
"""
        
        # Implement retry logic
        max_retries = 3
        retry_delay = 2  # seconds
        
        for retry in range(max_retries):
            try:
                # Get a fresh API key for each retry
                api_key = self._get_next_api_key()
                
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                
                data = {
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2
                }
                
                response = requests.post(
                    f"{self.BASE_URL}/chat/completions", 
                    headers=headers, 
                    json=data,
                    timeout=30  # Add timeout to prevent hanging
                )
                response.raise_for_status()
                
                result = response.json()
                if "choices" not in result or not result["choices"]:
                    if retry < max_retries - 1:
                        logging.warning(f"Empty response from OpenRouter API, retrying ({retry+1}/{max_retries})...")
                        time.sleep(retry_delay)
                        continue
                    else:
                        # If all retries fail, return a default response
                        logging.error(f"Empty response from OpenRouter API after {max_retries} retries")
                        return default_response
                    
                content = result["choices"][0]["message"]["content"]
                
                # Extract JSON from the response
                try:
                    analysis = json.loads(content)
                    
                    # Validate the structure
                    if not isinstance(analysis, dict):
                        logging.warning(f"API returned non-dictionary analysis: {analysis}")
                        return default_response
                    
                    # Ensure all required fields are present
                    if "implements_requirement" not in analysis:
                        logging.warning("Analysis missing implements_requirement field")
                        analysis["implements_requirement"] = False
                        
                    if "confidence" not in analysis:
                        analysis["confidence"] = 0
                        
                    if "implementation_details" not in analysis:
                        analysis["implementation_details"] = "No details provided"
                    
                    # Convert implements_requirement to boolean if it's a string
                    if isinstance(analysis["implements_requirement"], str):
                        analysis["implements_requirement"] = analysis["implements_requirement"].lower() == "true"
                    
                    # Convert confidence to int if it's a string
                    if isinstance(analysis["confidence"], str):
                        try:
                            analysis["confidence"] = int(analysis["confidence"])
                        except ValueError:
                            analysis["confidence"] = 0
                    
                    return analysis
                except json.JSONDecodeError:
                    # If the content isn't valid JSON, try to extract it from the text
                    import re
                    json_match = re.search(r'({[\s\S]*})', content)
                    if json_match:
                        try:
                            analysis = json.loads(json_match.group(1))
                            
                            # Apply the same validation as above
                            if not isinstance(analysis, dict):
                                logging.warning(f"Extracted non-dictionary analysis: {analysis}")
                                return default_response
                            
                            # Ensure all required fields are present
                            if "implements_requirement" not in analysis:
                                logging.warning("Extracted analysis missing implements_requirement field")
                                analysis["implements_requirement"] = False
                                
                            if "confidence" not in analysis:
                                analysis["confidence"] = 0
                                
                            if "implementation_details" not in analysis:
                                analysis["implementation_details"] = "No details provided"
                            
                            # Convert implements_requirement to boolean if it's a string
                            if isinstance(analysis["implements_requirement"], str):
                                analysis["implements_requirement"] = analysis["implements_requirement"].lower() == "true"
                            
                            # Convert confidence to int if it's a string
                            if isinstance(analysis["confidence"], str):
                                try:
                                    analysis["confidence"] = int(analysis["confidence"])
                                except ValueError:
                                    analysis["confidence"] = 0
                            
                            return analysis
                        except:
                            pass
                    
                    if retry < max_retries - 1:
                        logging.warning(f"Failed to parse JSON from response, retrying ({retry+1}/{max_retries})...")
                        time.sleep(retry_delay)
                        continue
                    else:
                        # If all retries fail, return a structured error
                        logging.error(f"Failed to parse JSON from response after {max_retries} retries: {content}")
                        return default_response
                
            except requests.exceptions.RequestException as e:
                if retry < max_retries - 1:
                    logging.warning(f"Error making OpenRouter API request: {e}, retrying ({retry+1}/{max_retries})...")
                    time.sleep(retry_delay)
                    continue
                else:
                    logging.error(f"Error making OpenRouter API request after {max_retries} retries: {e}")
                    return default_response
        
        # This should never be reached, but just in case
        return default_response
    
    def analyze_requirements_in_parallel(self, requirements: List[str], code_tree: Dict[str, Any], 
                                        file_contents: Dict[str, str], max_workers: int = 5) -> List[Dict[str, Any]]:
        """
        Analyze multiple requirements in parallel.
        
        Args:
            requirements: List of functional requirements
            code_tree: Code structure tree
            file_contents: Dictionary mapping file paths to contents
            max_workers: Maximum number of concurrent workers
            
        Returns:
            List of dictionaries with analysis results
        """
        results = []
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # First, predict file paths for each requirement
            future_to_req = {
                executor.submit(self._analyze_single_requirement, req, code_tree, file_contents): req 
                for req in requirements
            }
            
            for future in concurrent.futures.as_completed(future_to_req):
                req = future_to_req[future]
                try:
                    result = future.result()
                    results.append(result)
                    logging.info(f"Completed analysis for requirement: {req[:50]}...")
                except Exception as e:
                    logging.error(f"Error analyzing requirement '{req[:50]}...': {e}")
                    results.append({
                        "requirement": req,
                        "error": str(e),
                        "status": "error"
                    })
        
        return results
    
    def _analyze_single_requirement(self, requirement: str, code_tree: Dict[str, Any], 
                                  file_contents: Dict[str, str]) -> Dict[str, Any]:
        """Analyze a single requirement and its implementation."""
        try:
            # Step 1: Predict which files might implement this requirement
            predictions = self.predict_file_paths(requirement, code_tree)
            
            if "error" in predictions:
                return {
                    "requirement": requirement,
                    "error": predictions["error"],
                    "status": "error"
                }
            
            # Ensure we have a list of dictionaries for predicted_files
            if "predicted_files" not in predictions or not isinstance(predictions["predicted_files"], list):
                logging.warning(f"Invalid prediction format for requirement: {requirement[:50]}...")
                # Create a default prediction
                predicted_files = [{"file_path": "unknown", "confidence": 0, "reasoning": "Failed to get valid prediction"}]
            else:
                predicted_files = predictions["predicted_files"]
                # Validate each predicted file is a dictionary
                for i, file_info in enumerate(predicted_files):
                    if not isinstance(file_info, dict):
                        logging.warning(f"Invalid file info format (not a dict): {file_info}")
                        predicted_files[i] = {"file_path": "unknown", "confidence": 0, "reasoning": "Invalid prediction format"}
            
            # Step 2: Analyze each predicted file for implementation
            file_analyses = []
            files_analyzed = 0
            
            for file_info in predicted_files:
                # Ensure file_info is a dictionary and has a file_path key
                if not isinstance(file_info, dict):
                    logging.warning(f"Skipping invalid file_info (not a dict): {file_info}")
                    continue
                
                file_path = file_info.get("file_path", "unknown")
                
                # Try different path formats to find the file in the contents
                found_content = False
                content_key = None
                
                # Check original path
                if file_path in file_contents:
                    content_key = file_path
                    found_content = True
                else:
                    # Try with normalized path (replace backslashes with forward slashes)
                    normalized_path = file_path.replace('\\', '/')
                    if normalized_path in file_contents:
                        content_key = normalized_path
                        found_content = True
                    else:
                        # Try with just the filename
                        filename = os.path.basename(file_path)
                        matching_keys = [k for k in file_contents.keys() if k.endswith('/' + filename) or k.endswith('\\' + filename)]
                        if matching_keys:
                            content_key = matching_keys[0]
                            found_content = True
                
                if found_content and content_key:
                    # Add a small delay to avoid overwhelming the API
                    time.sleep(0.5)
                    
                    analysis = self.analyze_file_implementation(
                        requirement, content_key, file_contents[content_key]
                    )
                    
                    file_analyses.append({
                        "file_path": content_key,
                        "prediction_confidence": file_info.get("confidence", 0),
                        "prediction_reasoning": file_info.get("reasoning", ""),
                        "analysis": analysis
                    })
                    
                    files_analyzed += 1
                    
                    # Limit the number of files we analyze to avoid excessive API calls
                    if files_analyzed >= 3:
                        break
                else:
                    logging.warning(f"File not found in contents: {file_path}")
            
            # Step 3: Determine overall implementation status
            implemented_files = [
                f for f in file_analyses 
                if f.get("analysis", {}).get("implements_requirement", False)
            ]
            
            if implemented_files:
                status = "implemented"
                # Sort by confidence
                implemented_files.sort(
                    key=lambda x: x.get("analysis", {}).get("confidence", 0), 
                    reverse=True
                )
                details = implemented_files[0].get("analysis", {}).get("implementation_details", "")
            else:
                status = "not_implemented"
                details = "Requirement not found in analyzed files."
            
            return {
                "requirement": requirement,
                "status": status,
                "implementation_details": details,
                "analyzed_files": file_analyses
            }
            
        except Exception as e:
            logging.error(f"Error analyzing requirement '{requirement[:50]}...': {e}")
            return {
                "requirement": requirement,
                "error": str(e),
                "status": "error"
            } 