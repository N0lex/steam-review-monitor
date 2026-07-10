# Steam Review Monitor — Claude Instructions

## Project

Local Node.js/Express app that monitors Steam game reviews and highlights ones needing a developer response. Runs at `localhost:3000`.

## Stack constraints

- **Node.js 18+** — use native `fetch`, `node --test` for tests
- **CommonJS only** — `require` / `module.exports` everywhere, no ESM
- **No build step** — vanilla HTML/CSS/JS in `public/`
- **`open` pinned to `^8.4.2`** — v9+ is ESM-only and breaks the CJS server
- **`pkg` pinned to `^5.8.1`** — Windows exe bundler, targets `node18-win-x64`

## Key files

| File | Role |
|---|---|
| `config.json` | Game list — only file the user edits |
| `server.js` | Express entry, static serving, auto-open browser |
| `routes/reviews.js` | `/api/games` and `/api/reviews?appId=` |
| `services/steam.js` | Steam API fetch + normalisation |
| `public/app.js` | All frontend logic |
| `public/style.css` | CSS variables-based dark theme |
| `test/steam.test.js` | 7 unit tests for steam.js |

## Runtime path handling

When running as a `pkg` executable, `__dirname` points to the virtual bundle. Use:

```js
const ROOT = process.pkg ? path.dirname(process.execPath) : __dirname;
```

`routes/reviews.js` reads `config.json` with `fs.readFileSync` (not `require`) so it resolves correctly from the exe directory at runtime and stays editable by the user.

## Review business logic

- Fetches 20 most recent reviews per game from Steam public API
- `needsResponse: true` when BOTH: no `developer_response` AND `timestamp_created` within last 30 days
- Reviews with `needsResponse: true` are sorted to the top of each card in the frontend
- Badge at card top-right shows count; hidden when count is 0

## Running & testing

```bash
npm start          # start server (auto-opens browser, kills port 3000 first if needed)
npm test           # run 7 unit tests
npm run build:win  # build dist/steam-review-monitor.exe + zip for Windows
```

## How we work

- Brainstorm before building new features (`superpowers:brainstorming`)
- Write plans before implementation (`superpowers:writing-plans`)
- Implement via subagent-driven development (`superpowers:subagent-driven-development`)
- TDD: write failing tests first, then implement
- Tests use `node:test` — no Jest/Mocha
- Keep things minimal — no abstractions beyond what the task needs
- No ESM, no TypeScript, no build step for the frontend
