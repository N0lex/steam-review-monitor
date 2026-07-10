const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { fetchReviews } = require('../services/steam');

function loadConfig() {
  const root = process.pkg ? path.dirname(process.execPath) : path.join(__dirname, '..');
  return JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
}

router.get('/games', (_req, res) => {
  res.json(loadConfig().games);
});

router.get('/reviews', async (req, res) => {
  const { appId } = req.query;
  if (!appId) {
    return res.status(400).json({ error: 'appId query param is required' });
  }
  try {
    const data = await fetchReviews(appId);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
