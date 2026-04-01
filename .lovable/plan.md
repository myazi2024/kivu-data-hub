

# Suppression section juridique + correction disclaimer

## 1. Supprimer la section "Vérification juridique"

**`CadastralDocumentView.tsx`** :
- Retirer l'import de `LegalSection`
- Retirer `'legal'` du type `SectionKey` et du tableau `visibleSections`
- Retirer `hasLegalVerification` et le bloc JSX de la section Legal (lignes 140-147)
- Retirer `ShieldCheck` des imports lucide (déjà utilisé dans le footer, pas ici)
- Retirer `legal_verification` de la destructuration de `result`

**Fichier `sections/LegalSection.tsx`** : conservé mais plus utilisé par la fiche (peut servir ailleurs).

## 2. Corriger l'avis de non-responsabilité

**`DocumentFooter.tsx`** — Le texte actuel dit que les données viennent "des archives du Ministère des Affaires Foncières", ce qui est incorrect. Selon l'Article 6 des CGU (Legal.tsx), les données proviennent de **sources officielles et de contributions communautaires vérifiées**.

Nouveau texte aligné sur les CGU :

> **Avis de non-responsabilité :** Les informations contenues dans ce document proviennent de sources officielles (services cadastraux, conservation des titres immobiliers) et de contributions communautaires vérifiées. Le Bureau d'Informations Cadastrales (BIC) ne saurait garantir l'exhaustivité, l'exactitude absolue ou l'actualité permanente de l'ensemble des données. BIC agit de bonne foi dans son travail de compilation et de présentation de ces informations.

> En cas de divergence avec la situation réelle, veuillez vous rapprocher du service des Affaires Foncières compétent pour solliciter une mise à jour des informations relatives à la parcelle {parcelNumber}.

## Fichiers impactés

| Fichier | Modification |
|---|---|
| `CadastralDocumentView.tsx` | Retirer section Legal (import, type, logique, JSX) |
| `DocumentFooter.tsx` | Réécrire le disclaimer pour aligner sur les CGU |

