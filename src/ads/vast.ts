import { VASTConfig } from '../types';

/**
 * Simplified VAST video ad player
 * Supports autoplay muted with immediate skip functionality
 */

export class VASTPlayer {
  private container: HTMLElement;
  private videoElement: HTMLVideoElement | null = null;
  private skipButton: HTMLButtonElement | null = null;
  private tagUrl: string;
  private onComplete?: () => void;
  private onSkip?: () => void;
  private onError?: () => void;
  private destroyed = false;

  constructor(config: VASTConfig) {
    this.container = config.container;
    this.tagUrl = config.tagUrl;
    this.onComplete = config.onComplete;
    this.onSkip = config.onSkip;
    this.onError = config.onError;
  }

  /**
   * Load and play VAST ad
   */
  async load(): Promise<void> {
    if (this.destroyed) return;

    try {
      // Parse VAST XML
      const vastXml = await this.fetchVAST();
      const videoUrl = this.parseVASTMediaFile(vastXml);

      if (!videoUrl) {
        throw new Error('No video URL found in VAST response');
      }

      // Create video element
      this.createVideoPlayer(videoUrl);
    } catch (error) {
      console.error('VAST load error:', error);
      this.onError?.();
    }
  }

  /**
   * Fetch VAST XML from tag URL
   */
  private async fetchVAST(): Promise<Document> {
    // Add random correlator
    const separator = this.tagUrl.includes('?') ? '&' : '?';
    const urlWithCorrelator = `${this.tagUrl}${separator}correlator=${Date.now()}${Math.random()}`;

    const response = await fetch(urlWithCorrelator);
    const xmlText = await response.text();

    const parser = new DOMParser();
    return parser.parseFromString(xmlText, 'text/xml');
  }

  /**
   * Extract video URL from VAST XML
   */
  private parseVASTMediaFile(vastDoc: Document): string | null {
    const mediaFiles = vastDoc.getElementsByTagName('MediaFile');

    for (let i = 0; i < mediaFiles.length; i++) {
      const mediaFile = mediaFiles[i];
      const type = mediaFile.getAttribute('type');

      // Prefer MP4
      if (type?.includes('mp4')) {
        return mediaFile.textContent?.trim() || null;
      }
    }

    // Fallback to first media file
    return mediaFiles[0]?.textContent?.trim() || null;
  }

  /**
   * Create video player with controls
   */
  private createVideoPlayer(videoUrl: string): void {
    // Create video element
    this.videoElement = document.createElement('video');
    this.videoElement.className = 'hrvstr-vast-video';
    this.videoElement.src = videoUrl;
    this.videoElement.muted = true;
    this.videoElement.playsInline = true;
    this.videoElement.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000;
    `;

    // Create skip button (always enabled)
    this.skipButton = document.createElement('button');
    this.skipButton.className = 'hrvstr-vast-skip';
    this.skipButton.textContent = 'Skip Ad';
    this.skipButton.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      padding: 8px 16px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border: 1px solid white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      z-index: 10;
    `;

    // Event listeners
    this.videoElement.addEventListener('ended', () => {
      this.handleComplete();
    });

    this.videoElement.addEventListener('error', () => {
      console.error('Video playback error');
      this.onError?.();
    });

    this.skipButton.addEventListener('click', () => {
      this.handleSkip();
    });

    // Append to container
    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    this.container.appendChild(this.videoElement);
    this.container.appendChild(this.skipButton);

    // Autoplay
    this.videoElement.play().catch((error) => {
      console.error('Autoplay failed:', error);
      // Show play button overlay if autoplay fails
      this.showPlayButton();
    });
  }

  /**
   * Show manual play button if autoplay fails
   */
  private showPlayButton(): void {
    const playButton = document.createElement('button');
    playButton.className = 'hrvstr-vast-play';
    playButton.innerHTML = '&#9658;'; // Play symbol
    playButton.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 60px;
      height: 60px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border: 2px solid white;
      border-radius: 50%;
      cursor: pointer;
      font-size: 24px;
      z-index: 10;
    `;

    playButton.addEventListener('click', () => {
      this.videoElement?.play();
      playButton.remove();
    });

    this.container.appendChild(playButton);
  }

  /**
   * Handle video completion
   */
  private handleComplete(): void {
    this.onComplete?.();
    this.destroy();
  }

  /**
   * Handle skip button click
   */
  private handleSkip(): void {
    this.onSkip?.();
    this.destroy();
  }

  /**
   * Clean up player
   */
  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;

    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = '';
      this.videoElement.remove();
      this.videoElement = null;
    }

    if (this.skipButton) {
      this.skipButton.remove();
      this.skipButton = null;
    }

    this.container.innerHTML = '';
  }
}
