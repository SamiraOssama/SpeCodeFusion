import os
import re
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
from typing import List

# Download necessary NLTK resources (if not already downloaded)
nltk.download('stopwords', quiet=True)
nltk.download('punkt', quiet=True)
nltk.download('wordnet', quiet=True)

# Define global configurations
STOP_WORDS = set(stopwords.words('english'))  # Standard English stopwords
LEMMATIZER = WordNetLemmatizer()

# Domain-specific words (to retain during stopword removal)
DOMAIN_KEYWORDS = {"shall", "must", "should", "requirement", "functional", "non-functional", "will", "user"}

def preprocess_data(text: str, custom_stopwords: List[str] = None) -> str:
    """
    Cleans and preprocesses text extracted from Software Requirements Specification (SRS) documents.

    Steps:
    1. Removes non-alphabetic characters while preserving spaces.
    2. Converts text to lowercase.
    3. Tokenizes the text into words.
    4. Removes stopwords, with exceptions for domain-specific keywords.
    5. Lemmatizes words to their base forms.

    Args:
        text (str): The raw input text from an SRS document.
        custom_stopwords (List[str], optional): Additional stopwords to exclude from the processed text.

    Returns:
        str: The preprocessed and cleaned text.
    """
    # 1. Remove non-alphabetic characters (keep spaces)
    cleaned_text = re.sub(r'[^A-Za-z\s]', '', text)

    # 2. Convert text to lowercase for uniformity
    cleaned_text = cleaned_text.lower()

    # 3. Tokenize the text into individual words
    tokens = word_tokenize(cleaned_text)

    # 4. Extend stopwords with any custom stopwords (if provided)
    effective_stopwords = STOP_WORDS.union(set(custom_stopwords or []))

    # 5. Remove stopwords, but retain domain-specific keywords
    filtered_tokens = [
        token for token in tokens
        if token not in effective_stopwords or token in DOMAIN_KEYWORDS
    ]

    # 6. Lemmatize tokens to convert them to their base forms
    lemmatized_tokens = [LEMMATIZER.lemmatize(token) for token in filtered_tokens]

    # 7. Join the tokens back into a single string
    processed_text = ' '.join(lemmatized_tokens)

    return processed_text

# Example Usage
if __name__ == "__main__":
    raw_text = """
    The system shall allow users to log in securely. All user information must be encrypted
    and stored safely. Functional requirements include a login feature and a password reset mechanism.
    """
    custom_stopwords = ["login", "mechanism"]  # Add any extra words to filter out
    processed_text = preprocess_data(raw_text, custom_stopwords=custom_stopwords)
    print("Preprocessed Text:", processed_text)
