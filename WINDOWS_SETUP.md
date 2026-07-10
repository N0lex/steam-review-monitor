# Steam Review Monitor — Windows Setup Guide

No exe needed. Follow these steps once and the app will work forever.

---

## Step 1 — Download the app files

Get the project folder from whoever sent you this guide.  
Unzip it somewhere easy to find, like your **Desktop** or `C:\steam-review-monitor`.

---

## Step 2 — Install Node.js

1. Go to **https://nodejs.org**
2. Click the big green **"Download Node.js (LTS)"** button
3. Run the downloaded `.msi` installer
4. Click **Next → Next → Next → Install** (all defaults are fine)
5. Click **Finish**

---

## Step 3 — Open a terminal in the app folder

1. Open the app folder (the one with `server.js` inside)
2. Click into the **address bar** at the top of File Explorer (where it shows the folder path)
3. Type `cmd` and press **Enter**

A black window (Command Prompt) will open, already inside the right folder.

---

## Step 4 — Install dependencies (one time only)

In the black window, type this and press **Enter**:

```
npm install
```

Wait for it to finish. You'll see a lot of text scroll by — that's normal.

---

## Step 5 — Start the app

Type this and press **Enter**:

```
npm start
```

Your browser will open automatically at `http://localhost:3000` and show your Steam reviews.

**Every time you want to use the app:** open the terminal in the folder (Step 3) and run `npm start`.

---

## How to add or remove games

1. Open the file `config.json` in Notepad (right-click → Open with → Notepad)
2. Edit the list — each game needs an `appId` and a `name`:

```json
{
  "games": [
    { "appId": "831770",  "name": "Zombie Derby" },
    { "appId": "762590",  "name": "Zombie Derby 2" }
  ]
}
```

3. Save the file
4. Stop the app (press **Ctrl+C** in the black window) and run `npm start` again

To find a game's App ID: go to its Steam store page — the number in the URL is the ID.  
Example: `store.steampowered.com/app/**831770**/Zombie_Derby/`

---

## Something went wrong?

| Problem | Fix |
|---|---|
| `'npm' is not recognized` | Restart the Command Prompt after installing Node.js |
| Browser doesn't open | Go to `http://localhost:3000` manually |
| Port 3000 already in use | Close other apps or restart your PC |
| Reviews not loading | Check your internet connection |
