# Plan amélioré du plan de lotissement (PDF) + intégration admin

## Objectif
S'inspirer du sample (BIC) pour produire un **plan de lotissement officiel** généré par l'application, configurable depuis l'espace admin, sécurisé (QR + filigrane + signalement), et géo-fidèle (échelle, Nord, légende).

## Périmètre

### A. Modèle PDF amélioré (refonte `generateSubdivisionPlanPDF.ts`)
1. **En-tête** : `Généré par : Bureau d'Informations Cadastrales` (droite), titre `PLAN DE LOTISSEMENT DE LA PARCELLE N° {parent_parcel_number}` (centre), logo (gauche).
2. **Filigrane d'état** :
   - `BROUILLON` (gris diagonal) si statut ≠ approved.
   - `TEST` si `test_mode = true`.
   - `SAMPLE` si génération de prévisualisation admin.
   - Aucun filigrane sur plan final approuvé.
3. **Zone plan (centre)** : SVG lots + voies + lampadaires + canaux d'évacuation + revêtements (issus de `subdivision_plan_elements` réellement présents).
4. **Rose des vents (NORD)** géoréférencée d'après bbox parcelle + **échelle normalisée auto** (1:200 / 500 / 1000 / 2000 selon surface & format papier) + barre graphique en option.
5. **Cartouche légende (bas-droit)** : dérivée auto des éléments présents (Lampadaire, Canal d'évacuation, Revêtement, etc.). Symboles standardisés depuis `subdivision_legend_symbols`.
6. **Tableau Contraintes voies** (bas-gauche) : Voies / Évacuation / Éclairage. Valeurs **auto-calculées serveur** depuis `subdivision_infrastructure_tariffs` (matériaux, épaisseurs, largeurs) et `subdivision_plan_elements` (éclairage : hauteur, espacement, intensité, faisceau, quantité).
7. **Bloc QR + signalement** (bas-gauche) :
   - QR vers `/verify-document?ref=…` (URL signée, immuable).
   - Texte : « Si vous n'avez pas de résultat positif, signalez-le au {whatsapp_number}. Vous pouvez gagner une récompense financière jusqu'à {reward_amount} {currency}. »
   - Numéro et montant lus depuis `app_subdivision_plan_config`.
8. **Cadres de signature dynamiques (N variables)** : remplace les 3 cadres figés. Chaque cadre = `{title, authority, show_seal}`, ordre configurable, **règles par contexte** (urbain/rural/province). Refonte `subdivisionPlanContext.ts` → `resolveSignatureFrames(parcel, configRules)`.
9. **Footer** : « Reproduction interdite » + `Échelle 1:{n}` + version `v{plan_versions.version}` + date.

### B. Nouvelle section admin : `Admin > Lotissement > Config plan`
Nouveau sous-onglet `plan-config` dans `AdminSubdivisionHub.tsx` (à côté de Plan/Documents).

**Sous-sections** :
1. **Identité & en-tête** — logo (réutilise `app_appearance_config`), titre, sous-titre, organisation, mentions légales footer.
2. **Filigranes** — texte/couleur/opacité pour BROUILLON / TEST / SAMPLE.
3. **Cadres de signature** — table CRUD `subdivision_signature_frames` : `name, title_template, authority, applies_to (urban|rural|both), province_filter, order, show_seal, active`. Aperçu live.
4. **Symboles de légende** — table CRUD `subdivision_legend_symbols` : `code, label, svg_icon, color, source_element_type` (lampadaire, canal_evacuation, revetement…). Permet matching auto avec `subdivision_plan_elements`.
5. **Format & échelle** — format papier par défaut (A3/A2/A1), orientation, marges, table des paliers d'échelle (surface min → 1:N).
6. **Programme signalement** — `whatsapp_number`, `reward_amount`, `reward_currency`, `report_text_template`, `active`.
7. **Aperçu** — bouton « Générer un plan SAMPLE » qui produit un PDF de prévisualisation avec données fictives + filigrane SAMPLE (réutilise une demande TEST).

### C. Cycle de vie & versioning
- **Brouillon** : généré dès `submission_payment_status = paid`, téléchargeable par l'usager (filigrane BROUILLON). Stocké dans `expertise-certificates/subdivision/draft/`.
- **Final** : généré lors de l'approbation admin (sans filigrane, avec cachet). Stocké dans `expertise-certificates/subdivision/final/`. URL via RPC signée `get_signed_subdivision_certificate` (déjà existante).
- **Versioning** : chaque régénération crée une nouvelle ligne dans `plan_versions` (déjà existant). Seule la dernière version `is_current = true` est référencée par le QR.
- **Téléchargement** : usager voit `current_version`, admin voit l'historique complet avec diff de paramètres.

### D. Base de données (migrations)
```sql
-- 1. Config globale
CREATE TABLE app_subdivision_plan_config (
  id uuid PK, config_key text UNIQUE, config_value jsonb, updated_by uuid, updated_at timestamptz
);
-- Clés : 'header', 'watermarks', 'paper_format', 'scale_tiers', 'report_program', 'footer_text'

-- 2. Cadres de signature dynamiques
CREATE TABLE subdivision_signature_frames (
  id uuid PK, name text, title_template text, authority text,
  applies_to text CHECK (in 'urban','rural','both'),
  province_filter text[], display_order int, show_seal bool, active bool,
  created_by, updated_at
);

-- 3. Symboles de légende
CREATE TABLE subdivision_legend_symbols (
  id uuid PK, code text UNIQUE, label text, svg_icon text,
  color text, source_element_type text, display_order int, active bool
);

-- 4. RLS : lecture publique authentifiée, écriture admin uniquement.
-- 5. Seed : insérer les cadres actuels (3 urbain + 3 rural) et symboles standards.
```

### E. Refonte code
```text
src/utils/generateSubdivisionPlanPDF.ts        → refonte par sections (header/plan/legend/cartouche/signatures/footer)
src/utils/subdivisionPlanContext.ts            → resolveSignatureFrames(parcel, framesConfig)
src/utils/subdivisionPlanScale.ts              → NEW: échelle auto + bbox → scale 1:N + rose des vents
src/utils/subdivisionPlanLegend.ts             → NEW: derive légende depuis plan_elements + symboles config
src/components/admin/AdminSubdivisionPlanConfig.tsx          → NEW (onglet hub)
src/components/admin/subdivision-plan-config/
  ├─ IdentitySection.tsx
  ├─ WatermarksSection.tsx
  ├─ SignatureFramesEditor.tsx
  ├─ LegendSymbolsEditor.tsx
  ├─ PaperFormatSection.tsx
  ├─ ReportProgramSection.tsx
  └─ PlanPreviewButton.tsx
src/hooks/useSubdivisionPlanConfig.ts          → NEW (TanStack Query)
supabase/functions/generate-subdivision-plan/  → aligner sur la nouvelle config + auto-tariffs
```

### F. Sécurité
- Bucket `expertise-certificates` (privé, déjà en place) — pas de stockage `public`.
- QR pointe vers `/verify-document?ref=…&type=subdivision` — RPC `verify_subdivision_plan(ref)` retourne uniquement : statut, version, date approbation, parcelle (n° uniquement, pas de PII).
- Filigrane SAMPLE/BROUILLON **inamovible** (rendu sur canvas avant tout autre élément, multi-couches).
- Toute modification de `app_subdivision_plan_config` ou `subdivision_signature_frames` loggée dans `system_config_audit`.

### G. Livraison par phases
1. **P0 — Données** ✅ : 3 tables + seed + RLS + RPC verify.
2. **P1 — Admin UI** ✅ : nouvel onglet `plan-config` + 6 sous-sections.
3. **P2 — Générateur PDF** ✅ : refonte avec cadres N, légende auto, échelle auto, filigranes, programme signalement.
4. **P3 — Cycle de vie** ✅ : `subdivision_plan_versions` étendue (`official_version`, `pdf_path`, `config_snapshot`, `verification_code`, `is_current` + trigger), edge function `generate-subdivision-plan` insère une ligne immuable avec snapshot complet (config + cadres + symboles) à chaque (re)génération.
5. **P4 — Mémoire & docs** : MAJ `mem://features/subdivision/specifications-completes-fr` + audit.

## Détails techniques

**Échelle auto** (`subdivisionPlanScale.ts`)
- bbox parcelle (m) + zone dessinable page → `scale = ceil(maxDim / drawableMm * 1000)` → snap au palier supérieur (200/500/1000/2000/5000).
- Rose des vents : angle calculé depuis l'orientation réelle de la bbox lat/lng.

**Légende auto** (`subdivisionPlanLegend.ts`)
- Pour chaque `plan_element.element_type` distinct présent → lookup `subdivision_legend_symbols.source_element_type` → push item légende.
- Tri par `display_order`, dédup.

**Cadres N** : `frames.filter(f => f.active && (f.applies_to === ctx + f.province_filter match)).sort(order).render()`.

**Versioning** : `plan_versions { id, request_id, version, config_snapshot jsonb, pdf_path, is_current, generated_by, created_at }` — déjà présent, on garantit `config_snapshot` pour reproductibilité historique.

## Hors périmètre
- Édition graphique interactive du plan (déjà couvert par Lot Designer).
- Workflow d'approbation (déjà couvert par `approve-subdivision`).
- Paiement (déjà couvert).

## Questions résiduelles (à traiter pendant build)
- Format papier par défaut : **A3 paysage** confirmé sauf indication contraire.
- Cachet final : image uploadée par admin (PNG transparent) ou généré (texte + bordure circulaire) ? → on partira sur **upload admin** dans `app_subdivision_plan_config.stamp_image`.
