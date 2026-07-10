# Steam Review Monitor — Design Spec

**Date:** 2026-07-10  
**Status:** Approved

## Overview

A local Node.js web app that displays Steam game reviews across multiple games on a single page, highlighting reviews that have not yet received a developer response. Run on demand, viewed in the browser at `localhost:3000`.

## Goals

- See all monitored games at a glance, each in its own card
- Immediately know how many reviews need a developer response per game
- View the most recent reviews with unanswered ones visually distinct
- Add/remove games by editing a config file

## Stack

- **Runtime:** Node.js
- **Server:** Express
- **Frontend:** Vanilla HTML/CSS/JS (no build step)
- **Data source:** Steam public reviews API (`store.steampowered.com/appreviews/{appid}`)

## File Structure

```
steam-review-explorer/
├── config.json              ← game list (appId + display name)
├── server.js                ← Express app, serves static + API routes
├── services/
│   └── steam.js             ← fetches and processes Steam API responses
├── routes/
│   └── reviews.js           ← GET /api/games, GET /api/reviews?appId=xxx
└── public/
    ├── index.html           ← single-page app shell
    ├── app.js               ← fetches API, renders cards, handles refresh
    └── style.css            ← layout, card styles, highlight styles
```

## Config Format

```json
{
  "games": [
    { "appId": "2435310", "name": "Stunt Paradise" }
  ]
}
```

Add more objects to the array to monitor additional games.

## API Endpoints

### `GET /api/games`
Returns the list of games from `config.json`.

```json
[{ "appId": "2435310", "name": "Stunt Paradise" }]
```

### `GET /api/reviews?appId=2435310`
Fetches up to 20 most recent reviews from Steam for the given app, returns processed results.

```json
{
  "appId": "2435310",
  "totalFetched": 20,
  "unansweredCount": 3,
  "reviews": [
    {
      "id": "...",
      "author": "SteamUser123",
      "text": "Game crashes on start",
      "thumbsUp": false,
      "createdAt": 1720000000,
      "developerResponse": "",
      "needsResponse": true
    }
  ]
}
```

`needsResponse` is `true` when `developer_response` is absent or empty.

## UI Design

One card per game, stacked vertically (or in a responsive grid if multiple games).

```
┌─────────────────────────────────────────────────────┐
│  Stunt Paradise                    [3 need response] │
│  ─────────────────────────────────────────────────  │
│  ⚠ "Game crashes on start"          👎  2 days ago  │  ← red highlight
│    No developer response                             │
│  ─────────────────────────────────────────────────  │
│  ✓ "Best game ever, love it!"       👍  3 days ago  │  ← normal
│    Dev: "Thanks for the feedback!"                   │
│  ─────────────────────────────────────────────────  │
│                          [Show more]  [↻ Refresh]   │
└─────────────────────────────────────────────────────┘
```

- **Unanswered reviews:** red left-border + subtle red background tint
- **Badge:** orange/red pill at top-right of card showing "X need response"
- **Default:** show 5 most recent reviews per card
- **"Show more":** reveals next 5 (client-side, from already-fetched 20)
- **"Refresh" per card:** re-fetches that game's reviews from the API
- **"Refresh All" button:** at the top of the page, refreshes all cards
- **Loading state:** spinner shown inside each card while fetching
- **Error state:** friendly message if Steam API call fails (e.g. "Could not load reviews")

## Startup Behaviour

Running `node server.js` starts the server on port `3000` and automatically opens `http://localhost:3000` in the default browser using the `open` npm package.

## Error Handling

- Steam API failure for one game: show error inside that game's card, other cards unaffected
- Invalid `appId` in config: log a warning on server start, skip that game
- Steam rate limiting: surface the HTTP error code in the card's error state

## Dependencies

| Package | Purpose |
|---------|---------|
| `express` | HTTP server |
| `open` | Auto-open browser on startup |

Native `fetch` (Node 18+) is used for Steam API requests — no extra package needed.

## Out of Scope

- Authentication / Steam login
- Posting developer responses from the UI
- Persistent storage / database
- Deployment / hosting
- Auto-refresh / polling
