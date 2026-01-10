const express = require('express');
const router = express.Router();
const Email = require('../models/Resume'); // Model is renamed to Email but file is still Resume.js

// Get all emails
router.get('/', async (req, res) => {
  try {
    const emails = await Email.find().sort({ receivedAt: -1, createdAt: -1 });
    res.json(emails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single email by ID
router.get('/:id', async (req, res) => {
  try {
    const email = await Email.findById(req.params.id);
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    res.json(email);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete an email
router.delete('/:id', async (req, res) => {
  try {
    const email = await Email.findByIdAndDelete(req.params.id);
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    res.json({ message: 'Email deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get email count
router.get('/stats/count', async (req, res) => {
  try {
    const count = await Email.countDocuments();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
