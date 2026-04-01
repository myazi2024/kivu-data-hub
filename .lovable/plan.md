

# Audit de fonctionnalite — Formulaire CCC

## Architecture

Le formulaire CCC (`CadastralContributionDialog.tsx`) est un dialogue modal a 5 onglets (Infos, Localisation, Passe, Obligations, Envoi) pilote par le hook central `useCCCFormState.ts` (1565 lignes). Les onglets sont verrouilles sequentiellement : chaque onglet doit etre complet avant d'acceder au suivant.

---

## Etat de sante global : Solide

Le formulaire est fonctionnellement mature avec une couverture exhaustive des champs cadastraux. Voici l'audit detaille :

---

## Constats par domaine

### 1. Navigation & UX des onglets

| # | Constat | Statut |
|---|---|---|
| 1 | Verrouillage sequentiel des onglets (general → location → history → obligations → review) | OK |
| 2 | Scroll-to-top automatique au changement d'onglet | OK |
| 3 | Validation par onglet avec toast listant les champs manquants (max 5 affiches) | OK |
| 4 | Scroll automatique vers le premier champ en erreur (`.ring-destructive`) | OK |
| 5 | Confirmation de fermeture si donnees non soumises | OK |

### 2. Sauvegarde & Persistance

| # | Constat | Statut |
|---|---|---|
| 6 | Auto-save localStorage toutes les 1.5s (debounce) | OK |
| 7 | Restauration depuis localStorage a la reouverture (mode creation) | OK |
| 8 | Chargement depuis DB en mode edition (`editingContributionId`) | OK |
| 9 | Les fichiers (`receiptFile`, `attachmentFile`) sont exclus du localStorage (non serialisables) | OK |
| 10 | Nettoyage du localStorage apres soumission reussie | OK |
| 11 | **`auth_redirect_url` est ecrit dans localStorage** a chaque sauvegarde (ligne 228) mais **jamais lu ni nettoye** par ce hook | P3 |

### 3. Onglet Infos (GeneralTab)

| # | Constat | Statut |
|---|---|---|
| 12 | Titre de propriete : 4 types + "Autre" avec saisie personnalisee | OK |
| 13 | Contrat de location : distinction initial/renouvellement avec duree bail | OK |
| 14 | Proprietaires multiples (copropriete) | OK |
| 15 | Cascade construction : Categorie → Type → Materiaux → Nature (auto-deduite) → Standing → Usage | OK |
| 16 | Constructions additionnelles (mode multiple) | OK |
| 17 | Autorisations de batir : mode existant (avec pieces) OU demande | OK |
| 18 | Restrictions permis : terrain nu/precaire bloque la regularisation | OK |
| 19 | Validation chronologique : date permis vs annee construction (3 ans max) | OK |
| 20 | Titre anterieur obligatoire si acquisition < date de delivrance du titre | OK |
| 21 | **`removeBuildingPermit` est defini mais jamais exporte** dans le `return` du hook (ligne 488). L'onglet GeneralTab n'a pas acces a cette fonction. | **P2 - Bug** |
| 22 | **`addBuildingPermit` est defini mais jamais exporte** dans le `return` (ligne 475). | **P2 - Bug** |

### 4. Onglet Localisation (LocationTab)

| # | Constat | Statut |
|---|---|---|
| 23 | Auto-detection section urbaine/rurale depuis le numero de parcelle (SU/SR) | OK |
| 24 | Cascade geographique : Province → Ville/Territoire → Commune/Collectivite → Quartier/Groupement → Avenue/Village | OK |
| 25 | Dimensions parcelle avec minimum 3 cotes | OK |
| 26 | Calcul surface automatique : Heron (3 cotes), Rectangle/Brahmagupta (4), polygone regulier (5+) | OK |
| 27 | GPS par borne avec geolocalisation native | OK |
| 28 | Limites et entrees : routes, servitudes, entrees de parcelle | OK |
| 29 | Croquis de constructions (buildingShapes) | OK |
| 30 | Mesures specifiques pour appartements (longueur, largeur, orientation) | OK |
| 31 | Validation enclavement : servitude obligatoire si aucune route | OK |

### 5. Onglet Passe (HistoryTab)

| # | Constat | Statut |
|---|---|---|
| 32 | Historique de propriete avec anciens proprietaires | OK |
| 33 | Auto-sync date fin dernier ancien proprietaire ← date "depuis" proprietaire actuel | OK |
| 34 | Validation : le propriétaire actuel (nom+prenom) doit etre rempli avant d'ajouter un ancien | OK |
| 35 | Types de mutation : Vente, Donation, Succession, Expropriation, Echange | OK |
| 36 | Support statut juridique par ancien proprietaire (physique, morale, Etat) | OK |

