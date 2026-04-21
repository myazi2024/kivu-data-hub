

## Plan — Afficher la description du service sous la désignation

### Constat

Dans le **catalogue de services** (table `cadastral_services_config`), chaque service possède un champ `description` (ex. « Chaîne complète de propriété depuis la création de la parcelle… » pour *Historique de propriété*). 

Mais dans le **tableau prestations** de la facture :
- **Aperçu HTML A4** (`InvoicePreviewPanel.tsx` ligne 203) : affiche uniquement `s.name`
- **PDF généré** (`src/lib/pdf.ts` ligne 394) : affiche uniquement `service.name`
- **Mini reçu** (ligne 343) : `s.name.substring(0, 26)` tronqué, sans description

Le champ `description` du catalogue est donc **complètement ignoré** dans la facturation.

### Correction

#### 1. PDF A4 — `src/lib/pdf.ts` (autoTable prestations, lignes 390-415)

Modifier la cellule « Désignation » pour afficher 2 lignes :
- Ligne 1 : nom du service (gras)
- Ligne 2 : description du catalogue (petit, gris, italique) — uniquement si `service.description` non vide

Utiliser le `didDrawCell` ou un body custom avec `\n` + `cellPadding` ajusté + couleur secondaire pour la 2e ligne. Approche simple : remplacer le contenu de la colonne 0 par une string `nom\ndescription` et activer `cellPadding: { top: 2, bottom: 2 }` avec wrap automatique. Pour le styling différencié, utiliser `didParseCell` qui détecte le `\n` et applique un style multi-segment via deux `text()` superposés (technique standard jsPDF-autotable).

Dimensions : la colonne `Désignation` passe de 50% → 55% de largeur, en réduisant `Prix unitaire HT` (20% → 17.5%) et `Total TTC` (20% → 17.5%).

#### 2. Aperçu HTML A4 — `InvoicePreviewPanel.tsx` (lignes 198-209)

Remplacer la cellule `<td>{s.name}</td>` par :
```
<td>
  <div style="font-weight:500">{s.name}</div>
  {s.description && (
    <div style="font-size:7.5pt; color:#6b7280; fontStyle:italic; marginTop:2px; lineHeight:1.3">
      {s.description}
    </div>
  )}
</td>
```

Ajuster les largeurs de colonnes en miroir du PDF (50%→55%, 20%→17.5% × 2).

#### 3. Mini reçu HTML — lignes 339-346

Sous chaque ligne service du mini reçu, ajouter une 2e ligne (police 6px, gris) avec `description` tronquée à ~50 caractères + ellipsis. Le mini reçu reste compact mais informatif.

#### 4. Mini reçu PDF — `src/lib/pdf.ts` (`generateMiniInvoicePDF`)

Localiser la boucle des prestations dans le mini PDF et ajouter une ligne `setFontSize(6)` + `setTextColor(120,120,120)` avec la description tronquée juste sous le nom.

#### 5. Sample preview — `buildSampleServices()` (lignes 73-76)

Peupler le champ `description` des 2 services sample pour démontrer l'affichage :
- *Fiche cadastrale complète* → « Document officiel reprenant l'ensemble des informations cadastrales d'une parcelle. »
- *Historique de propriété* → « Chaîne complète de propriété depuis la création de la parcelle… »

### Critères de validation

1. Une facture réelle contenant *Historique de propriété* affiche le texte explicatif sous le nom dans l'aperçu HTML **et** le PDF téléchargé
2. Les services sans description s'affichent comme avant (pas de ligne vide)
3. Le mini reçu (HTML + PDF) affiche aussi la description tronquée
4. Les colonnes du tableau restent alignées et lisibles (largeurs 55/10/17.5/17.5)
5. Le sample par défaut montre déjà des descriptions pour démonstration
6. Bouton « Comparer ↔ PDF » : descriptions visibles à l'identique dans les deux

### Hors périmètre

- Pas d'éditeur de description dans l'aperçu (édition dans Catalogue services uniquement)
- Pas de troncature configurable (limite fixe pour mini)
- Pas de support markdown dans la description (texte brut uniquement)

