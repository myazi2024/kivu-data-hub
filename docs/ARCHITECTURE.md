# Architecture Technique

## Vue d'ensemble

Application React SPA (Single Page Application) connectée à un backend Supabase. Pas de serveur custom : toute la logique backend passe par les politiques RLS de PostgreSQL, les RPCs et 6 Edge Functions Deno.

## Providers (arbre de contexte)

```
ErrorBoundary
└── QueryClientProvider (TanStack React Query, staleTime: 5 min)
    └── CookieProvider (consentement RGPD)
        └── AuthProvider (session, profil, rôle)
            └── CartProvider (panier publications)
                └── CadastralCartProvider (panier services cadastraux)
                    └── TooltipProvider
                        └── TestEnvironmentProvider (détection routes /test/*)
                            └── <Routes>
```

## Pages (18)

| Route | Page | Accès |
|-------|------|-------|
| `/` | Index (accueil) | Public |
| `/cadastral-map` | CadastralMap (recherche + résultats + actions) | Public |
| `/map` | Map (carte interactive RDC) | Public |
| `/publications` | Publications (kiosque) | Public |
| `/services` | Services (catalogue + facturation) | Public |
| `/articles` | Articles (blog) | Public |
| `/articles/:slug` | ArticleDetail | Public |
| `/about` | About | Public |
| `/about-ccc` | AboutCCC (codes contributeur) | Public |
| `/about-discount-codes` | AboutDiscountCodes | Public |
| `/partnership` | Partnership (devenir revendeur) | Public |
| `/legal` | Legal (mentions légales) | Public |
| `/auth` | Auth (connexion/inscription) | Public |
| `/reset-password` | ResetPassword | Public |
| `/admin` | Admin (63 onglets via `?tab=`) | `admin`, `super_admin` |
| `/mon-compte` | UserDashboard (espace personnel) | Authentifié |
| `/reseller` | ResellerDashboard | `partner`, `admin` |
| `/test/*` | Routes miroir pour le mode test | Authentifié |

## Flux de données

```
Supabase DB ←→ Edge Functions (paiement, webhook)
     ↕ (RLS + service_role)
Supabase JS Client
     ↕
Custom Hooks (useXxx)
     ↕
React Components (UI)
```

### Hooks principaux par domaine

**Authentification** : `useAuth` (session, profil, rôle, cache 5 min), `usePermissions`

**Cadastre** : `useCadastralSearch`, `useAdvancedCadastralSearch`, `useCadastralContribution`, `useCadastralStats`, `useCadastralServices`, `useCadastralBilling`, `useCadastralCart`, `useCadastralPayment`

**Services fonciers** : `useLandTitleRequest`, `useLandTitleDynamicFees`, `useMutationRequest`, `useMortgageDraft`, `useMortgageFees`, `usePermitPayment`, `useRealEstateExpertise`, `usePropertyTaxCalculator`

**Paiement** : `usePayment`, `usePaymentConfig`, `usePaymentMethods`, `usePaymentProviders`

**Admin** : `useAdminStatistics`, `useAdminUserStatistics`, `useUserManagement`, `useBulkUserActions`, `useAdminNotes`, `usePendingCount`, `useConfigHistory`, `useConfigValidation`

**Configuration** : `useSearchConfig`, `useSearchBarConfig`, `useResultsConfig`, `useContributionConfig`, `useParcelActionsConfig`, `useCatalogConfig`, `useMapConfig`, `useCurrencyConfig`, `useDiscountCodes`

**Analytics** : `useAdvancedAnalytics`, `useEnhancedAnalytics`, `useLandDataAnalytics`, `useDashboardData`, `useResellerStatistics`

**Divers** : `useTestMode`, `useTestEnvironment`, `useNotifications`, `useArticles`, `usePublications`, `useCart`, `useCookies`, `usePagination`, `usePersistentPagination`, `usePeriodFilter`, `useDebounce`

## Admin — Architecture par onglets

L'espace admin utilise un query param `?tab=` avec un `switch` dans `Admin.tsx`. 63 onglets couvrent :

- **Dashboard** : vue d'ensemble, statistiques, analytics avancés
- **Utilisateurs** : gestion, rôles, permissions, actions en masse
- **Cadastre** : parcelles, contributions, CCC, historiques, litiges, conflits
- **Services** : titres, mutations, permis, hypothèques, expertise, lotissements
- **Paiements** : transactions, factures, rapprochement, monitoring, méthodes
- **Configuration** : recherche, résultats, catalogue, devises, frais, zones
- **Contenu** : publications, articles, thèmes, partenaires
- **Système** : audit, santé, mode test, notifications

Tous les composants admin sont lazy-loaded via `React.lazy`.

## Sécurité

- **Authentification** : Supabase Auth (email/password)
- **Autorisation** : RLS policies sur toutes les tables + vérification rôle client-side via `useAuth`
- **Rôles** : table `user_roles` séparée (jamais dans `profiles`). Fonction `has_role()` SECURITY DEFINER pour éviter la récursion RLS
- **Rate limiting** : table `rate_limit_attempts`, vérifiée dans les Edge Functions (10 req/h par user)
- **Clés API** : masquées dans l'interface admin, validées par format (préfixes Stripe)
- **Mode test** : lu côté serveur depuis `cadastral_search_config`, jamais confié au client
