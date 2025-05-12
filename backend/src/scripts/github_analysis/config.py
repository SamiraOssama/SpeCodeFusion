"""
Configuration settings for GitHub analysis scripts.
Centralized configuration to make it easier to adjust parameters.
"""

import os, logging
from dotenv import load_dotenv

# Try to load environment variables from multiple locations
env_paths = [
    os.path.join(os.getcwd(), 'dotenv.env'),
    os.path.join(os.getcwd(), 'backend', 'dotenv.env'),
    os.path.join(os.path.dirname(__file__), '../../../dotenv.env'),
    os.path.join(os.path.dirname(__file__), '../../../../dotenv.env'),
]

for env_path in env_paths:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        logging.info(f"Loaded environment from {env_path}")
        break
    else:
        logging.debug(f"Environment file not found at {env_path}")

class Config:
    """Global configuration for GitHub analysis."""
    
    # Parallel processing
    MAX_WORKERS = 4  # Number of threads to use for parallel processing
    
    # Various file paths and constants can be added here
    EXTENSIONS = {
        'js': ['js', 'jsx', 'ts', 'tsx'],
        'java': ['java', 'kt'],
        'python': ['py'],
        'c': ['c', 'h', 'cpp', 'hpp', 'cc'],
        'c#': ['cs'],
        'ruby': ['rb'],
        'php': ['php'],
        'go': ['go'],
        'swift': ['swift'],
        'dart': ['dart']
    }
    
    @staticmethod
    def get_api_keys(key_prefix="OPENROUTER_API_KEY"):
        """Get all API keys from environment variables with the specified prefix."""
        keys = []
        
        # Check for indexed keys (KEY_0, KEY_1, etc.)
        for i in range(10):  # Check up to 10 keys
            env_var = f"{key_prefix}_{i}"
            if env_var in os.environ and os.environ[env_var]:
                keys.append(os.environ[env_var])
        
        # Also check for a regular key without index
        if key_prefix in os.environ and os.environ[key_prefix]:
            if os.environ[key_prefix] not in keys:  # Avoid duplicates
                keys.append(os.environ[key_prefix])
        
        if not keys:
            logging.warning(f"No API keys found with prefix: {key_prefix}")
        else:
            logging.info(f"Found {len(keys)} API keys with prefix: {key_prefix}")
        
        return keys

    # File paths and directories
    FILE_PATHS = {
        "cache_dir": "cache",
        "nltk_data": "embed/nltk_data",
        "default_output_dir": "output"
    }

    # API configuration
    API_CONFIG = {
        "github_api_base": "https://api.github.com",
        "rate_limit_pause": 60,  # seconds to pause when rate limited
        "max_retries": 3
    }

    # Extraction configuration
    EXTRACTION_CONFIG = {
        "max_file_size": 1024 * 1024,  # 1MB
        "excluded_dirs": [
            "node_modules", ".git", "__pycache__", "venv", "env",
            "dist", "build", "target", "bin", "obj"
        ],
        "code_file_extensions": [
            ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".c", ".cpp", ".h", 
            ".hpp", ".cs", ".go", ".rb", ".php", ".swift", ".kt", ".rs"
        ],
        "doc_file_extensions": [
            ".md", ".txt", ".rst", ".adoc", ".pdf", ".doc", ".docx"
        ]
    }

    # Embedding configuration
    EMBEDDING_CONFIG = {
        "model_name": "all-MiniLM-L6-v2",
        "embedding_dim": 384,
        "batch_size": 32,
        "max_seq_length": 512
    }

    # Matching configuration
    MATCHING_CONFIG = {
        # Thresholds for different matching approaches
        "base_threshold": 0.5,             # Standard embedding similarity threshold
        "semantic_threshold": 0.25,        # Threshold for semantic matching
        "multi_level_threshold": 0.2,      # Threshold for multi-level matching
        
        # Weights for combined scoring
        "embedding_weight": 0.3,           # Weight for embedding similarity
        "semantic_weight": 0.3,            # Weight for semantic similarity 
        "keyword_weight": 0.2,             # Weight for keyword matching
        "context_weight": 0.2,             # Weight for contextual similarity
        
        # Feature toggles
        "use_multi_level": True,           # Enable multi-level matching
        "use_semantic_enhancer": True,     # Enable semantic enhancement
        "use_llm_verification": False      # Enable LLM verification
    }

    # Report configuration
    REPORT_CONFIG = {
        # Consolidated report module settings
        "top_k": 10,                      # Number of top matches to consider
        "max_matches_per_requirement": 3,  # Maximum matches to include per requirement
        "validation_threshold": 0.5,       # Threshold for validation
        
        # Output file names
        "report_name": "compatibility_report.json",
        "summary_name": "compatibility_report_summary.csv",
        "detailed_name": "compatibility_report.csv"
    }

    # Logging configuration
    LOGGING_CONFIG = {
        "level": "INFO",
        "format": "%(asctime)s - %(levelname)s - %(message)s",
        "file_handlers": {
            "match": "match.log",
            "report": "report.log",
            "embed_srs": "embed_srs.log",
            "embed_code": "embed_code.log"
        }
    }

    # Module mapping for simplified architecture
    MODULE_MAPPING = {
        # Maps old module paths to new consolidated ones
        "match": "embed/match.py",
        "report": "embed/report.py",
        "embed_srs": "embed/embed_srs.py",
        "embed_code": "embed/embed_code.py"
    }
    
    # LLM Configuration
    LLM_ENABLED = True  # Always enable LLM by default
    LLM_MIN_COMPLEXITY = int(os.environ.get('LLM_MIN_COMPLEXITY', '5'))  # Min lines for LLM processing
    LLM_CACHE_PATH = os.path.join(os.path.dirname(__file__), 'cache', 'llm_cache.json')
    
    # Embedding Configuration
    GENERATE_EMBEDDINGS = True  # Always enable embeddings by default
    
    # Report Generation
    GENERATE_REPORT = True  # Always enable report generation by default
    
    # Path Configuration
    @staticmethod
    def ensure_cache_dir():
        """Ensure the cache directory exists."""
        cache_dir = os.path.dirname(Config.LLM_CACHE_PATH)
        if not os.path.exists(cache_dir):
            os.makedirs(cache_dir, exist_ok=True)
        return cache_dir

    # ---------------- user‑tunable ----------------
    LLM_MODEL          = "gemini-pro"  # Updated to correct model name
    CACHE_FILE         = "function_cache.json"
    # ---------------------------------------------
    SAFETY_SETTINGS = [
        {"category": "HARM_CATEGORY_HARASSMENT",       "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH",      "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT","threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT","threshold": "BLOCK_NONE"},
    ]
    GENERATION_CONFIG = {"temperature": 0.3, "max_output_tokens": 200}
