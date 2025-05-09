#!/usr/bin/env python3
import pandas as pd
import os
import sys
import argparse
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('format_srs_csv.log')
    ]
)

def format_srs_csv(input_file, output_file=None):
    """
    Format an SRS CSV file to ensure it has proper headers and no empty rows.
    
    Args:
        input_file (str): Path to the input CSV file
        output_file (str, optional): Path to save the formatted CSV file. 
                                    If None, overwrites the input file.
    
    Returns:
        int: 0 for success, -1 for failure
    """
    try:
        logging.info(f"Processing SRS CSV file: {input_file}")
        
        if not os.path.exists(input_file):
            logging.error(f"Input file not found: {input_file}")
            return -1
            
        # If output_file not specified, use the input file
        if output_file is None:
            output_file = input_file
            
        # Read the CSV file
        try:
            # First try reading with headers
            df = pd.read_csv(input_file)
            logging.info(f"Successfully read CSV with {len(df)} rows")
        except Exception as e:
            logging.warning(f"Failed to read CSV with headers: {str(e)}")
            try:
                # Try reading without headers
                df = pd.read_csv(input_file, header=None)
                logging.info(f"Successfully read CSV without headers, {len(df)} rows")
            except Exception as e2:
                logging.error(f"Failed to read CSV file: {str(e2)}")
                return -1
        
        # Check if the CSV has proper headers
        if df.shape[1] == 1:
            # Only one column found, likely needs to be split
            logging.info("Only one column found, attempting to split into multiple columns")
            # Try to split by common delimiters
            for delimiter in [',', ';', '\t']:
                if df.iloc[0, 0] and isinstance(df.iloc[0, 0], str) and delimiter in df.iloc[0, 0]:
                    # Split the single column into multiple columns
                    df = pd.DataFrame([row[0].split(delimiter) for row in df.values], columns=None)
                    logging.info(f"Split using delimiter: {delimiter}")
                    break
        
        # Remove empty rows
        df = df.dropna(how='all')
        
        # Check if there are any rows left
        if len(df) == 0:
            logging.error("No valid data found in the CSV file after removing empty rows")
            return -1
            
        # Determine if the first row contains column headers or is actual data
        first_row_is_header = True
        
        # If column names are all numeric or unnamed, assume no header
        if all(isinstance(col, int) or str(col).startswith('Unnamed:') for col in df.columns):
            first_row_is_header = False
            
        # If no header, set appropriate column names
        if not first_row_is_header:
            # Set column headers based on content
            if df.shape[1] >= 3:
                df.columns = ['Requirement Text', 'Type', 'Source'] + [f'Column{i+4}' for i in range(df.shape[1]-3)]
            elif df.shape[1] == 2:
                df.columns = ['Requirement Text', 'Type']
            else:
                df.columns = ['Requirement Text']
                
            logging.info(f"Set column headers: {', '.join(str(col) for col in df.columns)}")
        
        # Ensure 'Requirement Text' column exists
        if 'Requirement Text' not in df.columns and df.shape[1] > 0:
            # Rename the first column to 'Requirement Text'
            df = df.rename(columns={df.columns[0]: 'Requirement Text'})
            logging.info(f"Renamed first column to 'Requirement Text'")
            
        # Ensure 'Type' column exists
        if 'Type' not in df.columns and df.shape[1] > 1:
            # Rename the second column to 'Type'
            df = df.rename(columns={df.columns[1]: 'Type'})
            logging.info(f"Renamed second column to 'Type'")
            
        # Filter out rows with empty requirement text
        df = df[df['Requirement Text'].notna() & (df['Requirement Text'] != '')]
        logging.info(f"After filtering empty requirements, {len(df)} rows remain")
        
        # Save the formatted CSV
        df.to_csv(output_file, index=False)
        logging.info(f"Successfully saved formatted CSV to {output_file}")
        
        return 0
    except Exception as e:
        logging.error(f"Unexpected error: {str(e)}")
        return -1

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Format SRS CSV files")
    parser.add_argument("--input", "-i", required=True, help="Path to input CSV file")
    parser.add_argument("--output", "-o", help="Path to output CSV file (if not specified, overwrites input)")
    
    args = parser.parse_args()
    
    result = format_srs_csv(args.input, args.output)
    sys.exit(result) 