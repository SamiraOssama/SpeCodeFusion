import os
import argparse
import pickle
import pandas as pd
import google.generativeai as genai
from tensorflow.keras.models import load_model
from pdf_processing import extract_text_from_pdf
from requirement_extraction import extract_requirements_from_pdf
from io import StringIO

# ==============================
# 🔹 Load API key
# ==============================
genai.configure(api_key='AIzaSyAHBD3jHdaoYE3zikbDAkCx645jlmg2syc')

# ==============================
# 🔹 Model setup
# ==============================
MODEL_NAME = "models/gemini-1.5-pro-latest"
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

df = pd.DataFrame(extracted_data, columns=["Requirement ID", "Requirement Text"])
df.to_csv(output_csv_path, index=False, encoding="utf-8")
print(f"✅ Extracted {len(df)} requirements. Saved to: {output_csv_path}")

# ==============================
# 🔹 Validate & Complete Requirements with Gemini
# ==============================
def validate_and_complete_requirements(srs_text, extracted_reqs):
    """
    Use Gemini to validate and complete the extracted requirements.
    Ensures proper CSV formatting before saving.
    """
    prompt = f"""
    Here is an SRS document:
    {srs_text}

    Here are the extracted functional requirements:
    {extracted_reqs}

    Please verify if all functional requirements from the SRS are present.
    If any are missing, add them. Ensure the response is strictly formatted as CSV:
    "Requirement Text" this is the first column and the second column should be the "label" functional or not and the third column file type "File Name" and write the name of the srs file uploaded 
    """

    response = gemini_model.generate_content(prompt)
    if hasattr(response, "text"):  # Ensure response is correctly formatted
        return response.text.strip()
    else:
        raise ValueError("❌ ERROR: Gemini response is empty or incorrect!")

# ==============================
# 🔹 Load Extracted CSV & Validate with Gemini
# ==============================
df = pd.read_csv(output_csv_path)

try:
    updated_text = validate_and_complete_requirements(srs_text, df.to_csv(index=False))
    
    # Convert text output to DataFrame
    updated_df = pd.read_csv(StringIO(updated_text))

    # At the end of the file, modify the saving logic:
    updated_csv_path = output_csv_path.replace(".csv", "_updated.csv")
    updated_df.to_csv(updated_csv_path, index=False, encoding="utf-8")

# Also save the original for reference
    df.to_csv(output_csv_path, index=False, encoding="utf-8")

    print(f"✅ Initial requirements saved to: {output_csv_path}")
    print(f"✅ Updated requirements saved to: {updated_csv_path}")
except Exception as e:
    print(f"❌ ERROR: Gemini validation failed: {e}")
