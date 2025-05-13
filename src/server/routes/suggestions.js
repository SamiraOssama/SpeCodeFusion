const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Suggestion = require('../models/Suggestion');
const Requirement = require('../models/Requirement');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Get all suggestions for a repository
router.get('/repos/:repoId/suggestions', auth, async (req, res) => {
  try {
    const suggestions = await Suggestion.find({ repoId: req.params.repoId })
      .populate('requirementId', 'description context');
    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ message: 'Error fetching suggestions' });
  }
});

// Generate AI suggestion for a requirement
router.post('/repos/:repoId/suggestions/generate', auth, async (req, res) => {
  try {
    const { requirementId, requirementDescription, context } = req.body;

    // Validate input
    if (!requirementId || !requirementDescription) {
      return res.status(400).json({ message: 'Requirement ID and description are required' });
    }

    // Generate code suggestion using OpenAI
    const prompt = `Generate a code implementation for the following requirement:
    
Requirement: ${requirementDescription}
${context ? `Context: ${context}` : ''}

Please provide a complete, working code solution that implements this requirement.
Include necessary imports, error handling, and comments explaining the implementation.
The code should follow best practices and be production-ready.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert software developer. Generate high-quality, production-ready code with proper error handling, comments, and following best practices."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const generatedCode = completion.choices[0].message.content;

    // Save the generated suggestion
    const suggestion = new Suggestion({
      repoId: req.params.repoId,
      requirementId,
      content: generatedCode,
      isAIGenerated: true,
      createdBy: req.user.id
    });

    await suggestion.save();
    res.json(suggestion);
  } catch (error) {
    console.error('Error generating suggestion:', error);
    res.status(500).json({ message: 'Error generating suggestion' });
  }
});

// Add a new manual suggestion
router.post('/repos/:repoId/suggestions', auth, async (req, res) => {
  try {
    const { requirementId, content } = req.body;

    if (!requirementId || !content) {
      return res.status(400).json({ message: 'Requirement ID and content are required' });
    }

    const suggestion = new Suggestion({
      repoId: req.params.repoId,
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
});

// Update a suggestion
router.put('/repos/:repoId/suggestions/:suggestionId', auth, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const suggestion = await Suggestion.findOne({
      _id: req.params.suggestionId,
      repoId: req.params.repoId
    });

    if (!suggestion) {
      return res.status(404).json({ message: 'Suggestion not found' });
    }

    if (suggestion.isAIGenerated) {
      return res.status(403).json({ message: 'Cannot edit AI-generated suggestions' });
    }

    suggestion.content = content;
    suggestion.updatedAt = Date.now();
    await suggestion.save();

    res.json(suggestion);
  } catch (error) {
    console.error('Error updating suggestion:', error);
    res.status(500).json({ message: 'Error updating suggestion' });
  }
});

// Delete a suggestion
router.delete('/repos/:repoId/suggestions/:suggestionId', auth, async (req, res) => {
  try {
    const suggestion = await Suggestion.findOneAndDelete({
      _id: req.params.suggestionId,
      repoId: req.params.repoId,
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
});

module.exports = router; 