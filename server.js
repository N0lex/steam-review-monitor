const express = require('express');
const path = require('path');
const open = require('open');
const reviewsRouter = require('./routes/reviews');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', reviewsRouter);

app.listen(PORT, () => {
  console.log(`Steam Review Monitor running at http://localhost:${PORT}`);
  open(`http://localhost:${PORT}`);
});
