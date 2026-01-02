import { FeedSettings } from '../types';

/**
 * Inline teaser component
 * Renders a clickable teaser that opens the lightbox
 */

export class TeaserComponent {
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private onOpen: () => void;

  constructor(container: HTMLElement, settings: FeedSettings, onOpen: () => void) {
    this.container = container;
    this.onOpen = onOpen;
    this.render(settings);
  }

  /**
   * Render teaser
   */
  private render(settings: FeedSettings): void {
    this.element = document.createElement('div');
    this.element.className = 'hrvstr-teaser';

    this.element.innerHTML = `
      <img
        src="${settings.thumbnail}"
        alt="${settings.title}"
        class="hrvstr-teaser-thumbnail"
      />
      <div class="hrvstr-teaser-content">
        <h3 class="hrvstr-teaser-title">${settings.title}</h3>
        <span class="hrvstr-teaser-cta">${settings.cta_text}</span>
      </div>
    `;

    this.element.addEventListener('click', () => {
      this.onOpen();
    });

    this.container.appendChild(this.element);
  }

  /**
   * Clean up
   */
  destroy(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}
