import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { LAND_DATA_ROLES } from '@/constants/roles';
import LandDataAccessGate from '../LandDataAccessGate';

const { auth } = vi.hoisted(() => ({
  auth: { user: { id: 'test-user' } as { id: string } | null, profile: { role: 'user' } as { role: string } | null, loading: false },
}));
const { appearance } = vi.hoisted(() => ({ appearance: { config: {} as Record<string, string> } }));
vi.mock('@/hooks/useAppAppearance', () => ({ useAppAppearance: () => ({ config: appearance.config, loading: false }) }));
const { purchased } = vi.hoisted(() => ({ purchased: { keys: [] as string[] } }));
vi.mock('@/hooks/useAnalyticsAccess', () => ({
  useMyAnalyticsAccess: () => ({ allowed: new Set(purchased.keys), isLoading: false }),
  AnalyticsAccessProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/components/ui/navigation', () => ({ default: () => <nav aria-label="Navigation" /> }));
vi.mock('@/components/ui/loading-indicator', () => ({ LoadingIndicator: () => <span>Chargement</span> }));

vi.mock('@/components/access/AccessPlansDialog', () => ({ default: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</> }));

function renderGate() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/map']}>
        <Routes>
          <Route path="/map" element={<LandDataAccessGate><div>Données protégées</div></LandDataAccessGate>} />
          <Route path="/auth" element={<div>Connexion</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

afterEach(() => {
  cleanup();
  auth.user = { id: 'test-user' };
  auth.profile = { role: 'user' };
  auth.loading = false;
  localStorage.clear();
  appearance.config = {};
  purchased.keys = [];
});

describe('LandDataAccessGate', () => {
  it('invites a non-authorized user without exposing protected content', () => {
    renderGate();
    expect(screen.getByRole('heading', { name: 'Données foncières' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Demander l’accès' })).toBeInTheDocument();
    expect(screen.getByText(/ne payez que ce dont vous avez besoin/)).toBeInTheDocument();
    expect(screen.queryByText('Données protégées')).not.toBeInTheDocument();
    expect(screen.queryByText(/non accessibles|Accès réservé|PII/)).not.toBeInTheDocument();
    expect(screen.getByText('Visualisez les territoires')).toBeInTheDocument();
    expect(screen.getByText('Analysez les tendances foncières')).toBeInTheDocument();
    expect(screen.getByText('Partagez vos analyses')).toBeInTheDocument();
  });

  it('reserves separate desktop and mobile preview areas without fake images', () => {
    const { container } = renderGate();
    expect(container.querySelector('[data-preview="desktop"]')).toHaveClass('hidden', 'md:flex', 'h-full', 'min-h-0');
    expect(container.querySelector('[data-preview="mobile"]')).toHaveClass('md:hidden', 'h-full', 'min-h-0');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.land-data-discovery')).toHaveClass('h-dvh');
    expect(container.querySelector('main')).toHaveClass('min-h-0', 'flex-1');
  });

  it('shows admin-managed captures for each screen size', () => {
    appearance.config = { land_data_preview_desktop_url: 'https://x/d.png', land_data_preview_mobile_url: 'https://x/m.png' };
    const { container } = renderGate();
    expect(container.querySelector('[data-preview="desktop"] img')).toHaveAttribute('src', 'https://x/d.png');
    expect(container.querySelector('[data-preview="mobile"] img')).toHaveAttribute('src', 'https://x/m.png');
    expect(container.querySelector('[data-preview="mobile"] img')).toHaveClass('object-contain', 'min-h-0');
  });

  it.each(LAND_DATA_ROLES)('preserves access for %s', (role) => {
    auth.profile = { role };
    renderGate();
    expect(screen.getByText('Données protégées')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Demander l’accès' })).not.toBeInTheDocument();
  });

  it('lets a non-authorized user in once a visual is purchased', () => {
    purchased.keys = ['taxes::kpi-total'];
    renderGate();
    expect(screen.getByText('Données protégées')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Acheter d'autres visuels/ })).toBeInTheDocument();
  });

  it('redirects a signed-out visitor to authentication', () => {
    auth.user = null;
    auth.profile = null;
    renderGate();
    expect(screen.getByText('Connexion')).toBeInTheDocument();
    expect(localStorage.getItem('auth_redirect_url')).toBe(window.location.pathname);
  });

  it.each(['session', 'profile'])('waits for the %s before displaying content', (state) => {
    if (state === 'session') auth.loading = true;
    else auth.profile = null;
    renderGate();
    expect(screen.getByText('Chargement')).toBeInTheDocument();
    expect(screen.queryByText('Données protégées')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Demander l’accès' })).not.toBeInTheDocument();
  });
});