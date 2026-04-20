

## Contrôle d'accès au menu « Données foncières »

### Règle d'accès

| Rôle | Accès `/map` & `/cadastral-map` |
|---|---|
| `super_admin`, `admin`, `expert_immobilier`, `mortgage_officer`, `notaire`, `geometre`, `urbaniste`, `partner` | ✅ Autorisé |
| `user` (rôle par défaut) | ❌ Bloqué — page d'information dédiée |
| Non connecté | Redirection `/auth` (déjà en place sur `/cadastral-map`) |

### Implémentation

#### 1. Centraliser la liste des rôles autorisés
`src/constants/roles.ts` — ajouter :
```ts
export const LAND_DATA_ROLES: AppRole[] = [
  'super_admin','admin','expert_immobilier','mortgage_officer',
  'notaire','geometre','urbaniste','partner',
];
```

#### 2. Nouveau composant `LandDataAccessGate`
Fichier : `src/components/access/LandDataAccessGate.tsx`

Comportement :
- Lit `useAuth()` → si `loading` : spinner
- Si `!user` : `<Navigate to="/auth" replace />` (avec `auth_redirect_url` mémorisé)
- Si `profile.role` ∈ `LAND_DATA_ROLES` : rend `children`
- Sinon (rôle `user`) : affiche la **page d'information** ci-dessous

**Page d'information (rôle `user`)** — composant `LandDataAccessDenied` intégré au gate :
- Titre : « Accès réservé aux profils habilités »
- Bandeau explicatif : « Le menu *Données foncières* contient des informations sensibles dont l'accès est strictement encadré. Votre profil actuel (*Utilisateur*) ne permet pas la consultation. »
- **Bloc A — Données traitées (non accessibles)** :
  - Parcelles cadastrales géolocalisées et leurs limites (GPS)
  - Titres fonciers, certificats d'enregistrement, contrats de location
  - Identités des propriétaires et co-titulaires (PII)
  - Hypothèques et inscriptions de garanties
  - Litiges fonciers et historiques contentieux
  - Mutations, transferts et historiques de propriété
  - Autorisations de bâtir et constructions déclarées
  - Données fiscales (impôt foncier, bâtisse, IRL)
  - Statistiques croisées multi-variables (genre, usage, zone, statut)
  - Cartographie territoriale par province / territoire / commune / quartier
- CTA principal : « Soumettre une demande de partenariat » → `Link` vers `/partnership` (carte verte, icône `Handshake`)
- **Bloc B — Données accessibles après validation** :
  - Carte interactive choroplèthe RDC (4 niveaux territoriaux)
  - Filtres et croisements analytiques (8 onglets)
  - Export d'images et partage des graphiques
  - Cartographie cadastrale détaillée par parcelle
  - Tableaux de bord territoriaux et indicateurs de répartition
  - Téléchargement et partage de rapports visuels
- Lien secondaire : « Retour à l'accueil » → `/`

Design : même grammaire visuelle que les autres pages (`Card`, `Badge`, classes sémantiques `bg-background`, `text-muted-foreground`), icônes lucide (`Lock`, `ShieldCheck`, `MapPin`, `FileText`, `Users`, `Scale`, `BarChart3`, `Handshake`).

#### 3. Brancher le gate sur les routes `App.tsx`
Wrapper `/map`, `/cadastral-map`, `/test/map`, `/test/cadastral-map` :
```tsx
<Route path="/map" element={
  <LandDataAccessGate><Map /></LandDataAccessGate>
} />
```
- `/cadastral-map` reste en plus dans `<ProtectedRoute>` (déjà présent) ; `LandDataAccessGate` ajoute la couche rôle.
- `/map` n'avait aucun garde — le gate gère désormais auth + rôle.
- Routes `/test/*` admin restent dans `<ProtectedRoute requiredRoles={['admin','super_admin']}>` (déjà OK, pas besoin du gate).

#### 4. Discrétion dans la navigation (optionnel mais cohérent)
`src/components/ui/navigation.tsx` :
- Garder le lien « Données foncières » visible pour tous (la page bloquante l'explique mieux qu'une absence silencieuse)
- Ajouter un petit `<Lock className="h-3 w-3 ml-1 text-muted-foreground" />` à côté du libellé quand `profile?.role === 'user'`, pour signaler l'accès restreint avant clic.

### Fichiers touchés

| Fichier | Action |
|---|---|
| `src/constants/roles.ts` | + constante `LAND_DATA_ROLES` |
| `src/components/access/LandDataAccessGate.tsx` | **Création** (~160 lignes, gate + page bloquante intégrée) |
| `src/App.tsx` | Wrapper sur 4 routes (`/map`, `/cadastral-map`, `/test/map`, `/test/cadastral-map`) |
| `src/components/ui/navigation.tsx` | Icône cadenas conditionnelle (desktop + mobile) |

### Hors périmètre

- Pas de nouvelle table BD : workflow d'accès = redirection `/partnership` (formulaire existant)
- Pas de modification de `ProtectedRoute` (gate dédié, plus expressif)
- Pas de changement des permissions granulaires (`role_permissions`) — le contrôle est ici fait par rôle, suffisant pour ce scope
- Pas de modification des routes admin (`/admin`) ni du dashboard utilisateur

### Validation attendue

- Connexion en tant que `user` → clic sur « Données foncières » → page d'information s'affiche, CTA `/partnership` fonctionne
- Connexion en tant que `notaire` / `partner` / `admin` → accès direct à la carte
- Non-connecté → redirection `/auth` puis retour automatique vers la carte après login (rôle permettant)
- Mode test admin (`/test/map`) → inchangé pour `admin` / `super_admin`

