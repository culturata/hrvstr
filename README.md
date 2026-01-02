# hrvstr

Embeddable publisher widget for short-form content feeds with Google Ad Manager integration.

## Overview

hrvstr is an embeddable on-site short-form feed that opens in a lightbox overlay. Content is presented in a TikTok/Reels-style interface with swipe navigation on mobile and arrow key navigation on desktop. Monetization is powered by Google Ad Manager with companion banners and VAST video ads.

## Features

- **Single Script Tag Integration** - Drop in one line of code
- **TikTok/Reels-style Navigation** - Swipe on mobile, arrow keys on desktop
- **Feed Tier Rotation** - Daily rotation through Recent, Popular, and Evergreen content
- **Google Ad Manager Integration** - Companion banners (320x50) and full ad cards with VAST video
- **Event-based Analytics** - Batched event tracking with retry logic
- **Performance Optimized** - Lazy loading, ad load abort on fast swipes, and cleanup
- **Mobile Responsive** - Works seamlessly on all devices

## Quick Start

### Prerequisites

- Node.js 16+ and npm

### Installation

```bash
# Install dependencies
npm install

# Build the widget
npm run build

# Start the development server
npm run server
```

The demo will be available at `http://localhost:3000`

### Development Mode

Run both the build watcher and server:

```bash
npm run dev
```

This will:
- Watch for source file changes and rebuild automatically
- Serve the demo page at `http://localhost:3000`

## Integration

### Basic Integration

Add the script tag where you want the widget to appear:

```html
<script src="hrvstr.umd.js" data-feed-id="demo" data-placement="inline"></script>
```

### Programmatic Integration

```javascript
const widget = window.hrvstr.init({
  feedId: 'demo',
  container: document.getElementById('my-container'),
  gamNetworkCode: '123456789',
  companionAdUnit: 'hrvstr_companion',
  fullCardAdUnit: 'hrvstr_full',
  pageContext: {
    article_id: '12345',
    category: 'sports'
  }
});

// Open lightbox programmatically
widget.open();

// Close lightbox
widget.close();

// Destroy widget
widget.destroy();
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `feedId` | string | required | Unique identifier for the feed |
| `container` | HTMLElement | auto-created | Container element for the widget |
| `gamNetworkCode` | string | '123456789' | Google Ad Manager network code |
| `companionAdUnit` | string | 'hrvstr_companion' | Ad unit path for companion ads |
| `fullCardAdUnit` | string | 'hrvstr_full' | Ad unit path for full ad cards |
| `maxCardsPerSession` | number | 12 | Maximum cards per session |
| `eventEndpoint` | string | '/api/events' | Analytics event endpoint |
| `vastTagUrl` | string | (default VAST tag) | VAST tag URL for video ads |
| `pageContext` | object | undefined | Additional key-values for ad targeting |

## Feed Data Structure

The widget expects feed data from `GET /api/feed/:feedId` in this format:

```json
{
  "settings": {
    "title": "Explore Our Feed",
    "thumbnail": "https://example.com/thumb.jpg",
    "cta_text": "Watch Now",
    "max_cards_per_session": 12
  },
  "recent": [
    {
      "id": "recent-1",
      "canonical_id": "ig-post-1",
      "type": "instagram",
      "embed_url": "https://www.instagram.com/p/example/embed",
      "fallback_image": "https://example.com/image.jpg",
      "title": "Latest Post",
      "platform_url": "https://www.instagram.com/p/example/"
    }
  ],
  "popular": [...],
  "evergreen": [...]
}
```

## Ad Integration

### Companion Ads (320x50)

- Appears on every content card
- One request per card change
- No timed refresh
- Suppressed on full ad cards

### Full Ad Cards

- Inserted every 4 content cards
- VAST video ads (autoplay muted, skippable immediately)
- Fallback to display ads (300x600/300x250 desktop, 300x250 mobile)
- Suppresses companion ad

### Ad Targeting Key-Values

Both ad types include these targeting parameters:
- `feed_id` - Feed identifier
- `tier` - Content tier (recent/popular/evergreen)
- `card_index` - Position in queue
- `slot` - companion or full_card
- `device` - mobile or desktop
- `ad_position` - interstitial (full cards only)
- Custom page context values

## Analytics Events

The widget tracks these events:

- `feed_open` - Lightbox opened
- `feed_close` - Lightbox closed
- `card_view` - Card viewed for 1+ seconds
- `card_engaged` - User interacted with card
- `card_complete` - Card viewing completed
- `card_skip` - User skipped to next card
- `ad_request` - Ad requested
- `ad_viewable` - Ad became viewable
- `ad_complete` - Ad viewing completed

Events are batched and sent to `POST /api/events` every 3 seconds with retry/backoff.

### Event Payload

```json
{
  "events": [
    {
      "event_type": "card_view",
      "feed_id": "demo",
      "session_id": "1234567890-abc123",
      "card_id": "recent-1",
      "canonical_id": "ig-post-1",
      "tier": "recent",
      "card_index": 0,
      "device": "desktop",
      "timestamp": 1234567890123,
      "page_context": {
        "article_id": "12345"
      }
    }
  ]
}
```

## Feed Tier Rotation

The widget implements intelligent tier rotation:

1. **First session of the day** - Starts with Recent tier
2. **Subsequent sessions** - Rotates through Popular -> Evergreen -> Recent
3. **Daily reset** - Rotation resets at midnight

Rotation state is persisted in localStorage per feed.

## Navigation

### Desktop
- **Arrow Left** - Previous card
- **Arrow Right/Down** - Next card
- **Arrow Up** - Previous card
- **ESC** - Close lightbox
- **Click Close Button** - Close lightbox
- **Next/Prev Buttons** - Navigate cards

### Mobile
- **Swipe Up** - Next card
- **Swipe Down** - Previous card
- **Tap Close Button** - Close lightbox

## Project Structure

```
hrvstr/
├── src/
│   ├── ads/
│   │   ├── gpt.ts           # Google Publisher Tag helpers
│   │   └── vast.ts          # VAST video player
│   ├── analytics/
│   │   └── tracker.ts       # Event tracking and batching
│   ├── components/
│   │   ├── teaser.ts        # Inline teaser component
│   │   ├── lightbox.ts      # Lightbox shell
│   │   ├── content-card.ts  # Content card with embed
│   │   ├── companion-ad.ts  # Companion banner ad
│   │   └── full-ad-card.ts  # Full ad card component
│   ├── feed/
│   │   └── rotation.ts      # Feed rotation logic
│   ├── types.ts             # TypeScript interfaces
│   ├── widget.ts            # Main widget class
│   ├── index.ts             # SDK entry point
│   └── styles.css           # Widget styles
├── server/
│   └── index.js             # Express server (mock API)
├── demo/
│   └── index.html           # Demo page
├── dist/                    # Build output
│   └── hrvstr.umd.js        # Compiled widget bundle
├── package.json
├── tsconfig.json
├── webpack.config.js
└── README.md
```

## Build Commands

```bash
# Clean build artifacts
npm run clean

