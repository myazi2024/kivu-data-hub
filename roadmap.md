# Roadmap

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
