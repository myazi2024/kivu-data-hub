# Corriger la page « À propos du BIC » (menu Média)

La page /about décrit une méthode de travail qui ne correspond pas au fonctionnement réel de la plateforme. Les données proviennent essentiellement des **déclarations des propriétaires ou de leurs préposés** (formulaire CCC), validées par une revue administrative, et non d'enquêtes terrain, d'archives administratives numérisées ou d'une vérification juridique systématique.

## Incohérences relevées

1. **« Collecte et numérisation des archives cadastrales »** — la page affirme que les données des conservations foncières et bureaux du cadastre sont collectées et numérisées. Aucune fonctionnalité de la plateforme ne repose sur ce flux.
2. **« Enquêtes terrain et remontées communautaires »** — agents de terrain, identification des bornes, relevés GPS, entretiens avec les riverains : rien de tel n'existe. La géolocalisation et le croquis sont saisis par le déclarant lui-même.
3. **« Imagerie satellite »** — la plateforme n'utilise que des fonds de carte (OpenStreetMap / Mapbox), pas d'analyse d'imagerie satellite pour vérifier l'occupation du sol.
4. **« Vérification juridique »** — la page affirme que chaque titre, hypothèque et mutation fait l'objet d'un contrôle de validité des actes. En réalité l'administration contrôle la complétude et la cohérence du dossier ; les expertises et procédures sont des services distincts, sur demande.
5. **Nature déclarative jamais énoncée** — la page ne dit nulle part que l'information est déclarative, ni qu'elle n'a pas de valeur officielle opposable, ce qui est pourtant l'engagement central à afficher.
6. **Programme de contribution absent** — le rôle des propriétaires contributeurs (CCC), la validation par l'administration et la possibilité de demander une correction ne sont pas mentionnés, alors qu'ils constituent la source réelle des données.

## Corrections à apporter (page `src/pages/About.tsx` uniquement)

- **Réécrire la section « Notre méthode »** en 5 piliers conformes au fonctionnement réel :
  1. Déclaration par le propriétaire ou son préposé (formulaire cadastral structuré, pièces justificatives, croquis et géolocalisation saisis par le déclarant).
  2. Contrôles automatiques de complétude et de cohérence (score de complétude, règles de validation, détection de doublons de numéros de parcelle).
  3. Revue administrative avant publication (approbation, rejet motivé, demande de correction).
  4. Cartographie : positionnement des parcelles sur fonds OpenStreetMap / Mapbox, sans prétention de mesure officielle.
  5. Enrichissement continu : mises à jour et demandes de correction par les déclarants, historisation des versions.
- **Ajouter un encadré « D'où viennent les données ? »** dans « Qui sommes-nous ? » : origine déclarative, programme de contribution cadastrale, avantages accordés aux contributeurs.
- **Corriger « Ce que nous faisons »** : préciser que la recherche cadastrale restitue des informations déclarées et vérifiées administrativement ; retirer toute formulation laissant croire à une source officielle exhaustive ; aligner la liste des services sur le catalogue réel de la plateforme.
- **Renforcer « Notre engagement »** : ajouter explicitement le caractère déclaratif des données, l'absence de valeur juridique opposable, la responsabilité du déclarant sur l'exactitude, et le droit de correction/contestation.
- **Mettre à jour la meta description** pour refléter le modèle déclaratif.

## Détails techniques

Modification limitée au contenu JSX de `src/pages/About.tsx` (textes, titres de sections, liste à puces). Pas de changement de mise en page, de tokens de design, d'assets ni de logique applicative. Ajout éventuel de liens internes existants vers le programme de contribution (`/about-ccc`) et les mentions légales (`/legal`).
