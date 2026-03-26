

# Diagnostic complet du Catalogue de Services — Resultats et orientations

## Synthese

Le catalogue de services (ouvert via "Plus de donnees") comprend 3 composants principaux : `CadastralBillingPanel` (selection et paiement), `CadastralResultCard` (affichage des donnees par onglet), et `CadastralInvoice` (facture post-paiement). Le diagnostic revele **2 categories de problemes** : des divergences dans le rendu des donnees et une fragilite dans la gestion de la facture.

---

## Problemes identifies

### Categorie 1 — Divergences dans le rendu des donnees

**Bug 1 — Icones de statut des permis ne correspondent pas aux valeurs reelles**

- **Fichier** : `CadastralResultCard.tsx` L690-692 et L756-758
- **Code** : Les conditions testent `'Conforme'` et `'Non autorise'` pour afficher les icones (vert/rouge)
- **Valeurs reelles** : Le formulaire admin (`PermitRequestDialog.tsx` L150) ecrit `'Delivre'`, les donnees de test (`testDataGenerators.ts` L723) utilisent `'Approuve'` / `'Rejete'`
- **Impact** : Les icones de statut (CheckCircle vert, XCircle rouge) ne s'affichent **jamais** pour les permis reels. Seul le texte brut apparait sans icone visuelle.

**Bug 2 — Calcul de date de fin de validite incoherent entre permis courant et historique**

- **Fichier** : `CadastralResultCard.tsx`
- **Permis courant** (L676-677) : `validityEndDate.setMonth(validityEndDate.getMonth() + months)` — methode correcte
- **Permis historique** (L739) : `issueDate.getTime() + months * 30 * 24 * 60 * 60 * 1000` — approximation avec mois de 30 jours
- **Impact** : Pour un permis de 36 mois emis le 1er janvier, la methode historique donne le 27 decembre au lieu du 1er janvier +3ans. Decalage de 3-5 jours selon les mois.

### Categorie 2 — Fragilite de la facture post-paiement

**Bug 3 — CadastralInvoice lit la remise depuis localStorage**

- **Fichier** : `CadastralInvoice.tsx` L52-64 et L261
- **Code** : `localStorage.getItem('currentCadastralInvoice')` pour recuperer `discount_amount_usd` et `discount_code_used`
- **Impact** : Si le localStorage est vide (navigation privee, nettoyage), la remise disparait de la facture affichee meme si elle existe en DB. La facture PDF (`handleDownloadPDF` dans CadastralResultCard L229-279) lit correctement la DB — incoherence entre les deux vues.

---

## Orientations recommandees

### Correction 1 — Aligner les icones de statut des permis (1 fichier)

| Action | Fichier |
|--------|---------|
| Remplacer `'Conforme'` par `'Approuve'` et `'Delivre'` pour l'icone verte. Remplacer `'Non autorise'` par `'Rejete'` pour l'icone rouge. Appliquer aux 2 blocs (permis courant L690-692 et historique L756-758). | `CadastralResultCard.tsx` |

### Correction 2 — Unifier le calcul de date de fin de validite (1 fichier)

| Action | Fichier |
|--------|---------|
| Remplacer le calcul approximatif `months * 30 * 24 * 60 * 60 * 1000` (L739) par `setMonth(getMonth() + months)` comme pour le permis courant. | `CadastralResultCard.tsx` |

### Correction 3 — Supprimer la dependance localStorage dans la facture (1 fichier)

| Action | Fichier |
|--------|---------|
| Au lieu de lire le localStorage, charger la facture reelle depuis Supabase (`cadastral_invoices` filtree par `parcel_number` + `user_id` + `status='paid'`), comme le fait deja `handleDownloadPDF` dans CadastralResultCard. Cela garantit que la remise, le numero de facture et les montants sont toujours corrects. | `CadastralInvoice.tsx` |

---

## Resume

| Categorie | Problemes | Fichiers impactes |
|-----------|-----------|-------------------|
| Divergences rendu | 2 (icones statut, calcul date) | 1 (`CadastralResultCard.tsx`) |
| Fragilite facture | 1 (localStorage) | 1 (`CadastralInvoice.tsx`) |
| **Total** | **3 problemes** | **2 fichiers** |

