import os
import PyPDF2

# Function to extract text from PDF
def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file."""
    with open(pdf_path, "rb") as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in range(len(reader.pages)):
            text += reader.pages[page].extract_text()
    return text

# Function to extract text from all PDFs in a folder
def extract_text_from_pdfs_in_folder(folder_path):
    """Extract text from all PDF files in the folder."""
    pdf_texts = {}
    for filename in os.listdir(folder_path):
        if filename.endswith('.pdf'):
            file_path = os.path.join(folder_path, filename)
            pdf_texts[filename] = extract_text_from_pdf(file_path)
    return pdf_texts
