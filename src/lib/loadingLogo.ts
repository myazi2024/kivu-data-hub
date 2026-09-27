export type LoadingLogoAnimation = 'pulse' | 'rotate' | 'none';

let imageVersion = 0;

/** A single CSS-backed indicator is shared by existing loaders, including lazy-loaded screens. */
export function applyLoadingLogo(logoUrl?: string, animation?: string) {
  const root = document.documentElement;
  root.dataset.loadingAnimation = animation === 'rotate' || animation === 'none' ? animation : 'pulse';
  const version = ++imageVersion;
  root.removeAttribute('data-loading-logo');
  root.style.removeProperty('--loading-logo-image');

  if (!logoUrl) return;
  let url: URL;
  try {
    url = new URL(logoUrl, window.location.origin);
    if (!['https:', 'http:'].includes(url.protocol)) return;
  } catch {
    return;
  }

  const image = new window.Image();
  image.onload = () => {
    if (version !== imageVersion) return;
    root.style.setProperty('--loading-logo-image', `url(${JSON.stringify(url.href)})`);
    root.dataset.loadingLogo = 'ready';
  };
  image.onerror = () => {
    if (version !== imageVersion) return;
    root.removeAttribute('data-loading-logo');
    root.style.removeProperty('--loading-logo-image');
  };
  image.src = url.href;
}