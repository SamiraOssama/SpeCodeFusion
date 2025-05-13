const Suggestion = require('../models/Suggestion');
const { generateCodeSuggestion, OpenRouterError } = require('../services/openRouterService');


exports.getSuggestions = async (req, res) => {
  try {
    const suggestions = await Suggestion.find({ repoId: req.params.repoId })
      .sort({ createdAt: -1 });
    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ message: 'Error fetching suggestions' });
  }
};


exports.generateSuggestion = async (req, res) => {
  try {
    const { requirementId, requirementDescription, context } = req.body;
    const { repoId } = req.params;

    if (!requirementId || !requirementDescription) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
     
      const generatedCode = await generateCodeSuggestion(requirementDescription, context);

     
      const suggestion = new Suggestion({
        repoId,
        requirementId,
        content: generatedCode,
        isAIGenerated: true,
        metadata: {
          model: 'mistralai/mistral-7b-instruct',
          prompt: requirementDescription,
          requirementDescription,
          context
        },
        createdBy: req.user.id
      });

      await suggestion.save();
      res.json(suggestion);
    } catch (genError) {
      console.error('Code generation error:', genError);
      
      if (genError instanceof OpenRouterError) {
      
        if (genError.status === 402) {
          return res.status(402).json({
            message: 'Failed to generate code',
            error: 'Free tier credit limit reached. Please try again later when credits refresh.'
          });
        }
        
        if (genError.status === 429) {
          return res.status(429).json({
            message: 'Failed to generate code',
            error: 'Rate limit exceeded. Please try again in a few minutes.'
          });
        }

        return res.status(genError.status || 500).json({
          message: 'Failed to generate code',
          error: genError.message
        });
      }

    
      res.status(500).json({
        message: 'Error generating suggestion',
        error: genError.message
      });
    }
  } catch (error) {
    console.error('Error in suggestion generation route:', error);
    res.status(500).json({
      message: 'Error generating suggestion',
      error: error.message
    });
  }
};


exports.addSuggestion = async (req, res) => {
  try {
    const { requirementId, content } = req.body;
    const { repoId } = req.params;

    if (!requirementId || !content) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const suggestion = new Suggestion({
      repoId,
      requirementId,
      content,
      isAIGenerated: false,
      createdBy: req.user.id
    });

    await suggestion.save();
    res.json(suggestion);
  } catch (error) {
    console.error('Error adding suggestion:', error);
    res.status(500).json({ message: 'Error adding suggestion' });
  }
};


exports.updateSuggestion = async (req, res) => {
  try {
    const { content } = req.body;
    const { repoId, suggestionId } = req.params;

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const suggestion = await Suggestion.findOne({
      _id: suggestionId,
      repoId,
      createdBy: req.user.id
    });

    if (!suggestion) {
      return res.status(404).json({ message: 'Suggestion not found' });
    }

    if (suggestion.isAIGenerated) {
      return res.status(403).json({ message: 'Cannot edit AI-generated suggestions' });
    }

    suggestion.content = content;
    await suggestion.save();

    res.json(suggestion);
  } catch (error) {
    console.error('Error updating suggestion:', error);
    res.status(500).json({ message: 'Error updating suggestion' });
  }
};


exports.deleteSuggestion = async (req, res) => {
  try {
    const { repoId, suggestionId } = req.params;

    const suggestion = await Suggestion.findOneAndDelete({
      _id: suggestionId,
      repoId,
      createdBy: req.user.id
    });

    if (!suggestion) {
      return res.status(404).json({ message: 'Suggestion not found' });
    }

    res.json({ message: 'Suggestion deleted successfully' });
  } catch (error) {
    console.error('Error deleting suggestion:', error);
    res.status(500).json({ message: 'Error deleting suggestion' });
  }
}; 