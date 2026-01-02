import { AnalyticsEvent, EventType } from '../types';
import { getDeviceType } from '../ads/gpt';

/**
 * Analytics tracker with event batching
 * Batches events and sends to backend every 2-5 seconds
 */

export class AnalyticsTracker {
  private sessionId: string;
  private feedId: string;
  private eventQueue: AnalyticsEvent[] = [];
  private batchInterval: number | null = null;
  private endpoint: string;
  private pageContext?: Record<string, string>;
  private readonly BATCH_INTERVAL_MS = 3000; // 3 seconds
  private readonly MAX_RETRIES = 3;

  constructor(
    sessionId: string,
    feedId: string,
    endpoint: string,
    pageContext?: Record<string, string>
  ) {
    this.sessionId = sessionId;
    this.feedId = feedId;
    this.endpoint = endpoint;
    this.pageContext = pageContext;
    this.startBatching();
  }

  /**
   * Track an event
   */
  track(
    eventType: EventType,
    data?: {
      cardId?: string;
      canonicalId?: string;
      tier?: string;
      cardIndex?: number;
      slot?: 'companion' | 'full_card';
    }
  ): void {
    const event: AnalyticsEvent = {
      event_type: eventType,
      feed_id: this.feedId,
      session_id: this.sessionId,
      device: getDeviceType(),
      timestamp: Date.now(),
      ...data,
    };

    if (this.pageContext) {
      event.page_context = this.pageContext;
    }

    this.eventQueue.push(event);

    // Push to GTM dataLayer if available
    this.pushToGTM(event);
  }

  /**
   * Push event to Google Tag Manager dataLayer
   */
  private pushToGTM(event: AnalyticsEvent): void {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'hrvstr_event',
        hrvstr_event_type: event.event_type,
        hrvstr_feed_id: event.feed_id,
        hrvstr_session_id: event.session_id,
        hrvstr_card_id: event.card_id,
        hrvstr_tier: event.tier,
        hrvstr_device: event.device,
      });
    }
  }

  /**
   * Start batching timer
   */
  private startBatching(): void {
    this.batchInterval = window.setInterval(() => {
      this.flush();
    }, this.BATCH_INTERVAL_MS);
  }

  /**
   * Flush event queue immediately
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    await this.sendEvents(eventsToSend);
  }

  /**
   * Send events to backend with retry logic
   */
  private async sendEvents(
    events: AnalyticsEvent[],
    retryCount = 0
  ): Promise<void> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      });

      if (!response.ok && retryCount < this.MAX_RETRIES) {
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        await this.sendEvents(events, retryCount + 1);
      }
    } catch (error) {
      console.error('Failed to send analytics events:', error);

      // Retry with backoff
      if (retryCount < this.MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        await this.sendEvents(events, retryCount + 1);
      }
    }
  }

  /**
   * Stop batching and flush remaining events
   */
  async destroy(): Promise<void> {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }

    await this.flush();
  }
}

/**
 * Generate unique session ID
 */
export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
