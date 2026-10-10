import { describe, it, expect, vi, beforeEach } from 'vitest';

const upload = vi.fn();
const remove = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ upload, remove }) } },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { uploadDisputeFiles, validateFile } from '../disputeUploadUtils';

describe('uploadDisputeFiles', () => {
  beforeEach(() => { upload.mockReset(); remove.mockReset(); });

  it("envoie dans le dossier de l'utilisateur et renvoie des chemins (pas de lien signé)", async () => {
    upload.mockResolvedValue({ error: null });
    const f = new File(['x'], 'acte.PDF', { type: 'application/pdf' });
    const paths = await uploadDisputeFiles([f], 'uid-1', 'dispute');
    expect(paths).toHaveLength(1);
    expect(paths[0]).toMatch(/^uid-1\/land-disputes\/dispute_[0-9a-f-]+\.pdf$/);
  });

  it('supprime les fichiers déjà envoyés en cas d\'échec', async () => {
    upload.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: 'refus' } });
    const a = new File(['x'], 'a.png', { type: 'image/png' });
    const b = new File(['x'], 'b.png', { type: 'image/png' });
    await expect(uploadDisputeFiles([a, b], 'uid-1', 'lifting')).rejects.toThrow(/b\.png/);
    expect(remove).toHaveBeenCalledWith([expect.stringMatching(/^uid-1\/land-disputes\//)]);
  });

  it('refuse les formats non autorisés', () => {
    expect(validateFile(new File(['x'], 'a.exe', { type: 'application/x-msdownload' }))).toBe(false);
  });
});
