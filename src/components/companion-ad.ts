import { AnalyticsTracker } from '../analytics/tracker';
import {
  loadGptOnce,
  defineOrUpdateSlot,
  displaySlot,
  destroySlot,
  getDeviceType,
} from '../ads/gpt';

/**
 * Companion ad component (320x50)
 * Shown on every content card
 */

export class CompanionAd {
  private container: HTMLElement;
  private tracker: AnalyticsTracker;
  private divId: string;
  private adUnitPath: string;
  private loadAborted = false;

  constructor(
    container: HTMLElement,
    tracker: AnalyticsTracker,
    feedId: string,
    networkCode: string,
    adUnit: string,
    tier: string,
    cardIndex: number,
    pageContext?: Record<string, string>
  ) {
    this.container = container;
    this.tracker = tracker;
    this.divId = `hrvstr-companion-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}`;
    this.adUnitPath = `/${networkCode}/${adUnit}`;

    // Create ad div
    const adDiv = document.createElement('div');
    adDiv.id = this.divId;
    adDiv.style.width = '320px';
    adDiv.style.height = '50px';
    this.container.appendChild(adDiv);

    // Load ad with delay to allow abort on fast swipe
    setTimeout(() => {
      if (!this.loadAborted) {
        this.loadAd(feedId, tier, cardIndex, pageContext);
      }
    }, 500);
  }

  /**
   * Load companion ad
   */
  private async loadAd(
    feedId: string,
    tier: string,
    cardIndex: number,
    pageContext?: Record<string, string>
  ): Promise<void> {
    if (this.loadAborted) return;

    try {
      await loadGptOnce();

      const targeting: Record<string, string> = {
        feed_id: feedId,
        tier,
        card_index: String(cardIndex),
        slot: 'companion',
        device: getDeviceType(),
      };

      if (pageContext) {
        Object.assign(targeting, pageContext);
      }

      defineOrUpdateSlot({
        divId: this.divId,
        adUnitPath: this.adUnitPath,
        sizes: [320, 50],
        targeting,
      });

      this.tracker.track('ad_request', {
        tier,
        cardIndex,
        slot: 'companion',
      });

      displaySlot(this.divId);
    } catch (error) {
      console.error('Companion ad load failed:', error);
    }
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.loadAborted = true;
    destroySlot(this.divId);
    this.container.innerHTML = '';
  }
}
