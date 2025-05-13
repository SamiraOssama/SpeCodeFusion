const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
  repoId: {
    type: String,
    required: true,
    index: true
  },
  requirementId: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  isAIGenerated: {
    type: Boolean,
    default: false
  },
  metadata: {
    model: String,
    prompt: String,
    requirementDescription: String,
    context: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});


suggestionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});


suggestionSchema.index({ repoId: 1, requirementId: 1 });
suggestionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Suggestion', suggestionSchema); 