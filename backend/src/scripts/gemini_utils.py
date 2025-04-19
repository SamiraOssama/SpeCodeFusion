import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

def init_gemini(api_key="YOUR_API_KEY"):
    genai.configure(api_key=api_key)
    return genai.GenerativeModel('gemini-pro')

def generate_content_safely(model, prompt, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = model.generate_content(
                prompt,
                safety_settings={
                    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
                }
            )
            return response.text
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)  # Exponential backoff