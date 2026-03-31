

# Audit exhaustif de l'application BIC (Bureau d'Information Cadastrale)

---

## Resume executif

### Forces
- Architecture modulaire bien structuree (hooks metier separes, composants par domaine, lazy loading)
- Systeme de roles via `user_roles` table (conforme aux bonnes pratiques, pas de roles sur le profil)
- Sanitisation XSS avec DOMPurify pour les SVG et contenus HTML
- Cookie banner RGPD avec preferences granulaires
- ErrorBoundary global, ProtectedRoute avec verification serveur dans Admin
- Mode test isole avec prefixe `TEST-%` et filtrage automatique
- Caching React Query avec `staleTime` de 5 min

### Faiblesses majeures
- **11 vulnerabilites RLS critiques** detectees par le scan de securite (donnees PII publiques, escalade de privileges)
- Fichiers monolithiques (LandTitleRequestDialog: 2 934 lignes, useCCCFormState: 1 565 lignes)
- 536 `console.log` en production
- Aucun schema de validation Zod cote client pour les formulaires principaux
- Page Admin charge 70+ imports eagerly au montage

---

## 1. Architecture & Code

### 1.1 Problemes critiques

| # | Probleme | Fichier(s) | Criticite |
|---|----------|------------|-----------|
| A1 | `LandTitleRequestDialog.tsx` = 2 934 lignes, non decompoe | `cadastral/` | Elevee |
| A2 | `useCCCFormState.ts` = 1 565 lignes, 40+ useState dans un seul hook | `hooks/` | Elevee |
| A3 | `Admin.tsx` importe eagerly 70+ composants admin (pas de lazy loading interne) | `pages/Admin.tsx` | Moyenne |
| A4 | 536 `console.log` en production (bruit, fuite d'info potentielle) | 23 fichiers | Moyenne |
| A5 | `renderContent()` dans Admin = switch de 50+ cases sans routage nested | `pages/Admin.tsx` | Moyenne |

### 1.2 Duplications identifiees

| Duplication | Occurrences |
|-------------|-------------|
| Logique `fetchPending*Count` (9 fonctions quasi-identiques dans Admin.tsx) | 9x |
| Pattern de batching par 50 repete manuellement dans chaque generateur test | 6x |
| Logique geographic cascading (province → ville → commune) dupliquee entre CCC et LandTitle | 2x |

### 1.3 Recommandations

- **Court terme** : Decomposer `LandTitleRequestDialog` en sous-composants + hook dedie (comme deja fait pour CCC)
- **Court terme** : Supprimer les `console.log` de production, utiliser un logger conditionnel
- **Moyen terme** : Lazy-loader les composants admin dans `renderContent()` ou utiliser des routes nested
- **Moyen terme** : Extraire un hook generique `usePendingCount(table, filter)` pour Admin

---

## 2. Performance & Scalabilite

| # | Probleme | Impact | Criticite |
|---|----------|--------|-----------|
| P1 | Admin.tsx charge 70+ modules au premier render (meme si un seul onglet afiche) | TTI eleve pour admin | Elevee |
| P2 | 9 requetes `count` Supabase en parallele au montage Admin sans debounce | Charge DB inutile | Moyenne |
| P3 | `useCCCFormState` cree 40+ useState → re-renders en cascade | Lag formulaire CCC | Moyenne |
| P4 | Pas de virtualisation pour les listes longues (contributions, parcelles, litiges) | DOM lourd >1000 rows | Moyenne |
| P5 | `profileCache` dans useAuth utilise une Map en state React → re-render a chaque set | Micro-perf | Faible |

### Recommandations
- **Court terme** : Lazy-loader chaque composant admin via `React.lazy` dans le switch/case
- **Moyen terme** : Utiliser `useReducer` au lieu de 40 `useState` dans useCCCFormState
- **Moyen terme** : Ajouter de la virtualisation (react-window) pour les tables admin >100 lignes
- **Long terme** : Migrer le cache profil vers React Query pour eviter la gestion manuelle

---

## 3. Securite

### 3.1 Vulnerabilites critiques (scan Supabase)

| # | Vulnerabilite | Table | Criticite |
|---|---------------|-------|-----------|
| S1 | **Escalade de privileges** : `cadastral_service_access` policy `true` → tout utilisateur peut s'accorder l'acces aux services payants | `cadastral_service_access` | **CRITIQUE** |
| S2 | **Modification non autorisee** : `orders` policy UPDATE `true` → n'importe qui peut changer le statut/montant | `orders` | **CRITIQUE** |
| S3 | **PII expose** : `cadastral_land_disputes` SELECT `true` → emails, telephones, noms des declarants lisibles par tous | `cadastral_land_disputes` | **CRITIQUE** |
| S4 | **Credentials exposees** : `payment_methods_config` readable par anon → colonne `api_credentials` (Stripe keys) | `payment_methods_config` | **CRITIQUE** |
| S5 | **PII expose** : `cadastral_parcels` SELECT `true` → noms proprietaires, WhatsApp, URLs documents | `cadastral_parcels` | **CRITIQUE** |
| S6 | **Certificats publics** : `generated_certificates` SELECT `true` → tous les certificats lisibles | `generated_certificates` | Elevee |
| S7 | **Donnees financieres publiques** : hypotheques, taxes, historique propriete → SELECT `true` | 5 tables | Elevee |
| S8 | **Fraude revendeurs** : `reseller_sales` INSERT `true` → creation de commissions frauduleuses | `reseller_sales` | Elevee |
| S9 | 9 fonctions SQL sans `SET search_path = public` | Fonctions DB | Moyenne |
| S10 | Protection contre les mots de passe compromis desactivee | Auth config | Moyenne |
| S11 | Version Postgres avec patchs de securite disponibles | Infrastructure | Moyenne |

### 3.2 Vulnerabilites applicatives

| # | Probleme | Criticite |
|---|----------|-----------|
| S12 | `ArticleDetail.tsx` : le markdown est parse en HTML puis sanitise, mais le parsing cree du HTML avant sanitisation (risque si DOMPurify bypass) | Faible (mitigue) |
| S13 | Aucune validation Zod client-side sur les formulaires CCC, LandTitle, Mutation, Expertise | Moyenne |
| S14 | `ProtectedRoute` verifie le role depuis `profile.role` (client-side) → la vraie verification se fait dans Admin.tsx via requete `user_roles`, mais le ProtectedRoute pourrait etre contourne si le profil est manipule en memoire | Moyenne |

### Recommandations
- **URGENT** : Corriger les 8 policies RLS critiques (S1-S8). Restreindre les SELECT aux utilisateurs authentifies ou ayant achete le service. Supprimer les policies `USING (true)` pour INSERT/UPDATE/DELETE
- **Court terme** : Ajouter `SET search_path = public` aux 9 fonctions manquantes
- **Court terme** : Activer la protection contre les mots de passe compromis
- **Moyen terme** : Ajouter validation Zod sur tous les formulaires avant soumission

---

## 4. Experience Utilisateur (UX/UI)

| # | Constat | Criticite |
|---|---------|-----------|
| U1 | Cookie banner ne bloque pas le scroll derriere → l'utilisateur peut interagir avec le site sans consentir | Moyenne |
| U2 | Formulaire CCC (5 onglets, 40+ champs) sans indicateur de progression global ni estimation du temps | Moyenne |
| U3 | `LandTitleRequestDialog` de 2 934 lignes suggere un flux complexe → risque d'abandon utilisateur | Moyenne |
| U4 | Les messages d'erreur Supabase sont parfois affiches bruts (`toast.error(error.message)`) | Faible |
| U5 | Accessibilite : les attributs `aria-label` sont presents sur les boutons principaux mais absents des formulaires complexes (champs CCC, filtres de recherche) | Moyenne |
| U6 | Pas de mode sombre explicite (le theming Tailwind le supporte mais pas de toggle utilisateur) | Faible |

### Recommandations
- **Court terme** : Ajouter `aria-label` et `aria-describedby` aux champs de formulaires CCC et LandTitle
- **Court terme** : Afficher des messages d'erreur traduits/humanises au lieu des erreurs Supabase brutes
- **Moyen terme** : Ajouter une barre de progression au formulaire CCC montrant le % de completion
- **Long terme** : Implementer un toggle dark/light mode

---

## 5. Conformite & Normes

| # | Domaine | Constat | Criticite |
|---|---------|---------|-----------|
| C1 | RGPD | Cookie banner present avec consentement granulaire (essentiel/analytics/marketing) | Conforme |
| C2 | RGPD | **PII en clair dans la DB sans chiffrement** (noms, emails, telephones dans `cadastral_parcels`, `disputes`, `contributions`) | Elevee |
| C3 | RGPD | Pas de mecanisme de suppression des donnees personnelles (droit a l'oubli) visible | Elevee |
| C4 | RGPD | Pas de page "Politique de confidentialite" dediee (la page `/legal` existe mais contenu non verifie) | Moyenne |
| C5 | Normes dev | 536 console.log en production → non conforme aux bonnes pratiques | Moyenne |
| C6 | Normes dev | Pas de tests unitaires ni d'integration visibles dans le projet | Elevee |
| C7 | Documentation | Pas de README, pas de documentation technique/fonctionnelle dans le repo | Moyenne |

### Recommandations
- **URGENT** : Corriger les policies RLS pour proteger les PII (recoupe avec S1-S8)
- **Court terme** : Ajouter une page Politique de confidentialite et un mecanisme de demande de suppression des donnees
- **Moyen terme** : Mettre en place des tests (au minimum pour les hooks metier critiques : useCCCFormState, useCadastralPayment, useAuth)
- **Long terme** : Ajouter un chiffrement au repos pour les colonnes PII sensibles

---

## 6. Tableau de priorisation

| Priorite | Action | Categorie | Effort |
|----------|--------|-----------|--------|
| **P0 — URGENT** | Corriger les 8 policies RLS critiques (S1-S8) | Securite | 1 jour |
| **P0 — URGENT** | Activer la protection mots de passe compromis | Securite | 5 min |
| P1 — Court terme | Ajouter `search_path` aux 9 fonctions SQL | Securite | 1h |
| P1 — Court terme | Supprimer les 536 console.log de production | Code | 2h |
| P1 — Court terme | Lazy-loader les composants admin | Perf | 2h |
| P2 — Moyen terme | Decomposer LandTitleRequestDialog (2 934 → ~500 lignes) | Architecture | 1 jour |
| P2 — Moyen terme | Refactoriser useCCCFormState (useReducer) | Architecture | 1 jour |
| P2 — Moyen terme | Ajouter validation Zod aux formulaires | Securite/UX | 2 jours |
| P2 — Moyen terme | Virtualisation des tables admin longues | Perf | 1 jour |
| P2 — Moyen terme | Tests unitaires hooks metier | Conformite | 3 jours |
| P3 — Long terme | Chiffrement PII au repos | Conformite | 3 jours |
| P3 — Long terme | Toggle dark/light mode | UX | 1 jour |
| P3 — Long terme | Documentation technique complete | Conformite | 2 jours |

