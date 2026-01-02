import { AnalyticsTracker } from '../analytics/tracker';
import { VASTPlayer } from '../ads/vast';
import {
  loadGptOnce,
  defineOrUpdateSlot,
  displaySlot,
  destroySlot,
  getDeviceType,
} from '../ads/gpt';

/**
 * Full ad card component
 * Shows VAST video ad or display fallback
 * Appears every 4 content cards
 */

export class FullAdCard {
  private container: HTMLElement;
  private tracker: AnalyticsTracker;
  private feedId: string;
  private networkCode: string;
  private adUnit: string;
  private vastTagUrl: string;
  private cardIndex: number;
  private adPosition: string;
  private pageContext?: Record<string, string>;
  private onComplete: () => void;

  private adContainer: HTMLElement | null = null;
  private vastPlayer: VASTPlayer | null = null;
  private divId: string;
  private loadAborted = false;

  constructor(
    container: HTMLElement,
    tracker: AnalyticsTracker,
    feedId: string,
    networkCode: string,
    adUnit: string,
    vastTagUrl: string,
    cardIndex: number,
    adPosition: string,
    pageContext: Record<string, string> | undefined,
    onComplete: () => void
  ) {
    this.container = container;
    this.tracker = tracker;
    this.feedId = feedId;
    this.networkCode = networkCode;
    this.adUnit = adUnit;
    this.vastTagUrl = vastTagUrl;
    this.cardIndex = cardIndex;
    this.adPosition = adPosition;
    this.pageContext = pageContext;
    this.onComplete = onComplete;

    this.divId = `hrvstr-fullad-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}`;

    this.render();

    // Load ad with delay to allow abort on fast swipe
    setTimeout(() => {
      if (!this.loadAborted) {
        this.loadAd();
      }
    }, 500);
  }

  /**
   * Render full ad card
   */
  private render(): void {
    const cardElement = document.createElement('div');
    cardElement.className = 'hrvstr-full-ad-card';

    this.adContainer = document.createElement('div');
    this.adContainer.className = 'hrvstr-ad-container';
    this.adContainer.id = this.divId;

    cardElement.appendChild(this.adContainer);
    this.container.appendChild(cardElement);
  }

  /**
   * Load ad (try VAST first, fallback to display)
   */
  private async loadAd(): Promise<void> {
    if (this.loadAborted) return;

    this.tracker.track('ad_request', {
      cardIndex: this.cardIndex,
      slot: 'full_card',
    });

    // Try VAST video ad first
    try {
      await this.loadVAST();
    } catch (error) {
      console.error('VAST ad failed, falling back to display:', error);
      await this.loadDisplayAd();
    }
  }

  /**
   * Load VAST video ad
   */
  private async loadVAST(): Promise<void> {
    this.vastPlayer = new VASTPlayer({
      tagUrl: this.vastTagUrl,
      container: this.adContainer!,
      onComplete: () => {
        this.tracker.track('ad_complete', {
          cardIndex: this.cardIndex,
          slot: 'full_card',
        });
        this.onComplete();
      },
      onSkip: () => {
        this.tracker.track('card_skip', {
          cardIndex: this.cardIndex,
          slot: 'full_card',
        });
        this.onComplete();
      },
      onError: async () => {
        // Fallback to display
        console.error('VAST playback error, falling back to display');
        await this.loadDisplayAd();
      },
    });

    await this.vastPlayer.load();

    this.tracker.track('ad_viewable', {
      cardIndex: this.cardIndex,
      slot: 'full_card',
    });
  }

  /**
   * Load display ad fallback
   */
  private async loadDisplayAd(): Promise<void> {
    if (this.loadAborted) return;

    try {
      await loadGptOnce();

      const device = getDeviceType();
      const sizes: googletag.GeneralSize =
        device === 'mobile' ? [300, 250] : [[300, 600], [300, 250]];

      const targeting: Record<string, string> = {
        feed_id: this.feedId,
        card_index: String(this.cardIndex),
        slot: 'full_card',
        ad_position: this.adPosition,
        device,
      };

      if (this.pageContext) {
        Object.assign(targeting, this.pageContext);
      }

      defineOrUpdateSlot({
        divId: this.divId,
        adUnitPath: `/${this.networkCode}/${this.adUnit}`,
        sizes,
        targeting,
      });

      displaySlot(this.divId);

      this.tracker.track('ad_viewable', {
        cardIndex: this.cardIndex,
        slot: 'full_card',
      });

      // Auto-advance after 5 seconds for display ads
      setTimeout(() => {
        if (!this.loadAborted) {
          this.tracker.track('ad_complete', {
            cardIndex: this.cardIndex,
            slot: 'full_card',
          });
          this.onComplete();
        }
      }, 5000);
    } catch (error) {
      console.error('Display ad load failed:', error);
      // Skip to next card on error
      this.onComplete();
    }
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.loadAborted = true;

    if (this.vastPlayer) {
      this.vastPlayer.destroy();
      this.vastPlayer = null;
    }

    destroySlot(this.divId);
    this.container.innerHTML = '';
  }
}
