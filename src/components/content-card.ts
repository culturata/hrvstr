import { FeedCard } from '../types';
import { AnalyticsTracker } from '../analytics/tracker';
import { CompanionAd } from './companion-ad';

/**
 * Content card component
 * Renders embed or fallback image with companion ad
 */

export class ContentCard {
  private container: HTMLElement;
  private card: FeedCard;
  private tracker: AnalyticsTracker;
  private feedId: string;
  private gamNetworkCode: string;
  private companionAdUnit: string;
  private cardIndex: number;
  private pageContext?: Record<string, string>;

  private embedContainer: HTMLElement | null = null;
  private companionAd: CompanionAd | null = null;
  private embedIframe: HTMLIFrameElement | null = null;
  private embedTimeout: number | null = null;
  private viewTimer: number | null = null;
  private hasTrackedView = false;

  constructor(
    container: HTMLElement,
    card: FeedCard,
    tracker: AnalyticsTracker,
    feedId: string,
    gamNetworkCode: string,
    companionAdUnit: string,
    cardIndex: number,
    pageContext?: Record<string, string>
  ) {
    this.container = container;
    this.card = card;
    this.tracker = tracker;
    this.feedId = feedId;
    this.gamNetworkCode = gamNetworkCode;
    this.companionAdUnit = companionAdUnit;
    this.cardIndex = cardIndex;
    this.pageContext = pageContext;

    this.render();
    this.startViewTracking();
  }

  /**
   * Render content card
   */
  private render(): void {
    const cardElement = document.createElement('div');
    cardElement.className = 'hrvstr-content-card';

    // Embed container
    this.embedContainer = document.createElement('div');
    this.embedContainer.className = 'hrvstr-embed-container';

    // Try loading embed if URL exists
    if (this.card.embed_url) {
      this.loadEmbed();
    } else {
      this.showFallback();
    }

    // Companion ad
    const companionContainer = document.createElement('div');
    companionContainer.className = 'hrvstr-companion-ad';

    this.companionAd = new CompanionAd(
      companionContainer,
      this.tracker,
      this.feedId,
      this.gamNetworkCode,
      this.companionAdUnit,
      this.card.tier || 'recent',
      this.cardIndex,
      this.pageContext
    );

    cardElement.appendChild(this.embedContainer);
    cardElement.appendChild(companionContainer);
    this.container.appendChild(cardElement);
  }

  /**
   * Load embed iframe
   */
  private loadEmbed(): void {
    // Show loading state
    this.embedContainer!.innerHTML = '<div class="hrvstr-loading"></div>';

    // Create iframe
    this.embedIframe = document.createElement('iframe');
    this.embedIframe.className = 'hrvstr-embed-iframe';
    this.embedIframe.src = this.card.embed_url!;
    this.embedIframe.allow = 'autoplay; encrypted-media';
    this.embedIframe.loading = 'lazy';

    // Fallback timeout (2 seconds)
    this.embedTimeout = window.setTimeout(() => {
      this.showFallback();
    }, 2000);

    // Load success
    this.embedIframe.addEventListener('load', () => {
      if (this.embedTimeout) {
        clearTimeout(this.embedTimeout);
        this.embedTimeout = null;
      }
    });

    // Append iframe
    this.embedContainer!.innerHTML = '';
    this.embedContainer!.appendChild(this.embedIframe);
  }

  /**
   * Show fallback image with attribution
   */
  private showFallback(): void {
    if (this.embedTimeout) {
      clearTimeout(this.embedTimeout);
      this.embedTimeout = null;
    }

    if (this.embedIframe) {
      this.embedIframe.remove();
      this.embedIframe = null;
    }

    this.embedContainer!.innerHTML = `
      <div class="hrvstr-embed-fallback">
        <img
          src="${this.card.fallback_image}"
          alt="${this.card.title}"
          class="hrvstr-fallback-image"
        />
        <div class="hrvstr-fallback-overlay">
          <p>${this.card.title}</p>
          <a
            href="${this.card.platform_url}"
            target="_blank"
            rel="noopener noreferrer"
            class="hrvstr-fallback-link"
          >
            View on ${this.card.type}
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Start view tracking (1s threshold)
   */
  private startViewTracking(): void {
    this.viewTimer = window.setTimeout(() => {
      if (!this.hasTrackedView) {
        this.hasTrackedView = true;
        this.tracker.track('card_view', {
          cardId: this.card.id,
          canonicalId: this.card.canonical_id,
          tier: this.card.tier,
          cardIndex: this.cardIndex,
        });
      }
    }, 1000);
  }

  /**
   * Clean up
   */
  destroy(): void {
    if (this.viewTimer) {
      clearTimeout(this.viewTimer);
      this.viewTimer = null;
    }

    if (this.embedTimeout) {
      clearTimeout(this.embedTimeout);
      this.embedTimeout = null;
    }

    if (this.embedIframe) {
      this.embedIframe.src = '';
      this.embedIframe.remove();
      this.embedIframe = null;
    }

    if (this.companionAd) {
      this.companionAd.destroy();
      this.companionAd = null;
    }

    this.container.innerHTML = '';
  }
}
