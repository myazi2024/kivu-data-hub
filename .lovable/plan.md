

# Renommage "Bureau de l'Immobilier du Congo" → "Bureau d'Informations Cadastrales" + mise a jour domaine/email

## Portee

Remplacement global dans 11 fichiers :

| Remplacement | Ancien | Nouveau |
|---|---|---|
| Nom complet | Bureau de l'Immobilier du Congo | Bureau d'Informations Cadastrales |
| Nom legal | Bureau de l'Immobilier du Congo S.A.R.L. | Bureau d'Informations Cadastrales S.A.R.L. |
| Email | contact@bic.myazi.net.org | contact@bic.cd |
| mailto | mailto:contact@bic.myazi.net.org | mailto:contact@bic.cd |
| Domaine | bic-rdc.com | bic.cd |
| URL canonique | https://bic-rdc.com | https://bic.cd |
| QR codes | https://bic-rdc.com/verify-... | https://bic.cd/verify-... |

## Fichiers concernes

1. **index.html** — title, meta description, author, og:title, twitter:title, canonical URL
2. **src/components/ui/navigation.tsx** — sous-titre navigation
3. **src/components/Footer.tsx** — nom + email + mailto
4. **src/pages/Auth.tsx** — titre page login
5. **src/pages/About.tsx** — texte "Qui sommes-nous"
6. **src/pages/Contact.tsx** — description + email
7. **src/pages/Legal.tsx** — denomination sociale + 3 occurrences email
8. **src/pages/JoinUs.tsx** — email contact (les mentions generiques "l'immobilier congolais" restent inchangees car elles ne designent pas le nom de l'entreprise)
9. **src/lib/pdf.ts** — BIC_COMPANY_INFO (name, fullLegalName) + 3 textes dans les PDF
10. **src/components/cadastral/CadastralInvoice.tsx** — BIC_COMPANY_INFO name + texte facture
11. **src/components/cadastral/CadastralDocumentView.tsx** — en-tete + disclaimer
12. **src/utils/generatePermitPDF.ts** — QR code URL
13. **src/utils/generateMortgageReceiptPDF.ts** — QR code URL
14. **src/utils/generateExpertiseCertificatePDF.ts** — QR code URL
15. **src/utils/generateCertificatePDF.ts** — QR code URL

## Notes
- L'acronyme **BIC** reste inchange
- Les mentions generiques de "l'immobilier" (ex: "Developpons ensemble l'immobilier congolais") ne sont pas modifiees

