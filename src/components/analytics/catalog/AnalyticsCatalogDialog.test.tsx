import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/ui/button';
import AnalyticsCatalogDialog from './AnalyticsCatalogDialog';
import AnalyticsCatalogItem from './AnalyticsCatalogItem';

vi.mock('./AnalyticsCatalog', () => ({ default: () => <p>Visuels du catalogue</p> }));
afterEach(cleanup);

describe('Analytics catalogue overlay', () => {
  it('opens above the page, blocks outside dismissal and restores the trigger focus', async () => {
    render(<><h1>Données foncières</h1><AnalyticsCatalogDialog trigger={<Button>Demander l’accès</Button>} /></>);
    const trigger = screen.getByRole('button', { name: 'Demander l’accès' });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Catalogue des données' })).toBeInTheDocument();
    expect(screen.getByText('Visuels du catalogue')).toBeVisible();
    fireEvent.pointerDown(document.body);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await vi.waitFor(() => expect(trigger).toHaveFocus());
  });
});

describe('Analytics catalogue item', () => {
  const item = { tab_key: 'taxes', item_key: 'tax', title: 'Taxes déclarées', kind: 'Graphique', price_usd: 5, days: 30, description: 'Répartition des taxes' };
  it('shows currency, selects with a labelled checkbox and expands details', () => {
    const onToggle = vi.fn();
    render(<AnalyticsCatalogItem item={item} selected={false} owned={false} priceLabel="5,00 USD" onToggle={onToggle} />);
    expect(screen.getByText('5,00 USD')).toBeVisible();
    fireEvent.click(screen.getByRole('checkbox', { name: item.title }));
    expect(onToggle).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: `Détails : ${item.title}` }));
    expect(screen.getByText('Accès 30 jours')).toBeVisible();
    expect(screen.getByText(item.description)).toBeVisible();
  });
  it('prevents buying an already owned visual', () => {
    const onToggle = vi.fn();
    render(<AnalyticsCatalogItem item={item} selected={false} owned expiry="2027-01-01" priceLabel="5 USD" onToggle={onToggle} />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByText('Déjà acheté')).toBeVisible();
  });
});