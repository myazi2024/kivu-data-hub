import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import CatalogSelectionRow from './CatalogSelectionRow';

afterEach(cleanup);
it('selects once from row or checkbox, but not from the details command', () => {
  const onSelect = vi.fn();
  const onExpand = vi.fn();
  render(<CatalogSelectionRow title="Titre foncier" icon={<span />} selected={false} expanded={false} priceLabel="5 USD" onSelect={onSelect} onExpand={onExpand} />);
  fireEvent.click(screen.getByRole('heading'));
  expect(onSelect).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(onSelect).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Détails : Titre foncier' }));
  expect(onExpand).toHaveBeenCalledOnce();
  expect(onSelect).toHaveBeenCalledTimes(2);
});
it('keeps unavailable services disabled with the compact reference layout', () => {
  const onSelect = vi.fn();
  render(<CatalogSelectionRow title="Service indisponible" icon={<span />} selected={false} expanded={false} available={false} disabled priceLabel="5 USD" onSelect={onSelect} onExpand={() => {}} />);
  expect(screen.getByRole('checkbox')).toBeDisabled();
  fireEvent.click(screen.getByRole('heading'));
  expect(onSelect).not.toHaveBeenCalled();
});