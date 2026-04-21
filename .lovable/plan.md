

## Audit conformité WYSIWYG — Aperçu vs PDF facture

### Verdict

L'aperçu HTML et le PDF généré utilisent **deux moteurs distincts** (React/CSS vs jsPDF) qui ne produisent pas le même rendu. La couleur d'en-tête est synchronisée mais **la structure visuelle diverge sur ~10 points**, dont certains très visibles (logo émetteur, bandeau coloré complet, bloc identifiants, équivalent CDF, footer).

### Divergences identifiées (HTML aperçu ↔ PDF généré)

| # | Élément | Aperçu HTML | PDF généré | Écart |
|---|---|---|---|---|
| D1 | **En-tête émetteur** | Bandeau `header_color` plein largeur, fond coloré, texte blanc, logo intégré dedans | Logo + texte sombre sur fond blanc, **pas de bandeau coloré** | Visuel radicalement différent |
| D2 | **Bloc identifiants RCCM/NIF/ID-NAT/TVA** | Barre grise horizontale dédiée sous l'en-tête | Inclus dans le bloc émetteur, fondu dans les lignes | Hiérarchie différente |
| D3 | **Mention « DGI — RDC »** sous le titre | Absente | Présente (`Direction Générale des Impôts (DGI) — RDC`) | PDF ajoute une ligne |
| D4 | **Tableau prestations colonnes** | Désignation / Qté / **P.U. (USD)** / Montant | Désignation / Qté / **Prix unitaire HT** / **Total TTC** | Libellés et sémantique différents (HT vs TTC) |
| D5 | **Bloc totaux** | Sous-total + Base HT + TVA + TOTAL TTC + équivalent CDF (taux figé 2800) | Base HT + TVA + TOTAL TTC + ligne taux change si rate>1 | Ordre/présence variable |
| D6 | **Mentions DGI placeholder** | Cadre amber `bg-#fef3c7` avec texte explicite « code injecté à la génération » | Bloc « MENTIONS LÉGALES (DGI) » avec 5 lignes de texte légal réel | Contenu totalement différent |
| D7 | **Conditions de paiement + Coordonnées bancaires** | Section dédiée 2/3 de largeur | Absentes du PDF (jamais rendues) | **Manquant dans le PDF** |
| D8 | **QR vérification** | Placeholder damier centré avec libellé | QR réel petit (16mm) en bas à droite | Position et taille différentes |
| D9 | **Footer** | Texte centré italique sous bordure haute | Footer absent (texte inclus dans mentions DGI) | Visuel différent |
| D10 | **Mini reçu** | Logo + en-tête centré, blocs séparés par tirets, statut coloré | Logo 6mm, pas de séparation visuelle équivalente, statut texte | Mise en page divergente |

### Causes racines

1. **Deux implémentations indépendantes** : `InvoicePreviewA4` (React inline-styles) et `generateA4InvoicePDF` (jsPDF impératif) ont été écrites séparément, sans contrat partagé.
2. **Pas de spec visuelle source** : aucune définition unique « voici la facture » ; chaque moteur a improvisé une mise en page.
3. **Sections asymétriques** : conditions/banque rendues dans HTML mais oubliées dans PDF ; mentions DGI rendues en PDF mais simplifiées dans HTML.

### Plan de correction — Aligner l'aperçu HTML sur le PDF (source de vérité)

Le **PDF est la sortie réelle** envoyée aux clients et auditée DGI : c'est lui qui doit servir de référence. On modifie l'aperçu HTML pour qu'il **reproduise visuellement** la sortie jsPDF, section par section.

#### Étape 1 — Refonte `InvoicePreviewA4` pour matcher le PDF

Remplacer l'en-tête actuel (bandeau coloré) par la disposition PDF :
- Logo (14mm équiv) + raison sociale en gros + adresse + identifiants en lignes successives sur fond blanc
- À droite : titre `FACTURE NORMALISÉE` en `header_color`, sous-ligne « Direction Générale des Impôts (DGI) — RDC », N°, dates
- Ligne séparatrice horizontale en `header_color`

