# FinanceOS

A personal finance dashboard that runs entirely in your browser. Track income, expenses, budgets, subscriptions, savings goals, giving, and view everything on a financial calendar.

## Features

- 📊 **Dashboard** — Overview of your financial health with charts and insights
- 💰 **Income & Expenses** — Track every transaction with categories and tags
- 🎯 **Budgets** — Set monthly budgets with custom categories
- 🔄 **Subscriptions** — Monitor recurring payments
- 🏦 **Goals** — Track savings goals with contributions
- 💝 **Giving** — Monitor charitable giving and donations
- 📅 **Calendar** — View all financial events in a calendar layout
- 🌙 **Dark Mode** — Full dark theme support
- 📱 **Responsive** — Works on desktop, tablet, and mobile
- 🔒 **Guest Mode** — Try the app without creating an account

## Project Structure

```
FinanceOS/
├── index.html      # Main HTML markup
├── styles.css      # All styles (light/dark themes, responsive)
├── app.js          # All application logic
├── sw.js           # Service worker (offline PWA support)
├── manifest.json   # PWA manifest
├── favicon.ico     # Browser icons
├── icon-192.png    # PWA icon (192px)
├── icon-512.png    # PWA icon (512px)
└── CNAME           # Custom domain (GitHub Pages)
```

## Getting Started

Simply open `index.html` in any modern browser, or run a local server:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then visit `http://localhost:8000`.

### Guest Mode

You can use the app immediately without an account. Data stays on your device. Sign in with Google or email to sync across devices.

## Deploying

This is a static web app. Deploy options:

- **Vercel** — `npx vercel` in the project directory
- **Netlify** — Drag and drop the folder
- **GitHub Pages** — Push to GitHub and enable Pages

## Tech Stack

- Pure HTML, CSS, and JavaScript (no build step required)
- Chart.js for charts (CDN)
- Firebase Auth + Firestore for cloud sync (optional)
- Google Calendar API (optional)
- localStorage for data persistence

## Notes

- Firebase API key and config are exposed in `app.js` — this is normal for Firebase web apps, but you should configure domain restrictions in Google Cloud Console.
- For custom domains on Vercel: deploy first, then add your domain in Vercel dashboard.
