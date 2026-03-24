

# Améliorations Carte RDC — 6 corrections

## 1. Bouton retour : icône compacte en haut à droite

**Constat** : Le bouton `← Retour à la carte` est un `Button` avec texte, trop encombrant au milieu de la carte.

**Correction** dans `DRCMapWithTooltip.tsx` :
- Remplacer le `Button` par un bouton icône rond (h-6 w-6) positionné `top-2 right-2`
- Utiliser uniquement l'icône `ArrowLeft` sans texte
- Ajouter un `title="Retour à la carte"` pour l'accessibilité

## 2. Données province : vérification des divergences

**Analyse** : Les données du bloc province viennent de `provincesData` construit dans `DRCInteractiveMap.tsx` (lignes 88-133). La correspondance se fait par `r.province === meta.name`.

**Divergences identifiées** :
- Les tables sans champ `province` direct (permits, taxes, mortgages, expertise, mutations, disputes, certificates, invoices) sont enrichies via lookup parcel. Si un enregistrement n'a pas de `parcel_number`/`parcel_id` correspondant à une parcelle existante, il ne sera pas comptabilisé — c'est correct.
- **Pas de divergence de code détectée** : les compteurs utilisent tous le même objet `ProvinceData`. Le tooltip (hover) et le bloc détails (clic) consomment les mêmes données.
- **Action** : Vérifier visuellement en comparant un compteur province avec un filtre dans Analytics. Si les totaux divergent, le problème est dans l'enrichissement (parcelle non trouvée). Je proposerai un log de diagnostic si besoin après test.

## 3. Légende contextuelle quand la choroplèthe disparait

**Constat** : Quand la légende choroplèthe se masque (zoom), l'espace en bas à gauche reste vide.

**Correction** dans `DRCInteractiveMap.tsx` :
- Quand `isMapZoomed === true` ET `selectedProvince` existe, afficher une mini-légende contextuelle dans le même emplacement (absolute bottom-2 left-2)
- Contenu : résumé des données clés de la province sélectionnée (Parcelles, Titres, Revenus, Densité) — max 4-5 lignes compactes
- Style identique à la légende choroplèthe (bg-background/80 backdrop-blur-sm)

## 4. Note descriptive enrichie + pied de carte

**Correction** dans `DRCInteractiveMap.tsx` :
- Ajouter une note descriptive sous le titre de la carte : préfixe contextuel "Répartition géographique des données foncières cadastrales" + total d'enregistrements (somme parcelles toutes provinces)
- Ajouter un pied de carte (absolute ou en dessous) : date du jour + "BIC - Tous droits réservés" en text-[7px]
- S'assurer que le pied de carte est inclus dans la zone capturée par l'export PNG

## 5. Bouton "Copier en image"

**Correction** dans `DRCInteractiveMap.tsx` :
- Ajouter un bouton `Copy` (icône) à côté du bouton info existant (bottom-2 right-2)
- Fonctionnement identique à `ChartCard` : capture du conteneur carte via `html2canvas`, copie dans le presse-papier en PNG avec coins arrondis 12px
- Inclure la note descriptive, la légende et le watermark dans la capture

## 6. "Service émetteur" dans Analytics

**Constat** : Le graphique "Service émetteur" dans l'onglet Parcelles/Titres utilise `cadastral_building_permits.issuing_service`. Cette donnée **est bien collectée** dans le formulaire de permis de construire (`BuildingPermitFormDialog.tsx`, ligne 323). Cependant, ce formulaire est séparé du formulaire CCC principal — il est accessible via la carte cadastrale.

**Action** : Ce graphique affiche des données réelles collectées. Si l'utilisateur souhaite le masquer car il ne fait pas partie du workflow CCC principal, il peut le faire via la config admin (item_key `permit-service`). Pas de suppression de code nécessaire — seulement une clarification.

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/DRCMapWithTooltip.tsx` | Bouton retour → icône compacte top-right |
| `src/components/DRCInteractiveMap.tsx` | Légende contextuelle zoom + note descriptive + watermark + bouton copie PNG |

2 fichiers modifiés.

