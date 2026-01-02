import { FeedCard, FeedResponse, RotationState } from '../types';

/**
 * Feed rotation and tier management
 * Handles daily rotation of start tier and queue building
 */

const STORAGE_KEY = 'hrvstr_rotation_state';
const TIER_ORDER: Array<'recent' | 'popular' | 'evergreen'> = [
  'recent',
  'popular',
  'evergreen',
];

/**
 * Get today's date as YYYY-MM-DD
 */
function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Load rotation state from localStorage
 */
function loadRotationState(feedId: string): RotationState {
  try {
    const key = `${STORAGE_KEY}_${feedId}`;
    const stored = localStorage.getItem(key);

    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load rotation state:', error);
  }

  // Default state
  return {
    lastSessionDate: getTodayDate(),
    nextTier: 'recent',
  };
}

/**
 * Save rotation state to localStorage
 */
function saveRotationState(feedId: string, state: RotationState): void {
  try {
    const key = `${STORAGE_KEY}_${feedId}`;
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save rotation state:', error);
  }
}

/**
 * Get next tier in rotation
 */
function getNextTier(
  currentTier: 'recent' | 'popular' | 'evergreen'
): 'recent' | 'popular' | 'evergreen' {
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  const nextIndex = (currentIndex + 1) % TIER_ORDER.length;
  return TIER_ORDER[nextIndex];
}

/**
 * Determine start tier for current session
 */
export function getStartTier(
  feedId: string
): 'recent' | 'popular' | 'evergreen' {
  const state = loadRotationState(feedId);
  const today = getTodayDate();

  // Reset daily
  if (state.lastSessionDate !== today) {
    // New day - start with Recent
    const newState: RotationState = {
      lastSessionDate: today,
      nextTier: 'popular', // Next session will be Popular
    };
    saveRotationState(feedId, newState);
    return 'recent';
  }

  // Same day - use rotation
  const startTier = state.nextTier;
  const nextTier = getNextTier(startTier);

  const updatedState: RotationState = {
    lastSessionDate: today,
    nextTier,
  };
  saveRotationState(feedId, updatedState);

  return startTier;
}

/**
 * Build session queue from feed response
 */
export function buildSessionQueue(
  feedResponse: FeedResponse,
  startTier: 'recent' | 'popular' | 'evergreen',
  maxCards: number
): FeedCard[] {
  const { recent, popular, evergreen } = feedResponse;

  // Tag cards with their tier
  const taggedRecent = recent.map((card) => ({ ...card, tier: 'recent' as const }));
  const taggedPopular = popular.map((card) => ({
    ...card,
    tier: 'popular' as const,
  }));
  const taggedEvergreen = evergreen.map((card) => ({
    ...card,
    tier: 'evergreen' as const,
  }));

  // Build queue based on start tier
  let queue: FeedCard[] = [];

  if (startTier === 'recent') {
    queue = [...taggedRecent, ...taggedPopular, ...taggedEvergreen];
  } else if (startTier === 'popular') {
    queue = [...taggedPopular, ...taggedEvergreen, ...taggedRecent];
  } else {
    queue = [...taggedEvergreen, ...taggedRecent, ...taggedPopular];
  }

  // Limit to max cards
  return queue.slice(0, maxCards);
}

/**
 * Insert ad cards into queue
 * Full ad card every 4 content cards
 */
export function insertAdCards(contentCards: FeedCard[]): Array<FeedCard | null> {
  const result: Array<FeedCard | null> = [];
  const AD_FREQUENCY = 4; // Every 4 content cards

  contentCards.forEach((card, index) => {
    result.push(card);

    // Insert ad card after every 4th content card
    if ((index + 1) % AD_FREQUENCY === 0 && index < contentCards.length - 1) {
      result.push(null); // null represents an ad card
    }
  });

  return result;
}
