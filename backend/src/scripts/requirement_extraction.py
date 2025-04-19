import os
import re
import PyPDF2
import pandas as pd  # Import pandas for CSV handling
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')  # Ensure UTF-8 encoding

# ==============================
# 1. FUNCTION TO EXTRACT TEXT FROM PDFs
# ==============================
def extract_text_from_pdf(pdf_path):
    """Extracts text from a PDF file."""
    if not os.path.exists(pdf_path):
        print(f"🚨 Error: PDF file not found at {pdf_path}")
        sys.stdout.flush()
        return ""

    with open(pdf_path, "rb") as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in range(len(reader.pages)):
            page_text = reader.pages[page].extract_text()
            if page_text:
                text += page_text + "\n"

    if not text.strip():
        print(f"⚠️ Warning: No text extracted from {pdf_path}")
        sys.stdout.flush()

    return text.strip()


# ==============================
# 2. FUNCTION TO CLASSIFY REQUIREMENTS
# ==============================
def classify_requirement(requirement):
    """Classifies requirements as functional (1) or non-functional (0)."""
    functional_regex = r'\b(The system|The user|The admin|The application)\s*(will|shall|must|should|can|may|might|could|would|be able to)[^.!?]*[.!?]'
    non_func_keywords = r'\b(performance|scalability|security|usability|reliability|availability|maintainability|efficiency|compatibility|portability|robustness|flexibility|audit|compliance)\b'

    functional_match = re.search(functional_regex, requirement, re.IGNORECASE)
    non_functional_match = re.search(non_func_keywords, requirement, re.IGNORECASE)

    if functional_match and not non_functional_match:
        return 1  # Functional
    elif non_functional_match and not functional_match:
        return 0  # Non-Functional
    else:
        return None  # Skip unclear cases


# ==============================
# 3. FUNCTIONAL REQUIREMENTS EXTRACTION
# ==============================
def extract_functional_requirements(text):
    """Extracts functional requirements based on patterns."""
    pattern = r'(\b(The system|The user|The admin|The database|The application|The platform|The service)\s*(will|shall|must|should|can|may|might|could|would|be able to|has to|is required to|needs to)[^.!?]*[.!?])'
    matches = re.findall(pattern, text)

    functional_reqs = set()
    for match in matches:
        req = match[0].strip()
        if classify_requirement(req) == 1:
            functional_reqs.add(req)

    return list(functional_reqs)


# ==============================
# 4. NON-FUNCTIONAL REQUIREMENTS EXTRACTION
# ==============================
def extract_non_functional_requirements(text):
    """Extracts non-functional requirements using regex and keyword detection."""
    non_func_keywords = r'\b(performance|scalability|security|usability|reliability|availability|maintainability|efficiency|compatibility|portability|robustness|flexibility)\b'
    non_func_pattern = r'\b(The system|The application|The service)\s*(shall|must|should|can|may|needs to)[^.!?]*[.!?]'

    pattern_matches = re.findall(non_func_pattern, text)
    keyword_matches = re.findall(non_func_keywords, text, re.IGNORECASE)

    extracted_sentences = set()
    for match in pattern_matches:
        extracted_sentences.add(match[0].strip())

    sentences = text.split(".")
    for sentence in sentences:
        if re.search(non_func_keywords, sentence, re.IGNORECASE):
            extracted_sentences.add(sentence.strip())

    return list(extracted_sentences)


# ==============================
# 5. EXTRACT REQUIREMENTS FROM A FOLDER
# ==============================
def extract_requirements_from_folder(folder_path):
    """Extracts requirements from all PDFs in a folder."""
    if not os.path.exists(folder_path):
        print(f"⚠️ Folder '{folder_path}' not found. Creating it now...")
        os.makedirs(folder_path, exist_ok=True)

    print(f"🔍 Scanning folder: {folder_path}")
    files = os.listdir(folder_path)

    if not files:
        print("⚠️ No PDF files found in the folder.")
        return []

    extracted_data = []
    for filename in files:
        if filename.lower().endswith('.pdf'):
            file_path = os.path.join(folder_path, filename)
            print(f"🔄 Processing {filename}...")

            try:
                text = extract_text_from_pdf(file_path)
                if not text.strip():
                    print(f"⚠️ Skipping {filename} (empty content)")
                    continue
            except Exception as e:
                print(f"⚠️ Skipping {filename} due to error: {e}")
                continue

            functional_reqs = extract_functional_requirements(text)
            non_functional_reqs = extract_non_functional_requirements(text)

            print(f"✅ {filename}: {len(functional_reqs)} Functional, {len(non_functional_reqs)} Non-Functional")

            for req in functional_reqs:
                extracted_data.append({"filename": filename, "requirement": req, "label": "Functional"})
            for req in non_functional_reqs:
                extracted_data.append({"filename": filename, "requirement": req, "label": "Non-Functional"})

    if not extracted_data:
        print("⚠️ No requirements were extracted from the folder.")
    return extracted_data


def extract_requirements_from_pdf(pdf_path):
    """Extracts requirements from a single PDF file."""
    if not os.path.exists(pdf_path):
        print(f"🚨 Error: PDF file not found at {pdf_path}")
        return []

    print(f"🔍 Extracting requirements from {pdf_path}...")

    try:
        text = extract_text_from_pdf(pdf_path)
        if not text.strip():
            print(f"⚠️ No text extracted from {pdf_path}")
            return []

        functional_reqs = extract_functional_requirements(text)
        non_functional_reqs = extract_non_functional_requirements(text)

        extracted_data = []
        for req in functional_reqs:
            extracted_data.append({"filename": os.path.basename(pdf_path), "requirement": req, "label": "Functional"})
        for req in non_functional_reqs:
            extracted_data.append({"filename": os.path.basename(pdf_path), "requirement": req, "label": "Non-Functional"})

        print(f"✅ Extracted {len(extracted_data)} requirements from {pdf_path}")
        return extracted_data

    except Exception as e:
        print(f"❌ ERROR extracting requirements from {pdf_path}: {e}")
        return []

# ==============================
# 6. MAIN EXECUTION FUNCTION
# ==============================
def main():
    # Correct path to `backend/data/srs_pdfs/`
    folder_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "srs_pdfs"))

    print(f"📂 Processing PDFs in: {folder_path}")
    sys.stdout.flush()

    extracted_data = extract_requirements_from_folder(folder_path)

    # Save results to CSV file
    output_path = os.path.join(os.path.dirname(folder_path), "extracted_requirements.csv")  # ✅ Correct path

    df = pd.DataFrame(extracted_data)
    df.to_csv(output_path, index=False, encoding="utf-8")

    print(f"📜 Extracted requirements saved at: {output_path}")
    sys.stdout.flush()
    print(df.to_json(orient="records"))  # Send output to Node.js


# Run the script
if __name__ == "__main__":
    main()
