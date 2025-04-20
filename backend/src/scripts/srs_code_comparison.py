import json
import pandas as pd
from difflib import SequenceMatcher
import argparse
import logging
from pathlib import Path
from typing import Dict, List, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)

class SRSvsCodeAnalyzer:
    def __init__(self, srs_csv_path: str, code_json_path: str):
        self.srs_csv_path = Path(srs_csv_path)
        self.code_json_path = Path(code_json_path)
        self.results = {
            'stats': {},
            'matches': [],
            'missing_requirements': [],
            'undocumented_functions': [],
            'suggestions': []
        }
    
    def _load_srs_data(self) -> pd.DataFrame:
        """Load SRS requirements from CSV"""
        try:
            df = pd.read_csv(self.srs_csv_path)
            # Make column names case-insensitive and strip whitespace
            df.columns = [col.strip().lower() for col in df.columns]
            if not {'requirement text', 'label'}.issubset(df.columns):
                raise ValueError("CSV missing required columns")
            return df[df['label'] == 'functional']  # Only use functional requirements
        except Exception as e:
            logging.error(f"Failed to load SRS data: {e}")
            raise

    def _load_code_data(self) -> Dict:
        """Load code analysis results from JSON"""
        try:
            with open(self.code_json_path, 'r') as f:
                data = json.load(f)
            return data
        except Exception as e:
            logging.error(f"Failed to load code analysis: {e}")
            raise

    def _similarity_score(self, text1: str, text2: str) -> float:
        """Calculate similarity between two texts (0-1)"""
        return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()

    def _extract_key_components(self, text: str) -> str:
        """Extract key action verbs and nouns from text"""
        verbs = ['shall', 'must', 'should', 'will', 'needs to', 'can']
        words = text.lower().split()
        # Keep important words and remove common stop words
        key_words = [word for word in words if word in verbs or word.isalpha()]
        return ' '.join(key_words)

    def _find_best_match(self, req: str, functions: List[Dict]) -> Tuple[float, Dict]:
        """Find the best matching function for a requirement"""
        best_score = 0
        best_match = None
        
        req_components = self._extract_key_components(req)
        
        for func in functions:
            func_desc = func.get('analysis', '')
            # Try matching against both function names and analysis text
            func_text = ' '.join(func['functions']) + ' ' + func_desc
            score = self._similarity_score(req_components, func_text)
            
            if score > best_score:
                best_score = score
                best_match = func
        
        return best_score, best_match

    def analyze(self) -> Dict:
        """Main analysis method"""
        try:
            # Load data
            srs_df = self._load_srs_data()
            code_data = self._load_code_data()
            
            # Flatten all functions from code analysis
            code_functions = []
            for result in code_data.get('results', []):
                if 'functions' in result and 'analysis' in result:
                    code_functions.append(result)
            
            # Comparison logic
            matched_reqs = set()
            matched_funcs = set()
            
            # Lower threshold for considering a match
            SIMILARITY_THRESHOLD = 0.5  # Reduced from 0.65
            
            for _, req_row in srs_df.iterrows():
                req = req_row['requirement text']
                best_score, best_match = self._find_best_match(req, code_functions)
                
                if best_score >= SIMILARITY_THRESHOLD and best_match:
                    self.results['matches'].append({
                        'requirement': req,
                        'function': f"{best_match['filename']}::{', '.join(best_match['functions'])}",
                        'similarity_score': best_score,
                        'analysis': best_match['analysis']
                    })
                    matched_reqs.add(req)
                    matched_funcs.add(json.dumps(best_match))
                else:
                    self.results['missing_requirements'].append({
                        'requirement': req,
                        'suggestion': f"Implement functionality for: {req.split('.')[0]}",
                        'priority': "High" if "shall" in req.lower() or "must" in req.lower() else "Medium"
                    })
            
            # Find undocumented functions
            for func in code_functions:
                if json.dumps(func) not in matched_funcs:
                    self.results['undocumented_functions'].append({
                        'filename': func['filename'],
                        'functions': func['functions'],
                        'suggestion': f"Document these functions in SRS: {', '.join(func['functions'])}"
                    })
            
            # Generate statistics
            total_reqs = len(srs_df)
            matched_reqs_count = len(matched_reqs)
            self.results['stats'] = {
                'total_requirements': total_reqs,
                'implemented_requirements': matched_reqs_count,
                'missing_requirements': len(self.results['missing_requirements']),
                'undocumented_functions': len(self.results['undocumented_functions']),
                'coverage_percentage': round(matched_reqs_count / total_reqs * 100, 2) if total_reqs > 0 else 0
            }
            
            # Generate overall suggestions
            if self.results['stats']['missing_requirements'] > 0:
                self.results['suggestions'].append({
                    'type': 'implementation',
                    'message': f"Focus on implementing {self.results['stats']['missing_requirements']} missing requirements",
                    'priority': 'High'
                })
            
            if self.results['stats']['undocumented_functions'] > 0:
                self.results['suggestions'].append({
                    'type': 'documentation',
                    'message': f"Document {self.results['stats']['undocumented_functions']} functions in SRS",
                    'priority': 'Medium'
                })
            
            return self.results
            
        except Exception as e:
            logging.error(f"Analysis failed: {e}")
            raise

def main():
    parser = argparse.ArgumentParser(description="Compare SRS requirements with source code implementations")
    parser.add_argument("--srs", required=True, help="Path to SRS requirements CSV file")
    parser.add_argument("--code", required=True, help="Path to code analysis JSON file")
    parser.add_argument("--output", required=True, help="Output JSON file path")
    
    args = parser.parse_args()
    
    try:
        analyzer = SRSvsCodeAnalyzer(args.srs, args.code)
        results = analyzer.analyze()
        
        # Save results
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        
        logging.info(f"Analysis completed successfully. Results saved to {args.output}")
    
    except Exception as e:
        logging.error(f"Comparison process failed: {e}")
        exit(1)

if __name__ == "__main__":
    main()