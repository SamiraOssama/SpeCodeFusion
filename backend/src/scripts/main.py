import os
import importlib.util

# Dynamically import functions from specific file paths
def load_module_from_path(module_name, file_path):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

# Importing scripts dynamically
pdf_processing = load_module_from_path(
    "pdf_processing",
    r"C:/Users/Malak Helal/Desktop/pull speccode fusion/specode-frontend/backend/src/scripts/pdf_processing.py"
)
requirement_extraction = load_module_from_path(
    "requirement_extraction",
    r"C:/Users/Malak Helal/Desktop/pull speccode fusion/specode-frontend/backend/src/scripts/requirement_extraction.py"
)
utils = load_module_from_path(
    "utils",
    r"C:/Users/Malak Helal/Desktop/pull speccode fusion/specode-frontend/backend/src/scripts/utils.py"
)
train_model_script = load_module_from_path(
    "train_model",
    r"C:/Users/Malak Helal/Desktop/pull speccode fusion/specode-frontend/backend/src/scripts/train_model.py"
)

def main():
    # Step 1: Define paths
    pdf_folder_path = r'C:\Users\Malak Helal\Desktop\pull speccode fusion\specode-frontend\backend\data\srs_pdfs'
    output_path = r'C:\Users\Malak Helal\Desktop\pull speccode fusion\specode-frontend\backend\data\extracted_requirements.csv'
    test_pdf_path = r'C:\Users\Malak Helal\Desktop\pull speccode fusion\specode-frontend\backend\data\VisuallyImpairedAssistant_srs_doc.pdf'

    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created output directory at {output_dir}")
    
    # Step 2: Extract text from PDFs
    print("Extracting text from PDFs...")
    try:
        pdf_texts = pdf_processing.extract_text_from_pdfs_in_folder(pdf_folder_path)
    except Exception as e:
        print(f"Error extracting text from PDFs: {e}")
        return
    
    # Step 3: Extract requirements from text
    print("Extracting requirements...")
    extracted_requirements = {}
    for filename, text in pdf_texts.items():
        try:
            requirements = requirement_extraction.extract_requirements_from_folder(text)
            extracted_requirements[filename] = requirements
        except Exception as e:
            print(f"Error extracting requirements from {filename}: {e}")
            continue  # Skip this file and move to the next one

    # Step 4: Save extracted requirements to CSV
    if extracted_requirements:
        print(f"Saving extracted requirements to {output_path}...")
        try:
            utils.save_requirements_to_csv(extracted_requirements, output_path)
        except Exception as e:
            print(f"Error saving requirements to CSV: {e}")
            return

    # Step 5: Train the model
    print("Training the model...")
    try:
        train_model_script.train_model()  # Call the function to train the model
    except Exception as e:
        print(f"Error during model training: {e}")
        return
    
    # Step 6: Test with a new SRS document
    print("Testing new SRS documents...")
    try:
        train_model_script.test_new_srs(test_pdf_path)
    except Exception as e:
        print(f"Error testing new SRS: {e}")
        return
    
    print("Process complete!")

if __name__ == "__main__":
    main()
