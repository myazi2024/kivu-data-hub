

# Tripler l'intensité des ombres (×3)

**Fichier** : `src/pages/CadastralMap.tsx`

### 1. Barre de recherche (ligne 990)
```
shadow-[0_10px_40px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2)]
→
shadow-[0_10px_40px_-8px_rgba(0,0,0,0.9),0_4px_16px_-4px_rgba(0,0,0,0.6)]
```

### 2. Panneau Actions (ligne 1325)
```
shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.75),0_4px_16px_-4px_rgba(0,0,0,0.45)]
→
shadow-[0_8px_40px_-12px_hsl(var(--primary)/1),0_4px_16px_-4px_rgba(0,0,0,1)]
```
(Les opacités sont plafonnées à 1.0 car `0.75×3=2.25` et `0.45×3=1.35` dépassent le max.)

2 lignes modifiées dans 1 fichier.

