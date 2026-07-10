# Steam Review Monitor

Local web app that shows Steam game reviews across multiple games on one page, highlighting reviews that need a developer response.

## How to use

```bash
npm install
npm start
```

Opens `http://localhost:3000` automatically. Each game gets a card showing recent reviews. Reviews from the last 30 days with no developer response are highlighted in red and sorted to the top.

## Add or remove games

Edit `config.json`:

```json
{
  "games": [
    { "appId": "831770",  "name": "Zombie Derby" },
    { "appId": "762590",  "name": "Zombie Derby 2" },
    { "appId": "1271690", "name": "Zombie Derby: Pixel Survival" },
    { "appId": "2435310", "name": "Stunt Paradise" }
  ]
}
```

Restart the server after changes.

## Commands

| Command | What it does |
|---|---|
| `npm start` | Start the server, open browser |
| `npm test` | Run unit tests (7 tests) |
| `npm run build:win` | Build Windows `.exe` into `dist/` |

## Windows distribution

```bash
npm run build:win
```

Creates `dist/steam-review-monitor-windows.zip`. Send it to a friend — they unzip, edit `config.json`, double-click the exe. No Node.js needed on their end.

## Stack

- Node.js 18+ / Express 4
- Vanilla HTML + CSS + JS (no build step)
- Steam public reviews API (`store.steampowered.com/appreviews/{appid}`)
- `open` v8 (auto-opens browser on start)
- `pkg` v5 (Windows exe bundler)

## Project structure

```
config.json          ← game list (edit to add/remove games)
server.js            ← Express entry point, port 3000
routes/reviews.js    ← GET /api/games, GET /api/reviews?appId=
services/steam.js    ← Steam API client + review normalisation
public/
  index.html         ← page shell
  style.css          ← dark theme, card layout
  app.js             ← frontend logic
test/
  steam.test.js      ← unit tests (node --test)
dist/                ← built exe + zip (gitignored)
```

## Review logic

- Fetches 20 most recent reviews per game
- `needsResponse: true` when: no developer response AND review is ≤ 30 days old
- Reviews needing response are sorted to the top of each card
- Badge shows count of reviews needing response (0 = badge hidden)
