# Audit — Freeze du formulaire "Ajouter une règle de zonage" au clic sur "Matériaux autorisés"

## Reproduction observée
Dans `AdminSubdivisionZoningRules.tsx` (1 338 lignes), la section **« Infrastructures requises par voie »** active 3 blocs : Canal d'évacuation (drainage), Éclairage solaire, Revêtement de la voie. Cliquer sur une puce de la liste **Matériaux autorisés** (drainage ou revêtement) blanchit la boîte de dialogue et bloque l'interaction.

## Origine probable (hypothèses classées)

### H1 — Cause racine la plus probable : **`<Switch>` Radix imbriqué dans un `<label>` HTML**
Pour chacun des 3 blocs (lignes 1091-1098, 1170-1177, 1218-1225) :

```tsx
<label className="flex items-center justify-between gap-3 cursor-pointer">
  <div className="flex flex-col min-w-0">…titre + description…</div>
  <Switch checked={form.require_drainage_canal} onCheckedChange={…} />
</label>
```

`Switch` (Radix) rend un `<button role="switch">` **plus un `<input type="checkbox">` caché** pour la participation aux formulaires. Le `<label>` parent associe automatiquement son clic au **premier contrôle de formulaire descendant** — donc à cet input caché.

Conséquence : chaque clic sur le `<label>` déclenche **deux toggles** (un sur le bouton, un sur l'input synthétisé). Les états `require_*` oscillent, et chaque oscillation re-rend tout le `<fieldset>` (qui change son attribut `disabled`). Sur un formulaire de 1 300 lignes avec `useMemo([rules])` + cascades géographiques, la double mise à jour synchrone peut figer le main-thread pendant plusieurs centaines de ms et faire clignoter le fieldset jusqu'à blancheur perçue. Sur mobile (viewport actuel 360×612, le replay) c'est dramatique.

Le clic sur une puce **« Matériaux »** ne touche pas ce label directement, mais le `<fieldset>` parent réagit à chaque setState pendant que le focus traverse — et plus important, l'input chip lui-même est un `<input type="checkbox" className="sr-only">` enveloppé dans un `<label>` ; combiné au `disabled:opacity-50 transition-opacity` du fieldset, on observe un blanchiment lors du changement d'état.

### H2 — `setForm` non-mémoïsé + lourd sous-arbre (1 300 lignes)
Chaque coche déclenche `setForm(f => ({...f, road_surface_allowed_materials: [...]}))`. Le composant entier (cascades `villes`, `communes`, `quartiers`, `avenues` + table filtrée + `Dialog`) se re-rend. Il n'y a pas de `useCallback` sur les handlers, pas de `memo` sur le `ZoningRuleDialog`. Sur device tactile, un blocage long est interprété comme "freeze".

### H3 — `breadcrumbCache` partagé entre renders
`breadcrumbCache = useMemo(() => new Map(), [rules])` est muté dans le render path (`memoFormatBreadcrumb` fait `.set` pendant le render). C'est un anti-pattern React qui peut, en mode strict / concurrent, déclencher des warnings et un double-render.

### H4 — Possible `roadSurfaceTariffKeys` muté
`setRoadSurfaceTariffKeys(new Set(...))` est OK, mais le `Set` est passé tel quel à `validateZoningRuleForm` au save — pas un bug runtime, juste un risque.

### H5 — Aucun `<form>` natif autour des inputs
Le Dialog n'a pas de `<form onSubmit>` ; l'`Enter` dans un Input ne soumet rien, mais le clic sur un `<label>` orphelin peut, sur certains navigateurs (Safari iOS), provoquer des effets imprévus. Cohérent avec un viewport 360×612.

## Diagnostic retenu
**H1 + H2 cumulés** : le double-toggle du Switch via `<label>` parent réactive le `<fieldset>` à chaque clic en cascade, et la re-renderisation lourde gèle l'UI. Le symptôme "blanc" provient de `disabled:opacity-50 transition-opacity` + sous-arbre temporairement désactivé.

## Plan de correction (Lot unique)

### A. Découpler le Switch du `<label>` (3 blocs)
Remplacer le `<label>` enveloppant par un `<div role="group">` :
```tsx
<div className="flex items-center justify-between gap-3">
  <div className="flex flex-col min-w-0">
    <span id="lbl-drainage" className="text-xs font-semibold">…</span>
    <span className="text-[10px] text-muted-foreground">…</span>
  </div>
  <Switch
    aria-labelledby="lbl-drainage"
    checked={form.require_drainage_canal}
    onCheckedChange={v => setForm(f => ({ ...f, require_drainage_canal: v }))}
  />
</div>
```
Idem pour `require_solar_lighting` et `require_road_surface`. Cela élimine le double-toggle Radix et stabilise le fieldset.

### B. Mémoïser les handlers et sortir le contenu du dialog
- Extraire chaque liste de cases (`DrainageMaterialsChips`, `DrainageTypesChips`, `RoadSurfaceMaterialsChips`) en sous-composants `React.memo` recevant `(value: string[], onChange)`.
- Wrapper les onChange en `useCallback` au niveau parent.
- Ainsi un clic sur une puce ne re-rend que cette puce et son groupe, pas la totalité de la cascade géographique.

### C. Corriger `breadcrumbCache` (mutation pendant render)
Le calculer via `useMemo` qui retourne une `Map` pré-remplie à partir de `rules`, sans mutation pendant render.

### D. Petit garde-fou défensif
Sur chaque `setForm`, normaliser les tableaux : `[...(f.drainage_canal_allowed_materials ?? []), m]` pour éviter tout `.includes` sur `undefined` après hydratation depuis une règle existante incomplète.

### E. Vérification post-fix
Reproduire dans le preview sandbox : ouvrir Admin > Demandes & Procédures > Lotissement > Zonage > Ajouter, activer chaque Switch, cocher des matériaux/types — vérifier 0 freeze + console clean. Lancer `vitest run zoningValidation` pour non-régression validation.

## Fichiers modifiés
- `src/components/admin/AdminSubdivisionZoningRules.tsx` (refactor des 3 entêtes Switch + cache breadcrumb + handlers `useCallback`)
- (optionnel) extraction de 3 petits composants chips si on veut limiter la surface du diff

## Détails techniques
- Tech stack : React 18 + Radix UI (`@radix-ui/react-switch` synthétise un input caché — cf. doc Radix : « renders a hidden input to ensure the switch participates in form submissions »).
- Aucun changement DB, aucune logique métier touchée — uniquement présentation/interaction.
- Conformité mémoire projet : on garde la modularisation déjà entamée (Lot E de l'audit zonage précédent) en faisant un pas dans la même direction (extraction de chips).
