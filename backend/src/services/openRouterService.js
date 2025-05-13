const axios = require('axios');

class OpenRouterError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'OpenRouterError';
    this.status = status;
  }
}

const generateCodeSuggestion = async (requirementDescription, context = '') => {
  const apiKey = process.env.CODE_SUGGESTION_OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new OpenRouterError('OpenRouter API key not configured', 500);
  }

  try {
    // Create a complete code request that works for any requirement
    const systemPrompt = `You are an expert code generator that creates complete, working implementations. For any requirement:
1. Start with all necessary imports
2. Implement the core functionality with proper error handling
3. Add helper functions if needed
4. Include a main section with example usage
5. Add print statements to show results
6. Make the code ready to run without modifications
Never explain or comment the code beyond basic function documentation.`;

    const userPrompt = `Generate a complete, executable implementation for this requirement:

Requirement: ${requirementDescription}
${context ? `Additional Context: ${context}` : ''}

The code must be:
1. Complete and executable
2. Include all necessary imports
3. Have proper error handling
4. Include example usage with sample data
5. Show output/results
6. Follow best practices

Do not explain the code, just provide the complete implementation.`;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'mistralai/mistral-7b-instruct',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:5000',
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      throw new OpenRouterError('Invalid response from OpenRouter API', 500);
    }

    let generatedContent = response.data.choices[0].message.content;
    
    // Clean up the response
    generatedContent = generatedContent
      .replace(/^(Here's|Here is|This is|I'll provide|Let me provide|Here's how|Here's an?).*?\n/i, '')
      .replace(/^(Note|Remember|Important):.*?\n/gim, '')
      .replace(/^(First|To begin|Let's start|We'll start).*?\n/i, '')
      .replace(/\n*In this code:.*$/s, '')
      .trim();

    // Remove any markdown code blocks if present
    generatedContent = generatedContent.replace(/```[python]?\n?/g, '').replace(/```\n?$/, '').trim();

    // If the code doesn't have a main section, add a basic one
    if (!generatedContent.includes('if __name__ == "__main__"') && !generatedContent.includes('def main()')) {
      generatedContent += `\n\n# Example usage
if __name__ == "__main__":
    try:
        # Add your test data here
        print("Example usage:")
        # Call your functions here
        print("\\nResults:")
        # Print your results here
    except Exception as e:
        print(f"Error: {e}")`;
    }

    // Add error handling if not present
    if (!generatedContent.includes('try:') && !generatedContent.includes('except')) {
      const lines = generatedContent.split('\n');
      const mainIndex = lines.findIndex(line => line.includes('if __name__ == "__main__"'));
      if (mainIndex !== -1) {
        lines.splice(mainIndex + 1, 0, '    try:');
        lines.push('    except Exception as e:');
        lines.push('        print(f"Error: {e}")');
        generatedContent = lines.join('\n');
      }
    }

    return generatedContent;
  } catch (error) {
    if (error instanceof OpenRouterError) {
      throw error;
    }

    if (error.response) {
      // OpenRouter API error
      const status = error.response.status;
      const message = error.response.data?.error?.message || 'OpenRouter API error';
      
      // Handle credit limit errors
      if (status === 402 || (message && message.toLowerCase().includes('credit'))) {
        throw new OpenRouterError('Free tier credit limit reached. Try again later.', 402);
      }
      
      // Handle rate limit errors
      if (status === 429) {
        throw new OpenRouterError('API rate limit exceeded. Please try again later.', 429);
      }
      
      throw new OpenRouterError(message, status);
    }

    // Network or other errors
    throw new OpenRouterError('Failed to connect to OpenRouter API', 500);
  }
};

module.exports = {
  generateCodeSuggestion,
  OpenRouterError
}; 