

# Insertion de 8 slides de services dans la Présentation BIC

## Résumé

Ajouter 8 nouveaux slides après le slide "Services" (id: `services`), chacun dédié à un des 8 services numériques du BIC. Ces slides reprendront le même pattern visuel que les slides existants (SlideWrapper, layout deux colonnes texte/visuel).

## Les 8 services (un slide chacun)

1. **Recherche cadastrale** — Recherche par numéro, nom, GPS. Résultats instantanés.
2. **Carte interactive** — Visualisation satellite avec couches cadastrales.
3. **Titre foncier** — Demande en ligne de certificat avec suivi temps réel.
4. **Expertise immobilière** — Évaluation professionnelle de la valeur marchande.
5. **Mutation foncière** — Transfert de propriété numérisé.
6. **Litiges fonciers** — Déclaration et suivi des conflits avec médiation.
7. **Vérification d'hypothèque** — Vérification des charges hypothécaires.
8. **Historique fiscal** — Consultation de l'historique taxes et quittances.

## Design de chaque slide

Chaque slide suivra un layout cohérent :
- **En-tête** : badge "Service N/8" + nom du service
- **Colonne gauche** : description détaillée, 3-4 points clés avec icônes CheckCircle2, public cible
- **Colonne droite** : icône principale grande dans un cadre stylisé avec gradient
- Alternance de gradients de fond pour varier visuellement (bleu, vert, ambre, violet, etc.)

## Modifications techniques

### Fichier : `src/pages/PitchPartenaires.tsx`

1. **Créer 8 composants** (`SlideServiceRecherche`, `SlideServiceCarte`, `SlideServiceTitre`, `SlideServiceExpertise`, `SlideServiceMutation`, `SlideServiceLitiges`, `SlideServiceHypotheque`, `SlideServiceHistorique`) — insérés après le composant `SlideServices` (~ligne 197).

2. **Mettre à jour le tableau `slides`** (~ligne 921) pour insérer les 8 nouveaux slides entre `services` et `how-it-works`.

3. **Mettre à jour `DEFAULT_SLIDES`** dans `src/components/admin/AdminPitchConfig.tsx` pour ajouter les 8 nouveaux slide IDs afin qu'ils soient configurables dans l'admin.

### Aucune nouvelle dépendance — toutes les icônes nécessaires sont déjà importées.

