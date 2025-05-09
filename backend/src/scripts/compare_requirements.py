import csv
import json
import os
import sys
import logging
import google.generativeai as genai
from pathlib import Path
from tenacity import retry, stop_after_attempt, wait_exponential
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)

# Configure Gemini API
genai.configure(api_key='AIzaSyDzuC-JsaUJJagdvlzdO5G96Q8ZCz6Dcek')

# Gemini models to use with fallback
MODELS = [
    "gemini-1.5-pro-latest",  # Primary model (more accurate)
    "gemini-1.5-flash-latest"  # Fallback model (faster)
]

# Global rate limiting
LAST_API_CALL_TIME = 0
MIN_CALL_INTERVAL = 5  # Minimum seconds between API calls

def rate_limit():
    """Enforce rate limiting between API calls"""
    global LAST_API_CALL_TIME
    elapsed = time.time() - LAST_API_CALL_TIME
    if elapsed < MIN_CALL_INTERVAL:
        time.sleep(MIN_CALL_INTERVAL - elapsed)
    LAST_API_CALL_TIME = time.time()

@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=10))
def generate_with_model(model_name, prompt):
    """Generate content with retry logic for a specific model"""
    rate_limit()
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logging.error(f"Error with {model_name}: {str(e)}")
        raise

def parse_response(response_text):
    """Parse and validate the response"""
    try:
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0]
        return json.loads(response_text)
    except json.JSONDecodeError as e:
        logging.error(f"Failed to parse JSON response: {str(e)}")
        return None

def analyze_with_models(prompt):
    """Try analyzing with multiple models in sequence"""
    last_error = None
    
    for model_name in MODELS:
        try:
            logging.info(f"Attempting analysis with {model_name}")
            response_text = generate_with_model(model_name, prompt)
            analysis = parse_response(response_text)
            
            if analysis and "matches" in analysis and "stats" in analysis:
                analysis["model_used"] = model_name
                return analysis
                
            logging.warning(f"Invalid response format from {model_name}")
            
        except Exception as e:
            last_error = e
            logging.warning(f"Model {model_name} failed, trying next...")
            continue
    
    if last_error:
        logging.error(f"All models failed. Last error: {str(last_error)}")
    return None

def compare_requirements_with_code(requirements_path, source_code_path, output_path):
    """Main comparison function"""
    # Load requirements
    try:
        requirements = []
        with open(requirements_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            if not reader.fieldnames or 'Requirement Text' not in reader.fieldnames:
                logging.error("Invalid CSV format - missing 'Requirement Text' column")
                return None
            for row in reader:
                if 'Requirement Text' in row and row['Requirement Text'].strip():
                    requirements.append(row['Requirement Text'])
        logging.info(f"Loaded {len(requirements)} requirements")
    except Exception as e:
        logging.error(f"Error reading requirements: {str(e)}")
        return None

    # Load source code
    try:
        with open(source_code_path, 'r', encoding='utf-8') as jsonfile:
            source_code = json.load(jsonfile)
        logging.info("Successfully loaded source code analysis")
    except Exception as e:
        logging.error(f"Error reading source code: {str(e)}")
        return None
    
    # Prepare precise prompt
    prompt = f"""Analyze these software requirements against the provided source code with 100% accuracy:

    Requirements:
    {json.dumps(requirements, indent=2)}

    Source Code Structure:
    {json.dumps(source_code, indent=2)}

    Return a detailed JSON analysis with EXACTLY this structure:
    {{
      "stats": {{
        "total_requirements": <int>,
        "implemented_requirements": <int>,
        "missing_requirements": <int>,
        "coverage_percentage": <float>
      }},
      "matches": [
        {{
          "requirement": "<requirement text>",
          "implemented": <boolean>,
          "locations": [
            "<filename>:<function>",
            ...
          ]
        }},
        ...
      ],
      "missing_requirements": [
        {{
          "requirement": "<requirement text>",
          "suggestion": "<specific implementation suggestion>",
          "priority": "high/medium/low"
        }},
        ...
      ],
      "suggestions": []
    }}

    Important rules:
    1. Only include functions that directly implement requirements
    2. Be extremely precise in matching requirements to code
    3. For missing requirements, provide specific technical suggestions
    4. Calculate coverage_percentage as (implemented_requirements/total_requirements)*100
    5. Only include functions that clearly match requirements
    """

    try:
        analysis = analyze_with_models(prompt)
        if not analysis:
            logging.error("Analysis failed with all models")
            return None
            
        # Save results
        with open(output_path, 'w', encoding='utf-8') as outfile:
            json.dump(analysis, outfile, indent=2)
        return analysis
        
    except Exception as e:
        logging.error(f"Error during analysis: {str(e)}")
        return None

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--requirements', required=True)
    parser.add_argument('--sourcecode', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    
    result = compare_requirements_with_code(args.requirements, args.sourcecode, args.output)
    sys.exit(0 if result else 1)