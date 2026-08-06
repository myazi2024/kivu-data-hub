# Espace utilisateur : réorganisation et pilotage des données CCC

## Constat de l'audit

- Le formulaire CCC enregistre désormais `rental_configuration`, `rental_units` (loyers, occupation, capacité, étage), `rental_units_count`, `resale_price_usd/amount/currency`, `has_recent_appraisal`, `appraisal_date`, `appraisal_report_url`, `market_listings`, `sound_environment`, `hosting_capacity`. Aucune de ces colonnes n'est lue dans `src/components/user/**` : l'utilisateur ne peut ni consulter, ni contrôler, ni republier ces données depuis son compte.
- La liste des contributions n'affiche que statut/type/parcelle. Pas de vue « mes biens », pas de vue « mes annonces », pas d'indicateur de revenus locatifs ni de fiscalité déclarée.
- La navigation compte 11 onglets sur une largeur mobile de 360 px : elle défile horizontalement et n'a pas de vue de synthèse.
- Aucun canal pour demander une correction après approbation : l'édition n'est possible que sur `pending`/`returned`, et rien ne le signale à l'utilisateur.
- La recherche de contributions filtre uniquement la page courante (25 lignes) alors que la pagination est serveur : résultats trompeurs dès la 2ᵉ page.

## Ce qui sera construit

### 1. Navigation regroupée en 5 hubs

```text
Accueil     -> synthèse : KPI, alertes, actions rapides
Mes biens   -> Contributions | Locations | Annonces | Valeur & expertise
Démarches   -> Titres | Autorisations | Expertises | Mutations | Hypothèques | Lotissements | Litiges
Finances    -> Factures | Codes CCC | Fiscalité déclarée (IRL, impôt foncier)
Réglages    -> Profil | Préférences | Sécurité | Mes données (export/suppression)
```

Onglets de premier niveau en barre principale, sous-onglets à l'intérieur de chaque hub. Les URL actuelles (`?tab=titles`, etc.) continuent de fonctionner via une redirection vers `?tab=demarches&sub=titles`.

### 2. Hub « Mes biens »

- **Locations** : par contribution en location, tableau des locaux (nom/n°, étage, loyer mensuel, occupation, capacité), totaux mensuel et annuel recalculés, taux d'occupation, alerte si le total diffère du montant déclaré.
- **Annonces** : cartes des `market_listings` avec photo de couverture, prix, type (vente/location), coordonnées de contact, état de publication, et bascule activer/désactiver la publication.
- **Valeur & expertise** : prix de revente déclaré, devise, date d'expertise, lien vers le rapport, badge d'alerte si l'expertise date de plus de 12 mois.
- Détail d'une contribution : dialogue en lecture enrichi couvrant localisation, construction, location, valeur marchande, historiques et obligations.

### 3. Édition selon le statut

- `pending` / `returned` : édition directe (comportement actuel du dialogue CCC), avec bandeau explicite « modifiable ».
- `approved` : lecture seule + bouton « Demander une correction » qui ouvre un formulaire (champ concerné, valeur souhaitée, motif) créant une contribution de type mise à jour rattachée à la parcelle, visible dans le suivi côté admin.
- `rejected` : lecture seule + rappel du motif et bouton « Soumettre une nouvelle version ».

### 4. Hub « Finances » – suivi fiscal

- Synthèse des obligations déclarées : impôt sur les revenus locatifs estimé à partir des loyers déclarés (mono-local ou somme des locaux), impôt foncier déclaré, statut de paiement et dates issues de l'historique fiscal.
- Rappels d'échéance et lien vers la démarche de paiement correspondante.
- Les montants restent des estimations serveur/déclaratives : aucun calcul fiscal nouveau n'est inventé côté client, on réutilise la logique déjà appliquée dans l'onglet Obligations.

### 5. Réglages – contrôle et confidentialité

- « Mes données » : export complet (RPC `export_user_data` déjà présente) en JSON et CSV.
- Visibilité : bascule globale de publication des annonces, et bascule par annonce.
- Demande de suppression de compte / de retrait des données déclarées, avec confirmation explicite.

### 6. Correctifs

- Recherche des contributions déplacée côté serveur (debounce + `escapeIlike`) pour couvrir toutes les pages.
- Réinitialisation de la page courante lors d'un changement de recherche ou d'onglet.
- Statuts et libellés alignés sur l'enum standard EN → labels FR.
- États vides et états de chargement homogènes sur tous les hubs.

## Notes techniques

- `useUserContributions` étendu : sélection explicite des colonnes locatives et marché, recherche serveur, et dérivés mémoïsés (total loyers, nombre d'annonces publiées).
- Nouveaux composants sous `src/components/user/` : `hubs/` (`HomeHub`, `AssetsHub`, `ProceduresHub`, `FinanceHub`, `SettingsHub`), `assets/` (`RentalUnitsPanel`, `ListingsPanel`, `MarketValuePanel`), `finance/TaxObligationsPanel`, `data/UserDataControls`, `contributions/CorrectionRequestDialog`.
- `UserDashboard.tsx` réduit à un routeur d'onglets : gestion `?tab=` + `?sub=`, mapping des anciens onglets, aucun contenu métier inline.
- Utilitaires de calcul locatif partagés extraits pour rester identiques à ceux du formulaire et de l'espace admin (totaux loyers, capacité agrégée, unités vacantes).
- La demande de correction s'appuie sur les tables existantes (contribution de type mise à jour). Si un stockage dédié s'avère nécessaire après vérification des politiques d'accès, une migration sera proposée séparément avant l'implémentation.
- Toutes les couleurs via jetons sémantiques Tailwind, aucun style codé en dur.
