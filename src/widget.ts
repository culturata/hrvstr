import { HrvstrConfig, HrvstrWidget, FeedResponse } from './types';
import { TeaserComponent } from './components/teaser';
import { Lightbox } from './components/lightbox';
import { AnalyticsTracker, generateSessionId } from './analytics/tracker';
import { getStartTier, buildSessionQueue, insertAdCards } from './feed/rotation';

/**
 * Main widget class
 * Manages feed loading, teaser, and lightbox lifecycle
 */

export class Widget implements HrvstrWidget {
  private config: HrvstrConfig;
  private teaser: TeaserComponent | null = null;
  private lightbox: Lightbox | null = null;
  private tracker: AnalyticsTracker | null = null;
  private feedData: FeedResponse | null = null;

  // Default configuration
  private static readonly DEFAULTS = {
    maxCardsPerSession: 12,
    eventEndpoint: '/api/events',
    vastTagUrl:
      'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_preroll_skippable&sz=640x480&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&correlator=',
    gamNetworkCode: '123456789',
    companionAdUnit: 'hrvstr_companion',
    fullCardAdUnit: 'hrvstr_full',
  };

  constructor(config: HrvstrConfig) {
    this.config = {
      ...Widget.DEFAULTS,
      ...config,
    };

    this.init();
  }

  /**
   * Initialize widget
   */
  private async init(): Promise<void> {
    try {
      // Fetch feed data
      this.feedData = await this.fetchFeed();

      // Render teaser
      const container = this.config.container || this.createDefaultContainer();
      this.teaser = new TeaserComponent(container, this.feedData.settings, () =>
        this.open()
      );
    } catch (error) {
      console.error('Failed to initialize hrvstr widget:', error);
      // Fail gracefully - do not break host page
    }
  }

  /**
   * Fetch feed data from backend
   */
  private async fetchFeed(): Promise<FeedResponse> {
    const response = await fetch(`/api/feed/${this.config.feedId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create default container if not provided
   */
  private createDefaultContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'hrvstr-widget-container';
    document.body.appendChild(container);
    return container;
  }

  /**
   * Open lightbox
   */
  open(): void {
    if (this.lightbox || !this.feedData) return;

    // Create session
    const sessionId = generateSessionId();
    this.tracker = new AnalyticsTracker(
      sessionId,
      this.config.feedId,
      this.config.eventEndpoint!,
      this.config.pageContext
    );

    this.tracker.track('feed_open');

    // Build session queue
    const startTier = getStartTier(this.config.feedId);
    const maxCards =
      this.feedData.settings.max_cards_per_session ||
      this.config.maxCardsPerSession!;

    const contentQueue = buildSessionQueue(this.feedData, startTier, maxCards);
    const fullQueue = insertAdCards(contentQueue);

    // Open lightbox
    this.lightbox = new Lightbox(
      fullQueue,
      this.tracker,
      this.config.feedId,
      this.config.gamNetworkCode!,
      this.config.companionAdUnit!,
      this.config.fullCardAdUnit!,
      this.config.vastTagUrl!,
      this.config.pageContext,
      () => this.close()
    );
  }

  /**
   * Close lightbox
   */
  async close(): Promise<void> {
    if (this.tracker) {
      this.tracker.track('feed_close');
      await this.tracker.destroy();
      this.tracker = null;
    }

    if (this.lightbox) {
      this.lightbox = null;
    }
  }

  /**
   * Destroy widget and clean up
   */
  destroy(): void {
    if (this.teaser) {
      this.teaser.destroy();
      this.teaser = null;
    }

    if (this.lightbox) {
      this.lightbox.close();
      this.lightbox = null;
    }

    if (this.tracker) {
      this.tracker.destroy();
      this.tracker = null;
    }
  }
}
