# Déduire la zone SU/SR depuis la circonscription foncière

Le bloc « Zone urbaine ou Zone rurale ? » disparaît de l'onglet Localisation. Chaque circonscription foncière est classée une fois pour toutes en urbaine ou rurale ; dès que l'utilisateur choisit sa circonscription, le préfixe (SU ou SR) du numéro de parcelle et toute la suite du formulaire s'adaptent automatiquement.

## Comportement attendu

- Les deux boutons « SU - Urbaine » / « SR - Rurale » et le badge « Type auto-détecté depuis le numéro » sont retirés.
- Sélectionner une circonscription fixe la zone : préfixe SU ou SR imposé devant le numéro de parcelle, et affichage du bon bloc (Ville → Commune → Quartier → Avenue pour l'urbain, Territoire → Collectivité → Groupement → Village pour le rural).
- Un court libellé de lecture sous la circonscription rappelle la zone déduite (« Section urbaine (SU) »), sans bouton cliquable.
- Changer de circonscription pour une zone différente purge les champs de l'ancien bloc géographique (ville/commune/quartier ou territoire/collectivité/village) et recompose le numéro de parcelle avec le nouveau préfixe.
- Le numéro de parcelle n'apparaît qu'une fois la circonscription choisie (il remplace la condition actuelle « zone choisie »).
- Si le numéro vient d'une recherche cadastrale avec préfixe SU/SR et contredit la circonscription choisie, un avertissement invite à vérifier la circonscription ; le numéro issu de la recherche reste prioritaire et verrouillé.
- Cas de repli : provinces sans circonscription répertoriée, ou circonscription saisie manuellement → les deux boutons SU/SR réapparaissent pour ce seul cas, afin que la zone reste renseignable.
- Contributions déjà enregistrées : la zone est relue depuis la circonscription si elle est connue, sinon depuis le préfixe du numéro de parcelle existant.

## Classement des circonscriptions

Chaque circonscription reçoit une zone unique (aucune « mixte ») :

- Urbaines : circonscriptions de villes et de communes urbaines — les 16 de Kinshasa, Matadi, Boma, Lubumbashi-Ouest/Est/Plateau, Likasi, Kolwezi I et II, Goma, Karisimbi, Bukavu I et II, Beni-Ville, Butembo I et II, Uvira-Ville, Kisangani-Nord/Sud, Tshopo I et II, Kindu I et II, Mbandaka I et II, Kananga, Mbuji-Mayi, Tshikapa, Kikwit I et II, Bandundu-Ville, Mwene-Ditu, Bunia, Isiro, Kalemie, Lukuga, Kamina, Kenge, Gemena, Gbadolite, Lisala, Boende, Inongo, Lodja, etc.
- Rurales : circonscriptions portant sur des territoires et entités rurales — Maluku, N'Sele, Kasenga/M'Pweto, Kipushi-Nord/Sud, Kasumbalesa-Sakania, Beni-Territoire, Uvira-Territoire, Rutshuru, Masisi, Walikale, Lubero, Kayna, Kyondo, Nyiragongo, Kabare, Kalehe-Centre/Nord/Sud-Kalonge, Shabunda-Nord/Sud, Mwenga-Kamituga, Baraka-Fizi, Walungu, Idjwi, Songololo, Mbanza-Ngungu, Kisantu, Kasangulu, Luozi, Seke-Banza, Tshela, Lukula, Moanda, Dilolo, Mutshatsha, Lubudi, Moba, Kongolo, Manono, Kanyama, Watsa, Dungu, Wamba, Buta, Bondo, Bambesa, Bikoro, Bomongo, Ingende, Makanza, Mbansakusu, Bumba, Bokungu, Zongo, Yakoma, Kabinda, Aru, Mahagi, Djugu, Mambasa, Irumu, Pangi, Lubutu, Punia, Kasongo, Kabambare, Kibombo, Mweka, Ilebo, Dibaya, Luiza, Katanda, Kabeya-Kamwanga, Tshilenge, Lusambo, Katako-Kombe, Kutu, Bolobo, Mushie, Kasongo-Lunda, Kahemba, Idiofa, Gungu, Masimanimba, Bulungu, Kinshasa (circonscription de la ville-province rattachée à l'urbain).

Note : Kinshasa reste urbaine dans son ensemble, sauf Maluku et N'Sele traitées comme rurales (grandes zones agricoles).

## Détails techniques

- `src/lib/geographicData.ts` : ajout de `landDistrictSectionType: Record<string, 'urbaine' | 'rurale'>` (clés = noms exacts des 143 circonscriptions) et `getSectionTypeForLandDistrict(district?: string): 'urbaine' | 'rurale' | ''` avec comparaison insensible aux accents/casse.
- `src/hooks/useCCCFormState.ts` :
  - un effet dérive `sectionType` de `formData.landDistrict` via `getSectionTypeForLandDistrict` (prioritaire sur la détection par préfixe) ; `sectionTypeAutoDetected` devient `true` dès que la circonscription est reconnue ;
  - l'effet existant de détection par préfixe ne s'applique plus que lorsque la circonscription est inconnue (saisie libre) ;
  - lors d'un changement de zone induit par la circonscription, réutilisation de la logique de `handleSectionTypeChange` (purge du bloc géographique opposé + recomposition du numéro via `composeParcelNumber`) ;
  - `resetLocationBlock` : `sectionType` redevient dérivé (vidé en même temps que `landDistrict`).
- `src/components/cadastral/ccc-tabs/LocationTab.tsx` : suppression des boutons SU/SR, du popover et du badge ; ajout du libellé de zone déduite sous la circonscription ; `ParcelNumberField` rendu dès que `sectionType` est déduit ; boutons SU/SR conservés uniquement dans la branche de saisie manuelle.
- `src/hooks/ccc/useFormValidation.ts` : le message d'erreur « zone non choisie » pointe désormais sur la circonscription foncière ; `landDistrict` reste obligatoire.
- `src/hooks/ccc/useGeographicCascade.ts` : inchangé (la purge par province reste valable).
- Aucune migration : `land_district` et `parcel_type` existent déjà ; la zone reste stockée via `parcelType` (SU/SR).
- Tests : nouveau test unitaire sur `getSectionTypeForLandDistrict` ; vérification `npx tsgo --noEmit -p tsconfig.app.json` et `npx vitest run`.
