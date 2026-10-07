# Supprimer l'onglet Servitudes d'Analytics et déplacer « Parcelles grevées vs libres » dans Titre foncier

## Ce qui change
1. **Suppression de l'onglet Servitudes**
   - Retrait de l'onglet, de son icône et de son bloc dans Données foncières.
   - Suppression de ses chiffres clés et autres graphiques (types, bénéficiaires, durée, servitudes par parcelle, géographie) : le formulaire CCC ne collecte que « servitude de passage oui/non + largeur », ces graphiques restaient donc vides.
   - Base : suppression des réglages admin enregistrés pour cet onglet.
   - Conservé : la question servitude du formulaire CCC, les servitudes de lotissement, les litiges de servitude.
2. **Nouveau visuel dans l'onglet Titre foncier : « Titres fonciers : Parcelles grevées vs libres »**
   - Camembert : parcelles avec une servitude de passage déclarée (« Grevées ») contre les autres (« Libres »), avec la phrase « X % des parcelles déclarent au moins une servitude ».
   - Une parcelle compte comme grevée seulement si la servitude est réellement déclarée (pas une simple case « non »).
   - Suit les filtres Analytics, disparaît sans données, et reste affichable / masquable / renommable / déplaçable depuis l'admin.

## Détails techniques
- `ProvinceDataVisualization.tsx` : retrait de `servitudes` (lazy import, icône, bloc) ; suppression de `blocks/ServitudesBlock.tsx`.
- `analyticsTabsRegistry.ts` : suppression de l'entrée `servitudes` ; ajout du chart `encumbered-distribution` (pie) dans `title-requests`.
- `TitleRequestsBlock.tsx` : calcul sur `filtered` (parcelles) via un helper pur `hasDeclaredServitude(record)` (`servitude_data.hasServitude === true`, tolère tableau / objet non vide pour l'existant) + tests.
- Nettoyage des éventuelles références (`crossVariables`, `mapTabProfiles`, défauts de filtres).
- Migration : `DELETE FROM analytics_charts_config WHERE tab_key = 'servitudes';`.
- Vérification : tests, typecheck, recherche des restes de l'onglet `servitudes`.
