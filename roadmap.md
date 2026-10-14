# Roadmap

- [x] Page d’accès payant sur un seul écran : 15 tests et 8 formats vérifiés avec/sans captures, sans défilement ; liens conservés. Vérification visuelle isolée, parcours authentifié indisponible sur la base externe.

- [x] Refonte accueillante de la page Données foncières pour profils non habilités, avec emplacements de captures ordinateur/mobile et contrôle d’accès inchangé (13 tests ; apparence et lien vérifiés en aperçu isolé, authentification réelle non vérifiable sur la base externe).

- [x] Combiner les limites territoriales et communales fiables sur la carte d’Accueil.
- [x] Maintenir les suggestions non validées hors des limites affichées.
- [x] Ajouter le zoom animé, le second clic et le bouton de retour.
- [x] Vérifier les correspondances, le rendu et les formats ordinateur/mobile.
- [x] Afficher la circonscription sélectionnée dans la carte et ses trois indicateurs agrégés sous la carte.
- [x] Alertes de sécurité : faux paiements, remboursements, relances, test prestataire, retour de paiement, exports CSV, tuiles, MCP.
- [x] Protéger relevés de santé + contrôle des alertes : migration du secret cron et déploiements effectués.
- [x] Afficher la voirie publique par côté sur la parcelle sélectionnée, avec repères limités aux segments déclarés.
- [x] Afficher chaque construction enregistrée sur la parcelle avec les longueurs des côtés et sa hauteur, sans exposer d'autres champs privés.
- [x] Retirer le bandeau de titre et les boutons de type de carte de la carte Données foncières ; circonscriptions par défaut, vue dérivée des filtres.
- [x] Compacter les indicateurs sous la carte des circonscriptions et porter la carte à 75 % de la colonne après sélection.
- [x] Placer le nom de la circonscription sélectionnée directement dans sa forme sur la carte.
- [x] Retirer les boutons « Réinitialiser » et « Info » du bloc carte ; garder partager et plein écran.
- [x] Regrouper et rendre rétractables les commandes mobiles Carte/Analytics, rendre les onglets Analytics rétractables et retirer le filtre de statut.
- [x] Rétablir les onglets Analytics sur le côté sur mobile avec rétraction latérale, sans déplacer la liste en haut.
- [x] Reformuler la première phrase de « À propos de ce service » dans l'introduction du formulaire CCC.



## Adaptation mobile complète
- [x] Socle mobile et pages publiques
- [x] Carte cadastrale, CCC et services
- [x] Données foncières et Analytics
- [x] Espaces utilisateur, revendeur et RH
- [x] Espace admin
- [x] Charge réseau et serveur mobile
- [x] Vérifications multi-écrans et rapport

- [x] Aligner le back-end Analytics sur le front-end : purge DB des réglages filter-status / filter-status-field / map-header-note, code mort retiré (useAnalyticsChartsConfig, FilterManager, AnalyticsFilters, blocks).
- [x] Alléger « Location et valeur » : retirer quatre classements par localité/prix et les KPI « Biens recensés » / « Avec autorisation de bâtir ».
- [x] Ajouter « À propos de ce service » en tête de la page d’introduction CCC (vérification au cadastre numérique + numéro recherché rappelé).
- [x] Reformuler « À propos de ce service » : vérification poussée, absence de correspondance (frappe ou méthodologie), demande de vérification auprès du cadastre, ajout par BIC au registre national.

- [x] CCC : fermeture accidentelle du formulaire bloquée (clic extérieur/Echap → confirmation, brouillon restauré = modifié, message édition corrigé) — 2026-10-13
- [x] Mode test aligné sur les 8 onglets Données foncières (circonscriptions, statuts, location/vente, bornage, construction) ; 5 onglets masqués retirés. Reste : cliquer « Régénérer » dans le mode test.
