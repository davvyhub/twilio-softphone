# Twilio Softphone

A production-ready, browser-based softphone for making and receiving calls to/from US and Canada numbers using the Twilio Voice JavaScript SDK. Runs entirely over WebRTC — no mobile forwarding, no international charges from the Netherlands.

---

## Prerequisites

- **Node.js v18+** — [nodejs.org](https://nodejs.org)
- **Twilio account** — [twilio.com](https://www.twilio.com)
- A **US or Canada phone number** purchased in Twilio
- A **public URL** for Twilio webhooks (ngrok for local dev, or a hosted server)

---

## Twilio Setup (do this before running the app)

### 1. Create a Twilio API Key

1. Go to [console.twilio.com](https://console.twilio.com)
2. Navigate to **Account → API Keys & Tokens**
3. Click **Create API Key**
4. Type: **Standard**
5. Give it a name (e.g. "Softphone")
6. Copy the **SID** (starts with `SK`) → this is `TWILIO_API_KEY`
7. Copy the **Secret** (shown once) → this is `TWILIO_API_SECRET`

### 2. Create a TwiML Application

1. Go to **Voice → TwiML Apps**
2. Click **Create new TwiML App**
3. Name it "Softphone"
4. Set **Voice Request URL** to: `https://your-domain.com/webhook/voice`
5. Set **Voice Status Callback URL** to: `https://your-domain.com/webhook/status`
6. Click Save
7. Copy the **Application SID** (starts with `AP`) → this is `TWILIO_TWIML_APP_SID`

### 3. Buy a US Phone Number

1. Go to **Phone Numbers → Manage → Buy a number**
2. Select a US number (country: United States)
3. Ensure it has **Voice** capability
4. Click Buy
5. Copy the number in E.164 format (e.g. `+12125551234`) → this is `TWILIO_PHONE_NUMBER`

### 4. Configure the Phone Number's Webhook

1. Go to **Phone Numbers → Manage → Active Numbers**
2. Click your new number
3. Under **Voice & Fax → A call comes in**, select **Webhook**
4. Set URL to: `https://your-domain.com/webhook/voice`
5. HTTP method: **POST**
6. Set **Call status changes** URL to: `https://your-domain.com/webhook/status`
7. Set **Fallback URL** to: `https://your-domain.com/webhook/fallback`
8. Click Save

---

## Installation & Configuration

```bash
# 1. Clone or download the project
cd twilio-softphone

# 2. Install dependencies
npm install

# 3. Copy the example environment file
cp .env.example .env
```

Open `.env` and fill in all values:

```env
PORT=3000
NODE_ENV=production
SESSION_SECRET=<generate a random 64-char string>

APP_PASSWORD=<your chosen login password>

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
TWILIO_CLIENT_IDENTITY=agent

PUBLIC_URL=https://your-domain.com
```

> **Tip:** Generate a session secret with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

---

## Running the App

```bash
node server/index.js
```

On startup, the server will:
1. Run database migrations (creates `database/softphone.db` automatically)
2. Start Express on the configured port
3. Log the public URL and Twilio phone number

Open your browser: **http://localhost:3000**

---

## Local Development with ngrok

To receive inbound calls locally, you need a public URL. Use [ngrok](https://ngrok.com):

```bash
# Install ngrok, then:
ngrok http 3000
```

Copy the `https://xxxx.ngrok.io` URL and:
1. Set `PUBLIC_URL=https://xxxx.ngrok.io` in your `.env`
2. Update the TwiML App Voice URL in Twilio console
3. Update your phone number's webhook URL in Twilio console
4. Restart the server

> Note: Free ngrok URLs change every restart. For persistent URLs, use ngrok's paid plan or deploy to a server.

---

## Production Deployment

### Railway / Render / Fly.io

1. Push the code to a Git repository
2. Create a new project on your chosen platform
3. Set all environment variables from `.env`
4. Set `NODE_ENV=production`
5. Set `PUBLIC_URL=https://your-app-name.railway.app` (or equivalent)
6. Deploy — the server starts automatically with `node server/index.js`
7. Update Twilio webhook URLs to the new domain

### Important for production

- The SQLite database file lives at `database/softphone.db`. Make sure this path is on **persistent storage** (Railway and Render both support volume mounts).
- Set `SESSION_SECRET` to a long, random string — never the default.
- Set `APP_PASSWORD` to a strong password.

---

## Using the App

1. Open **http://localhost:3000** — you'll be redirected to the login page
2. Enter your `APP_PASSWORD`
3. The softphone initializes and connects to Twilio automatically

### Making a call
- Click the **Dialpad** tab
- Type a US/Canada number (10 digits or E.164 format like `+12125551234`)
- Click the green **Call** button

### Receiving a call
- Someone calls your Twilio number
- An incoming call overlay appears with ring animation and audio
- Click **Answer** (✅) to accept or **Decline** (📵) to reject

### Call log
- All calls are logged automatically under the **Recent Calls** tab
- Filter by All / Missed / Inbound / Outbound
- Search by name or number
- Add notes to any call
- Click **Call Back** to pre-fill the number in the dialpad

### Contacts
- Add contacts with name, phone, email, company, notes
- Contact names appear automatically in call logs when a match is found
- Click **Call** on any contact to dial them instantly

### Dashboard
- See today's call counts, missed calls, total minutes
- Calls-by-hour chart for the current day
- Last 5 recent calls summary

---

## Architecture Overview

```
Browser (Twilio Voice JS SDK) ←→ WebRTC ←→ Twilio Cloud ←→ PSTN
                                                ↓
                                    Webhooks → /webhook/voice
                                              /webhook/status
                                              /webhook/fallback
                                                ↓
                                    Express server (Node.js)
                                                ↓
                                    SQLite (better-sqlite3)
```

---

## Security Notes

- All API routes (except `/api/auth/login` and webhooks) require an active session
- Twilio webhook signatures are validated on all `/webhook/*` routes
- Login is rate-limited to 10 attempts per 15 minutes per IP
- Session cookies are `httpOnly`, `sameSite: strict`, and `secure` in production
- All database queries use parameterized statements (SQL injection safe)
- Phone numbers are normalized to E.164 format before storage
- Helmet.js sets security headers on all responses
