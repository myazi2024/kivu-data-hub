
# Audit — Pilotage admin du formulaire de demande de lotissement

Périmètre : `Admin → Demandes & procédures → Lotissement` (`AdminSubdivisionHub` : Demandes / Frais / Zonage / Lots & voies / Analytics) vs formulaire utilisateur `SubdivisionRequestDialog` (5 étapes : Parcelle, Designer, Plan, Documents, Récap).

## Méthode
Pour chaque champ/composant du formulaire frontend, on vérifie s'il existe (côté admin) un contrôle qui permet :
- (C) Configurer les options proposées,
- (V) Valider/contraindre la saisie,
- (T) Tarifer ce qui doit l'être.

## Résultats par étape du formulaire

### Étape 1 — Parcelle mère + Identité demandeur + Objet
| Composant frontend | Admin couvre ? | Écart |
|---|---|---|
| Bandeau d'éligibilité parcelle (litige, hypothèque, mutation, lotissement en cours, titre, GPS, surface mère min/max, ancienneté titre, exclusion types titres) | ✅ Zonage (bloc « Contraintes parcelle-mère ») | OK |
| Identité demandeur (statut juridique, genre, nationalité, RCCM, type de droit État…) | ⚠️ Aucun | **Pas de configuration admin** des règles d'identité (ex. autoriser/forcer Personne morale, RCCM obligatoire, types d'entités acceptés) |
| Type demandeur (`owner / mandatary / notary / other`) | ⚠️ Codé en dur | Pas de table admin pour activer/désactiver un type, ni exiger des pièces différentes par type |
| Objet du lotissement (`SUBDIVISION_PURPOSE_LABELS` : vente, succession, investissement, etc.) | ❌ Aucun | **Liste figée dans `constants.ts`** — non éditable depuis l'admin |

### Étape 2 — Designer (lots, voies, espaces communs, servitudes)
| Composant | Admin | Écart |
|---|---|---|
| Surface min/max d'un lot, largeur min/recommandée des voies, % min espaces communs, façade min, nombre max de lots | ✅ Zonage | OK |
| Usage d'un lot (`residential/commercial/industrial/agricultural/mixed`) | ⚠️ Codé en dur (`LOT_COLORS`/`USAGE_LABELS`) | Pas de configuration admin (ex. activer/désactiver « industriel » selon zone, libellés, couleurs) |
| Type de surface de voie (`asphalt/gravel/earth/paved/planned`) | ⚠️ Codé en dur | Pas configurable + pas de tarif différencié par surface (alors que `road_fee_per_linear_m_usd` existe globalement) |
| Type d'espace commun (`green_space/parking/playground/market/drainage/other`) | ⚠️ Codé en dur | Pas configurable, pas de % minimum **par sous-type** (ex. min espace vert ≠ min parking) |
| Servitudes (`passage/drainage/utility/view/other`) | ❌ Aucun | Aucune règle admin (obligation, largeur min, types autorisés) |
| Type de clôture (`wall/wire/hedge/mixed`) et type de construction (`house/building/warehouse/other`) | ❌ Aucun | Pas de référentiel admin |

### Étape 3 — Plan (`PlanElements`)
| Composant | Admin | Écart |
|---|---|---|
| Toggles du plan (grille, nord, légende, dimensions, n° lots, surfaces, voies, espaces communs, servitudes, propriétaires, échelle) | ❌ Aucun | Pas de **valeurs par défaut éditables** ni d'éléments rendus obligatoires (ex. forcer `showScale` et `showNorthIndicator` pour validité officielle) |
| Export PNG | ❌ | Pas de contrôle admin sur le filigrane / DPI |

### Étape 4 — Documents
| Composant | Admin | Écart |
|---|---|---|
| Liste de documents (`requester_id_document_url`, `proof_of_ownership_url`, `subdivision_sketch_url`) + obligatoire/optionnel | ❌ Codé en dur dans `DOC_CONFIG` | Pas de table admin permettant : ajouter un document requis (ex. plan topographique, attestation environnementale, autorisation conjoint), définir formats/poids, par type de demandeur ou par section urbain/rural |
| Taille max (5 Mo) et formats acceptés (`jpeg/png/webp/pdf`) | ❌ Codé en dur | Non configurable |

### Étape 5 — Récapitulatif & soumission
| Composant | Admin | Écart |
|---|---|---|
| Frais (palier, voirie, espaces communs, min/max par lot, taux $/m²) | ✅ Frais (`AdminSubdivisionFeesConfig`) | OK |
| Conformité au zonage (carte `ZoningComplianceCard`) | ✅ via Zonage | OK |
| Mode de paiement | Géré ailleurs (AdminPaymentMethods) | OK transversal |
| Réf. dossier (préfixe, format) | ❌ | Non configurable depuis l'admin |

