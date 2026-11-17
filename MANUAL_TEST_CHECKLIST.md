# Manual test checklist

A click-through of the core flows after each refactor batch. Takes under 5 minutes.

**Setup**
- Start the server: `python3 -m http.server 8082 --directory "/Users/reidrussell/Documents/Learning Tools/lift-tracker"`
- Open http://localhost:8082 in a narrow (phone-width) window with DevTools open on the Console tab.
- **Before the first run:** Profile → Data → Export, and keep the file. Steps 8–10 write to your real history; step 10 deletes the test workout again.

Tick each box only if it works **and** the console shows no new red errors.

| # | Flow | What to do | Expected |
|---|------|-----------|----------|
| 1 | App opens | Reload the page | Welcome screen: plate logo, turning dots, "Welcome in, Reid". "Let's get moving" opens Home. |
| 2 | **Existing workout history still loads** | Open Progress | Session and set totals match your last export. Calendar shows dots on past workout days (go back a month or two). Muscle charts draw lines, not empty boxes. |
| 3 | Home | Open Home | Today's date and weekday. "This week" grid has badges on days you trained. Personal best and Next session cards show real exercises. The Start button names the next day (e.g. "Start Lower A"). |
| 4 | Start a workout | Home → Start → pick the suggested day | Workout screen opens with the right day's exercises. First exercise open, last time's sets and a suggestion shown. |
| 5 | Log a set | Enter weight and reps for set 1 | The tick fills, a "Set 1 done · W × R" pill shows, the progress bar moves. The rest timer pill appears if it's turned on in Profile. |
| 6 | Resume after leaving | Tap ← (back), then open Progress | A banner with the day name and "1/N sets logged" shows. Tapping it returns to the workout with set 1 still logged. |
| 7 | Resume after closing | Reload the page, tap "Let's get moving" if shown | Workout screen comes back with the logged set. |
| 8 | Edit the workout | Add a set, remove a set, Add exercise → pick any → it appears | All three changes show at once. |
| 9 | Finish | Finish workout → Save Session | "Session saved" toast. Progress opens, session total +1, today has a calendar dot. |
| 10 | Edit and delete history | Tap today on the calendar → Edit → change a rep → Save. Reopen: change kept. Then Delete → confirm | Edit persists. After deleting, the total is back to the number in step 2 and the dot is gone. |
| 11 | Chart range | On any muscle chart tap 20, then All. Reload, back to Progress | Line redraws and the subtitle updates. The chosen range is remembered after reload. |
| 12 | My Plans | Open My Plans, tap a day's chevron, then close the builder without saving | Active program's days listed, next day marked. Builder opens on that day. Nothing changed after closing. |
| 13 | Profile settings persist | Profile: turn the rest timer on/off and change duration. Reload | Settings are as you left them. Name and photo/initial show in the top-right chip on every tab. |
| 14 | Cover background | Profile → background button → pick a photo → Use background. Reload | Cover photo shows with its credit line. Set it back to what it was afterwards. |
| 15 | Backup round trip | Profile → Data → Export, then Import the file you just exported → confirm | A JSON file downloads. The import confirm shows the same session count. After import, Progress totals are unchanged. |

**If anything fails:** note the step number and the console error, then restore your data from the backup taken at setup (Profile → Data → Import).
