const express = require('express');
const path = require('path');
const open = require('open');
const reviewsRouter = require('./routes/reviews');

const app = express();
const PORT = 3000;

// When running as a pkg executable, __dirname points to the virtual bundle.
// Use the directory of the executable itself so public/ and config.json are
// resolved relative to wherever the user placed the exe.
const ROOT = process.pkg ? path.dirname(process.execPath) : __dirname;

app.use(express.static(path.join(ROOT, 'public')));
app.use('/api', reviewsRouter);

app.listen(PORT, () => {
  console.log(`Steam Review Monitor running at http://localhost:${PORT}`);
  open(`http://localhost:${PORT}`);
});
