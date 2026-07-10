const express = require('express');
const router = express.Router();
const config = require('../config.json');
const { fetchReviews } = require('../services/steam');

router.get('/games', (_req, res) => {
  res.json(config.games);
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
