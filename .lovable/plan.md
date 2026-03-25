

# Audit du service "Demander un lotissement" + Affichage du plan valide sur la carte

## Problemes identifies

### 1. PAS D'ACTION "RENVOYER POUR CORRECTION" (coherence manquante)

Le panneau admin (`AdminSubdivisionRequests.tsx` L325-329) n'offre que "Approuver" et "Rejeter". Contrairement aux autorisations et taxes qui ont maintenant un bouton "Renvoyer", le lotissement ne permet pas de demander des corrections sans rejet definitif.

### 2. PARCELLE MERE NON MODIFIEE APRES APPROBATION (fonctionnalite demandee)

Quand un lotissement est approuve :
- Les lots sont inseres dans `subdivision_lots` et affiches sur la carte (L783-834 de `CadastralMap.tsx`) — OK.
- Mais la parcelle mere continue de s'afficher avec son polygone rouge standard identique aux autres parcelles. Rien n'indique visuellement qu'elle a ete subdivisee.
- Il n'existe aucune colonne `is_subdivided` dans `cadastral_parcels` pour marquer la parcelle.

**Correction** : Ajouter une colonne `is_subdivided` (boolean, default false) a `cadastral_parcels`. Lors de l'approbation, mettre cette colonne a `true`. Sur la carte, modifier le rendu de la parcelle mere : contour en pointilles, couleur differente, label "Lotie", et ne pas afficher le polygone plein rouge pour eviter le chevauchement visuel avec les lots.

### 3. CROQUIS DE LA PARCELLE MERE NON MIS A JOUR

Le croquis (building shapes, dimensions) de la parcelle mere n'est pas modifie apres approbation. Le plan de lotissement valide devrait devenir le nouveau croquis de reference.

**Correction** : Lors de l'approbation, sauvegarder les lots comme `subdivision_plan` dans la parcelle mere (colonne JSONB existante ou nouvelle). Sur la carte, si `is_subdivided = true`, afficher les lots colores au lieu du polygone rouge simple.

### 4. AUCUNE DONNEE FICTIVE DETECTEE

- Frais de soumission : 20$ (code + DB).
- Frais de traitement : saisis par l'admin a l'approbation.
- Stats basees sur donnees reelles.

### 5. REDONDANCE CCC DEJA GEREE

- Pre-remplissage depuis `parcelData` (surface, localisation, proprietaire, GPS, cotes).
- Infos demandeur auto-remplies depuis `authUser`.

### 6. LE FILTRE STATUT N'INCLUT PAS `returned`

Le `SUBDIVISION_STATUS_MAP` (L60-67) n'a pas d'entree `returned`. A ajouter pour coherence.

### 7. DETAILS ADMIN INCOMPLETS

Le dialogue de details (L349-404) n'affiche pas :
- L'email du demandeur
- Le type de demandeur (proprietaire/mandataire)
- Le type de titre foncier
- Le motif complet avec label lisible
- Les voies d'acces internes
- Les espaces communs et servitudes du `subdivision_plan_data`

---

## Plan d'implementation

### Etape 1 — Migration DB : ajouter `is_subdivided` a `cadastral_parcels`

```sql
ALTER TABLE cadastral_parcels ADD COLUMN IF NOT EXISTS is_subdivided boolean DEFAULT false;
```

### Etape 2 — Modifier l'approbation admin pour marquer la parcelle mere

Dans `AdminSubdivisionRequests.tsx`, apres `saveApprovedLots()` :
- Faire un `UPDATE cadastral_parcels SET is_subdivided = true WHERE parcel_number = request.parcel_number`
- Stocker le `subdivision_plan_data` dans la parcelle si necessaire

### Etape 3 — Modifier le rendu carte pour les parcelles subdivisees

Dans `CadastralMap.tsx` (L706-780), quand `parcel.is_subdivided === true` :
- Remplacer le polygone rouge plein par un contour en pointilles gris/bleu
- Ajouter un label "Lotie" au centroid
- Les lots individuels (deja affiches L783-834) restent colores par usage
- Le resultat visuel : parcelle mere = contour discret + lots colores a l'interieur

### Etape 4 — Ajouter l'action "Renvoyer pour correction"

Dans `AdminSubdivisionRequests.tsx` :
- Ajouter `returned` au `SUBDIVISION_STATUS_MAP`
- Ajouter un 3eme bouton "Renvoyer" a cote de Approuver/Rejeter
- Ajouter un dialogue avec champ "Motif du renvoi"
- Notification dediee a l'utilisateur

### Etape 5 — Enrichir le dialogue de details admin

Ajouter les champs manquants : email, type demandeur, titre foncier, voies internes, espaces communs, servitudes depuis `subdivision_plan_data`.

### Etape 6 — Charger `is_subdivided` dans la requete carte

S'assurer que la requete Supabase dans `CadastralMap.tsx` inclut `is_subdivided` dans le `select`.

### Fichiers impactes

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter colonne `is_subdivided` |
| `src/components/admin/AdminSubdivisionRequests.tsx` | Marquer parcelle, ajouter "Renvoyer", enrichir details |
| `src/pages/CadastralMap.tsx` | Rendu conditionnel pour parcelles subdivisees |

3 fichiers modifies + 1 migration.

