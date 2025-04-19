const express = require("express");
const mongoose = require("mongoose");
const Repository = require("../models/Repository"); // Adjust if needed

const router = express.Router();

router.get("/repository/:id", async (req, res) => {
  const { id } = req.params;

  // Validate that the ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  try {
    const repo = await Repository.findById(id);
    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }
    res.json(repo);
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
