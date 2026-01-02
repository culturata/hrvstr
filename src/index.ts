import './styles.css';
import { HrvstrConfig, HrvstrWidget } from './types';
import { Widget } from './widget';

/**
 * hrvstr SDK entry point
 * Provides init method and auto-initialization from script tag
 */

// Global instances map
const instances = new Map<string, HrvstrWidget>();

/**
 * Initialize hrvstr widget
 */
function init(config: HrvstrConfig): HrvstrWidget {
  const widget = new Widget(config);
  instances.set(config.feedId, widget);
  return widget;
}

/**
 * Auto-initialize from script tag dataset
 */
function autoInit(): void {
  const scripts = document.querySelectorAll(
    'script[data-feed-id]'
  ) as NodeListOf<HTMLScriptElement>;

  scripts.forEach((script) => {
    const feedId = script.dataset.feedId;
    const placement = script.dataset.placement || 'inline';

    if (!feedId) return;

    // Create container based on placement
    let container: HTMLElement | undefined;

    if (placement === 'inline') {
      container = document.createElement('div');
      container.className = 'hrvstr-inline-container';
      script.parentNode?.insertBefore(container, script.nextSibling);
    }

    // Parse additional config from dataset
    const config: HrvstrConfig = {
      feedId,
      container,
      gamNetworkCode: script.dataset.gamNetworkCode,
      pageContext: script.dataset.pageContext
        ? JSON.parse(script.dataset.pageContext)
        : undefined,
    };

    init(config);
  });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  autoInit();
}

// Export SDK
const hrvstrSDK = {
  init,
  _instances: instances,
};

// Expose to window
if (typeof window !== 'undefined') {
  window.hrvstr = hrvstrSDK;
}

export default hrvstrSDK;
