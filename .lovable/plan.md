

# Audit — Documentations Absentes

## Etat Actuel

Le projet contient 13 fichiers `.md` a la racine, mais la majorite sont des rapports de test ou des correctifs ponctuels, pas de la documentation structurelle. Le `README.md` est le template Lovable par defaut, sans aucune information specifique au projet.

## Documentations Manquantes Identifiees

### 1. README.md — A reecrire completement (P0)

Le README actuel est generique. Il devrait contenir :
- Description du projet (plateforme cadastrale RDC)
- Architecture technique (React + Supabase, structure des dossiers)
- Modules fonctionnels (cadastre, hypotheques, lotissements, permis, litiges, mutations, expertise, fiscalite, CCC, revendeurs)
- Variables d'environnement requises
- Instructions de deploiement specifiques

### 2. ARCHITECTURE.md — Inexistant (P0)

Aucun document ne decrit :
- La structure des dossiers (`src/components/admin/`, `src/components/cadastral/`, `src/components/user/`, etc.)
- Le flux de donnees (Supabase → hooks → composants)
- Les 18 pages et leurs roles
- Les 65+ hooks et leur organisation
- Les 6 Edge Functions et leurs responsabilites
- Le systeme de providers (Auth, Cart, CadastralCart, Cookie, TestEnvironment)

### 3. DATABASE_SCHEMA.md — Inexistant (P0)

Il y a 140+ fichiers de migration SQL mais aucun document qui :
- Liste les tables principales et leurs relations
- Decrit les RPCs disponibles (`get_admin_statistics`, `create_cadastral_invoice_secure`, etc.)
- Documente les politiques RLS
- Explique les colonnes generees (ex: `area_hectares`)
- Note : `CADASTRAL_PARCELS_GUIDE.md` couvre uniquement `area_hectares`, pas le schema global

### 4. EDGE_FUNCTIONS.md — Inexistant (P1)

6 Edge Functions non documentees :
- `cleanup-test-data` — pas de doc sur les conditions de declenchement
- `create-payment` — pas de doc sur les providers supportes, les parametres attendus
- `health-check` — pas de doc sur le format de reponse
- `process-mobile-money-payment` — pas de doc sur l'integration mobile money
- `stripe-webhook` — pas de doc sur les evenements geres
- `test-payment-provider` — pas de doc sur le comportement simule

### 5. PAYMENT_FLOW.md — Inexistant (P1)

Le systeme de paiement est complexe (3 composants payment, hooks dedies, mode test, providers multiples) mais non documente :
- Flux de paiement complet (creation facture → paiement → validation)
- Providers supportes (Stripe, Mobile Money, carte bancaire)
- Mode test vs production
- Gestion des devises et taux de change

### 6. MODULES_GUIDE.md — Inexistant (P1)

Les modules fonctionnels majeurs n'ont pas de documentation utilisateur/developpeur :
- **Lotissement** (`subdivision/`) — 25+ types, workflow complexe
- **Hypotheques** — enregistrement, radiation, workflow admin
- **Permis de construire** — formulaire multi-etapes, frais, pieces jointes
- **Mutations foncieres** — workflow et frais
- **Litiges fonciers** — signalement, levee, suivi
- **Expertise immobiliere** — demande, certificat PDF
- **Declarations fiscales** — calcul IRL, taxe batiment
- **Codes CCC** — generation, validation, utilisation

### 7. RESELLER_GUIDE.md — Inexistant (P2)

Module revendeur (dashboard, commissions, codes promo) sans documentation.

### 8. API_TYPES.md — Inexistant (P2)

Les types sont repartis dans 6 fichiers `src/types/` + types locaux dans les composants, sans index ni documentation des interfaces principales.

### 9. TEST_MODE.md — Inexistant (P2)

Le mode test est un systeme transversal (provider, banner, nettoyage des donnees) sans documentation unifiee. Les fichiers `TEST_*.md` existants sont des rapports de validation, pas de la documentation d'utilisation.

### 10. DEPLOYMENT.md — Inexistant (P2)

Pas de guide de deploiement specifique :
- Configuration Supabase requise
- Migrations a executer
- Variables d'environnement
- Ordre de deploiement (migrations → edge functions → frontend)

## Fichiers .md Existants a Nettoyer

Les fichiers suivants sont des rapports de test/verification ponctuels, pas de la documentation permanente. Ils pourraient etre deplaces dans un dossier `docs/reports/` :
- `TEST_CCC_RAPPORT.md`
- `TEST_USER_BUILDING_PERMITS.md`
- `TEST_USER_DASHBOARD_INTEGRATION.md`
- `TEST_VALIDATION_NOTIFICATIONS.md`
- `VERIFICATION_CCC_FINALE.md`
- `VERIFICATION_GESTION_UTILISATEURS.md`
- `BUGS_FIXED.md`
- `BACKEND_CCC_CORRECTIONS.md`
- `CORRECTIONS_USER_MANAGEMENT.md`

## Plan de Creation

| Priorite | Document | Contenu |
|---|---|---|
| P0 | `README.md` | Reecriture complete avec description projet, architecture, modules |
| P0 | `docs/ARCHITECTURE.md` | Structure dossiers, flux de donnees, providers, pages |
| P0 | `docs/DATABASE_SCHEMA.md` | Tables, relations, RPCs, RLS, colonnes generees |
| P1 | `docs/EDGE_FUNCTIONS.md` | 6 fonctions avec parametres, reponses, declencheurs |
| P1 | `docs/PAYMENT_FLOW.md` | Flux complet, providers, mode test, devises |
| P1 | `docs/MODULES.md` | Guide de chaque module fonctionnel |
| P2 | `docs/RESELLER.md` | Module revendeur |
| P2 | `docs/TEST_MODE.md` | Mode test unifie |
| P2 | `docs/DEPLOYMENT.md` | Guide de deploiement |
| P2 | `docs/API_TYPES.md` | Index des types et interfaces |

Total : 10 documents a creer, 9 fichiers de rapports a reorganiser.