# Production build
npm run build

# Development build
npm run build:dev

# Watch mode
npm run watch

# Start server only
npm run server

# Development mode (watch + server)
npm run dev
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Android 90+)

## Performance Considerations

1. **GPT loads only when lightbox opens** - Not on page load
2. **Embed lazy loading** - Only current + next card
3. **Ad load abort** - Fast swipes don't trigger runaway ad calls
4. **Cleanup on exit** - All players and slots destroyed
5. **Event batching** - Reduces network requests

## Customization

### Styling

The widget uses CSS classes prefixed with `hrvstr-`. You can override styles:

```css
.hrvstr-teaser {
  /* Custom teaser styles */
}

.hrvstr-lightbox {
  /* Custom lightbox styles */
}
```

### Ad Configuration

Modify default ad units and targeting in the configuration:

```javascript
window.hrvstr.init({
  feedId: 'demo',
  gamNetworkCode: 'YOUR_NETWORK_CODE',
  companionAdUnit: 'your_companion_unit',
  fullCardAdUnit: 'your_full_card_unit',
  pageContext: {
    custom_key: 'custom_value'
  }
});
```

## API Endpoints

### GET /api/feed/:feedId

Returns feed configuration and content tiers.

**Response:**
```json
{
  "settings": { ... },
  "recent": [ ... ],
  "popular": [ ... ],
  "evergreen": [ ... ]
}
```

### POST /api/events

Receives batched analytics events.

**Request:**
```json
{
  "events": [ ... ]
}
```

**Response:**
```json
{
  "success": true,
  "count": 5
}
```

## License

MIT

## Support

For issues and feature requests, please open an issue on GitHub