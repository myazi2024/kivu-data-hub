

# Diagnostic complet de l'espace utilisateur — Resultats et orientations

## Synthese

L'espace utilisateur comprend 10 onglets (Profil, Donnees, Titres, Autorisations, Expertises, Mutations, Hypotheques, Litiges, Factures, Reglages) avec une architecture solide. Le diagnostic revele **3 categories de problemes** : des composants orphelins/dupliques, des indicateurs incomplets, et des fonctionnalites absentes.

---

## Problemes identifies

### Categorie 1 — Composants orphelins (code mort)

**Bug 1 — 4 composants jamais importes dans l'application**

Les fichiers suivants existent dans `src/components/user/` mais ne sont importes nulle part dans le dashboard utilisateur ni aucune autre page :
- `UserQuickStats.tsx` — duplique exactement la logique des stats deja integree dans `UserProfileSection.tsx` (meme 4 compteurs, memes requetes)
- `UserQuickActions.tsx` — duplique le lien de parrainage et le bouton support deja integres dans `UserProfileSection.tsx`
- `UserProfileEdit.tsx` — l'edition du profil est deja geree directement dans `UserProfileSection.tsx`
- `UserVerification.tsx` — la verification email est deja integree dans `UserProfileSection.tsx` (bouton "Verifier" a cote de l'email)

**Impact** : 4 fichiers de code mort (~300 lignes) qui polluent le projet sans etre utilises.

### Categorie 2 — Indicateurs incomplets sur le profil

**Bug 2 — Quick Stats du profil ne montrent que 4 metriques sur 8+**

`UserProfileSection.tsx` L211-216 affiche 4 stats : Contributions, Autorisations, Factures, Codes CCC. Mais l'utilisateur a egalement des :
- Demandes de titres fonciers (`land_title_requests`)
- Demandes d'expertise (`real_estate_expertise_requests`)
- Demandes de mutation (`mutation_requests`)
- Litiges fonciers (`cadastral_land_disputes`)
- Demandes d'hypotheque (contributions type `mortgage_*`)

**Impact** : L'apercu rapide du profil ne reflete pas l'ensemble de l'activite de l'utilisateur.

**Bug 3 — Le compteur "Autorisations" compte mal**

`UserProfileSection.tsx` L54-57 : Le compteur "Autorisations" filtre les contributions ayant `permit_request_data != null`. Mais `UserBuildingPermits.tsx` L56-77 fetche aussi les contributions de type `update` avec `building_permits != null`. Le compteur du profil est donc sous-estime.

### Categorie 3 — Fonctionnalite absente

**Bug 4 — Pas d'onglet "Lotissements" pour l'utilisateur**

L'admin a un module `AdminSubdivisionRequests` avec compteur sidebar pour `subdivision_requests`. Mais l'utilisateur n'a **aucun onglet** dans son dashboard pour suivre ses demandes de lotissement. La table `subdivision_requests` a un champ `user_id` et le mode test genere ces donnees, mais l'utilisateur ne peut pas les consulter.

**Impact** : Un utilisateur qui soumet une demande de lotissement n'a aucun moyen de suivre son avancement.

**Bug 5 — Page BillingDashboard duplique des fonctionnalites**

`BillingDashboard.tsx` est une page separee (`/billing`) qui affiche `UserProfileHeader` + `CadastralDashboardTabs` + `UserStatisticsCharts` + `UserPreferences`. Ces composants sont tous deja accessibles depuis `UserDashboard.tsx` (onglets Factures, Profil, Reglages). La page `UserStatisticsCharts` en particulier affiche des KPI via le hook `useUserStatistics` (appel RPC `get_user_statistics`) qui ne sont visibles nulle part dans le dashboard principal.

**Impact** : Duplication de navigation. Les statistiques detaillees (total depense, factures en attente, taux d'approbation, codes CCC gagnes/utilises) ne sont accessibles que depuis cette page secondaire.

---

## Orientations recommandees

### Correction 1 — Supprimer les composants orphelins