import { AdSlotConfig } from '../types';

/**
 * GPT (Google Publisher Tag) helper module
 * Handles loading and managing Google Ad Manager slots
 */

let gptLoaded = false;
let gptLoadPromise: Promise<void> | null = null;
const activeSlots = new Map<string, googletag.Slot>();

/**
 * Load GPT library once and initialize
 */
export async function loadGptOnce(): Promise<void> {
  if (gptLoaded) {
    return Promise.resolve();
  }

  if (gptLoadPromise) {
    return gptLoadPromise;
  }

  gptLoadPromise = new Promise((resolve, reject) => {
    // Initialize googletag queue
    window.googletag = window.googletag || { cmd: [] };

    const script = document.createElement('script');
    script.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
    script.async = true;

    script.onload = () => {
      window.googletag.cmd.push(() => {
        window.googletag.pubads().enableSingleRequest();
        window.googletag.pubads().disableInitialLoad();
        window.googletag.enableServices();
        gptLoaded = true;
        resolve();
      });
    };

    script.onerror = () => {
      gptLoadPromise = null;
      reject(new Error('Failed to load GPT'));
    };

    document.head.appendChild(script);
  });

  return gptLoadPromise;
}

/**
 * Define or update an ad slot
 */
export function defineOrUpdateSlot(config: AdSlotConfig): googletag.Slot {
  const { divId, adUnitPath, sizes, targeting } = config;

  // Check if slot already exists
  const existingSlot = activeSlots.get(divId);
  if (existingSlot) {
    // Update targeting
    if (targeting) {
      Object.entries(targeting).forEach(([key, value]) => {
        existingSlot.setTargeting(key, value);
      });
    }
    return existingSlot;
  }

  // Define new slot
  let slot: googletag.Slot | null = null;

  window.googletag.cmd.push(() => {
    slot = window.googletag
      .defineSlot(adUnitPath, sizes, divId)
      ?.addService(window.googletag.pubads()) || null;

    if (slot && targeting) {
      Object.entries(targeting).forEach(([key, value]) => {
        slot!.setTargeting(key, value);
      });
    }

    if (slot) {
      activeSlots.set(divId, slot);
    }
  });

  return slot!;
}

/**
 * Display an ad slot
 */
export function displaySlot(divId: string): void {
  window.googletag.cmd.push(() => {
    window.googletag.display(divId);
    window.googletag.pubads().refresh([activeSlots.get(divId)!]);
  });
}

/**
 * Destroy an ad slot and clean up
 */
export function destroySlot(divId: string): void {
  const slot = activeSlots.get(divId);
  if (!slot) return;

  window.googletag.cmd.push(() => {
    window.googletag.destroySlots([slot]);
    activeSlots.delete(divId);
  });
}

/**
 * Destroy all active slots (cleanup on widget destroy)
 */
export function destroyAllSlots(): void {
  if (activeSlots.size === 0) return;

  const slots = Array.from(activeSlots.values());
  window.googletag.cmd.push(() => {
    window.googletag.destroySlots(slots);
    activeSlots.clear();
  });
}

/**
 * Get device type for targeting
 */
export function getDeviceType(): 'mobile' | 'desktop' {
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
}
