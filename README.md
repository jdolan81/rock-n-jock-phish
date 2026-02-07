# 🐠 Rock 'n Jock - Phish Setlist Prediction Game

A fun multiplayer game where you and your friends predict the Phish setlist for upcoming shows and score points based on accuracy!

## Features

- **100% Free** - Uses the free Phish.net API (no costs!)
- **Real-time Stats** - Get tour probabilities based on recent shows
- **Multiplayer** - Share game links with friends
- **Smart Scoring** - Points for openers, closers, encore, and wildcards
- **Auto-Fetch** - Pull setlists automatically from Phish.net after shows
- **Mobile-Friendly** - iOS-inspired clean interface

## How It Works

1. **Create a Game** - Pick a show date and set when picks lock
2. **Add Players** - Invite friends via share link
3. **Make Predictions** - Use tour stats to pick your songs
4. **Score the Show** - Auto-fetch or manually enter the setlist
5. **See Results** - Leaderboard shows who won!

### Scoring System
- **Opener**: 10 points
- **Set 1 Closer**: 10 points
- **Set 2 Opener**: 10 points
- **Set 2 Closer**: 10 points
- **Encore**: 10 points
- **Wildcards** (any song played): 5 points each

## Tech Stack

- React + TypeScript
- Tailwind CSS
- Vite
- Phish.net API (free!)

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment (100% FREE)

### Option 1: Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Click "Deploy" (Vercel auto-detects Vite settings)

**Done!** Your app is live with a free `.vercel.app` URL.

**Vercel Free Tier:**
- Unlimited deployments
- Automatic HTTPS
- Global CDN
- Perfect for small friend groups

### Option 2: Netlify

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect to GitHub and select your repo
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click "Deploy"

**Netlify Free Tier:**
- 100GB bandwidth/month
- Automatic HTTPS
- Instant cache invalidation
- Great for small groups

### Option 3: GitHub Pages

1. Install the GitHub Pages plugin:
```bash
npm install --save-dev gh-pages
```

2. Add to `package.json`:
```json
{
  "homepage": "https://yourusername.github.io/rock-n-jock",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

3. Update `vite.config.ts`:
```typescript
export default defineConfig({
  plugins: [react()],
  base: '/rock-n-jock/', // Replace with your repo name
})
```

4. Deploy:
```bash
npm run deploy
```

**GitHub Pages Free Tier:**
- 1GB storage
- 100GB bandwidth/month
- Requires public repository (for free tier)

## About the Phish.net API

This app uses the **100% free Phish.net API** provided by the Mockingbird Foundation. No API keys needed for basic features!

**What it provides:**
- Complete setlists for all Phish shows
- Venue and location information
- Song statistics and history

**Rate Limiting:**
- Very generous for normal use
- We cache data in localStorage to minimize requests
- Perfect for small friend groups

**API Documentation:** [https://api.phish.net/](https://api.phish.net/)

## Privacy & Data Storage

- All game data stored in **browser localStorage**
- No server-side database needed
- Game state shared via URL hash (encoded in link)
- Tour stats cached to reduce API calls

## Browser Support

- Chrome/Edge (recommended)
- Safari (iOS support)
- Firefox
- Any modern browser with localStorage support

## Future Ideas

- Add push notifications when picks lock
- Historical game tracking
- Season-long leaderboards
- Export results to share on social media

## License

MIT - Feel free to fork and customize!

## Credits

- Built with ❤️ for Phish fans
- Data provided by [Phish.net](https://phish.net) and the Mockingbird Foundation
- Inspired by fantasy sports prediction games

---

**Questions?** Open an issue on GitHub!

**Enjoy the show!** 🎸🐠
