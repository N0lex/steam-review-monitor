# Steam Review Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Node.js/Express web app that shows Steam game reviews for multiple games on one page, highlighting reviews that have no developer response.

**Architecture:** Express serves both a static `public/` directory and a `/api` route group. The frontend (vanilla JS) fetches `/api/games` on load, then fires a `/api/reviews?appId=xxx` call per game and renders a card for each. The Steam service layer handles all Steam API communication and normalises responses.

**Tech Stack:** Node.js 18+, Express 4, `open` v8 (CJS), native `fetch`, Vanilla HTML/CSS/JS, `node:test` for unit tests.

## Global Constraints

- Node.js 18+ required (uses native `fetch` and `node --test`)
- CommonJS modules throughout (`require` / `module.exports`) — no ESM, no build step
- `open` pinned to `^8.4.2` — v9+ is ESM-only and would break the CJS server
- Steam reviews API: `GET https://store.steampowered.com/appreviews/{appId}?json=1&num_per_page=20&filter=recent&language=all&purchase_type=all`
- Server port: `3000`
- Default reviews shown per card: `5` (client-side pagination, 5 more per "Show more" click)
- Max reviews fetched from Steam per game: `20`

---

### Task 1: Project scaffold + Express server

**Files:**
- Create: `package.json`
- Create: `config.json`
- Create: `server.js`
- Create: `public/index.html` (minimal stub — replaced in Task 4)
- Create: `public/app.js` (empty stub — replaced in Task 5)
- Create: `public/style.css` (empty stub — replaced in Task 4)
- Create: `services/steam.js` (empty stub — replaced in Task 2)
- Create: `routes/reviews.js` (empty stub — replaced in Task 3)

**Interfaces:**
- Produces: running Express server on port 3000 that serves `public/` as static files and mounts `/api` routes

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "steam-review-monitor",
  "version": "1.0.0",
  "description": "Monitor Steam reviews across games",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "node --test test/steam.test.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "open": "^8.4.2"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: `node_modules/` created, `package-lock.json` generated.

- [ ] **Step 3: Create `config.json`**

```json
{
  "games": [
    { "appId": "2435310", "name": "Stunt Paradise" }
  ]
}
```

- [ ] **Step 4: Create stub files**

Create `services/steam.js`:
```js
// stub — implemented in Task 2
```

Create `routes/reviews.js`:
```js
// stub — implemented in Task 3
const express = require('express');
const router = express.Router();
module.exports = router;
```

Create `public/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Steam Review Monitor</title></head>
<body><p>Loading…</p></body>
</html>
```

Create `public/app.js` (empty file).

Create `public/style.css` (empty file).

- [ ] **Step 5: Create `server.js`**

```js
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
```

- [ ] **Step 6: Verify server starts and opens the browser**

Run: `npm start`

Expected: console prints `Steam Review Monitor running at http://localhost:3000`, browser opens showing "Loading…".

Stop the server with `Ctrl+C`.

- [ ] **Step 7: Commit**

```bash
git init
git add package.json package-lock.json config.json server.js routes/reviews.js services/steam.js public/index.html public/app.js public/style.css
git commit -m "feat: scaffold project — Express server, static serving, config"
```

---

### Task 2: Steam service + unit tests

**Files:**
- Create: `services/steam.js`
- Create: `test/steam.test.js`

**Interfaces:**
- Produces: `fetchReviews(appId, fetcher?)` — async function, returns `{ appId, totalFetched, unansweredCount, reviews[] }`
- Each review: `{ id, author, text, thumbsUp, createdAt, developerResponse, needsResponse }`
- `needsResponse` is `true` when `developer_response` is falsy (absent or empty string)

- [ ] **Step 1: Create `test/steam.test.js` with failing tests**

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fetchReviews } = require('../services/steam');

function makeFetcher(reviews = [], success = 1) {
  return async () => ({
    ok: true,
    json: async () => ({ success, reviews }),
  });
}

