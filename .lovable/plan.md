# Audit — Documentations Juridiques Absentes

## Etat Actuel

L'application dispose d'une page `/legal` (Legal.tsx, 559 lignes) couvrant 7 articles : mentions legales, objet, CGU, protection des donnees, cookies, droit applicable, modifications. Le contenu est globalement solide, conforme a la loi congolaise n°20/017, avec juridiction Goma. Cependant, plusieurs zones critiques ne sont pas couvertes.

---

## Lacunes Identifiees

### P0 — Conditions Generales de Vente (CGV) absentes

L'application vend des services payants (recherche cadastrale, certificats CCC, titres fonciers, hypotheques, permis, expertises, declarations fiscales) mais **aucune CGV n'existe**. C'est une faille juridique majeure. Il manque :

- **Tarification** : grille tarifaire des services, devises acceptees (USD/CDF)
- **Politique de remboursement** : aucune clause formelle. Seul `ExemptionSummaryPage.tsx` mentionne "frais non remboursables" de facon isolee, sans cadre legal global
- **Droit de retractation** : aucune clause (meme pour exclure ce droit sur les services numeriques deja executes)
- **Moyens de paiement** : aucune documentation des providers (Mobile Money, Stripe, carte bancaire) et de leurs conditions
- **Facturation et preuves d'achat** : pas de clause sur la delivrance des factures/recus
- **Litiges commerciaux** : procedure de reclamation absente

**Action** : Ajouter un Article 8 "Conditions Generales de Vente" dans Legal.tsx, ou creer une page `/cgv` dediee.

### P0 — Lien CGU non cliquable sur la page Auth

La page d'inscription (Auth.tsx, ligne 537) affiche "En vous connectant, vous acceptez nos conditions d'utilisation" mais :

- Le texte n'est **pas un lien** vers `/legal`
- Il n'y a **pas de checkbox** d'acceptation obligatoire
- L'utilisateur peut s'inscrire sans jamais lire ni accepter les CGU

**Action** : Transformer le texte en lien cliquable vers `/legal` et ajouter une checkbox obligatoire avant inscription.

### P1 — Clause Contributions Citoyennes incomplete

Les utilisateurs contribuent des donnees cadastrales via le formulaire CCC. La page `/legal` ne couvre pas :

- **Cession de droits** : les contributeurs cedent-ils leurs droits sur les donnees soumises ?
- **Licence d'utilisation** : sous quelle licence le BIC exploite-t-il les contributions ?
- **Responsabilite du contributeur** : en cas de donnees fausses ou frauduleuses
- **Remuneration** : le code CCC (5 USD) constitue-t-il une remuneration ? Le code CCC est plutot une monnaie viruelle à utiliser uniquement sur l'application pour permettre l'utilisateur à obtenir des reductions considérables sur ses achats. Idéal pour les partenaires revendeurs.

**Action** : Ajouter un article "Contributions citoyennes et propriete des donnees" dans Legal.tsx.

### P1 — Politique de Remboursement absente

Aucun document ne definit clairement :

- Quels services sont remboursables et lesquels ne le sont pas
- Le delai pour demander un remboursement
- La procedure de reclamation
- Les cas de force majeure (erreur systeme, double paiement)

Seule la page d'exemption fiscale mentionne "frais non remboursables" localement, sans cadre general.

Etant donné que l'application vend l'accès aux informations cadastrales. Et que l'application prends des mesures pour bloquer la sélection de services dont les informations ne sont pas disponible dans le catalogue des services afin d"éviter à l'utilisateur de ne pas les sélectionner et les acheter par érreur, Aucun service n'est remboursable une fois acheté. 

**Action** : Integrer dans les CGV ou creer un article dedie.

### P1 — Conditions specifiques par service absentes

Chaque service a des conditions particulieres non documentees juridiquement :

- **Titre foncier** : `LandTitleTermsDialog.tsx` contient un disclaimer mais pas de conditions contractuelles (delais, obligations du BIC, recours)
- **Hypotheques** : aucune clause sur la responsabilite du BIC en cas d'erreur d'inscription/radiation
- **Mutations foncieres** : aucune clause sur la validite juridique des transferts
- **Expertise immobiliere** : aucune clause sur la valeur du certificat d'expertise

**Action** : Ajouter des conditions specifiques par service dans les CGV ou un article dedie.

### P2 — Politique de Cookies non conforme

L'article 5 decrit les cookies mais :

- Pas de **bandeau de consentement** cookies visible dans l'application (le `CookieConsentProvider` existe mais a verifier s'il s'affiche)
- Pas de mecanisme pour **refuser/configurer** les cookies non essentiels
- Pas de lien vers un **gestionnaire de preferences cookies**

**Action** : Verifier l'implementation du bandeau cookies et ajouter un gestionnaire de preferences.

### P2 — Mentions sur le programme Revendeurs absentes

Le programme revendeur implique des relations commerciales (commissions, codes promo) sans cadre juridique :

- Pas de **contrat revendeur** ou conditions de partenariat
- Pas de clause sur la **responsabilite du revendeur** vis-a-vis des clients finaux
- Pas de conditions de **resiliation** du partenariat

**Action** : Ajouter un article "Programme Partenaires/Revendeurs" ou creer une page dediee.

### P2 — Clause RCCM/IDNAT absente

Pour une entreprise operant en RDC, les mentions legales devraient inclure :

- Numero RCCM (Registre de Commerce)
- Numero d'Identification Nationale (IDNAT)
- Numero Impot (NIF)

Actuellement seuls l'adresse et le contact sont mentionnes (Article 1.1).

**Action** : Completer la section 1.1 avec les identifiants legaux.

---

## Plan d'Implementation


| Priorite | Modification                                                                                     | Fichier(s)              |
| -------- | ------------------------------------------------------------------------------------------------ | ----------------------- |
| P0       | Ajouter Article 8 — CGV (tarifs, remboursement, retractation, paiements, factures, reclamations) | `Legal.tsx`             |
| P0       | Ajouter lien cliquable + checkbox d'acceptation CGU sur Auth                                     | `Auth.tsx`              |
| P1       | Ajouter Article 9 — Contributions citoyennes (cession de droits, licence, responsabilite)        | `Legal.tsx`             |
| P1       | Ajouter Article 10 — Conditions specifiques par service                                          | `Legal.tsx`             |
| P2       | Completer Article 1.1 avec RCCM/IDNAT/NIF                                                        | `Legal.tsx`             |
| P2       | Ajouter Article 11 — Programme Revendeurs                                                        | `Legal.tsx`             |
| P2       | Verifier et corriger le bandeau cookies                                                          | `CookieConsentProvider` |


Tous les nouveaux articles seront ajoutes dans `Legal.tsx` avec mise a jour de la table des matieres (`legalSections`).