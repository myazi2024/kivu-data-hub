import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AccessPlansDialog from '../AccessPlansDialog';

vi.mock('@/components/analytics/catalog/AnalyticsCatalogDialog', () => ({
  default: ({ open }: { open?: boolean }) => (open ? <p>Catalogue ouvert</p> : null),
}));

afterEach(cleanup);

function renderDialog() {
  return render(
    <MemoryRouter initialEntries={['/donnees-foncieres']}>
      <Routes>
        <Route path="/donnees-foncieres" element={<AccessPlansDialog trigger={<Button>Demander l’accès</Button>} />} />
        <Route path="/partnership" element={<p>Page Partenariat</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AccessPlansDialog', () => {
  it('opens both plans above the page and blocks outside dismissal', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Demander l’accès' }));
    expect(screen.getByRole('dialog', { name: "Choisissez votre formule d'accès" })).toBeInTheDocument();
    expect(screen.getByText("Paiement à l'usage")).toBeVisible();
    expect(screen.getByText('Devenir Partenaire')).toBeVisible();
    expect(screen.getByText(/analyses des\s+hypothèques/)).toBeVisible();
    fireEvent.pointerDown(document.body);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens the data catalog from the pay-as-you-go plan', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Demander l’accès' }));
    fireEvent.click(screen.getByRole('button', { name: /Choisir les visuels/ }));
    expect(screen.getByText('Catalogue ouvert')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('navigates to the partnership page from the partner plan', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Demander l’accès' }));
    fireEvent.click(screen.getByRole('button', { name: /Introduire ma demande/ }));
    expect(screen.getByText('Page Partenariat')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
