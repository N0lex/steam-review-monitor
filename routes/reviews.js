const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { fetchGames, fetchReviews } = require('../services/steam');

function loadConfig() {
  const root = process.pkg ? path.dirname(process.execPath) : path.join(__dirname, '..');
  return JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
}

router.get('/games', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!req.query.ids) return res.json(loadConfig().games);

  const appIds = [...new Set(String(req.query.ids).split(',').map(id => id.trim()).filter(Boolean))];
  if (!appIds.length || appIds.length > 20 || appIds.some(id => !/^\d+$/.test(id))) {
    return res.status(400).json({ error: 'ids must contain 1-20 comma-separated Steam app IDs' });
  }

  res.json(await fetchGames(appIds));
});

router.get('/reviews', async (req, res) => {
  res.set('Cache-Control', 'no-store');
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
