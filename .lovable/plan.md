# Plan officiel de lotissement — version HD imprimable + authentification

## Objectif
Quand une demande de lotissement est **approuvée** côté admin, produire un **plan PDF officiel** :
- vectoriel pur, format dynamique selon le ratio de la parcelle, imprimable jusqu'à **10×10 m** sans pixellisation,
- sécurité/authentification conformes au standard de l'app (QR code de vérification, code, mentions légales),
- footer enrichi avec **3 cadres de signature/sceau** dont les libellés s'adaptent au contexte urbain ou rural,
- pipeline **hybride** : aperçu rapide côté client + version officielle générée par Edge Function et archivée.

---

## 1. Format vectoriel dynamique selon ratio parcelle

Refonte de `src/utils/generateSubdivisionPlanPDF.ts` :
- Calcul du bbox de la parcelle-mère + lots + voies → ratio largeur/hauteur réel.
- Choix d'une **base** (ex. base = 1000 mm) puis dimensionnement :
  ```
  pageW = base
  pageH = base * (bboxH / bboxW)
  ```
  borné à `[600, 1400] mm` pour rester gérable, avec **ratio préservé** (zéro déformation).
- jsPDF accepte un `format: [w, h]` arbitraire en mm → 100 % vectoriel, donc agrandissable jusqu'à 10×10 m sans perte.
- Marges/typo recalculées en pourcentage de la page (échelle relative) pour rester lisibles à toute taille d'impression.
- Cartouche, schéma, légende, flèche du Nord, échelle graphique, tableau des lots → repositionnés en grille relative.
- Échelle graphique recalculée en mètres réels d'après la surface de la parcelle-mère.

## 2. Mentions de signature dynamiques (urbain/rural)

Détection du contexte via la parcelle-mère (`cadastral_parcels` ou champs `parent_parcel_*`/`territoire`/`commune`/`ville` joints à la demande) :

- **Contexte urbain** (la parcelle a une `commune` + `ville`) — 3 cadres :
  1. « Certifié conforme au plan cadastral » — Bureau d'Information Cadastrale
  2. « Approuvé par la ville de **{ville}** »
  3. « Vu par le Bureau de la Commune de **{commune}** »

- **Contexte rural** (pas de commune, mais `territoire`/`chefferie`/`groupement`) — 3 cadres :
  1. « Certifié conforme au plan cadastral » — Bureau d'Information Cadastrale
  2. « Approuvé par le Bureau de la Chefferie **{chefferie}** » (fallback : groupement)
  3. « Vu par le Chef du Territoire de **{territoire}** »

Chaque cadre = boîte vectorielle avec libellé en gras, lignes pour **Nom**, **Fonction**, **Date**, **Signature**, et un **emplacement sceau** (cercle pointillé). Vide à signer manuellement après impression.

## 3. Sécurité & authentification

Réutilise le standard projet (cf. mémoire `doc-verification-privacy-fr`, `cadastral-pdf-report-fr`) :
- `createDocumentVerification({ documentType: 'subdivision_plan', ... })` → code + URL `/verify/{code}`,
- **QR code** vectoriel/HD dans le footer + **code lisible** à côté,
- mentions légales déjà présentes (génération, authentification, falsification),
- ajout d'un **filigrane diagonal** discret « PLAN OFFICIEL — {reference_number} » répété (vectoriel, opacité faible) pour résister à la copie photographique.

Le module `/verify/{code}` reconnaît déjà `subdivision_plan` (déjà supporté dans `DocumentType`) — RAS côté schéma.

## 4. Pipeline hybride (aperçu client + officiel serveur)

### Côté client (aperçu — déjà existant, à conserver)
`UserSubdivisionRequests` continue de proposer un téléchargement rapide via `generateSubdivisionPlanPDF`, mais :
- s'il existe déjà une **version officielle archivée**, on télécharge directement le PDF signé du bucket (Signed URL),
- sinon on génère l'aperçu côté client (cas où l'archive n'a pas encore été produite).

