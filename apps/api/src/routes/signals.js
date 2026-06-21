const router = require('express').Router();

// Stub — will be wired to ML model
router.get('/', (_req, res) => {
  res.json({ signals: [], count: 0, accuracy90d: 71.4 });
});

module.exports = router;
