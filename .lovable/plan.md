

# Correction des références API dans la Présentation BIC

## Problème

La présentation mentionne à plusieurs endroits une "API ouverte" pour banques, notaires, institutions, etc. Or, l'application gère tout via un **système de permissions granulaires par rôle**. Les partenaires et professionnels accèdent aux fonctionnalités directement sur la plateforme selon leurs permissions, sans API externe. Les utilisateurs qui veulent plus d'accès demandent l'ajout de permissions supplémentaires à leur compte.

## Endroits à corriger (6 occurrences)

### 1. Slide "Piliers" (~ligne 105)
- **Avant** : `Interopérabilité` → "Une API ouverte pour banques, notaires et institutions"
- **Après** : `Accessibilité` → "Accès personnalisé par permissions pour chaque professionnel et institution"

### 2. Slide "Partenariat Commercial" (~ligne 695)
- **Avant** : "Accès API pour intégrer les données cadastrales…" + benefits mentionnant API REST, Webhooks
- **Après** : "Accès direct à la plateforme avec permissions adaptées à vos besoins métier." + benefits : "Compte professionnel avec permissions dédiées", "Vérification des titres en temps réel", "Notifications et alertes personnalisées", "Support technique prioritaire"

### 3. Roadmap Phase 2 (~ligne 748)
- **Avant** : "Lancement de l'API commerciale"
- **Après** : "Ouverture des comptes professionnels à grande échelle"

### 4. Roadmap Phase 3 (~ligne 756)
- **Avant** : "API publique pour développeurs tiers", "Interopérabilité avec les SIG nationaux"
- **Après** : "Permissions étendues pour tous les acteurs du foncier", "Intégration des données SIG nationales dans la plateforme"

### 5. Modèle économique — carte "API commerciale" (~ligne 827)
- **Avant** : titre "API commerciale", prix "0,50 $ par appel", mention API REST
- **Après** : titre "Accès Professionnel", prix "50 — 200 $", unité "par mois", desc "Compte professionnel avec permissions avancées pour les entreprises : banques, notaires, promoteurs.", features : "Permissions personnalisées", "Accès aux données avancées", "Support dédié"

## Fichier modifié

- **`src/pages/PitchPartenaires.tsx`** : 6 corrections textuelles, aucun changement structurel.