function makeReview(overrides = {}) {
  return {
    recommendationid: '111',
    author: { steamid: '76561198000000000' },
    review: 'Great game',
    timestamp_created: 1720000000,
    voted_up: true,
    developer_response: '',
    ...overrides,
  };
}

test('marks review with empty developer_response as needsResponse', async () => {
  const fetcher = makeFetcher([makeReview({ developer_response: '' })]);
  const result = await fetchReviews('2435310', fetcher);
  assert.equal(result.reviews[0].needsResponse, true);
});

test('marks review with non-empty developer_response as not needsResponse', async () => {
  const fetcher = makeFetcher([makeReview({ developer_response: 'Thanks!' })]);
  const result = await fetchReviews('2435310', fetcher);
  assert.equal(result.reviews[0].needsResponse, false);
  assert.equal(result.reviews[0].developerResponse, 'Thanks!');
});

test('counts unansweredCount correctly', async () => {
  const fetcher = makeFetcher([
    makeReview({ recommendationid: '1', developer_response: '' }),
    makeReview({ recommendationid: '2', developer_response: 'Thanks!' }),
    makeReview({ recommendationid: '3', developer_response: '' }),
  ]);
  const result = await fetchReviews('2435310', fetcher);
  assert.equal(result.unansweredCount, 2);
  assert.equal(result.totalFetched, 3);
});

test('maps thumbsUp from voted_up', async () => {
  const fetcher = makeFetcher([
    makeReview({ voted_up: true }),
    makeReview({ recommendationid: '222', voted_up: false }),
  ]);
  const result = await fetchReviews('2435310', fetcher);
  assert.equal(result.reviews[0].thumbsUp, true);
  assert.equal(result.reviews[1].thumbsUp, false);
});

test('throws when Steam API returns ok=false', async () => {
  const fetcher = async () => ({ ok: false, status: 429 });
  await assert.rejects(
    () => fetchReviews('2435310', fetcher),
    /Steam API returned 429/,
  );
});

test('throws when success !== 1', async () => {
  const fetcher = makeFetcher([], 0);
  await assert.rejects(
    () => fetchReviews('2435310', fetcher),
    /success=0/,
  );
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
mkdir -p test
node --test test/steam.test.js
```

Expected: all tests fail with `TypeError: fetchReviews is not a function` (stub not implemented yet).

- [ ] **Step 3: Implement `services/steam.js`**

```js
const STEAM_REVIEW_URL = 'https://store.steampowered.com/appreviews';

async function fetchReviews(appId, fetcher = globalThis.fetch) {
  const url =
    `${STEAM_REVIEW_URL}/${appId}` +
    '?json=1&num_per_page=20&filter=recent&language=all&purchase_type=all';

  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`Steam API returned ${response.status}`);
  }

  const data = await response.json();
  if (data.success !== 1) {
    throw new Error('Steam API returned success=0');
  }

  const reviews = (data.reviews || []).map(r => ({
    id: r.recommendationid,
    author: r.author.steamid,
    text: r.review,
    thumbsUp: r.voted_up,
    createdAt: r.timestamp_created,
    developerResponse: r.developer_response || '',
    needsResponse: !r.developer_response,
  }));

  return {
    appId,
    totalFetched: reviews.length,
    unansweredCount: reviews.filter(r => r.needsResponse).length,
    reviews,
  };
}

