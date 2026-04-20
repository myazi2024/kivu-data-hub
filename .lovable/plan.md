

## Audit — Couche « Quartiers RDC » nationale

Plan approuvé précédemment mais non encore implémenté (aucun fichier modifié dans le dernier tour). Je n'ai donc rien à auditer côté code pour cette modification spécifique.

### Deux options

**Option A — Lancer l'implémentation maintenant**
Exécuter le plan approuvé :
1. Générer `public/drc-quartiers.geojson` depuis la source humdata (ogr2ogr + simplification)
2. Créer `src/components/DRCQuartiersAllMap.tsx`
3. Brancher la condition `selectedSectionType === 'urbaine' && !selectedVille` dans `DRCInteractiveMap.tsx`
4. Mettre à jour les libellés d'en-tête
5. Auditer ensuite (imports, régressions sur Goma/territoires/provinces)

**Option B — Auditer un autre changement**
Si vous faisiez référence à une modification antérieure (CTA Partnership, accès Carte Cadastrale, gate Données foncières), précisez laquelle et je relance l'audit ciblé.

### Recommandation

Option A — la fonctionnalité « Quartiers RDC » est approuvée mais pas encore en place ; il n'y a actuellement rien de nouveau à vérifier. Une fois implémentée, je vérifie systématiquement :
- Imports résolus (`DRCQuartiersAllMap`, asset GeoJSON 200 OK)
- Branches conditionnelles non régressives (Goma détaillé prioritaire, territoires rurale inchangés, provinces inchangées)
- `getQuartierColor` correctement passé, choroplèthe profil opérationnelle
- Performance acceptable au rendu de 385 polygones SVG
- Breadcrumb et `setSelectedQuartier` fonctionnels au clic

Confirmez Option A pour que je lance l'implémentation + audit, ou indiquez la modification à auditer pour Option B.