### Côté serveur (version officielle — nouveau)
Nouvelle Edge Function `generate-subdivision-plan` :
- Déclenchée automatiquement à l'approbation (depuis `useSubdivisionProcessing` / RPC d'approbation existante, après succès),
- Réutilise la même logique de mise en page (port d'un module partagé `_shared/subdivisionPlanLayout.ts` côté Deno avec `jspdf` via npm: import map),
- Charge données complètes (demande, parcelle-mère, lots, voies, géo cascade), génère le PDF, **upload** dans bucket privé `subdivision-plans` sous `{user_id}/{request_id}/plan-{reference}-v{n}.pdf`,
- Stocke le chemin relatif dans `subdivision_requests.official_plan_path` + `official_plan_generated_at`,
- Crée la `document_verifications` côté serveur (avec `user_id` du demandeur) → QR pointe vers code persistant,
- RPC `get_signed_subdivision_plan(p_request_id)` (SECURITY DEFINER) pour distribuer une URL signée (admin + propriétaire).

### DB (migration)
- `ALTER TABLE subdivision_requests ADD COLUMN official_plan_path text, official_plan_generated_at timestamptz, official_plan_version int default 0;`
- Bucket privé `subdivision-plans` + policies (lecture via RPC uniquement, pas d'accès direct anon).
- RPC `get_signed_subdivision_plan` (vérifie `auth.uid() = user_id` ou rôle admin/super_admin).

## 5. Admin UI

Dans le détail demande (espace admin, statut Approuvé) :
- Bouton **« (Re)générer le plan officiel »** → invoke `generate-subdivision-plan` (incrémente `official_plan_version`),
- Bouton **« Télécharger le plan officiel »** → ouvre la Signed URL,
- Indicateur de version + date de génération,
- Audit log via `request_admin_audit` (`subdivision.plan_generated`).

## 6. Tests

- **Unit** : `generateSubdivisionPlanPDF` — ratio respecté, cadres signature urbains vs ruraux, présence QR + filigrane.
- **Edge Function** : `supabase/functions/generate-subdivision-plan/index.test.ts` — 401 sans auth, 403 si non-admin & non-propriétaire, 200 + path retourné, idempotence (v1 → v2).
- **Régression** : run `useCadastralCart.purge.test.tsx` + `useParentParcelEligibility.test.tsx` (rien lié, mais sanity check).
- **QA visuelle** : conversion du PDF en PNG via `pdftoppm` à 150 DPI puis inspection (mentions, cadres, QR, filigrane, bbox sans déformation).

---

## Détails techniques (récapitulatif)

| Aspect | Choix |
|---|---|
| Format | jsPDF `format: [w, h]` calculé selon ratio bbox parcelle, base 1000 mm |
| Vectoriel | 100 % (lignes/textes/QR raster mais à 200 px source rendu net jusqu'à 10 m) |
| Signatures | Cadres vides (Nom/Fonction/Date/Signature/Sceau) |
| Libellés | Dynamiques urbain ({ville}/{commune}) vs rural ({territoire}/{chefferie}) |
| Sécurité | `createDocumentVerification` + QR + code + filigrane diagonal |
| Génération | Hybride : client (aperçu/fallback) + Edge Function (officiel archivé) |
| Stockage | Bucket privé `subdivision-plans`, signed URL via RPC SECURITY DEFINER |
| Versioning | `official_plan_version` incrémenté à chaque (re)génération admin |

## Fichiers impactés
- `src/utils/generateSubdivisionPlanPDF.ts` (refonte ratio + signatures + filigrane)
- `src/utils/subdivisionPlanContext.ts` (nouveau — résolution urbain/rural)
- `src/components/user/UserSubdivisionRequests.tsx` (priorité officiel > aperçu client)
- `src/components/admin/subdivision/requests/...` (boutons (re)génération + DL officiel)
- `supabase/functions/generate-subdivision-plan/index.ts` (nouveau)
- `supabase/functions/_shared/subdivisionPlanLayout.ts` (nouveau, partagé)
- Migration : colonnes + bucket + policies + RPC `get_signed_subdivision_plan`
- Mémoires : maj `subdivision-admin-audit-fr.md` + nouvelle entrée `features/subdivision/plan-pdf-hd-fr.md`

**Souhaitez-vous approuver ce plan ?**