### 6. Onglet Obligations (ObligationsTab)

| # | Constat | Statut |
|---|---|---|
| 37 | 3 sous-onglets : Taxes, Hypotheques, Litiges | OK |
| 38 | Registre fiscal avec types de taxes, annees, montants, statuts de paiement | OK |
| 39 | Hypotheques : question binaire + details si oui | OK |
| 40 | Litiges : question binaire + formulaire detaille si oui | OK |
| 41 | Upload de recus pour taxes et documents hypothecaires | OK |
| 42 | Validation : recu obligatoire pour toute taxe renseignee | OK |
| 43 | Validation : statut hypotheque (Oui/Non) obligatoire | OK |

### 7. Onglet Envoi (ReviewTab)

| # | Constat | Statut |
|---|---|---|
| 44 | Recapitulatif complet de toutes les sections | OK |
| 45 | Score de completude CCC (valeur 0-5 USD) | OK |
| 46 | Croquis SVG statique de la parcelle | OK |
| 47 | Impression A4 optimisee | OK |
| 48 | Bilan de conformite fiscale (3 annees precedentes) | OK |
| 49 | Liste des champs manquants avec navigation directe vers l'onglet concerne | OK |

### 8. Soumission

| # | Constat | Statut |
|---|---|---|
| 50 | Authentification rapide (QuickAuthDialog) si non connecte | OK |
| 51 | Detection doublons : bloque si contribution pending/returned existe deja pour la meme parcelle | OK |
| 52 | Upload parallele de tous les fichiers (proprietaire, titre, taxes, hypotheques, permis) | OK |
| 53 | URLs signees 10 ans | OK |
| 54 | Confetti a la soumission reussie | OK |
| 55 | Mode edition (`updateContribution`) vs mode creation (`submitContribution`) | OK |
| 56 | **Aucun feedback de progression pendant l'upload** — L'etat `uploading` est utilise mais le ReviewTab ne montre qu'un spinner generique. Pour des fichiers volumineux, l'utilisateur ne sait pas ou en est le processus. | P3 |

### 9. Mode Edition (Retour pour correction)

| # | Constat | Statut |
|---|---|---|
| 57 | Chargement depuis DB avec mapping snake_case ↔ camelCase | OK |
| 58 | Support des cles legacy (owner_name, ownerName) | OK |
| 59 | Fichiers existants (URLs) affiches et reutilises si pas remplaces | OK |
| 60 | `customTitleName` restaure si titre non standard | OK |

### 10. Calcul de score CCC

| # | Constat | Statut |
|---|---|---|
| 61 | 14 champs fondamentaux + bonus GPS, WhatsApp, historique, taxes, hypotheques, litiges, croquis | OK |
| 62 | GPS : 2 points pour ≥3 coordonnees, 1 point si partiel | OK |
| 63 | Score aligne frontend/backend | OK |

### 11. Reset par bloc

| # | Constat | Statut |
|---|---|---|
| 64 | 7 fonctions de reset : titre, proprietaires, construction, localisation, anciens proprietaires, taxes, hypotheques | OK |
| 65 | Chaque reset appelle `markDirty()` pour declencher l'auto-save | OK |

---

## Bugs et ameliorations identifies

| Priorite | Probleme | Impact | Correction |
|---|---|---|---|
| **P2** | `addBuildingPermit` et `removeBuildingPermit` ne sont pas exposes dans le `return` du hook. Les utilisateurs ne peuvent probablement pas ajouter/supprimer des permis depuis le GeneralTab. | Fonctionnel | Ajouter ces 2 fonctions au `return` de `useCCCFormState` |
| P3 | `auth_redirect_url` ecrit dans localStorage a chaque sauvegarde mais jamais nettoye par ce module | Fuite memoire mineure | Nettoyer dans `clearSavedFormData` |
| P3 | Pas de feedback de progression d'upload pour les fichiers volumineux | UX | Ajouter un compteur de fichiers uploades |

---

## Resume

Le formulaire CCC est **robuste et mature** :
- 5 onglets couvrant exhaustivement le dossier foncier
- Validation rigoureuse avec 30+ regles metier
- Auto-save debounce + restauration
- Mode creation et edition unifies
- Score de completude aligne frontend/backend
- Upload multi-fichiers avec URLs signees 10 ans

**1 bug fonctionnel P2** : les fonctions `addBuildingPermit` / `removeBuildingPermit` ne sont pas exposees par le hook, ce qui peut empecher l'ajout/suppression de permis.

**Souhaitez-vous approuver pour corriger le bug P2 ?**

