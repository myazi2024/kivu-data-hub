import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyLoadingLogo } from '../loadingLogo';

describe('loading logo', () => {
  const originalImage = window.Image;
  afterEach(() => {
    vi.stubGlobal('Image', originalImage);
    vi.unstubAllGlobals();
    applyLoadingLogo();
  });

  it('keeps the spinner when no image is configured', () => {
    applyLoadingLogo('', 'none');
    expect(document.documentElement.dataset.loadingLogo).toBeUndefined();
    expect(document.documentElement.dataset.loadingAnimation).toBe('none');
  });

  it('uses a valid loaded image and falls back on failure', () => {
    let image: { onload?: () => void; onerror?: () => void; src?: string } = {};
    vi.stubGlobal('Image', class { onload?: () => void; onerror?: () => void; src?: string; constructor() { image = this; } });
    applyLoadingLogo('https://example.com/logo.png', 'rotate');
    image.onload?.();
    expect(document.documentElement.dataset.loadingLogo).toBe('ready');
    expect(document.documentElement.dataset.loadingAnimation).toBe('rotate');
    expect(document.documentElement.style.getPropertyValue('--loading-logo-image')).toContain('logo.png');
    image.onerror?.();
    expect(document.documentElement.dataset.loadingLogo).toBeUndefined();
  });

  it('ignores stale image responses and unsupported URL schemes', () => {
    const images: Array<{ onload?: () => void; src?: string }> = [];
    vi.stubGlobal('Image', class { onload?: () => void; src?: string; constructor() { images.push(this); } });
    applyLoadingLogo('https://example.com/old.png');
    applyLoadingLogo('https://example.com/new.png');
    images[0].onload?.();
    expect(document.documentElement.dataset.loadingLogo).toBeUndefined();
    images[1].onload?.();
    expect(document.documentElement.style.getPropertyValue('--loading-logo-image')).toContain('new.png');
    applyLoadingLogo('javascript:alert(1)');
    expect(document.documentElement.dataset.loadingLogo).toBeUndefined();
  });
});