### Transversal
| Sujet | Admin | Écart |
|---|---|---|
| Activation globale du service « Lotissement » | À vérifier dans `AdminCatalogConfig` / `serviceAvailability` | À confirmer |
| Notifications utilisateur (templates email/in-app) | Génériques | Pas de gabarit dédié lotissement |
| SLA / délais de traitement affichés à l'utilisateur | ❌ | Non éditable |
| Multi-langue des libellés (FR/EN) | ❌ | Hard-codé |

## Synthèse — score de couverture
- **Bien couvert (✅)** : géométrie (surface lot, voies, espaces communs %, façade), contraintes parcelle-mère (litige/hypothèque/mutation/titre/GPS), tarification globale, conformité zonage, gestion des dossiers admin (file, bulk, audit).
- **Partiellement couvert (⚠️)** : tarification par sous-type (surface voie, type espace commun), libellés/couleurs lots.
- **Non couvert (❌)** : objet du lotissement (purpose), types de demandeurs, identité juridique (règles RCCM/État), types d'espaces communs et servitudes, types de clôture/construction, documents requis (liste + formats + taille), valeurs par défaut/obligatoires des toggles du plan, gabarits notifications, SLA, format réf. dossier.

## Plan de remédiation (proposé, en lots indépendants)

### Lot A — Référentiels métiers éditables (priorité haute)
Nouveau sous-onglet « Référentiels » dans `AdminSubdivisionHub` (table `subdivision_reference_lists`) avec gestion CRUD pour :
1. Objets de lotissement (remplace `SUBDIVISION_PURPOSE_LABELS`).
2. Types de demandeur (label, exigences documentaires).
3. Usages de lot (label, couleur, autorisé urbain/rural).
4. Surfaces de voie (label, surcoût $/ml).
5. Types d'espace commun (label, couleur, % min individuel).
6. Types de servitude (label, largeur min, obligatoire ou non).
7. Types de clôture / de construction (référentiels simples).

Les composants `StepLotDesigner`, `StepParentParcel`, `StepPlanView` consomment ces référentiels via un hook `useSubdivisionReferences()` (cache 5 min).

### Lot B — Documents requis configurables (priorité haute)
Nouvelle table `subdivision_required_documents` (key, label, required, accept, max_size_mb, applies_to_section, applies_to_requester_type, ordering). UI admin dans le hub. `StepDocuments` lit la liste et adapte la validation `canProceed`.

### Lot C — Plan officiel : éléments obligatoires (priorité moyenne)
Étendre `subdivision_zoning_rules` avec colonnes `required_plan_elements jsonb` (sous-set de `PlanElements`). `StepPlanView` force ces toggles à `true` et désactive l'interaction.

### Lot D — Tarifs détaillés (priorité moyenne)
Compléter `subdivision_rate_config` ou créer `subdivision_rate_modifiers` pour appliquer un coût additionnel selon la surface de voie et le type d'espace commun. Mettre à jour `_shared/subdivisionFees.ts` (calcul serveur unifié).

### Lot E — Identité & règles juridiques (priorité moyenne)
Étendre `subdivision_zoning_rules` (ou nouvelle table `subdivision_requester_rules`) avec : `allowed_legal_statuses[]`, `require_rccm_for_entities`, `allowed_state_right_types[]`, `require_email`. Ajouter validation côté `useSubdivisionForm.canProceed`.

### Lot F — UX admin (priorité basse)
- Sous-onglet « Notifications » (gabarits dédiés lotissement).
- Champ « Format référence dossier » dans `AdminSubdivisionFeesConfig` (préfixe, padding numérique).
- Champ SLA (jours moyens de traitement) affiché à l'utilisateur dans `StepSummary`.

## Détails techniques (pour l'implémentation)
- Toutes les nouvelles tables sont préfixées `subdivision_` et soumises à RLS : lecture publique pour les listes de référence actives (`is_active=true`), écriture restreinte aux rôles `admin`/`super_admin` via `has_role()`.
- Les hooks frontend (ex. `useZoningRules`, `useParentParcelEligibility`) sont étendus avec un fallback strict aux valeurs par défaut codées si la table n'est pas alimentée — pas de régression.
- Les libellés dynamiques remplacent les `Record<...,string>` figés via une utility `resolveLabel(key, fallback)` pour rétro-compat.
- Le calcul des frais reste **côté serveur** (`_shared/subdivisionFees.ts`) afin d'éviter toute manipulation client.

## Ce qui n'est PAS dans ce plan
- Refonte visuelle du formulaire frontend (déjà modernisé précédemment).
- Workflow de validation admin des dossiers (déjà couvert dans la mémoire « Subdivision admin audit »).

Une fois ce plan approuvé, je peux exécuter les lots un par un (recommandation : commencer par A puis B, qui apportent la plus grande valeur de configurabilité avec un risque faible).
