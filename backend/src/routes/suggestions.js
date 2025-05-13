const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Suggestion = require('../models/Suggestion');

// Template-based code generation
const generateCodeFromTemplate = (requirement, context) => {
  // Extract key information from requirement
  const isAPI = requirement.toLowerCase().includes('api') || requirement.toLowerCase().includes('endpoint');
  const isUI = requirement.toLowerCase().includes('component') || requirement.toLowerCase().includes('interface');
  const isDatabase = requirement.toLowerCase().includes('database') || requirement.toLowerCase().includes('model');
  
  let code = '';
  
  if (isAPI) {
    code = `
const express = require('express');
const router = express.Router();

// ${requirement}
router.get('/api/resource', async (req, res) => {
  try {
    // TODO: Implement the logic based on requirement
    const result = await someFunction();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;`;
  } else if (isUI) {
    code = `
import React, { useState, useEffect } from 'react';

// ${requirement}
const NewComponent = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // TODO: Implement initialization logic
  }, []);

  return (
    <div className="container">
      <h2>New Component</h2>
      {loading && <div>Loading...</div>}
      {error && <div className="error">{error}</div>}
      {data && (
        <div className="content">
          {/* TODO: Implement the UI based on requirement */}
        </div>
      )}
    </div>
  );
};

export default NewComponent;`;
  } else if (isDatabase) {
    code = `
const mongoose = require('mongoose');

// ${requirement}
const newSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  // TODO: Add more fields based on requirement
});

// Add any pre/post middleware if needed
newSchema.pre('save', function(next) {
  // TODO: Implement any pre-save logic
  next();
});

module.exports = mongoose.model('NewModel', newSchema);`;
  } else {
    // Default template for general functionality
    code = `
// ${requirement}
${context ? `// Context: ${context}\n` : ''}
function implementRequirement() {
  // TODO: Implement the core logic
  try {
    // Basic structure for implementation
    const setup = () => {
      // Initialize required resources
    };

    const validate = (input) => {
      // Validate inputs
      return true;
    };

    const process = (data) => {
      // Process the data
      return data;
    };

    // Main execution flow
    setup();
    if (validate(input)) {
      return process(input);
    }
    
    throw new Error('Invalid input');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}`;
  }

  return code.trim();
};

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

// Generate code suggestion for a requirement
router.post('/repos/:repoId/suggestions/generate', auth, async (req, res) => {
  try {
    const { requirementId, requirementDescription, context } = req.body;

    // Validate input
    if (!requirementId || !requirementDescription) {
      return res.status(400).json({ message: 'Requirement ID and description are required' });
    }

    try {
      // Generate code using templates
      const generatedCode = generateCodeFromTemplate(requirementDescription, context);

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
    } catch (genError) {
      console.error('Code generation error:', genError);
      res.status(500).json({ 
        message: 'Failed to generate code template',
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