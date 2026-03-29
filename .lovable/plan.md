

# Adapter la note explicative à la sélection de province

## Problème
La note sous le titre affiche toujours le total global (63 parcelles) même quand une province est sélectionnée. Elle doit refléter le contexte actuel.

## Changement — `src/components/DRCInteractiveMap.tsx` (ligne 257-259)

Remplacer le texte statique par une version conditionnelle :

- **Carte entière** : `"Répartition géographique des données foncières cadastrales — Total : {totalParcels} parcelles enregistrées"`
- **Province sélectionnée** : `"Données foncières cadastrales de {selectedProvince.name} — Total : {selectedProvince.parcelsCount} parcelles enregistrées"`

`selectedProvince` contient déjà `parcelsCount` (issu de `provincesData`), donc aucune donnée supplémentaire n'est nécessaire.

```tsx
<p className="text-[7px] text-muted-foreground leading-tight">
  {selectedProvince
    ? `Données foncières cadastrales de ${selectedProvince.name} — Total : ${formatNumber(selectedProvince.parcelsCount)} parcelles enregistrées`
    : `${getChartConfig('map-header-note')?.custom_title || 'Répartition géographique des données foncières cadastrales'} — Total : ${formatNumber(totalParcels)} parcelles enregistrées`
  }
</p>
```

## Fichier impacté

| Fichier | Modification |
|---------|-------------|
| `src/components/DRCInteractiveMap.tsx` | Ligne 257-259 — note contextuelle selon `selectedProvince` |