module.exports = { fetchReviews };
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
node --test test/steam.test.js
```

Expected: all 6 tests pass (`✔` prefix for each).

- [ ] **Step 5: Commit**

```bash
git add services/steam.js test/steam.test.js
git commit -m "feat: Steam service — fetch and normalise reviews, unit tests"
```

---

### Task 3: API routes

**Files:**
- Modify: `routes/reviews.js`

**Interfaces:**
- Consumes: `fetchReviews(appId)` from `services/steam.js`
- Consumes: `config.json` shape `{ games: [{ appId, name }] }`
- Produces: `GET /api/games` → `[{ appId, name }]`
- Produces: `GET /api/reviews?appId=xxx` → `{ appId, totalFetched, unansweredCount, reviews[] }`
- Error: `400` when `appId` missing; `502` when Steam API fails

- [ ] **Step 1: Implement `routes/reviews.js`**

```js
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
```

- [ ] **Step 2: Start the server and verify `/api/games`**

Run: `npm start` (in one terminal)

Then in another terminal:
```bash
curl http://localhost:3000/api/games
```

Expected:
```json
[{"appId":"2435310","name":"Stunt Paradise"}]
```

- [ ] **Step 3: Verify `/api/reviews` fetches real Steam data**

```bash
curl "http://localhost:3000/api/reviews?appId=2435310"
```

Expected: JSON with `appId`, `totalFetched`, `unansweredCount`, and a `reviews` array with objects containing `needsResponse` boolean.

- [ ] **Step 4: Verify error cases**

```bash
# Missing appId — expect 400
curl -i "http://localhost:3000/api/reviews"

# Invalid appId — expect 502
curl -i "http://localhost:3000/api/reviews?appId=0"
```

Stop the server. Commit.

- [ ] **Step 5: Commit**

```bash
git add routes/reviews.js
git commit -m "feat: API routes — GET /api/games and GET /api/reviews"
```

---

### Task 4: HTML shell + CSS

**Files:**
- Modify: `public/index.html`
- Modify: `public/style.css`

**Interfaces:**
- Produces: page structure with `#games-container` (cards mount here) and `#refresh-all` button
- Produces: CSS classes `card`, `card-header`, `badge`, `review`, `review.unanswered`, `spinner`, `error`, `hidden`

- [ ] **Step 1: Write `public/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Steam Review Monitor</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>Steam Review Monitor</h1>
    <button id="refresh-all">&#8635; Refresh All</button>
  </header>
  <main id="games-container"></main>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `public/style.css`**

```css
:root {
  --bg: #1a1a2e;
  --surface: #16213e;
  --surface2: #0f3460;
  --text: #e0e0e0;
  --text-muted: #9a9ab0;
  --accent: #e94560;
  --unanswered-bg: rgba(233, 69, 96, 0.08);
  --unanswered-border: #e94560;
  --answered-border: #2a9d8f;
  --radius: 8px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  min-height: 100vh;
}

/* ── Header ─────────────────────────────────────── */
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 2rem;
  background: var(--surface);
  border-bottom: 1px solid var(--surface2);
  position: sticky;
  top: 0;
  z-index: 10;
}

h1 { font-size: 1.4rem; font-weight: 700; }

/* ── Grid ────────────────────────────────────────── */
#games-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(480px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
  align-items: start;
}

/* ── Card ────────────────────────────────────────── */
.card {
  background: var(--surface);
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--surface2);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--surface2);
}

.card-header h2 { font-size: 1.05rem; font-weight: 600; }

/* ── Badge ───────────────────────────────────────── */
.badge {
  background: var(--accent);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  white-space: nowrap;
}

/* ── Reviews ─────────────────────────────────────── */
.review {
  padding: 0.8rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  border-left: 3px solid var(--answered-border);
}

.review.unanswered {
  border-left-color: var(--unanswered-border);
  background: var(--unanswered-bg);
}

