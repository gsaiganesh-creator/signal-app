const router = require('express').Router();

router.post('/predict', (_req, res) => {
  res.json({ prediction: null, confidence: null, model: 'random_forest_v1' });
});

module.exports = router;
