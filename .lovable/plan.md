

## Fix — Restaurer l'accès « Carte Cadastrale » pour le rôle `user`

### Problème

La route `/cadastral-map` est actuellement protégée par `LandDataAccessGate`, ce qui bloque les utilisateurs avec le rôle `user`. Or, seule la route `/map` (Données foncières — analytics RDC) doit être restreinte. La **Carte Cadastrale** doit rester accessible à tous les utilisateurs authentifiés.

### Correction

**1. `src/App.tsx`** — Retirer le wrapper `LandDataAccessGate` autour de `/cadastral-map`. Remplacer par `ProtectedRoute` simple (authentification requise, sans contrainte de rôle) :

```tsx
<Route path="/cadastral-map" element={
  <ProtectedRoute>
    <CadastralMap />
  </ProtectedRoute>
} />
```

La route `/map` reste protégée par `LandDataAccessGate` (inchangée).

**2. `src/components/ui/navigation.tsx`** — Retirer l'affichage du cadenas sur l'entrée « Carte Cadastrale » (desktop ligne ~154 et mobile ligne ~286). Le cadenas reste uniquement sur « Données foncières ».

### Fichiers touchés

| Fichier | Action |
|---|---|
| `src/App.tsx` | Remplacer `LandDataAccessGate` par `ProtectedRoute` sur `/cadastral-map` |
| `src/components/ui/navigation.tsx` | Retirer le cadenas conditionnel sur l'entrée « Carte Cadastrale » uniquement |

### Hors périmètre

- Aucune modification de `LAND_DATA_ROLES` ni du gate (toujours utilisé par `/map`)
- Aucune modification de la page d'information `LandDataAccessDenied`
- Routes `/test/*` inchangées

### Validation attendue

- `user` → clic sur « Carte Cadastrale » → accès direct à la carte ✅
- `user` → clic sur « Données foncières » → page d'information avec CTA `/partnership` ✅
- Non connecté → `/cadastral-map` redirige vers `/auth` ✅
- Rôles métier et admin → accès inchangé aux deux cartes ✅

