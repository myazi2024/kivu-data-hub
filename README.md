# CadastreRDC — Plateforme Cadastrale de la République Démocratique du Congo

Plateforme numérique de gestion cadastrale pour la RDC : recherche de parcelles, contributions citoyennes, services fonciers, paiements en ligne et administration complète.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript 5, Vite 5 |
| UI | Tailwind CSS 3, shadcn/ui, Lucide icons |
| État | TanStack React Query, Context API |
| Cartographie | Leaflet / React-Leaflet |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Paiements | Stripe (carte bancaire), Mobile Money (Airtel, Orange, M-Pesa) |
| PDF | jsPDF + jspdf-autotable |

## Modules fonctionnels

| Module | Description |
|--------|-------------|
| **Cadastre** | Recherche, visualisation et contribution de données parcellaires |
| **Titres fonciers** | Demande de titre (urbain/rural), frais dynamiques, suivi |
| **Mutations** | Transfert de propriété avec frais et validation admin |
| **Hypothèques** | Enregistrement, suivi, mainlevée hypothécaire |
| **Permis de bâtir** | Demande multi-étapes avec pièces jointes |
| **Lotissement** | Subdivision de parcelles, frais configurables |
| **Expertise immobilière** | Demande d'expertise, certificat PDF généré |
| **Litiges fonciers** | Signalement, suivi, levée de litige |
| **Fiscalité** | Calculateur IRL, taxe bâtiment, historique fiscal |
| **Codes CCC** | Codes contributeur cadastral : génération, validation, utilisation |
| **Publications** | Kiosque de documents avec panier d'achat |
| **Revendeurs** | Dashboard partenaire, commissions, codes promo |
| **Articles** | Blog thématique avec gestion admin |

## Structure des dossiers

```
src/
├── pages/          # 18 pages (Index, Admin, CadastralMap, UserDashboard…)
├── components/     
│   ├── admin/      # 70+ composants d'administration
│   ├── cadastral/  # Formulaires, dialogs, cartes cadastrales
│   ├── user/       # Tableau de bord utilisateur (15 onglets)
│   ├── payment/    # BankCardPayment, MobileMoneyPayment, CurrencySelector
│   ├── cart/        # Panier publications
│   └── ui/         # shadcn/ui (Button, Dialog, Toast…)
├── hooks/          # 65+ hooks (useAuth, useCadastralSearch, usePayment…)
├── types/          # Types partagés (cadastral, mutation, expertise…)
├── integrations/   # Client Supabase, types auto-générés
└── utils/          # Helpers (formatage, validation, PDF)

supabase/
├── functions/      # 6 Edge Functions (paiement, webhook, nettoyage…)
├── migrations/     # 140+ migrations SQL
└── config.toml     # Configuration Supabase
```

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL du projet Supabase (auto-configuré) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé anon Supabase (auto-configuré) |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (Edge Function secret) |
| `STRIPE_WEBHOOK_SECRET` | Secret webhook Stripe (Edge Function secret) |

## Développement local

```sh
git clone <URL_DU_REPO>
cd <NOM_DU_PROJET>
npm install
npm run dev
```

## Documentation

Voir le dossier [`docs/`](./docs/) :

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — Architecture technique détaillée
- [DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) — Schéma de base de données
- [EDGE_FUNCTIONS.md](./docs/EDGE_FUNCTIONS.md) — Documentation des Edge Functions
- [PAYMENT_FLOW.md](./docs/PAYMENT_FLOW.md) — Flux de paiement complet
- [MODULES.md](./docs/MODULES.md) — Guide des modules fonctionnels
- [TEST_MODE.md](./docs/TEST_MODE.md) — Mode test et données de test
- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) — Guide de déploiement
- [API_TYPES.md](./docs/API_TYPES.md) — Index des types TypeScript
- [RESELLER.md](./docs/RESELLER.md) — Module revendeur

## Déploiement

Via Lovable : cliquer sur **Share → Publish**. Les Edge Functions et migrations se déploient automatiquement. Le frontend nécessite un clic sur « Update » dans le dialogue de publication.
