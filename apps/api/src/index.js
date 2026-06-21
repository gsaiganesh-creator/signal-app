const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/signals', require('./routes/signals'));
app.use('/api/stocks',  require('./routes/stocks'));
app.use('/api/ml',      require('./routes/ml'));

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.listen(PORT, () => console.log(`Signal API running on :${PORT}`));
