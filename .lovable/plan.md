

# Audit — Divergences, visuels fictifs et données fictives

## Constat

L'application BIC est un outil cadastral et foncier, mais de nombreux textes et libellés à travers l'application utilisent encore le vocabulaire "immobilier" et "locatif" hérité de l'ancien concept. De plus, certaines données affichées dans les analytics (hypothèques, taxes, permis) proviennent exclusivement des tables satellites peuplées lors de l'approbation des contributions CCC — leur volume dépend directement des données de test générées et non d'une collecte terrain indépendante.

## Divergences identifiées

### Catégorie 1 : Terminologie "immobilier/locatif" résiduelle

| Fichier | Texte actuel | Problème |
|---------|-------------|----------|
| `TypewriterAnimation.tsx` (ligne 4) | "BIC transforme les **marchés fonciers** en insights stratégiques" | Terme vague — devrait refléter la mission cadastrale |
| `Footer.tsx` (ligne 39) | "Production et diffusion de données **immobilières** et territoriales" | Imprécis — c'est des données cadastrales |
| `About.tsx` (ligne 18) | "Comprendre les réalités foncières et **locatives**" | Pas de données locatives collectées |
| `About.tsx` (ligne 37) | "Collecte numérique via **Myazi Immobilier**" | Nom d'application obsolète |
| `Articles.tsx` (lignes 17, 19, 42, 47) | "Articles **Immobiliers**", "marché **immobilier** de la RDC" | Devrait être "Articles fonciers" |
| `Careers.tsx` (lignes 12, 16, 23, 55, 72) | "Analyste de Données **Immobilières**", "secteur **immobilier**" | Terminologie incohérente |
| `Partnership.tsx` (lignes 36, 56, 101) | "API d'accès aux données **immobilières**", "secteur **immobilier**" | Idem |
| `Publications.tsx` (ligne 45) | "Rapports d'analyse urbaine et **immobilière**" | Devrait être "cadastrale et foncière" |
| `PublicationCard.tsx` (lignes 187, 224) | "marché **immobilier** et données territoriales", "Rapport d'analyse du marché **immobilier**" | Idem |

### Catégorie 2 : Onglet "Parcelles titrées" — données satellites potentiellement fictives

L'onglet `parcels-titled` dans Analytics affiche des données provenant de 3 tables satellites :
- `cadastral_mortgages` (2 enregistrements) — graphiques "Hypothèques", "Créanciers", "Statut hyp.", "Contrats hyp./an"
- `cadastral_tax_history` (15 enregistrements) — graphiques "Taxes", "Taxes/année", "Montants taxes/an"
- `cadastral_building_permits` (46 enregistrements) — graphiques "Autorisation bâtir", "Statut autoris.", "Validité autoris.", "Service émetteur"

**Ces données ne sont pas collectées directement via le formulaire CCC.** Elles sont insérées dans ces tables satellites uniquement lorsqu'un admin approuve une contribution CCC (`AdminCCCContributions.tsx`). Le nombre affiché (ex: le "2700" mentionné par l'utilisateur) peut venir de données de test non purgées ou de l'accumulation de données d'approbations.

Le **nom de l'onglet** "Parcelles titrées" est aussi trompeur : il affiche TOUTES les parcelles de `cadastral_parcels`, pas uniquement celles avec un titre foncier.

### Catégorie 3 : KPI "Hypothèques" dans l'onglet Parcelles

Le KPI `kpi-mortgages` affiche le montant total des hypothèques comme indicateur clé de l'onglet parcelles, ce qui est disproportionné pour 2 enregistrements et donne l'impression de données significatives.

## Plan de correction

### Etape 1 : Aligner la terminologie sur la mission cadastrale

Corriger les textes "immobilier/locatif" dans les 9 fichiers identifiés :
- `TypewriterAnimation.tsx` → "BIC transforme les données foncières en outils de décision"
- `Footer.tsx` → "Production et diffusion de données cadastrales et foncières pour la RDC"
- `About.tsx` → Supprimer "locatives", remplacer "Myazi Immobilier" par "Myazi"
- `Articles.tsx` → "Articles fonciers", "analyses sur le secteur foncier de la RDC"
- `Careers.tsx` → "Analyste de Données Foncières", "secteur foncier"
- `Partnership.tsx` → "données cadastrales", "secteur foncier"
- `Publications.tsx` → "analyse cadastrale et foncière"
- `PublicationCard.tsx` → "données cadastrales et territoriales"

### Etape 2 : Renommer l'onglet "Parcelles titrées" → "Parcelles"

Dans `ANALYTICS_TABS_REGISTRY`, changer le label de `'Parcelles titrées'` à `'Parcelles'` pour refléter le contenu réel (toutes les parcelles cadastrales, pas uniquement les titrées).

### Etape 3 : Regrouper les données satellites sous condition d'existence

Dans `ParcelsWithTitleBlock.tsx`, masquer automatiquement les sections hypothèques/taxes/permis quand ces tables sont vides (elles le seront souvent en production) au lieu de les afficher avec des graphiques "0". Les graphiques sont déjà conditionnés par `hidden={...length === 0}` pour certains, mais les KPIs s'affichent toujours.

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/TypewriterAnimation.tsx` | Corriger la phrase |
| `src/components/Footer.tsx` | Corriger la description |
| `src/pages/About.tsx` | Supprimer "locatives", corriger "Myazi" |
| `src/pages/Articles.tsx` | "Immobiliers" → "Fonciers" |
| `src/pages/Careers.tsx` | "Immobilières" → "Foncières" |
| `src/pages/Partnership.tsx` | "immobilières" → "cadastrales" |
| `src/pages/Publications.tsx` | "immobilière" → "cadastrale et foncière" |
| `src/components/publications/PublicationCard.tsx` | "immobilier" → "cadastral" |
| `src/hooks/useAnalyticsChartsConfig.ts` | Label "Parcelles titrées" → "Parcelles" |

9 fichiers, corrections de chaînes de caractères.

