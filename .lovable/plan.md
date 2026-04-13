

# Fix — Bouton "Sauvegarder tout" responsive (icône seule sur mobile)

## Problème

Les boutons de mode (Graphiques, Onglets, Filigrane) masquent leur texte sur mobile et n'affichent que l'icône. Le bouton "Sauvegarder tout" affiche toujours du texte ("Sauvegarder"), ce qui est incohérent.

## Correction

**Fichier : `src/components/admin/AdminAnalyticsChartsConfig.tsx`** (lignes 342-345)

Masquer le texte sur mobile et retirer le `mr-1` de l'icône quand il n'y a pas de texte :

```tsx
<Button size="sm" variant="outline" onClick={handleSaveAll} disabled={!hasChanges || isSaving}>
  {isSaving ? <Loader2 className={`h-3.5 w-3.5 animate-spin ${!isMobile ? 'mr-1' : ''}`} /> : <Save className={`h-3.5 w-3.5 ${!isMobile ? 'mr-1' : ''}`} />}
  {!isMobile && 'Sauvegarder tout'}
</Button>
```

Un seul fichier modifié, 3 lignes changées.