Reconstruire les sections dans l'ordre exact du PDF :
1. En-tête bicolonne (émetteur gauche / titre+N° droite)
2. Ligne séparatrice colorée
3. `FACTURÉ À` (titre coloré) + données client + bloc `RÉFÉRENCE` à droite avec statut coloré dynamique
4. Tableau prestations avec colonnes **Désignation / Qté / Prix unitaire HT / Total TTC** (et non plus PU USD/Montant)
5. Bloc totaux aligné à droite : Sous-total (si remise) → Remise → Base HT → TVA → bandeau TOTAL TTC sur fond `header_color`
6. Ligne taux de change italique (si exchangeRate>1)
7. Section `MENTIONS LÉGALES (DGI)` avec les 5 lignes réelles (mention normalisée, émetteur, taux TVA, code DGI/vérification, footer_text) — **et non plus le placeholder amber**
8. QR code en bas à droite (16mm) avec libellé « Vérifier l'authenticité »

#### Étape 2 — Refonte `InvoicePreviewMini` pour matcher le PDF mini

Aligner sur la sortie `generateMiniInvoicePDF` :
- Logo 6mm centré, raison sociale, mention `FACTURE NORMALISÉE`, NIF/RCCM
- Lignes infos facture (N°, date, parcelle, client, NIF client, statut)
- Section « Prestations (TTC) » avec lignes service + prix
- Décomposition fiscale (Base HT, TVA, TOTAL TTC) avec ligne séparatrice
- Équivalent CDF si exchangeRate>1
- Téléphone + régime fiscal centrés

#### Étape 3 — Sample représentatif des données PDF

Aligner `buildSampleInvoice` sur ce que le PDF attend :
- `dgi_validation_code` peuplé (ex. `DGI-SAMPLE-2025-0001`) pour démontrer le rendu réel des mentions légales
- `verificationCode` factice transmis au composant pour afficher le code dans les mentions
- `exchangeRate` pris depuis sample (ex. 2800) → ligne taux affichée à l'identique

#### Étape 4 — Section Conditions/Banque

Choix : **retirer du HTML** (puisque absente du PDF), OU **ajouter au PDF**. 
Recommandation : **ajouter au PDF** dans `generateA4InvoicePDF` juste avant les mentions DGI, en respectant le toggle `showBank` quand bank info présente. Cela conserve la valeur métier du bloc et garantit que ce qui est vu = ce qui est livré.

#### Étape 5 — Tests de conformité visuelle

Ajouter dans `InvoicePreviewPanel` un bouton **« Comparer aperçu ↔ PDF »** qui :
- ouvre le PDF généré dans un nouvel onglet (au lieu de télécharger)
- permet à l'admin de comparer côte à côte sans téléchargement

### Détail technique

```text
Avant (divergence)
HTML : [bandeau header_color] [logo+nom blancs] [titre blanc à droite]
       [barre grise RCCM/NIF/ID-NAT/TVA]
       [client] [référence]
       [tableau: Désignation|Qté|P.U.USD|Montant]
       [totaux: sous-total/remise/HT/TVA/TTC]
       [conditions paiement + banque]
       [QR placeholder centré]
       [footer italique]

PDF  : [logo + nom sombre sur blanc] [titre header_color à droite + DGI]
       [identifiants intégrés au bloc émetteur]
       [ligne header_color]
       [FACTURÉ À coloré] [RÉFÉRENCE colorée + statut coloré]
       [tableau: Désignation|Qté|Prix unitaire HT|Total TTC]
       [totaux: HT/TVA/TTC bandeau coloré + taux change]
       (pas de conditions/banque)
       [MENTIONS LÉGALES DGI 5 lignes]
       [QR 16mm en bas à droite]

Après (WYSIWYG)
Les deux : structure identique, source PDF = vérité, HTML = miroir CSS
```

### Critères de validation

1. Capture d'écran de l'aperçu A4 et page 1 du PDF : **mise en page identique** (en-tête, ordre des blocs, colonnes du tableau, bandeau total)
2. Mention « Direction Générale des Impôts (DGI) — RDC » présente sous le titre dans les deux
3. Tableau : colonnes **Désignation / Qté / Prix unitaire HT / Total TTC** dans les deux
4. Mentions légales DGI : 5 lignes texte réel dans les deux (plus de placeholder amber dans HTML)
5. Conditions paiement + coordonnées bancaires : présentes dans les deux (ou retirées des deux)
6. QR : position bas-droite identique
7. Mini reçu : ordre et séparateurs identiques
8. Sample affiche un `dgi_validation_code` cohérent dans les mentions, plus aucun écart visuel restant

### Hors périmètre

- Pas de changement de moteur (jsPDF reste le générateur final)
- Pas de modification des couleurs config (header/secondary OK)
- Pas de refonte du flux de génération PDF (seulement ajout section bank/conditions)
- Pas de modification du format mini ticket dimensions (80×160mm)

