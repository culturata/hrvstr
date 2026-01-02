const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));
app.use(express.static('demo'));

// Mock feed data
const MOCK_FEEDS = {
  demo: {
    settings: {
      title: 'Explore Our Feed',
      thumbnail: 'https://picsum.photos/80/80?random=1',
      cta_text: 'Watch Now',
      max_cards_per_session: 12,
    },
    recent: [
      {
        id: 'recent-1',
        canonical_id: 'ig-post-1',
        type: 'instagram',
        embed_url: 'https://www.instagram.com/p/example/embed',
        fallback_image: 'https://picsum.photos/500/800?random=2',
        title: 'Latest Instagram Post',
        platform_url: 'https://www.instagram.com/p/example/',
      },
      {
        id: 'recent-2',
        canonical_id: 'ig-post-2',
        type: 'instagram',
        fallback_image: 'https://picsum.photos/500/800?random=3',
        title: 'Recent Story Highlight',
        platform_url: 'https://www.instagram.com/p/example2/',
      },
      {
        id: 'recent-3',
        canonical_id: 'ig-post-3',
        type: 'instagram',
        fallback_image: 'https://picsum.photos/500/800?random=4',
        title: 'Behind the Scenes',
        platform_url: 'https://www.instagram.com/p/example3/',
      },
      {
        id: 'recent-4',
        canonical_id: 'ig-post-4',
        type: 'instagram',
        fallback_image: 'https://picsum.photos/500/800?random=5',
        title: 'New Product Launch',
        platform_url: 'https://www.instagram.com/p/example4/',
      },
    ],
    popular: [
      {
        id: 'popular-1',
        canonical_id: 'ig-post-5',
        type: 'instagram',
        fallback_image: 'https://picsum.photos/500/800?random=6',
        title: 'Most Liked Post',
        platform_url: 'https://www.instagram.com/p/popular1/',
      },
      {
        id: 'popular-2',
        canonical_id: 'ig-post-6',
        type: 'instagram',
        fallback_image: 'https://picsum.photos/500/800?random=7',
        title: 'Trending Video',
        platform_url: 'https://www.instagram.com/p/popular2/',
      },
      {
        id: 'popular-3',
        canonical_id: 'ig-post-7',
        type: 'instagram',
        fallback_image: 'https://picsum.photos/500/800?random=8',
        title: 'Viral Moment',
        platform_url: 'https://www.instagram.com/p/popular3/',
      },
      {
        id: 'popular-4',
        canonical_id: 'ig-post-8',
        type: 'instagram',
        fallback_image: 'https://picsum.photos/500/800?random=9',
        title: 'Fan Favorite',
        platform_url: 'https://www.instagram.com/p/popular4/',
      },
    ],
    evergreen: [
      {
        id: 'evergreen-1',
        canonical_id: 'ig-post-9',
        type: 'instagram',
        fallback_image: 'https://picsum.photos/500/800?random=10',
        title: 'Classic Content',
        platform_url: 'https://www.instagram.com/p/evergreen1/',
      },
      {
        id: 'evergreen-2',
        canonical_id: 'ig-post-10',
        type: 'instagram',
        fallback_image: 'https://picsum.photos/500/800?random=11',
        title: 'Timeless Story',
        platform_url: 'https://www.instagram.com/p/evergreen2/',
      },
      {
        id: 'evergreen-3',
        canonical_id: 'ig-post-11',
        type: 'instagram',
        fallback_image: 'https://picsum.photos/500/800?random=12',
        title: 'Best of All Time',
        platform_url: 'https://www.instagram.com/p/evergreen3/',
      },
      {
        id: 'evergreen-4',
        canonical_id: 'ig-post-12',
        type: 'instagram',
        fallback_image: 'https://picsum.photos/500/800?random=13',
        title: 'Hall of Fame',
        platform_url: 'https://www.instagram.com/p/evergreen4/',
      },
    ],
  },
};

// API Routes

/**
 * GET /api/feed/:feedId
 * Fetch feed data
 */
app.get('/api/feed/:feedId', (req, res) => {
  const { feedId } = req.params;
  const feed = MOCK_FEEDS[feedId];

  if (!feed) {
    return res.status(404).json({ error: 'Feed not found' });
  }

  res.json(feed);
});

/**
 * POST /api/events
 * Receive analytics events
 */
app.post('/api/events', (req, res) => {
  const { events } = req.body;

  if (!events || !Array.isArray(events)) {
    return res.status(400).json({ error: 'Invalid events payload' });
  }

  // Log events (in production, store in database)
  console.log(`Received ${events.length} analytics events:`);
  events.forEach((event) => {
    console.log(
      `  [${event.event_type}] session=${event.session_id} card=${event.card_id || 'N/A'} tier=${event.tier || 'N/A'}`
    );
  });

  res.json({ success: true, count: events.length });
});

// Serve demo page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../demo/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 hrvstr server running at http://localhost:${PORT}`);
  console.log(`📊 Demo page: http://localhost:${PORT}/\n`);
});
