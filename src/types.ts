// Core configuration types

export interface HrvstrConfig {
  feedId: string;
  container?: HTMLElement;
  pageContext?: Record<string, string>;
  gamNetworkCode?: string;
  maxCardsPerSession?: number;
  eventEndpoint?: string;
  vastTagUrl?: string;
  companionAdUnit?: string;
  fullCardAdUnit?: string;
}

// Feed data structures

export interface FeedCard {
  id: string;
  canonical_id: string;
  type: 'instagram' | 'tiktok' | 'youtube';
  embed_url?: string;
  fallback_image: string;
  title: string;
  platform_url: string;
  tier?: 'recent' | 'popular' | 'evergreen';
}

export interface FeedSettings {
  title: string;
  thumbnail: string;
  cta_text: string;
  max_cards_per_session: number;
}

export interface FeedResponse {
  settings: FeedSettings;
  recent: FeedCard[];
  popular: FeedCard[];
  evergreen: FeedCard[];
}

// Ad types

export interface AdSlotConfig {
  divId: string;
  adUnitPath: string;
  sizes: googletag.GeneralSize;
  targeting?: Record<string, string>;
}

export interface CompanionAdConfig {
  feedId: string;
  tier: string;
  cardIndex: number;
  device: 'mobile' | 'desktop';
  pageContext?: Record<string, string>;
}

export interface FullCardAdConfig extends CompanionAdConfig {
  adPosition: string;
}

// Analytics event types

export type EventType =
  | 'feed_open'
  | 'feed_close'
  | 'card_view'
  | 'card_engaged'
  | 'card_complete'
  | 'card_skip'
  | 'ad_request'
  | 'ad_viewable'
  | 'ad_complete';

export interface AnalyticsEvent {
  event_type: EventType;
  feed_id: string;
  session_id: string;
  card_id?: string;
  canonical_id?: string;
  tier?: string;
  card_index?: number;
  device: 'mobile' | 'desktop';
  slot?: 'companion' | 'full_card';
  timestamp: number;
  page_context?: Record<string, string>;
}

// Session state

export interface SessionState {
  sessionId: string;
  feedId: string;
  startTier: 'recent' | 'popular' | 'evergreen';
  currentIndex: number;
  viewedCardIds: Set<string>;
  events: AnalyticsEvent[];
}

// Rotation state (persisted in localStorage)

export interface RotationState {
  lastSessionDate: string; // YYYY-MM-DD
  nextTier: 'recent' | 'popular' | 'evergreen';
}

// VAST types (simplified)

export interface VASTConfig {
  tagUrl: string;
  container: HTMLElement;
  onComplete?: () => void;
  onSkip?: () => void;
  onError?: () => void;
}

// Global window interface extensions

declare global {
  interface Window {
    hrvstr: {
      init: (config: HrvstrConfig) => HrvstrWidget;
      _instances: Map<string, HrvstrWidget>;
    };
    googletag: typeof googletag;
    dataLayer?: any[];
  }
}

// Widget interface

export interface HrvstrWidget {
  destroy: () => void;
  open: () => void;
  close: () => void;
}
