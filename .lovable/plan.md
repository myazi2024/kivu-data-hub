# Filtres Analytics : détecter le découpage sur lequel est calquée la circonscription

## Objectif
Quand l'utilisateur choisit une circonscription foncière, l'application comprend sur quel découpage elle est calquée (une ville entière, une commune ou un territoire), remplit et verrouille ce niveau, puis ne propose que les filtres qui viennent en dessous.

Exemples (Nord-Kivu) :

```text
Goma (circ.)        -> commune Goma (ville de Goma)   -> Quartier -> Avenue
Karisimbi (circ.)   -> commune Karisimbi (ville Goma) -> Quartier -> Avenue
Beni-Ville (circ.)  -> ville de Beni                  -> Commune -> Quartier -> Avenue
Rutshuru (circ.)    -> territoire de Rutshuru         -> Collectivité -> Groupement -> Village
```

## Ce que l'utilisateur verra
- Après la circonscription : la pastille SU/SR « auto-détecté » (inchangée), puis une pastille « Calquée sur : Commune de Goma (ville de Goma) » ou « Territoire de Rutshuru ».
- Les niveaux couverts par la circonscription sont remplis automatiquement et ne sont plus proposés en liste (Goma ne propose donc plus « Ville » ni « Commune », seulement « Quartier »).
- Le premier filtre proposé est le niveau juste en dessous.
- Circonscription partagée entre plusieurs entités ou non reconnue (ex. Lubumbashi-Ouest, Butembo I, Kalehe-Nord) : on ne devine rien. Seul le niveau certain est fixé (ex. ville de Lubumbashi, territoire de Kalehe) et l'utilisateur choisit la suite parmi la liste de ce niveau.
- Changer de province ou de circonscription réinitialise tout ce qui est dessous, comme aujourd'hui.

## Règles de détection (aucune frontière inventée)
1. Une table explicite de correspondances pour les cas connus mais ambigus par le nom (Goma -> commune Goma et non ville, Beni-Ville -> ville Beni, Uvira-Ville / Uvira-Territoire, Bukavu I/II -> ville Bukavu, etc.).
2. Sinon, correspondance exacte du nom dans la même province, par ordre de priorité : commune, puis territoire, puis ville.
3. Sinon, seul le nom de base (avant « -Nord », « I », « -Ouest »…) est rapproché d'une ville ou d'un territoire, pour fixer ce niveau parent uniquement.
4. Sinon, comportement actuel (zone choisie manuellement si inconnue).

La même détection est utilisée par le formulaire CCC ? Non : la demande porte sur Analytics ; le CCC n'est pas modifié.

## Détails techniques
- `src/lib/geographicData.ts` : nouvelle fonction `getLandDistrictAnchor(province, district)` renvoyant `{ level: 'ville' | 'commune' | 'territoire' | null, ville?, commune?, territoire?, partial: boolean }`, s'appuyant sur les données géographiques existantes (villes/communes, territoires) et une table `LAND_DISTRICT_ANCHOR_OVERRIDES`.
- `AnalyticsLocationRow.tsx` : au choix de la circonscription, appliquer l'ancre au filtre (ville/commune/territoire préremplis, appels `onVilleChange`/`onCommuneChange`/`onTerritoireChange`), masquer les listes des niveaux fixés, afficher la pastille « Calquée sur ».
- `useAnalyticsCascade.ts` : les listes dérivées (quartiers, collectivités…) partent du niveau fixé.
- Filtrage des données : inchangé (les champs ville/commune/territoire du filtre restent la source).
- Tests : `src/lib/__tests__/landDistrictAnchor.test.ts` (Goma -> commune, Karisimbi -> commune, Beni-Ville -> ville, Rutshuru -> territoire, Lubumbashi-Ouest -> ville partielle, nom inconnu -> null) et un test de la ligne de filtres.
- Règle ajoutée dans `AGENTS.md` : l'ancre d'une circonscription n'est jamais devinée hors correspondance exacte ou table explicite.
