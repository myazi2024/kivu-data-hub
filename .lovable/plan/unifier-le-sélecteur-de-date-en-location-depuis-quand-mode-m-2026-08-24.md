# Unifier le sélecteur de date « En location depuis quand ? » (mode mono-local)

## Contexte

En mode « Un seul local », le champ date « En location depuis quand ? » utilise le composant `RentalStartDateField` (Popover + Calendar shadcn — un calendrier popup personnalisé). En mode « Divisé en plusieurs locaux », chaque local utilise un champ natif `<input type="date">` (avec `min`/`max`). Les deux rendus sont visuellement différents ; l'utilisateur demande que le mode mono-local utilise le même sélecteur que le mode multi-local (le champ date natif), pour cohérence et ergonomie.

## Changement

### `src/components/cadastral/RentalStartDateField.tsx`

Remplacer le rendu interne (Popover + Calendar shadcn) par un champ natif `<input type="date">` calqué sur celui du mode multi-local (`RentalConfigurationFields.tsx` lignes 448-460) :

- `<Input type="date" min={minRentalDate} max={TODAY} value={value ?? ''} onChange=... className="h-9 rounded-xl text-sm" />`
  - `minRentalDate` = `${constructionYear}-01-01` si `constructionYear` renseigné, sinon absent.
  - `max` = `TODAY` (constante ISO yyyy-MM-dd).
  - Highlight required : `border-destructive ring-1 ring-destructive/40` si `highlightRequired && !value`.
- Conserver le libellé dynamique « En location depuis quand ? » / « Inoccupé depuis quand ? » selon `isOccupied === false` (inchangé).
- Conserver les messages d'aide (≥ 01/01/{constructionYear} et ≤ aujourd'hui) et le message d'invalidité optionnel, mais la validation native `min`/`max` du `<input type="date">` suffit ; le bloc d'erreur calculée peut être simplifié/retiré pour aligner avec le mode multi (qui n'en a pas).
- Supprimer les imports devenus inutiles : `Popover`, `PopoverContent`, `PopoverTrigger`, `Button`, `Calendar`, `CalendarIcon`, `format`, `parseISO`, `isValid`, `fr`, `date-fns`. Garder `Label`, `Input`, `cn`.

Les props du composant (`value`, `onChange`, `constructionYear`, `highlightRequired`, `isOccupied`) restent inchangées — aucun changement nécessaire dans les deux call sites :

- `src/components/cadastral/ccc-tabs/shared/ConstructionSection.tsx:415`
- `src/components/cadastral/AdditionalConstructionBlock.tsx:616`

## Détails techniques

- Aucune migration, aucun changement de schéma : `rentalStartDate` reste une chaîne ISO `yyyy-MM-dd`.
- Le mode multi-local n'est pas touché (déjà en `<input type="date">`).
- Les récapitulatifs/admin/PDF lisent `rentalStartDate` et `rentalDateLabel(isOccupied)` ; aucun impact (la valeur stockée est identique).
- Le helper `rentalDateLabel` exporté de `RentalConfigurationFields.tsx` reste la source du libellé pour les restitutions.

## Vérification

- Ouvrir le formulaire CCC → onglet Localisation → bloc Construction → « En location » = Oui → « Un seul local » : le champ date est un `<input type="date">` natif identique à celui des locaux en mode multi (même hauteur `h-9`, même coins arrondis, mêmes bornes min/max).
- Vérifier le libellé dynamique : occupé → « En location depuis quand ? », inoccupé → « Inoccupé depuis quand ? ».
- Vérifier la purge : passer à « Divisé en plusieurs locaux » vide toujours `rentalStartDate` (logique existante dans ConstructionSection/AdditionalConstructionBlock, inchangée).
- Typecheck (`tsgo`) réussit.
