const mongoose = require("mongoose");
const requestSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  email: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  }
});

const invitationSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending"
  },
  invitedAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date
  }
});

const repoSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true,
      maxlength: 100 
    },
    owner: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    members: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      default: [] 
    }],
    invitations: [invitationSchema],
    requests: [requestSchema],

    // File storage
    srsFile: { 
      type: String, 
      default: null 
    },
    sourceCodeFile: { 
      type: String, 
      default: null 
    },
    extractedFiles: {
      srsRequirements: { type: String },  // Path to extracted SRS requirements CSV
      codeAnalysis: { type: String }     // Path to code analysis JSON
    },

    // Report data
    report: {
      timestamp: { type: Date },
      statistics: {
        total_requirements: { type: Number },
        implemented_count: { type: Number },
        coverage_percentage: { type: Number }
      },
      requirements: [{
        requirement: { type: String },
        status: { type: String },
        implementation_details: { type: String }
      }]
    },

    // SRS File History
    srsHistory: [
      {
        user: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "User", 
          required: true 
        },
        action: {
          type: String,
          enum: ["Uploaded SRS", "Modified SRS", "Deleted SRS", "Processed SRS"],
          required: true,
        },
        file: { 
          type: String, 
          required: true 
        },
        timestamp: { 
          type: Date, 
          default: Date.now 
        },
        metadata: {
          extractedRequirements: { type: Number }
        }
      },
    ],

    // Source Code History
    sourceCodeHistory: [
      {
        user: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "User", 
          required: true 
        },
        action: {
          type: String,
          enum: [
            "Uploaded Source Code", 
            "Modified Source Code", 
            "Deleted Source Code", 
            "Analyzed Source Code",
            "Uploaded from GitHub"  // Added new action type
          ],
          required: true,
        },
        file: { 
          type: String, 
          required: true 
        },
        timestamp: { 
          type: Date, 
          default: Date.now 
        },
        metadata: {
          name: { type: String },
          file: { type: String },
          line: { type: Number },
          language: { type: String }
        }
      },
    ],

    // Comparison History
    comparisonHistory: [
      {
        user: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "User", 
          required: true 
        },
        timestamp: { 
          type: Date, 
          default: Date.now 
        },
        resultsFile: { 
          type: String,  // Path to comparison results JSON
          required: true 
        },
        stats: {
          totalRequirements: { type: Number },
          implemented: { type: Number },
          missing: { type: Number },
          undocumented: { type: Number },
          coverage: { type: Number }  // Percentage
        }
      }
    ],

    // Status tracking
    lastCompared: { 
      type: Date 
    },
    comparisonStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending"
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true } 
  }
);

// Virtual property for total activity count
repoSchema.virtual('totalActivity').get(function() {
  return this.srsHistory.length + this.sourceCodeHistory.length + this.comparisonHistory.length;
});

// Indexes for better query performance
repoSchema.index({ name: 'text' });
repoSchema.index({ owner: 1 });
repoSchema.index({ 'members': 1 });
repoSchema.index({ lastCompared: -1 });

module.exports = mongoose.model("Repo", repoSchema);