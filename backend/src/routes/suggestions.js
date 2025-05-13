const express = require('express');
const router = express.Router();
const authenticateUser = require('../middleware/authMiddleware');
const suggestionController = require('../controllers/suggestionController');


router.get('/repos/:repoId/suggestions', authenticateUser, suggestionController.getSuggestions);


router.post('/repos/:repoId/suggestions/generate', authenticateUser, suggestionController.generateSuggestion);


router.post('/repos/:repoId/suggestions', authenticateUser, suggestionController.addSuggestion);


router.put('/repos/:repoId/suggestions/:suggestionId', authenticateUser, suggestionController.updateSuggestion);


router.delete('/repos/:repoId/suggestions/:suggestionId', authenticateUser, suggestionController.deleteSuggestion);

module.exports = router; 