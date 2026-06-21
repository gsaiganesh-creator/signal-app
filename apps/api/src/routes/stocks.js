const router = require('express').Router();

router.get('/:ticker', (req, res) => {
  res.json({ ticker: req.params.ticker, cmp: null, signal: null });
});

module.exports = router;
