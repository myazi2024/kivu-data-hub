

# Synchroniser le filtre Lieu avec le bouton "Retour" de la carte

## Problème
Quand on clique "Retour" sur la carte, `selectedProvince` est remis à `null` dans `DRCInteractiveMap`, mais chaque bloc Analytics (Parcelles, Titres, etc.) gère son propre état `filter` localement avec `useState`. Il n'existe aucun mécanisme pour remettre `filter.province` à `undefined` depuis la carte.

## Solution

Créer un second contexte `MapProvinceContext` qui expose la province actuellement sélectionnée sur la carte. Chaque bloc écoute ce contexte via un `useEffect` et synchronise son filtre local quand la carte change de province (y compris quand elle revient à `null`).

### Changements

**1. `src/components/visualizations/filters/AnalyticsFilters.tsx`**
- Ajouter un nouveau contexte exporté : `MapProvinceContext` (type `string | null`)

**2. `src/components/visualizations/ProvinceDataVisualization.tsx`**
- Importer `MapProvinceContext`
- Envelopper le contenu avec `<MapProvinceContext.Provider value={selectedProvince?.name || null}>`
- (`selectedProvince` est déjà passé en prop depuis `DRCInteractiveMap`)

**3. Chaque bloc** (ParcelsBlock, TitleRequestsBlock, etc. — ~10 fichiers)
- Ajouter un `useEffect` qui écoute `MapProvinceContext` :
```tsx
const mapProvince = useContext(MapProvinceContext);
useEffect(() => {
  setFilter(f => ({ ...defaultFilter, province: mapProvince || undefined }));
}, [mapProvince]);
```
Quand la carte revient à la vue nationale (`mapProvince = null`), le filtre se réinitialise. Quand une province est sélectionnée depuis la carte, le filtre se met à jour aussi.

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `AnalyticsFilters.tsx` | Ajouter export `MapProvinceContext` |
| `ProvinceDataVisualization.tsx` | Provider avec `selectedProvince?.name` |
| `ParcelsBlock.tsx` | useEffect sync province |
| `TitleRequestsBlock.tsx` | useEffect sync province |
| `ContributionsBlock.tsx` | useEffect sync province |
| `SubdivisionBlock.tsx` | useEffect sync province |
| `DisputesBlock.tsx` | useEffect sync province |
| `OwnershipHistoryBlock.tsx` | useEffect sync province |
| `FraudAttemptsBlock.tsx` | useEffect sync province |
| `CertificatesBlock.tsx` | useEffect sync province |
| `InvoicesBlock.tsx` | useEffect sync province |
| `MutationsBlock.tsx` | useEffect sync province |

