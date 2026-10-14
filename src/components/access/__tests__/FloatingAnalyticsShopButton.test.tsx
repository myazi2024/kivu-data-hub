import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FloatingAnalyticsShopButton from '../FloatingAnalyticsShopButton';

const dialogProps = vi.hoisted(() => ({ opens: 0, prevOpen: false, lastOpen: false }));
vi.mock('@/components/analytics/catalog/AnalyticsCatalogDialog', () => ({
  default: (props: { open?: boolean }) => {
    if (props.open === true && !dialogProps.prevOpen) dialogProps.opens += 1;
    dialogProps.prevOpen = props.open === true;
    dialogProps.lastOpen = props.open === true;
    return null;
  },
}));

const KEY = 'bic-analytics-shop-fab';

function firePointer(el: Element, type: string, opts: { pointerId?: number; clientX?: number; clientY?: number } = {}) {
  // jsdom n'a pas PointerEvent : on assigne les propriétés à la main sur un Event.
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, {
    pointerId: opts.pointerId ?? 1,
    pointerType: 'touch',
    clientX: opts.clientX ?? 0,
    clientY: opts.clientY ?? 0,
    button: 0,
  });
  fireEvent(el, event);
}

beforeEach(() => {
  localStorage.clear();
  dialogProps.opens = 0;
  dialogProps.prevOpen = false;
  dialogProps.lastOpen = false;
});

afterEach(() => {
  cleanup();
});

describe('FloatingAnalyticsShopButton', () => {
  it('shows the expanded pill by default with a collapse control', () => {
    render(<FloatingAnalyticsShopButton />);
    const pill = screen.getByRole('button', { name: "Acheter d'autres visuels" });
    expect(pill).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Réduire' })).toBeInTheDocument();
  });

  it('collapses to a round icon and remembers it', () => {
    const { unmount } = render(<FloatingAnalyticsShopButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Réduire' }));

    const icon = screen.getByRole('button', { name: "Acheter d'autres visuels" });
    expect(icon).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText("Acheter d'autres visuels")).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Développer' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(KEY)!)).toMatchObject({ collapsed: true });

    unmount();
    render(<FloatingAnalyticsShopButton />);
    expect(screen.getByRole('button', { name: "Acheter d'autres visuels" })).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands again from the icon', () => {
    localStorage.setItem(KEY, JSON.stringify({ x: 12, y: 80, collapsed: true }));
    render(<FloatingAnalyticsShopButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Développer' }));
    expect(screen.getByRole('button', { name: "Acheter d'autres visuels" })).toHaveAttribute('aria-expanded', 'true');
    expect(JSON.parse(localStorage.getItem(KEY)!)).toMatchObject({ collapsed: false });
  });

  it('opens the catalog on tap and not after a drag', () => {
    const { container } = render(<FloatingAnalyticsShopButton />);
    const fab = container.querySelector('[data-testid="analytics-shop-fab"]')!;
    const grab = fab.querySelector('button')!;

    // Appui simple : ouverture du catalogue.
    firePointer(grab, 'pointerdown', { clientX: 0, clientY: 0 });
    firePointer(grab, 'pointerup', { clientX: 2, clientY: 1 });
    fireEvent.click(grab);
    expect(dialogProps.opens).toBe(1);
    expect(dialogProps.lastOpen).toBe(true);

    // Glissade : déplacement mémorisé, pas de nouvelle ouverture.
    dialogProps.opens = 0;
    firePointer(grab, 'pointerdown', { pointerId: 2, clientX: 0, clientY: 0 });
    firePointer(grab, 'pointermove', { pointerId: 2, clientX: 120, clientY: 240 });
    firePointer(grab, 'pointerup', { pointerId: 2, clientX: 120, clientY: 240 });
    fireEvent.click(grab);
    expect(dialogProps.opens).toBe(0);
    const stored = JSON.parse(localStorage.getItem(KEY)!);
    console.log("STORED", localStorage.getItem(KEY)); expect(stored.x).toBeGreaterThan(12);
    expect(stored.y).toBeGreaterThan(80);
  });
});
