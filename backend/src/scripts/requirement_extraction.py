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
def clean_text(text):
    """Clean extracted text by fixing common PDF extraction issues."""
    # Join hyphenated words
    text = re.sub(r'(\w+)-\n(\w+)', r'\1\2', text)
    
    # Handle FR requirements with missing periods
    text = re.sub(r'(FR\d+[:.]\s*[^.!?\n]+)(?=\s*FR\d+[:.]\s*|$)', r'\1.', text, flags=re.IGNORECASE)
    
    # Fix spacing around FR prefixes
    text = re.sub(r'\s*(FR\d+[:.]\s*)', r'\n\1', text, flags=re.IGNORECASE)
    
    # Join lines that are part of the same sentence
    text = re.sub(r'([^.!?])\n([a-z])', r'\1 \2', text, flags=re.IGNORECASE)
    
    # Fix line breaks in the middle of sentences
    text = re.sub(r'\n(?=[a-z])', ' ', text)
    
    # Remove extra whitespace and line breaks while preserving FR prefixes
    text = re.sub(r'\s+', ' ', text)
    
    # Fix common PDF extraction artifacts
    text = text.replace('• ', '')
    
    return text.strip()

def is_section_header(text):
    """Check if the text is a section header or table header."""
    # Check for numbered sections
    header_patterns = [
        r'^\d+\.?\s*[A-Z][a-zA-Z\s]*:?$',  # Numbered sections
        r'^Table\s+\d+:',  # Table headers
        r'^[A-Z][a-zA-Z\s]*:$',  # Section headers with colon
        r'^\d+\.\d+\s+[A-Z]',  # Subsection headers
        r'Specification',  # Specification tables
        r'Priority:',  # Priority indicators
        r'Code:'  # Code references
    ]
    
    text = text.strip()
    return any(re.search(pattern, text, re.IGNORECASE) for pattern in header_patterns)

def is_valid_requirement(text):
    """Check if the text is a valid requirement."""
    # Skip if too short
    if len(text) < 10:
        return False
        
    # Skip section headers and table headers
    if is_section_header(text):
        return False
        
    # Must be a complete sentence
    if not re.search(r'[.!?]$', text):
        return False
        
    # Convert to title case for consistent checking
    text = text.strip()
    
    # Must start with a proper subject (case insensitive)
    valid_starts = [
        'the system', 'the user', 'the admin', 'the application', 
        'the platform', 'the service', 'the database', 'recruiters', 
        'the applicants', 'users', 'administrators', 'system functions'
    ]
    
    # Clean the text for start checking
    check_text = text.lower()
    # Remove FR prefix if present (in case it wasn't cleaned properly)
    check_text = re.sub(r'^\s*fr[-\s.]?\d+(?:\.\d+)?[:.\s-]+\s*', '', check_text, flags=re.IGNORECASE)
    check_text = re.sub(r'^system\s+functions\s+', '', check_text)  # Handle "System Functions" prefix
    
    if not any(check_text.startswith(start) for start in valid_starts):
        return False
        
    # Must contain a requirement verb (case insensitive)
    verbs = r'\b(shall|shall use|must|will|should|can|may|might|could|would|be able to|has to|is required to|needs to)\b'
    if not re.search(verbs, text, re.IGNORECASE):
        return False
        
    # Skip if it's a descriptive text rather than a requirement
    skip_starts = [
        'this', 'these', 'the research', 'the study', 'the performance',
        'the primary', 'the classifier', 'furthermore', 'however',
        'therefore', 'thus', 'hence', 'the researchers', 'reduce'
    ]
    if any(check_text.startswith(start) for start in skip_starts):
        return False
        
    return True

def clean_requirement(text):
    """Clean and standardize a requirement text, removing FRxx prefixes."""
    text = text.strip()
    
    # Remove FR prefixes with various formats:
    # FR01:, FR1:, FR-01:, FR.01:, FR 01:, etc.
    text = re.sub(r'^\s*FR[-\s.]?\d+(?:\.\d+)?[:.\s-]+\s*', '', text, flags=re.IGNORECASE)
    
    # Remove any other leading numbers or bullet points
    text = re.sub(r'^\d+\.?\s*', '', text)
    
    # Fix line breaks in the middle of sentences
    text = re.sub(r'\n+', ' ', text)
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Capitalize first letter
    if text:
        text = text[0].upper() + text[1:]
    
    # Ensure proper punctuation at end
    if text and not text.endswith(('.', '!', '?')):
        text += '.'
    
    return text.strip()


