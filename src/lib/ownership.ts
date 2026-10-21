import { supabase } from '@/integrations/supabase/client';

export const OWNERSHIP_BUCKET = 'ownership-proofs';
export const MAX_PROOF_BYTES = 10 * 1024 * 1024;
export const PROOF_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export type ExploitationKind = 'water_bill' | 'electricity_bill' | 'tax_receipt' | 'payment_certificate';
export type RightsKind = 'title' | 'contract' | 'court_decision' | 'other_right';
export type ProofKind = ExploitationKind | RightsKind | 'identity';

export const EXPLOITATION_KINDS: { kind: ExploitationKind; label: string }[] = [
  { kind: 'water_bill', label: "Facture d'eau la plus récente" },
  { kind: 'electricity_bill', label: "Facture d'électricité la plus récente" },
  { kind: 'tax_receipt', label: 'Note de perception' },
  { kind: 'payment_certificate', label: 'Certificat de paiement' },
];

export const RIGHTS_KINDS: { kind: RightsKind; label: string }[] = [
  { kind: 'title', label: 'Titre de propriété' },
  { kind: 'contract', label: 'Contrat (vente, donation…)' },
  { kind: 'court_decision', label: 'Décision de justice' },
  { kind: 'other_right', label: 'Autre preuve de droit' },
];

export const PROOF_LABELS: Record<string, string> = {
  identity: "Pièce d'identité",
  ...Object.fromEntries(EXPLOITATION_KINDS.map((k) => [k.kind, k.label])),
  ...Object.fromEntries(RIGHTS_KINDS.map((k) => [k.kind, k.label])),
};

export interface ProofDoc {
  kind: ProofKind;
  path: string;
  name: string;
}

export interface OwnerDeclaration {
  role: 'contributor' | 'owner';
  proofs: ProofDoc[];
}

export type ClaimType = 'contribution' | 'contest';

/** Erreur lisible si le fichier est refusé, sinon null. */
export function validateProofFile(file: File): string | null {
  if (!PROOF_MIME.includes(file.type)) return `${file.name} : format refusé (PDF, JPG, PNG ou WebP).`;
  if (file.size > MAX_PROOF_BYTES) return `${file.name} : 10 Mo maximum.`;
  return null;
}

/** Une déclaration « propriétaire » exige au moins un justificatif d'exploitation. */
export function isOwnerDeclarationComplete(proofs: { kind: string }[]): boolean {
  const allowed = new Set<string>(EXPLOITATION_KINDS.map((k) => k.kind));
  return proofs.some((p) => allowed.has(p.kind));
}

/** Pièces exigées selon le type de revendication (miroir des contrôles serveur). */
export function missingClaimRequirements(
  type: ClaimType,
  docs: { kind: string }[],
  statement: string,
): string[] {
  const kinds = new Set(docs.map((d) => d.kind));
  const missing: string[] = [];
  if (!kinds.has('identity')) missing.push("pièce d'identité");
  if (type === 'contest') {
    if (!RIGHTS_KINDS.some((k) => kinds.has(k.kind))) missing.push('preuve de vos droits');
    if (!EXPLOITATION_KINDS.some((k) => kinds.has(k.kind))) missing.push("preuve d'exploitation");
    if (statement.trim().length < 20) missing.push('explication (20 caractères minimum)');
  }
  return missing;
}

export async function uploadProof(userId: string, kind: ProofKind, file: File): Promise<ProofDoc> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(OWNERSHIP_BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw error;
  return { kind, path, name: file.name.slice(0, 200) };
}

export async function removeProofs(paths: string[]) {
  if (paths.length) await supabase.storage.from(OWNERSHIP_BUCKET).remove(paths);
}

export async function openProof(path: string) {
  const { data, error } = await supabase.storage.from(OWNERSHIP_BUCKET).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) throw error ?? new Error('Lien indisponible');
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}
