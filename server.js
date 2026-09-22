const path = require('node:path');
const express = require('express');
const { generateReport, ValidationError } = require('./lib/report');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/verify', async (req, res) => {
  try {
    const report = await generateReport(req.body || {});
    res.json(report);
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong while generating the report. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`Job Verifier running at http://localhost:${PORT}`);
});