def extract_valid_requirement(text):
    """Extract and validate a requirement, returning None if invalid."""
    # First clean the text
    text = clean_requirement(text)
    
    # Skip if not a valid requirement
    if not is_valid_requirement(text):
        return None
        
    return text

def extract_text_from_pdf(pdf_path):
    """Extracts and cleans text from a PDF file."""
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
        return ""

    # Clean the extracted text
    return clean_text(text)


# ==============================
# 2. FUNCTION TO CLASSIFY REQUIREMENTS
# ==============================
def classify_requirement(requirement):
    """Classifies requirements as functional (1) or non-functional (0)."""
    # First clean and check if it's a valid requirement
    requirement = clean_requirement(requirement)
    if not is_valid_requirement(requirement):
        return None
        
    # Keywords that indicate functional requirements (case insensitive)
    functional_indicators = [
        r'\b(the system|the user|the admin|the application|the platform|the service|'
        r'the database|recruiters|the applicants)\s*'
        r'(will|shall|shall use|must|should|can|may|might|could|would|be able to|'
        r'has to|is required to|needs to)[^.!?]*[.!?]'
    ]
    
    # Check for functional requirements (case insensitive)
    for pattern in functional_indicators:
        if re.search(pattern, requirement, re.IGNORECASE):
            return 1

    return None  # Skip unclear cases


# ==============================
# 3. FUNCTIONAL REQUIREMENTS EXTRACTION
# ==============================
def extract_functional_requirements(text):
    """Extracts functional requirements based on patterns."""
    # First clean the text to handle line breaks
    text = clean_text(text)
    
    # Split by FR pattern while keeping the FR prefix
    fr_pattern = r'(?:^|\n)\s*(FR[-\s.]?\d+(?:\.\d+)?[:.\s-]+[^.!?\n]+[.!?]?)'
    fr_matches = re.finditer(fr_pattern, text, flags=re.IGNORECASE)
    
    functional_reqs = set()
    processed_text = text
    
    # First process FR-prefixed requirements
    for match in fr_matches:
        req_text = match.group(1).strip()
        # Add period if missing
        if not req_text.endswith(('.', '!', '?')):
            req_text += '.'
        cleaned_req = clean_requirement(req_text)
        if cleaned_req and is_valid_requirement(cleaned_req):
            functional_reqs.add(cleaned_req)
            # Remove processed requirement from text to avoid duplication
            processed_text = processed_text.replace(match.group(0), '')
    
    # Then process remaining sentences
    sentences = []
    current = ""
    
    # Split remaining text by sentence endings
    for part in re.split(r'([.!?]+(?:\s+|$))', processed_text):
        current += part
        if re.search(r'[.!?]+(?:\s+|$)', part):
            if current.strip():
                sentences.append(current.strip())
            current = ""
    
    # Add any remaining text
    if current.strip():
        sentences.append(current.strip() + '.')
    
    # Process each sentence
    for sentence in sentences:
        cleaned_req = clean_requirement(sentence)
        if cleaned_req and is_valid_requirement(cleaned_req):
            functional_reqs.add(cleaned_req)
    
    return list(functional_reqs)


# ==============================
# 4. NON-FUNCTIONAL REQUIREMENTS EXTRACTION
# ==============================
def extract_non_functional_requirements(text):
    """Extracts non-functional requirements using regex and keyword detection."""
    # Split text into sentences
    sentences = re.split(r'[.!?]+\s*', text)
    
    non_functional_reqs = set()
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        # Skip section headers and short sentences
        if is_section_header(sentence) or len(sentence) < 10:
            continue
            
        # Add period if missing
        if not sentence.endswith(('.', '!', '?')):
            sentence += '.'
            
        # Check if it's a valid requirement
        if classify_requirement(sentence) == 0:
            cleaned_req = extract_valid_requirement(sentence)
            if cleaned_req:
                non_functional_reqs.add(cleaned_req)

    return list(non_functional_reqs)


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

            print(f"✅ {filename}: {len(functional_reqs)} Functional requirements found")

            # Only include functional requirements that pass validation
            for req in functional_reqs:
                if is_valid_requirement(req):  # Additional validation
                    extracted_data.append({
                        "filename": filename, 
                        "requirement": req, 
                        "label": "Functional"
                    })

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
        
        # Only include functional requirements
        extracted_data = []
        for req in functional_reqs:
            if is_valid_requirement(req):  # Additional validation
                extracted_data.append({
                    "filename": os.path.basename(pdf_path), 
                    "requirement": req, 
                    "label": "Functional"
                })

        print(f"✅ Extracted {len(extracted_data)} functional requirements from {pdf_path}")
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
