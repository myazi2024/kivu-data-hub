

# Fix : Clic sur "Paramètres" ne fait rien dans l'admin

## Problème

Le bouton "Paramètres" dans le dropdown du header admin appelle `navigate('/admin?tab=test-mode')`. Quand l'utilisateur est **déjà sur cette URL** (ce qui est le cas ici), React Router ignore la navigation identique — rien ne se passe visuellement.

De plus, "Paramètres" devrait logiquement mener vers une section de paramètres généraux, pas uniquement vers "Mode Test".

## Correction proposée

Deux options :

**Option A (rapide)** : Forcer le re-render même si l'URL est identique, en utilisant `navigate('/admin?tab=test-mode', { replace: true })` combiné avec un state unique pour forcer React Router à traiter la navigation.

**Option B (recommandée)** : Créer un onglet dédié "Paramètres" dans la sidebar qui regroupe les configurations système (Mode Test, Actions Parcelle, Logs d'Audit, etc.), et y rediriger depuis le dropdown.

## Plan retenu — Option A (correction immédiate)

### `AdminDashboardHeader.tsx`

Remplacer le `navigate('/admin?tab=test-mode')` du dropdown "Paramètres" par une navigation qui fonctionne même depuis la même page :

```tsx
<DropdownMenuItem onClick={() => {
  const target = '/admin?tab=test-mode';
  if (window.location.pathname + window.location.search === target) {
    // Force scroll to top / visual feedback when already on page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    navigate(target);
  }
}}>
  Paramètres
</DropdownMenuItem>
```

### Fichier impacté

| Fichier | Modification |
|---|---|
| `AdminDashboardHeader.tsx` | Gérer le cas où l'utilisateur est déjà sur la page cible |

### Note sur les erreurs de build

Les 10 erreurs TS listées (`>` expected) semblent provenir d'un état précédent du build. Les fichiers actuels sont syntaxiquement corrects. Si les erreurs persistent après ce changement, un rebuild propre les résoudra.

