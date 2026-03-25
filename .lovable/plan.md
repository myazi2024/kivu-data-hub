

# Audit du service "Litige foncier"

## Constat global

Le service est bien structure avec une architecture solide (utilitaires centralises, types partages, Realtime, brouillons). L'audit revele neanmoins plusieurs points a corriger.

---

## 1. PARCELLES EN LITIGE NON MARQUEES SUR LA CARTE (fonctionnalite absente)

La table `cadastral_contributions` possede `has_dispute` et `dispute_data`, et le formulaire CCC collecte cette info dans l'onglet Obligations. Cependant, la carte cadastrale (`CadastralMap.tsx`) ne fait aucune reference a `has_dispute` — les parcelles en litige s'affichent exactement comme les autres.

**Correction** : Sur la carte, si `has_dispute === true` ou s'il existe un litige actif dans `cadastral_land_disputes` pour cette parcelle, afficher un indicateur visuel (bordure orange, icone d'avertissement, ou badge "Litige" au centroid), similaire au traitement `is_subdivided` des parcelles loties.

## 2. PAS DE PANNEAU ANALYTICS DEDIE (fonctionnalite absente)

Les services autorisation et expertise ont leur onglet analytics admin. Le service litige foncier n'en a pas. L'admin ne dispose que d'un tableau avec 4 stats basiques (total, signalements, levees, en cours).

**Correction** : Ajouter un onglet analytics "Litiges fonciers" dans le panneau admin avec :
- Repartition par nature de litige (bar chart)
- Evolution mensuelle des signalements vs levees (line chart)
- Taux de resolution (KPI)
- Duree moyenne de resolution (KPI)
- Repartition par niveau de resolution (pie chart)

## 3. CONTRIBUTION CCC CREEE AVEC DONNEES INCOMPLETES (divergence)

Lors de la soumission d'un signalement (L276-290), une contribution CCC est creee avec seulement `parcel_number`, `user_id`, `current_owner_name` et `whatsapp_number`. Les champs `province`, `territoire`, `city` sont nuls. Cette contribution "fantome" polluera les stats CCC.

**Correction** : Soit enrichir la contribution avec les donnees de `parcelData` (province, territoire, city, etc.) en les passant en props, soit supprimer cette creation automatique de contribution CCC car elle n'apporte pas de valeur reelle — le litige est deja enregistre dans sa propre table `cadastral_land_disputes`.

## 4. REDONDANCE CCC : DOUBLE COLLECTE DES DONNEES DE LITIGE

Le formulaire CCC (onglet Obligations) collecte `has_dispute` + `dispute_data` via le `LandDisputeReportForm` en mode `embedded`. Les donnees sont stockees dans `cadastral_contributions.dispute_data`. Parallelement, le service standalone stocke les memes donnees dans `cadastral_land_disputes`. Il n'y a pas de synchronisation entre les deux.

**Etat** : Deja gere par design (les deux flux sont independants). Le mode embedded ne cree PAS d'entree dans `cadastral_land_disputes` — il emet juste vers le parent CCC via `onDisputeDataChange`. Pas de divergence reelle ici.

## 5. PAS DE FLAG `has_dispute` MIS A JOUR SUR LA PARCELLE APRES SIGNALEMENT (fonctionnalite absente)

Quand un litige est signale via le service standalone, la colonne `has_dispute` de `cadastral_contributions` n'est PAS mise a jour. Seule la table `cadastral_land_disputes` est peuplee.

**Correction** : Apres soumission reussie d'un signalement, mettre a jour `has_dispute = true` sur la parcelle dans `cadastral_parcels` (ajouter la colonne si necessaire) pour que la carte puisse afficher l'indicateur visuel sans jointure complexe.

## 6. AUCUNE DONNEE FICTIVE

- Les stats admin (total, signalements, levees, en cours) sont calculees sur donnees reelles.
- Les constantes (natures, motifs, qualites) sont conformes au droit foncier RDC.
- Le prix d'acces (6,99 USD) est gere dans le catalogue de services.

## 7. ADMIN : PAS D'ACTION "RENVOYER" (coherence manquante)

Comme pour le lotissement avant correction, l'admin des litiges ne propose pas de "Renvoyer pour correction". Il ne peut que changer le statut dans une liste deroulante. C'est fonctionnel mais moins explicite que les autres services.

**Etat** : Le workflow actuel (changement de statut libre + notes) est plus flexible que les boutons discrets des autres services. Pas de correction necessaire — c'est un choix de design valide pour les litiges qui ont des transitions de statut multiples.

---

## Plan d'implementation

### Etape 1 — Migration DB : ajouter `has_dispute` a `cadastral_parcels`

```sql
ALTER TABLE cadastral_parcels ADD COLUMN IF NOT EXISTS has_dispute boolean DEFAULT false;
```

### Etape 2 — Marquer la parcelle apres signalement

Dans `LandDisputeReportForm.tsx`, apres l'insert reussi dans `cadastral_land_disputes`, ajouter :
```
UPDATE cadastral_parcels SET has_dispute = true WHERE parcel_number = parcelNumber
```

### Etape 3 — Afficher l'indicateur de litige sur la carte

Dans `CadastralMap.tsx` :
- Ajouter `has_dispute` au `select` de la requete parcelles
- Si `has_dispute === true`, ajouter un contour orange et un marqueur "⚠ Litige" au centroid (similaire au traitement `is_subdivided`)

### Etape 4 — Supprimer la contribution CCC fantome

Supprimer le bloc L275-290 de `LandDisputeReportForm.tsx` qui cree une contribution CCC incomplete. Le litige est deja persiste dans sa propre table.

### Etape 5 — Creer l'onglet analytics litiges

Nouveau composant `AdminDisputeAnalytics.tsx` avec graphiques de repartition et KPIs, branche sur l'onglet admin existant.

### Fichiers impactes

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter `has_dispute` a `cadastral_parcels` |
| `src/components/cadastral/LandDisputeReportForm.tsx` | Marquer parcelle + supprimer contribution CCC fantome |
| `src/pages/CadastralMap.tsx` | Indicateur visuel litiges |
| `src/components/admin/AdminDisputeAnalytics.tsx` | Nouveau — analytics litiges |
| `src/components/admin/AdminSidebar.tsx` | Ajouter onglet analytics litiges |

5 fichiers modifies/crees + 1 migration.

