

# Audit du service "Ajouter une autorisation" — Divergences et corrections

## Problemes identifies

### 1. DESALIGNEMENT CRITIQUE DES CLES JSON (bug majeur — admin voit des champs vides)

Le formulaire (`BuildingPermitRequestDialog.tsx` L105-125) stocke les donnees avec certaines cles, mais le dialogue admin (`PermitRequestDialog.tsx`) lit des cles differentes. L'admin voit donc des champs vides pour la majorite des demandes.

| Ce que le formulaire stocke | Ce que l'admin lit | Consequence |
|---|---|---|
| `requestType: 'construction'` | `permitType` (L212, L293, L329) | Type jamais affiche, badges cassés |
| `projectDescription` | `constructionDescription` (L273) | Description vide |
| `declaredUsage` | `plannedUsage` (L279) | Usage vide |
| `plannedArea` | `estimatedArea` (L284) | Surface vide |
| `constructionNature` | `buildingMaterials` (L300) | Materiaux vide |
| `attachments` (objet cle→URL) | `architecturalPlanImages` (L305), `constructionPhotos` (L347) | Documents jamais affiches |
| `constructionDate` | `constructionYear` (L333) | Annee vide (le form stocke une date, pas un nombre) |

Le filtre par type dans `AdminBuildingPermits.tsx` L78 compare aussi `permitData?.permitType` — ce filtre ne fonctionne donc jamais.

**Correction** : Mettre a jour le dialogue admin pour lire les cles correctes. Ajouter un mapping de compatibilite pour les anciennes demandes qui utilisaient les vieilles cles.

### 2. ADMIN NE MONTRE QUE 6 CHAMPS SUR 26

Le formulaire collecte 26 champs (type, nature, usage, surface, etages, pieces, toiture, eau, electricite, cout, architecte, agrement, adresse, email, telephone, description, date debut, duree, raison regularisation, etat actuel, date construction, conformite, permis original + attachments). L'admin n'en affiche que 6 (description, usage, surface, etages, materiaux, permis original).

**Correction** : Afficher tous les champs collectes dans le dialogue admin, organises en sections (Construction, Planification/Regularisation, Architecte, Demandeur, Documents joints).

### 3. PAS D'ACTION "RENVOYER POUR CORRECTION"

Le dialogue admin n'offre que Approuver et Rejeter. Pas d'option `returned` pour demander des corrections sans rejet definitif.

**Correction** : Ajouter un troisieme bouton "Renvoyer" dans le footer du dialogue admin, avec notification dediee.

### 4. STATUT LU DEPUIS LE JSON AU LIEU DE LA COLONNE DB

`AdminBuildingPermits.tsx` L73-74 lit le statut depuis `permitData?.status` (le JSON `permit_request_data`) au lieu de la colonne `status` de la contribution. Quand l'admin change le statut, il met a jour les deux (L148-149), mais les stats (L102-108) et les filtres (L73-80) se basent sur le JSON — ce qui peut diverger si un autre processus met a jour la colonne DB sans toucher au JSON.

**Correction** : Utiliser `permit.status` (colonne DB) pour les filtres et les stats. Conserver la lecture JSON comme fallback pour les anciennes donnees.

### 5. PAS D'ONGLET ANALYTICS DEDIE

Les graphiques autorisations sont integres dans l'onglet `parcels-titled` (permits, permit-admin, permit-validity, permit-service). Il n'y a pas d'onglet `building-permits` dedie dans le registre analytics, contrairement aux mutations et hypotheques qui ont maintenant leurs propres onglets.

**Correction** : Creer un onglet `building-permits` dans `ANALYTICS_TABS_REGISTRY` avec des graphiques specifiques : repartition construction/regularisation, cout estime par tranche, delai de traitement, taux d'approbation, repartition par type de construction.

### 6. PROPRIETAIRE ACTUEL NON AFFICHE

Ni le formulaire utilisateur ni le dialogue admin n'affichent `current_owner_name` depuis les donnees parcelle.

**Correction** : Afficher le proprietaire dans la Card info parcelle du formulaire et dans le dialogue admin.

### 7. AUCUNE DONNEE FICTIVE DETECTEE

Les frais sont charges depuis `permit_fees_config` (DB) avec fallback statique. Les stats admin sont calculees sur des donnees reelles. Pas de donnees simulees.

---

## Plan d'implementation

### Etape 1 — Corriger le desalignement des cles dans le dialogue admin
Modifier `PermitRequestDialog.tsx` pour lire les cles correctes (`requestType` au lieu de `permitType`, `projectDescription` au lieu de `constructionDescription`, etc.). Ajouter un helper de compatibilite qui resout les deux formats (ancien et nouveau).

### Etape 2 — Afficher tous les champs collectes dans l'admin
Ajouter les sections manquantes : toiture, pieces, eau, electricite, cout estime, architecte/agrement, adresse demandeur, date debut, duree. Afficher les documents joints depuis `attachments` (objet cle→URL).

### Etape 3 — Corriger les filtres et stats admin
Utiliser `permit.status` (colonne DB) au lieu de `permitData?.status` pour les compteurs et filtres dans `AdminBuildingPermits.tsx`.

### Etape 4 — Ajouter l'action "Renvoyer pour correction"
Ajouter un bouton "Renvoyer" dans le footer du dialogue admin + notification dediee + statut `returned`.

### Etape 5 — Afficher le proprietaire actuel
Ajouter `current_owner_name` dans le formulaire utilisateur et le dialogue admin.

### Etape 6 — Creer l'onglet analytics dedie
Ajouter un bloc `building-permits` dans `ANALYTICS_TABS_REGISTRY` avec graphiques sur les types de demande, couts, delais et taux d'approbation.

### Fichiers impactes

| Fichier | Action |
|---------|--------|
| `src/components/admin/permits/PermitRequestDialog.tsx` | Corriger cles JSON, afficher tous les champs, ajouter "Renvoyer" |
| `src/components/admin/AdminBuildingPermits.tsx` | Corriger filtres/stats (colonne DB), ajouter filtre `returned` |
| `src/components/cadastral/building-permit-request/PermitFormStep.tsx` | Afficher proprietaire actuel |
| `src/hooks/useAnalyticsChartsConfig.ts` | Onglet analytics dedie `building-permits` |

4 fichiers modifies, aucune migration DB.