.review-header {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.review-icon { flex-shrink: 0; font-size: 0.85rem; line-height: 1.5; }

.review-text {
  flex: 1;
  font-size: 0.875rem;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.review-meta {
  flex-shrink: 0;
  font-size: 0.72rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.no-response {
  font-size: 0.72rem;
  color: var(--accent);
  margin-top: 0.2rem;
  margin-left: 1.35rem;
}

.dev-response {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-style: italic;
  margin-top: 0.2rem;
  margin-left: 1.35rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Card footer ─────────────────────────────────── */
.card-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1.25rem;
  border-top: 1px solid var(--surface2);
}

/* ── Buttons ─────────────────────────────────────── */
button {
  background: var(--surface2);
  color: var(--text);
  border: none;
  padding: 0.4rem 0.9rem;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.82rem;
  transition: opacity 0.15s;
}

button:hover { opacity: 0.75; }

/* ── Utilities ───────────────────────────────────── */
.hidden { display: none !important; }

/* ── Spinner ─────────────────────────────────────── */
.spinner {
  width: 26px;
  height: 26px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
  margin: 1.25rem auto;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Error ───────────────────────────────────────── */
.error {
  color: var(--accent);
  font-size: 0.85rem;
  padding: 1rem 1.25rem;
}
```

- [ ] **Step 3: Start the server and verify the page structure in browser**

Run: `npm start`

Open DevTools → Elements. Confirm:
- `<header>` with `<h1>` and `#refresh-all` button
- `<main id="games-container">` (empty — JS not wired yet)
- `style.css` loaded (dark background visible)

Stop the server.

- [ ] **Step 4: Commit**

```bash
git add public/index.html public/style.css
git commit -m "feat: HTML shell and CSS design system"
```

---

### Task 5: Frontend JavaScript

**Files:**
- Modify: `public/app.js`

**Interfaces:**
- Consumes: `GET /api/games` → `[{ appId, name }]`
- Consumes: `GET /api/reviews?appId=xxx` → `{ appId, totalFetched, unansweredCount, reviews[] }`
- Review shape: `{ id, author, text, thumbsUp, createdAt, developerResponse, needsResponse }`
- Produces: full interactive page — cards per game, unanswered count badge, highlight, show-more, per-card refresh, refresh-all

- [ ] **Step 1: Write `public/app.js`**

```js
const PAGE_SIZE = 5;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function timeAgo(timestamp) {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function renderReview(review) {
  const cls = review.needsResponse ? 'review unanswered' : 'review';
  const icon = review.needsResponse ? '⚠' : '✓';
  const thumb = review.thumbsUp ? '👍' : '👎';
  const responseHtml = review.needsResponse
    ? '<p class="no-response">No developer response</p>'
    : `<p class="dev-response">Dev: &ldquo;${escapeHtml(review.developerResponse)}&rdquo;</p>`;

  return `
    <div class="${cls}">
      <div class="review-header">
        <span class="review-icon">${icon}</span>
        <span class="review-text">${escapeHtml(review.text)}</span>
        <span class="review-meta">${thumb}&nbsp;${timeAgo(review.createdAt)}</span>
      </div>
      ${responseHtml}
    </div>
  `;
}

function createCard(game) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.appId = game.appId;
  card.innerHTML = `
    <div class="card-header">
      <h2>${escapeHtml(game.name)}</h2>
      <span class="badge hidden" data-badge></span>
    </div>
    <div class="reviews-list" data-reviews></div>
    <div class="card-footer">
      <button class="btn-show-more hidden" data-show-more>Show more</button>
      <button class="btn-refresh" data-refresh>&#8635; Refresh</button>
    </div>
  `;
  return card;
}

async function fillCard(card) {
  const appId = card.dataset.appId;
  const reviewsList = card.querySelector('[data-reviews]');
  const badge = card.querySelector('[data-badge]');
  const showMoreBtn = card.querySelector('[data-show-more]');

  // Reset state
  reviewsList.innerHTML = '<div class="spinner"></div>';
  badge.classList.add('hidden');
  showMoreBtn.classList.add('hidden');
  delete card._reviews;
  delete card._shown;

  try {
    const res = await fetch(`/api/reviews?appId=${encodeURIComponent(appId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();

    card._reviews = data.reviews;
    card._shown = Math.min(PAGE_SIZE, data.reviews.length);

    if (data.unansweredCount > 0) {
      badge.textContent = `${data.unansweredCount} need response`;
      badge.classList.remove('hidden');
    }

    reviewsList.innerHTML = data.reviews
      .slice(0, card._shown)
      .map(renderReview)
      .join('');

    if (data.reviews.length > PAGE_SIZE) {
      showMoreBtn.classList.remove('hidden');
    }
  } catch (err) {
    reviewsList.innerHTML = `<p class="error">Could not load reviews: ${escapeHtml(err.message)}</p>`;
  }
}

function showMore(card) {
  const reviewsList = card.querySelector('[data-reviews]');
  const showMoreBtn = card.querySelector('[data-show-more]');
  card._shown = Math.min(card._shown + PAGE_SIZE, card._reviews.length);
  reviewsList.innerHTML = card._reviews
    .slice(0, card._shown)
    .map(renderReview)
    .join('');
  if (card._shown >= card._reviews.length) {
    showMoreBtn.classList.add('hidden');
  }
}

async function init() {
  const container = document.getElementById('games-container');
  const refreshAllBtn = document.getElementById('refresh-all');

  const res = await fetch('/api/games');
  const games = await res.json();

  const cards = games.map(game => {
    const card = createCard(game);
    container.appendChild(card);

    card.querySelector('[data-refresh]').addEventListener('click', () => fillCard(card));
    card.querySelector('[data-show-more]').addEventListener('click', () => showMore(card));

    return card;
  });

  refreshAllBtn.addEventListener('click', () => cards.forEach(fillCard));

  // Initial load
  cards.forEach(fillCard);
}

init();
```

- [ ] **Step 2: Start the server and verify the golden path**

Run: `npm start`

Check in the browser:
1. Page loads, spinner appears inside the Stunt Paradise card
2. Reviews appear — most recent 5 shown
3. Unanswered reviews have a red left border and subtle red background
4. The badge "X need response" appears at the top right of the card (if any unanswered)
5. "Show more" button appears if there are more than 5 reviews; clicking it shows 5 more
6. "↻ Refresh" button on the card re-fetches and re-renders that card
7. "↻ Refresh All" at the top re-fetches all cards

- [ ] **Step 3: Verify error state**

Temporarily change `config.json` to add a second game with an invalid appId:

```json
{
  "games": [
    { "appId": "2435310", "name": "Stunt Paradise" },
    { "appId": "0", "name": "Bad Game" }
  ]
}
```

Restart the server. Expected: Stunt Paradise card loads normally; "Bad Game" card shows "Could not load reviews" error message.

Revert `config.json` to only Stunt Paradise.

- [ ] **Step 4: Commit**

```bash
git add public/app.js
git commit -m "feat: frontend JS — render cards, highlight unanswered reviews, show-more, refresh"
```

---

## Self-Review Checklist

| Spec requirement | Covered in |
|---|---|
| Express server, port 3000 | Task 1 |
| `config.json` for game list | Task 1 |
| Auto-open browser on start | Task 1 (`open` in server.js) |
| Steam API fetch + response normalisation | Task 2 |
| `needsResponse` flag logic | Task 2 |
| `GET /api/games` endpoint | Task 3 |
| `GET /api/reviews?appId=` endpoint | Task 3 |
| 400 on missing appId, 502 on Steam failure | Task 3 |
| Single-page HTML shell | Task 4 |
| Dark theme, card layout, responsive grid | Task 4 |
| Red highlight for unanswered reviews | Task 4 + 5 |
| Orange/red badge with count | Task 4 + 5 |
| Show 5 reviews by default | Task 5 |
| "Show more" reveals next 5 (client-side) | Task 5 |
| Per-card refresh | Task 5 |
| Refresh All button | Task 5 |
| Spinner during load | Task 5 |
| Error state per card (others unaffected) | Task 5 |
| Invalid appId in config → warning, skip | NOT COVERED → see below |

**Gap found:** The spec says "Invalid `appId` in config: log a warning on server start, skip that game." This is handled gracefully at the API level (502 → error card), but the server does not validate `config.json` on startup. Adding a startup validation step to Task 1 would add complexity for minimal gain on a local tool — the error card behaviour already communicates the problem clearly. If this strictness is needed, add it to `server.js` before `app.listen`:

```js
const config = require('./config.json');
for (const game of config.games) {
  if (!game.appId || !game.name) {
    console.warn(`[config] Skipping invalid game entry: ${JSON.stringify(game)}`);
  }
}
```

This is a one-liner enhancement — not a separate task. Include it in Task 1 Step 5 if desired.
