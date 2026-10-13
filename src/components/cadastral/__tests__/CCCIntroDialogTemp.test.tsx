import { render, screen } from '@testing-library/react';
import CCCIntroDialog from '../CCCIntroDialog';

const props = (parcelNumber: string) => ({
  open: true,
  onOpenChange: () => {},
  onContinue: () => {},
  parcelNumber,
});

const paragraph = () => screen.getAllByText(/cadastre numérique de la République/i)[0].textContent || '';

it('explique le service et rappelle le numéro recherché', () => {
  render(<CCCIntroDialog {...props('  SU/TEST/1  ')} />);
  expect(screen.getByText('À propos de ce service')).toBeTruthy();
  const text = paragraph();
  expect(text).toContain('SU/TEST/1');
  expect(text).toContain('y apparaît, son dossier');
  expect(text).not.toContain(' ,');
  expect(text).toContain('registre national');
});

it('reste lisible quand aucun numéro n’est recherché', () => {
  render(<CCCIntroDialog {...props('')} />);
  const text = paragraph();
  expect(text).toContain('si elle y apparaît déjà, son dossier');
  expect(text).not.toContain('«');
});
