import pandas as pd

# Function to save extracted requirements to CSV with 'label' column
def save_requirements_to_csv(extracted_data, output_path):
    """Save extracted requirements to a CSV file with a 'label' column."""
    data = []
    for filename, req_data in extracted_data.items():
        # Add functional requirements with label = 1
        for req in req_data['functional']:
            data.append({"filename": filename, "requirement": req, "label": 1})  # 'label': 1 for functional
        # Add non-functional requirements with label = 0
        for req in req_data['non-functional']:
            data.append({"filename": filename, "requirement": req, "label": 0})  # 'label': 0 for non-functional
    
    df = pd.DataFrame(data)
    df.to_csv(output_path, index=False)
    print(f"Extracted requirements saved to {output_path}")
