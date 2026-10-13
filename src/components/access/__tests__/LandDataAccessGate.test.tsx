import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { LAND_DATA_ROLES } from '@/constants/roles';
import LandDataAccessGate from '../LandDataAccessGate';

const { auth } = vi.hoisted(() => ({
  auth: { user: { id: 'test-user' } as { id: string } | null, profile: { role: 'user' } as { role: string } | null, loading: false },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/components/ui/navigation', () => ({ default: () => <nav aria-label="Navigation" /> }));
vi.mock('@/components/ui/loading-indicator', () => ({ LoadingIndicator: () => <span>Chargement</span> }));

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
});

describe('LandDataAccessGate', () => {
  it('invites a non-authorized user without exposing protected content', () => {
    renderGate();
    expect(screen.getByRole('heading', { name: 'Données foncières' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Demander l’accès' })).toHaveAttribute('href', '/partnership');
    expect(screen.getByText(/après examen de votre demande/)).toBeInTheDocument();
    expect(screen.queryByText('Données protégées')).not.toBeInTheDocument();
    expect(screen.queryByText(/non accessibles|Accès réservé|PII/)).not.toBeInTheDocument();
    expect(screen.getByText('Visualisez les territoires')).toBeInTheDocument();
    expect(screen.getByText('Analysez les tendances foncières')).toBeInTheDocument();
    expect(screen.getByText('Partagez vos analyses')).toBeInTheDocument();
  });

  it('reserves separate desktop and mobile preview areas without fake images', () => {
    const { container } = renderGate();
    expect(container.querySelector('[data-preview="desktop"]')).toHaveClass('hidden', 'md:flex', 'aspect-video');
    expect(container.querySelector('[data-preview="mobile"]')).toHaveClass('md:hidden', 'aspect-[3/4]');
    expect(container.querySelector('img')).toBeNull();
  });

  it.each(LAND_DATA_ROLES)('preserves access for %s', (role) => {
    auth.profile = { role };
    renderGate();
    expect(screen.getByText('Données protégées')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Demander l’accès' })).not.toBeInTheDocument();
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
    expect(screen.queryByRole('link', { name: 'Demander l’accès' })).not.toBeInTheDocument();
  });
});