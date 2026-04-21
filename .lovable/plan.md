

## Audit ciblé — Aperçu Facture (WYSIWYG)

### Verdict global

L'onglet **Aperçu** affiche bien un rendu visuel A4 / Mini en direct, mais **ce n'est pas un vrai WYSIWYG** : deux moteurs de rendu coexistent (HTML React pour l'aperçu, jsPDF pour le PDF généré) et leurs sorties divergent sur plusieurs points. Le sample est aussi trop figé pour valider tous les cas réels.

### État actuel

| Élément | Aperçu HTML | PDF généré | Cohérent ? |
|---|---|---|---|
| Couleur en-tête | `config.header_color` ✅ | **bleu fixe `#003366`** | ❌ |
| Couleur secondaire | `config.secondary_color` ✅ | bleu fixe (head table) | ❌ |
| Bloc client entreprise (NIF/RCCM) | jamais affiché (sample = particulier) | conditionnel | ❌ |
| Remise commerciale | toujours `0,00` | conditionnelle si `discount > 0` | ❌ |
| Statut PAYÉE/PENDING | toujours « Payée » | dynamique | ❌ |
| Code DGI | sample « DGI-PREVIEW-XXXX » | `dgi_validation_code` réel | ⚠️ |
| Coordonnées bancaires | conditionnel | conditionnel | ✅ |
| QR code | placeholder visuel | QR réel encodé | ⚠️ |
| Mini reçu | monochrome | monochrome | ✅ |
| Bouton Rafraîchir | ne refetch que `config` | — | ❌ identité figée |
| Mode paiement | sélectable mais A4 seulement | dynamique | ⚠️ |

### Bugs / écarts identifiés

#### W1 — Couleurs admin ignorées par le PDF
Dans `src/lib/pdf.ts` (`generateA4InvoicePDF`), toutes les `setTextColor` / `setFillColor` sont en dur (`[0, 51, 102]`, `[33, 37, 41]`…). Conséquence : modifier `header_color` / `secondary_color` dans l'admin met à jour l'aperçu HTML **mais pas le PDF réellement émis aux clients**. Régression du principe WYSIWYG.

#### W2 — Sample non représentatif (cas absents)
Le composant `buildSampleInvoice` est figé : particulier, payée, sans remise, mode `mobile_money`. Impossible de visualiser :
- une facture entreprise (avec NIF/RCCM/Régime fiscal)
- une facture avec remise commerciale
- une facture en attente / échouée
- un statut autre que payé

L'admin ne peut donc pas valider le rendu de tous les scénarios métier.

#### W3 — Refetch incomplet
Le bouton « Rafraîchir » appelle `useInvoiceTemplateConfig.refetch()` mais pas `useCompanyLegalInfo` → si l'admin vient de modifier le logo/raison sociale, l'aperçu reste périmé tant que la page n'est pas rechargée.

#### W4 — Mode paiement non passé au Mini
Le sélecteur `paymentMethod` n'est passé qu'à `InvoicePreviewA4`. `InvoicePreviewMini` n'expose même pas le mode → asymétrie d'aperçu.

#### W5 — Code DGI sample dur
Texte « DGI-PREVIEW-XXXX-XXXX » et « PREVIEW-XXXX » écrits en clair → un admin novice peut croire que c'est un vrai code DGI échantillon. Devrait dire `« Code DGI ‒ injecté à la génération »` avec style placeholder.

#### W6 — Échelle non recalculée au changement de contenu
`useEffect([format])` ne se redéclenche pas quand le logo asynchrone se charge ni quand `info` change → décalage visuel à la 1ère ouverture si logo lent.

#### W7 — Pas de toggle « afficher coordonnées bancaires »
Le PDF les affiche conditionnellement (selon `info.bank_name`), l'aperçu aussi, mais aucun moyen de tester le rendu sans bank info en restant sur les vraies données (il faudrait vider le formulaire pour tester).

#### W8 — Aperçu PDF réel du sample uniquement
Les boutons « Aperçu PDF A4/Mini » génèrent toujours le sample. Aucune option pour générer le PDF d'**une facture existante** depuis l'admin afin de comparer l'aperçu HTML avec le PDF réel. Workflow QA absent.

### Plan de correction

#### Étape 1 — Vrai WYSIWYG : aligner le PDF sur la config admin
Modifier `src/lib/pdf.ts` (`generateA4InvoicePDF`) pour :
- convertir `tplCfg.header_color` (#hex) en RGB et l'utiliser pour : titre « FACTURE NORMALISÉE », ligne séparatrice, en-têtes de section (« FACTURÉ À », « RÉFÉRENCE »), bandeau TOTAL TTC.
- utiliser `tplCfg.secondary_color` pour : entête tableau (`headStyles.fillColor`).
- helper `hexToRgb()` partagé.

Critère d'acceptation : changer header_color en `#16a34a` dans l'admin → l'aperçu **et** le PDF affichent du vert.

#### Étape 2 — Sample paramétrable
Ajouter au-dessus de l'aperçu un panneau « Variantes de simulation » (3 sélecteurs compacts) :
- Type client : Particulier / Entreprise (déclenche affichage NIF/RCCM/Régime)
- Statut : Payée / En attente / Échec
- Remise : 0% / 10% / 25%
- Mode paiement (existant) : déjà OK, juste le passer aussi au Mini

Reflété simultanément dans `InvoicePreviewA4`, `InvoicePreviewMini` et le sample injecté dans `generateInvoicePDF` lors de l'aperçu PDF.

#### Étape 3 — Refetch identité + recompute scale
- `handleRefresh` appelle `refetch()` config **et** `useCompanyLegalInfo.refetch()`
- Ajouter `info` aux dépendances du `useEffect` de scale + observer le logo via `onLoad`

#### Étape 4 — Aperçu d'une facture existante
Ajouter dans la barre d'outils un sélecteur optionnel « Charger une facture existante » (combobox récente 20 dernières factures). Si choisi : remplace le sample par les vraies données ; bouton « Télécharger PDF » utilise `downloadInvoicePDF(invoice)`.

#### Étape 5 — UX placeholders DGI et code de vérification
Remplacer « DGI-PREVIEW-XXXX-XXXX » par un cadre `bg-amber-50 text-amber-700` :
> « Le code DGI réel sera injecté lors de la génération de chaque facture »

#### Étape 6 — Toggle « avec/sans coordonnées bancaires »
Petit switch dans la barre d'outils qui force l'affichage/masquage du bloc IBAN dans l'aperçu **uniquement** (n'altère pas la config réelle).

### Détail technique

```text
Avant
admin change header_color #16a34a
  -> aperçu HTML : vert ✅
  -> PDF généré  : bleu (#003366 hardcodé) ❌
  -> WYSIWYG cassé

Après
admin change header_color #16a34a
  -> aperçu HTML  : vert ✅
  -> PDF généré   : vert ✅ (hexToRgb(tplCfg.header_color))
  -> WYSIWYG OK
```

```text
Variantes simulation (sélecteurs aperçu)
  Type client   : [Particulier|Entreprise]
  Statut        : [Payée|En attente|Échec]
  Remise        : [0%|10%|25%]
  Mode paiement : [MM|Carte|Virement]   <-- existant, étendu au Mini
  Bank info     : [Affiché|Masqué]      <-- nouveau toggle local
  Source data   : [Sample|Facture réelle ▼]   <-- nouveau combobox
```

### Hors périmètre

- Pas de refonte du moteur jsPDF (juste paramétrer les couleurs)
- Pas de toggle multi-devises USD/CDF (déjà bilingue automatique)
- Pas d'éditeur drag-and-drop des sections (overkill métier)
- Pas de sauvegarde des variantes simulées (stateful local uniquement)

### Validation attendue

1. Couleur d'en-tête modifiée dans l'admin → reflétée à l'identique dans aperçu HTML **et** PDF téléchargé
2. Couleur secondaire → entête tableau du PDF change
3. Sélecteur « Entreprise » → bloc NIF/RCCM/Régime apparaît dans l'aperçu (A4 et Mini)
4. Sélecteur « Remise 25% » → ligne « Remise commerciale » apparaît avec montant
5. Bouton Rafraîchir → logo, raison sociale et config rechargés
6. Combobox facture existante → aperçu rendu sur vraies données + PDF correspondant
7. Texte DGI sample : style placeholder explicite, plus aucun risque de confusion
8. Toggle bank info → bloc IBAN apparaît/disparaît instantanément

