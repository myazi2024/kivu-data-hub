# Revue des 8 onglets Analytics — 2026-10-07

Règles partagées : `src/utils/analyticsTabRules.ts` (onglets + Carte RDC), tests `analyticsTabRules.test.ts`.

- Titre foncier : propriétaires comptés une fois par parcelle (dernière contribution approuvée) ; année/évolution de délivrance basées sur la seule date de délivrance (plus la date de saisie) ; tranches de durée ordonnées.
- Construction : rien à corriger depuis les passes précédentes.
- Hypothèque : statuts CCC (Active, Soldée, renégociée) reconnus aussi sur la carte ; montant et durée moyens sur les seules valeurs renseignées ; tranches sans trou.
- Lotissement : tranches de lots (1 lot n'est plus « 2 lots ») et de surface sans trou ; revenus = demandes payées ; carte : « En cours » = pending/in_review/awaiting_payment/returned.
- Litiges : statuts « resolu »/« leve » reconnus sur la carte ; durée moyenne = ancienneté des litiges en cours.
- Location et valeur : loyers des locaux vacants ou occupés par le propriétaire exclus.
- Taxes : statut « en retard » compté comme impayé (onglet et carte).
- Bornage : entrées vides ignorées ; clés camelCase et date de bornage harmonisées.
- Code mort : `exportCSV` récupéré sans usage dans tous les onglets ; données personnelles inutiles (nom du destinataire de certificat, e-mail client) retirées du chargement.
- Onglets masqués (Contributions, Expertise, Historique, Certificats, Factures) conservés : réactivables depuis l'admin.
