# Revue du service Gestion Hypothèque (menu Actions, carte cadastrale)

## Constats (vérifiés dans le code et la base)

1. **Vérification d'hypothèque active côté navigateur** : les onglets « Enregistrer » et « Radiation » lisent directement la table des hypothèques. Or seuls les admins et les propriétaires liés peuvent la lire : pour un notaire, un héritier ou un mandataire, aucune hypothèque n'est trouvée. La radiation est alors bloquée à tort et le contrôle « une seule hypothèque active » peut être contourné.
2. **Statuts incohérents** : le code cherche `active / en_defaut / renegociee` (libellés FR), alors que la règle projet impose des statuts EN et que l'admin gère un état de cycle de vie (`active / defaulted / renegotiated`). La liste est écrite en dur à trois endroits.
3. **Demande de radiation bloquée après un paiement échoué** : la demande est créée en « en attente de paiement », mais l'utilisateur ne peut ni la modifier ni la supprimer, et aucun écran ne permet de relancer le paiement, contrairement à ce qu'indique le message. Une nouvelle tentative crée un doublon, car le contrôle anti-doublon ignore ce statut.
4. **Le navigateur fixe le contenu sensible** : statut, statut de paiement, montant dû et détail des frais sont envoyés par le client lors de l'enregistrement. Les données de l'hypothèque et de la parcelle sont aussi copiées par le client. Le serveur recalcule bien le montant au paiement, mais rien ne contrôle ces champs à l'insertion.
5. **Notifications et journal d'audit écrits par le navigateur** après soumission, donc falsifiables. Ils sont redondants avec ce que le serveur peut produire.
6. **Enregistrement d'hypothèque** : le statut est choisi librement par l'utilisateur (`mortgageStatus`), la référence est générée côté client, et le message affiché est « Hypothèque enregistrée avec succès » alors qu'il s'agit d'une demande en attente.
7. **Code mort et redondance** : le barème par défaut existe en double (navigateur et serveur), le total des frais est recalculé dans la boîte de dialogue au lieu d'utiliser `calculateMortgageFees`, et `MortgageFlowContainer` ainsi que les marqueurs « Fix #n » doivent être vérifiés pour savoir s'ils sont encore utilisés.

## Corrections proposées

**Serveur**
- Nouvelle fonction de vérification `check_parcel_active_mortgage(parcel_id, reference?)` : elle indique seulement si une hypothèque active existe et si la référence est valide. Elle renvoie le minimum nécessaire (créancier, montant, date) uniquement pour une référence exacte, ouverte aux utilisateurs connectés.
- Normaliser les statuts actifs en EN dans une seule liste serveur et client. Avant de migrer, les valeurs réelles de la table seront vérifiées ; la table est vide aujourd'hui.
- Contrôle à l'enregistrement des demandes d'hypothèque :
  - le serveur force les statuts initiaux, recalcule le montant dû depuis le barème et recopie les données de l'hypothèque à partir de la référence ;
  - il refuse les doublons (une demande ouverte, y compris « en attente de paiement », par hypothèque) et une nouvelle inscription si une hypothèque est déjà active.
- Notification et audit de soumission créés côté serveur ; les écritures du navigateur sont supprimées.
- Possibilité de relancer le paiement d'une demande « en attente de paiement » existante, ou de l'annuler, via une fonction serveur contrôlant le propriétaire et le statut.

**Interface**
- Les onglets et le formulaire de radiation utilisent la vérification serveur.
- Avant de créer une demande, réutiliser une demande existante en attente de paiement plutôt que d'en créer une seconde. Ajouter « Reprendre le paiement » dans l'espace utilisateur (liste des demandes hypothécaires).
- Retirer le choix du statut par l'utilisateur à l'enregistrement et corriger les messages (« demande soumise »).
- Utiliser `calculateMortgageFees` partout et une seule liste de statuts, puis supprimer le code mort confirmé.

## Vérifications
- Tests unitaires : barème, liste des statuts et réutilisation de la demande en attente.
- Contrôle du code, build et linter de sécurité, sans nouvelle alerte non justifiée.
- Rapport ajouté à l'audit carte cadastrale, règle ajoutée dans AGENTS.md.

## Détails techniques
- Le trigger `enforce_mortgage_request_insert` s'applique à `cadastral_contributions` pour `mortgage_registration` et `mortgage_cancellation`. Il réutilise le barème configuré (`cadastral_contribution_config.mortgage_cancellation_fees`) dans une fonction SQL alignée sur `_shared/mortgageFees.ts`.
- Les nouvelles RPC sont en SECURITY DEFINER, avec `search_path = public` et un contrôle `auth.uid()` interne.
- `process-mobile-money-payment` et `create-payment` restent les seuls points de paiement. Leur règle « statut awaiting_payment » est inchangée.
