# Acte de cession des anciens propriétaires + barre de navigation mobile en bas

## 1. Formulaire CCC — onglet Historique des propriétaires
Pour chaque ancien propriétaire, un 3e emplacement obligatoire s'ajoute à « Titre de propriété » et « Pièce d'identité ». Son libellé suit le choix de la case Mutation :

| Mutation | Pièce demandée |
|---|---|
| Vente | Acte de vente |
| Donation | Acte de donation |
| Succession | Jugement / certificat d'hérédité |
| Expropriation | Arrêté d'expropriation |
| Échange | Acte d'échange |
| Autre / non choisi | Acte de cession |

- PDF ou image, 10 Mo max, retrait possible, comme les autres pièces.
- Envoi bloqué si l'acte manque (renvoi vers l'onglet Historique) ; en modification, un acte déjà enregistré compte comme fourni.
- Changer la mutation garde le fichier joint, seul le libellé change.
- Récapitulatif : l'acte apparaît pour chaque ancien propriétaire.
- Après validation admin, l'acte est recopié dans l'historique de la parcelle, visible uniquement via l'accès payé (règle existante) ; l'admin le voit dans le détail de la contribution.

## 2. Affichage mobile — barre de navigation en bas
- Sur téléphone (moins de 768 px), le bouton à trois barres en haut est retiré ; une barre fixe apparaît en bas de l'écran, sur les pages publiques qui utilisent le menu principal.
- 5 entrées avec icône + libellé court : Accueil, Données foncières, Carte cadastrale, Médias (ouvre une feuille avec Articles, Publications, Services, etc.), Compte (espace utilisateur, ou Connexion si déconnecté ; Admin ajouté dans la feuille si autorisé). Le cadenas de « Données foncières » restreinte est conservé.
- Style épuré : fond de la couleur du thème légèrement translucide, fine bordure haute, couleurs BIC, entrée active mise en évidence par une pastille et la couleur principale.
- Animation sobre : la pastille glisse vers l'entrée choisie (≈200 ms), légère montée de l'icône ; désactivée si l'utilisateur a demandé moins d'animations.
- Respect de la zone basse des iPhone, marge ajoutée en bas des pages pour que rien ne soit masqué ; sur la carte cadastrale, les boutons flottants sont remontés au-dessus de la barre.
- Sur ordinateur et tablette, rien ne change. L'espace utilisateur et l'admin gardent leur propre menu.

## Détails techniques
- `PreviousOwner` : `cessionDocFile`, `cessionDocumentUrl` ; helper `getCessionDocLabel(mutationType)` dans `src/lib/ccc/` + test unitaire des libellés.
- `HistoryTab` : ajout dans la liste des slots ; `useFormValidation` exige `cessionDocFile || cessionDocumentUrl` (+ tests) ; upload dans `useCCCFormState` (dossier `previous-owners`, rollback) ; payload `cession_document_url` dans le JSON `ownership_history` ; `useFormPersistence` retire le File ; `ReviewTab`, `CCCDetailsDialog`, `cccHelpers.OwnershipHistoryEntry`.
- Migration : colonne `cession_document_url text` sur `cadastral_ownership_history` ; `sync_approved_contribution_to_parcel` la recopie ; `get_parcel_paid_history` la renvoie dans le détail payé.
- Nouveau `src/components/ui/MobileBottomNav.tsx` rendu par `navigation.tsx` (`md:hidden`), Sheet pour « Médias » ; classe utilitaire `pb-[calc(4rem+env(safe-area-inset-bottom))]` appliquée au conteneur des pages concernées ; animation via transform CSS + `motion-reduce`.
