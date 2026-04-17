# Nilomi v3 — Deploy & Update guide

## Files in this folder
- index.html   — the full app
- manifest.json
- sw.js        — service worker (offline + notifications)
- icon-192.svg

---

## First-time deploy (Netlify — free)
1. Go to https://netlify.com and sign up with Google
2. Drag this entire nilomi folder onto the deploy area on the dashboard
3. You get a URL like https://nilomi-abc123.netlify.app — copy it
4. Open that URL in Safari on your iPhone
5. Tap Share button → Add to Home Screen → Add
6. Tap Allow for notifications when prompted
7. Go to Settings tab inside the app → enter your course start dates

---

## How to update the app without a new URL
When Claude gives you a new version:

1. Go to https://app.netlify.com and open your site dashboard
2. Click Deploys in the top nav
3. Drag the updated nilomi folder onto the drag-and-drop zone at the bottom of the page
4. Netlify deploys automatically — same URL, no reinstall needed on iPhone
5. On your iPhone: open the app from home screen and pull to refresh

Your history, streaks, notes, and settings are stored on your phone
and are never affected by redeployments.

---

## What is new in v3

Monthly calendar — navigate back through unlimited history, tap any date to see a full breakdown of what was done and missed that day.

Compliance bars — per-session completion rates over the last 30 days (Morning, Afternoon, Bedtime, As needed).

Best streak ever — tracked alongside your current streak, shown on the home screen stats row.

Missed dose log with filters — view missed items for this week, this month, or all time. Repeat misses are flagged with a count so you can spot patterns.

CSV export — 90 days of data formatted for Excel or Google Sheets, useful to share with a doctor.

Text report — a plain-language summary of streaks, compliance, and all your notes.

Everything from v2 is still here: custom reminder times, snooze, course countdowns, refill alerts, Brilante/Juveskin alternation calendar, dark/light mode, and long-press notes.
