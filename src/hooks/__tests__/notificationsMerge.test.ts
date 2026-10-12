import { describe, it, expect } from 'vitest';
import { upsertInPages, removeFromPages, type Notification } from '@/hooks/useNotifications';

const n = (id: string, is_read = false): Notification => ({
  id, title: 't', message: 'm', type: 'info', is_read, created_at: '2026-01-01T00:00:00Z',
});
const pages = (...p: Notification[][]) => ({ pages: p, pageParams: p.map(() => null) });

describe('fusion des notifications', () => {
  it('ajoute une nouvelle notification en tête', () => {
    expect(upsertInPages(pages([n('a')]), n('b'))!.pages[0].map((x) => x.id)).toEqual(['b', 'a']);
  });
  it('ne duplique pas un message reçu deux fois', () => {
    const d = upsertInPages(upsertInPages(pages([n('a')]), n('b')), n('b'));
    expect(d!.pages.flat().filter((x) => x.id === 'b')).toHaveLength(1);
  });
  it('met à jour en place (lecture dans un autre onglet)', () => {
    const d = upsertInPages(pages([n('a')], [n('b')]), n('b', true));
    expect(d!.pages[1][0].is_read).toBe(true);
  });
  it('supprime sur toutes les pages', () => {
    expect(removeFromPages(pages([n('a')], [n('b')]), 'b')!.pages.flat()).toHaveLength(1);
  });
});
