import { FeedCard } from '../types';
import { ContentCard } from './content-card';
import { FullAdCard } from './full-ad-card';
import { AnalyticsTracker } from '../analytics/tracker';

/**
 * Lightbox shell component
 * Handles navigation, keyboard controls, swipe gestures, and card rendering
 */

export class Lightbox {
  private element: HTMLElement | null = null;
  private cardContainer: HTMLElement | null = null;
  private currentCard: ContentCard | FullAdCard | null = null;
  private queue: Array<FeedCard | null>; // null = ad card
  private currentIndex = 0;
  private tracker: AnalyticsTracker;
  private feedId: string;
  private gamNetworkCode: string;
  private companionAdUnit: string;
  private fullCardAdUnit: string;
  private vastTagUrl: string;
  private pageContext?: Record<string, string>;
  private onClose: () => void;

  // Touch handling
  private touchStartY = 0;
  private touchStartTime = 0;

  // Prevent double-advance
  private isTransitioning = false;

  constructor(
    queue: Array<FeedCard | null>,
    tracker: AnalyticsTracker,
    feedId: string,
    gamNetworkCode: string,
    companionAdUnit: string,
    fullCardAdUnit: string,
    vastTagUrl: string,
    pageContext: Record<string, string> | undefined,
    onClose: () => void
  ) {
    this.queue = queue;
    this.tracker = tracker;
    this.feedId = feedId;
    this.gamNetworkCode = gamNetworkCode;
    this.companionAdUnit = companionAdUnit;
    this.fullCardAdUnit = fullCardAdUnit;
    this.vastTagUrl = vastTagUrl;
    this.pageContext = pageContext;
    this.onClose = onClose;

    this.render();
    this.attachEventListeners();
    this.lockBodyScroll();
    this.showCurrentCard();
  }

  /**
   * Render lightbox shell
   */
  private render(): void {
    this.element = document.createElement('div');
    this.element.className = 'hrvstr-lightbox';

    this.element.innerHTML = `
      <button class="hrvstr-lightbox-close" aria-label="Close">&times;</button>
      <div class="hrvstr-progress">
        <span class="hrvstr-progress-text">1 / ${this.queue.length}</span>
      </div>
      <button class="hrvstr-nav-button hrvstr-nav-prev" aria-label="Previous">&#8249;</button>
      <button class="hrvstr-nav-button hrvstr-nav-next" aria-label="Next">&#8250;</button>
      <div class="hrvstr-card-container"></div>
    `;

    this.cardContainer = this.element.querySelector('.hrvstr-card-container');
    document.body.appendChild(this.element);
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Close button
    const closeBtn = this.element!.querySelector('.hrvstr-lightbox-close');
    closeBtn?.addEventListener('click', () => this.close());

    // Navigation buttons
    const prevBtn = this.element!.querySelector('.hrvstr-nav-prev');
    const nextBtn = this.element!.querySelector('.hrvstr-nav-next');

    prevBtn?.addEventListener('click', () => this.previous());
    nextBtn?.addEventListener('click', () => this.next());

    // Keyboard navigation
    this.handleKeydown = this.handleKeydown.bind(this);
    document.addEventListener('keydown', this.handleKeydown);

    // Touch gestures (mobile)
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);

    this.cardContainer?.addEventListener('touchstart', this.handleTouchStart, {
      passive: true,
    });
    this.cardContainer?.addEventListener('touchend', this.handleTouchEnd, {
      passive: true,
    });
  }

  /**
   * Handle keyboard events
   */
  private handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.close();
    } else if (e.key === 'ArrowLeft') {
      this.previous();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      this.next();
    } else if (e.key === 'ArrowUp') {
      this.previous();
    }
  }

  /**
   * Handle touch start
   */
  private handleTouchStart(e: TouchEvent): void {
    this.touchStartY = e.touches[0].clientY;
    this.touchStartTime = Date.now();
  }

  /**
   * Handle touch end (swipe detection)
   */
  private handleTouchEnd(e: TouchEvent): void {
    const touchEndY = e.changedTouches[0].clientY;
    const touchDuration = Date.now() - this.touchStartTime;
    const swipeDistance = this.touchStartY - touchEndY;

    // Swipe threshold: 50px and within 500ms
    if (Math.abs(swipeDistance) > 50 && touchDuration < 500) {
      if (swipeDistance > 0) {
        // Swipe up - next
        this.next();
      } else {
        // Swipe down - previous
        this.previous();
      }
    }
  }

  /**
   * Navigate to previous card
   */
  private previous(): void {
    if (this.isTransitioning || this.currentIndex === 0) return;

    this.isTransitioning = true;
    this.currentIndex--;
    this.showCurrentCard();
  }

  /**
   * Navigate to next card
   */
  private next(): void {
    if (this.isTransitioning || this.currentIndex >= this.queue.length - 1) return;

    this.isTransitioning = true;
    this.tracker.track('card_skip');
    this.currentIndex++;
    this.showCurrentCard();
  }

  /**
   * Show current card
   */
  private async showCurrentCard(): Promise<void> {
    // Clean up previous card
    if (this.currentCard) {
      this.currentCard.destroy();
      this.currentCard = null;
    }

    // Clear container
    if (this.cardContainer) {
      this.cardContainer.innerHTML = '';
    }

    // Update progress
    this.updateProgress();
    this.updateNavButtons();

    const cardData = this.queue[this.currentIndex];

    if (cardData === null) {
      // Ad card
      this.currentCard = new FullAdCard(
        this.cardContainer!,
        this.tracker,
        this.feedId,
        this.gamNetworkCode,
        this.fullCardAdUnit,
        this.vastTagUrl,
        this.currentIndex,
        'interstitial',
        this.pageContext,
        () => this.next()
      );
    } else {
      // Content card
      this.currentCard = new ContentCard(
        this.cardContainer!,
        cardData,
        this.tracker,
        this.feedId,
        this.gamNetworkCode,
        this.companionAdUnit,
        this.currentIndex,
        this.pageContext
      );
    }

    // Allow next transition after short delay
    setTimeout(() => {
      this.isTransitioning = false;
    }, 300);
  }

  /**
   * Update progress indicator
   */
  private updateProgress(): void {
    const progressText = this.element!.querySelector('.hrvstr-progress-text');
    if (progressText) {
      progressText.textContent = `${this.currentIndex + 1} / ${this.queue.length}`;
    }
  }

  /**
   * Update navigation button states
   */
  private updateNavButtons(): void {
    const prevBtn = this.element!.querySelector(
      '.hrvstr-nav-prev'
    ) as HTMLButtonElement;
    const nextBtn = this.element!.querySelector(
      '.hrvstr-nav-next'
    ) as HTMLButtonElement;

    if (prevBtn) {
      prevBtn.disabled = this.currentIndex === 0;
    }

    if (nextBtn) {
      nextBtn.disabled = this.currentIndex >= this.queue.length - 1;
    }
  }

  /**
   * Lock body scroll
   */
  private lockBodyScroll(): void {
    document.body.style.overflow = 'hidden';
  }

  /**
   * Unlock body scroll
   */
  private unlockBodyScroll(): void {
    document.body.style.overflow = '';
  }

  /**
   * Close lightbox
   */
  close(): void {
    this.unlockBodyScroll();
    document.removeEventListener('keydown', this.handleKeydown);

    if (this.currentCard) {
      this.currentCard.destroy();
      this.currentCard = null;
    }

    if (this.element) {
      this.element.remove();
      this.element = null;
    }

    this.onClose();
  }
}
