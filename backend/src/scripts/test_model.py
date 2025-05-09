import os
import argparse
import pickle
import pandas as pd
import google.generativeai as genai
from tensorflow import keras
from keras.models import load_model
from pdf_processing import extract_text_from_pdf
from requirement_extraction import extract_requirements_from_pdf
from io import StringIO
import time

# Constants
MAX_RETRIES = 3
RETRY_DELAY = 45  # seconds

# ==============================
# 🔹 Load API key
# ==============================
genai.configure(api_key='AIzaSyAHBD3jHdaoYE3zikbDAkCx645jlmg2syc')

# ==============================
# 🔹 Model setup with retry logic
# ==============================
MODEL_NAME = "models/gemini-1.5-flash-latest"
gemini_model = genai.GenerativeModel(MODEL_NAME)  # Avoids conflicts with Keras model

# ==============================
# 🔹 Paths Setup
# ==============================
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
EXTRACTED_DIR = os.path.join(BASE_DIR, "extracted")
OUTPUT_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "output"))

MODEL_PATH = os.path.join(OUTPUT_DIR, "requirement_extraction_model.keras")
TOKENIZER_PATH = os.path.join(OUTPUT_DIR, "tokenizer.pkl")

# Ensure model and tokenizer exist
if not os.path.exists(MODEL_PATH):
    print(f"❌ ERROR: Model file NOT found at {MODEL_PATH}!")
    exit(1)

if not os.path.exists(TOKENIZER_PATH):
    print(f"❌ ERROR: Tokenizer file NOT found at {TOKENIZER_PATH}!")
    exit(1)

# ==============================
# 🔹 Load TensorFlow Model & Tokenizer
# ==============================
print(f"✅ Loading Keras model from {MODEL_PATH}...")
try:
    keras_model = load_model(MODEL_PATH)  # Use a separate variable
except Exception as e:
    print(f"❌ ERROR: Failed to load model: {e}")
    exit(1)

print(f"✅ Loading tokenizer from {TOKENIZER_PATH}...")
try:
    with open(TOKENIZER_PATH, "rb") as f:
        tokenizer = pickle.load(f)
except Exception as e:
    print(f"❌ ERROR: Failed to load tokenizer: {e}")
    exit(1)

# ==============================
# 🔹 Argument Parsing
# ==============================
parser = argparse.ArgumentParser(description="Process an SRS PDF and extract requirements.")
parser.add_argument("--file", required=True, help="Path to the SRS PDF file.")
parser.add_argument("--output", required=True, help="Path to save extracted CSV.")  
args = parser.parse_args()

# Validate PDF file
pdf_path = os.path.abspath(args.file)
if not os.path.exists(pdf_path):
    print(f"❌ ERROR: PDF file NOT found at {pdf_path}!")
    exit(1)

# ==============================
# 🔹 Extract Text from PDF
# ==============================
print(f"📂 Processing: {pdf_path}")
srs_text = extract_text_from_pdf(pdf_path)

if not srs_text.strip():
    print(f"⚠️ WARNING: No text extracted from {pdf_path}")
    exit(1)

# ==============================
# 🔹 Extract Requirements
# ==============================
print("🔍 Extracting requirements...")
try:
    extracted_data = extract_requirements_from_pdf(pdf_path)
except Exception as e:
    print(f"❌ ERROR: Extraction function failed: {e}")
    exit(1)

if not extracted_data:
    print("⚠️ No requirements found in the document!")
    exit(1)

# ==============================
# 🔹 Save Extracted Requirements to CSV
# ==============================
output_csv_path = os.path.abspath(args.output)
os.makedirs(os.path.dirname(output_csv_path), exist_ok=True)

# Convert the list of dictionaries to DataFrame
df = pd.DataFrame(extracted_data)
print(f"Debug: Original DataFrame columns: {df.columns}")

# Ensure we have the correct columns
if 'requirement' not in df.columns and 'Requirement Text' in df.columns:
    df = df.rename(columns={'Requirement Text': 'requirement'})
if 'label' not in df.columns:
    df['label'] = 'Functional'  # Default label
if 'filename' not in df.columns:
    df['filename'] = os.path.basename(args.file)

# Save initial CSV with all requirements
df.to_csv(output_csv_path, index=False, encoding='utf-8')
print(f"✅ All requirements saved to: {output_csv_path}")

# Save only Functional requirements to updated file
updated_csv_path = output_csv_path.replace(".csv", "_updated.csv")
functional_reqs = df[df['label'] == 'Functional'].copy()
functional_reqs.to_csv(updated_csv_path, index=False, encoding='utf-8')
print(f"✅ Functional requirements saved to: {updated_csv_path}")
print(f"📊 Summary: Found {len(functional_reqs)} functional requirements out of {len(df)} total requirements")
