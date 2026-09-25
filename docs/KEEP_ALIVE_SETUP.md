# Permanent 24/7 Zero-Sleep Setup for Render Containers

## Why Render Sleeps
Render's free-tier containers automatically sleep after **15 minutes** of inactivity. When asleep, a cold container takes **30–45 seconds** to boot up.

GitHub Actions scheduled workflows (`.github/workflows/keep-alive.yml`) were previously dropping from every 12 minutes to **once every 3 to 6 hours** because GitHub heavily throttles scheduled actions on free repositories.

---

## The Permanent Fix: 100% Free 5-Minute 24/7 Heartbeat

To ensure your Render containers **never sleep even when your laptop is turned off**, use a free, dedicated uptime monitor:

### Option A: UptimeRobot (Recommended — 2 Minutes, Free Forever)
1. Go to [https://uptimerobot.com/](https://uptimerobot.com/) and create a free account (takes 30 seconds).
2. Click **+ Add New Monitor**:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `Nox Council Service`
   - **URL (or IP)**: `https://council-cy4r.onrender.com/health`
   - **Monitoring Interval**: `5 minutes`
3. Click **Create Monitor**.
4. Add a second monitor:
   - **Friendly Name**: `Nox API Service`
   - **URL (or IP)**: `https://nox-a1nr.onrender.com/api/v1/council/status`
   - **Monitoring Interval**: `5 minutes`

### Option B: Cron-Job.org (Free Forever)
1. Go to [https://cron-job.org/](https://cron-job.org/) and register.
2. Click **Create cronjob**:
   - **Title**: `Ping Council`
   - **URL**: `https://council-cy4r.onrender.com/health`
   - **Schedule**: `Every 5 minutes`
3. Save and activate.

---

## What is Already Handled in Code:
1. **In-Session Keep-Alive (Zero Sleep While Nox is Open)**:
   - `CouncilView.tsx` now runs a silent background heartbeat every **3 minutes** while you have Nox open in your browser, pinging both Council and Nox API.
2. **Immediate Wake Handshake**:
   - Clicking **Wake** now monitors Council's live `/health` and proxy wake simultaneously, detecting container boot in real time (~20–25s) without aborting or timing out.
3. **Universal Active Key Recognition**:
   - Your active Gemini key automatically connects to Sofi, Riven, and Lucifer across all accounts without requiring separate keys.
