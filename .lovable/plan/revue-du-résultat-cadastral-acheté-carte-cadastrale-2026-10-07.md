# Revue du résultat cadastral acheté (carte cadastrale)

Objectif : fiabiliser la fiche affichée après paiement et faire en sorte que seul le serveur décide de ce que l'utilisateur peut voir. Rien d'autre n'est ajouté.

## Constats déjà vérifiés
1. **Les rubriques s'ouvrent selon les données reçues, pas selon les achats.** « Historique », « Obligations » et « Litiges » s'ouvrent dès qu'une liste n'est pas vide. « Litiges » s'ouvre même sans achat si des litiges arrivent. La bonne règle : une rubrique est ouverte seulement si son service est acheté (confirmé par le serveur). Sinon, elle affiche un cadenas.
2. **Deux sources pour les « services achetés ».** La fiche vérifie les accès de son côté, alors que le serveur calcule déjà cette liste quand il lit la parcelle. Les deux peuvent ne pas être d'accord, par exemple pour un accès expiré.
3. **Un code de vérification est créé à chaque ouverture de la fiche**, même sans achat. Cela crée des enregistrements inutiles et affiche un code sur un document incomplet.
4. **Le PDF reconstitue le nom du propriétaire** à partir des détails bruts quand le nom principal est vide. Il doit utiliser uniquement ce que le serveur a déjà autorisé.
5. **Les numéros des rubriques changent** selon que le nom du propriétaire est présent ou non (la rubrique « Construction » apparaît ou disparaît).

## À vérifier pendant les corrections
- Le serveur cache-t-il le nom du propriétaire, les coordonnées GPS, le bornage et les autorisations de bâtir tant que le service n'est pas acheté, y compris quand l'accès a expiré ? Tout champ envoyé sans achat sera retiré côté serveur.
- Chaque service du catalogue correspond-il à une rubrique (informations générales, localisation, historique, obligations, litiges) ? On cherche les services sans rubrique et les rubriques sans service.
- Rubriques manquantes : des données du formulaire CCC (constructions supplémentaires, limites et entrées, location) ne s'affichent pas alors que le service a été acheté.
- Code inutilisé dans la fiche, ses rubriques et le PDF.

## Corrections prévues
- Le serveur envoie, avec les données, la liste des services accessibles et leur date de fin d'accès. La fiche et le PDF s'appuient uniquement sur cette liste.
- Une rubrique s'affiche seulement si son service est acheté. Sinon : cadenas, avec un bouton pour revenir au catalogue.
- Code de vérification créé seulement au téléchargement ou à l'impression d'un document qui contient au moins un service acheté.
- Numéros de rubriques fixes ; PDF identique à la fiche à l'écran.
- Données CCC manquantes ajoutées aux rubriques déjà achetées, seulement si le serveur les autorise pour ce service.

## Vérification
- Contrôle du code et tests automatiques sans erreur. Nouveaux tests : rubriques fermées ou ouvertes selon les achats, accès expiré, aucune fuite avant paiement.
- Contrôle côté serveur, sans rien modifier en base : en visiteur non connecté, puis en utilisateur sans achat.
- Limite : je ne peux pas ouvrir à l'écran les pages qui demandent une connexion. Je vous indiquerai quoi tester.
- Une section sera ajoutée au rapport d'audit de la carte cadastrale.

## Détails techniques
- Fichiers : `CadastralResultCard`, `CadastralDocumentView` + `sections/*`, `lib/pdf.ts`, `utils/checkServiceAccess.ts`, `useCadastralSearch`, `createDocumentVerification`.
- Serveur : nouvelle migration pour `get_cadastral_parcel_data` — ajout de `paid_services` + `access_expires_at`, filtre `expires_at > now()`, masquage des champs de la parcelle par service. `get_parcel_paid_history` aligné sur la même règle.
- `AGENTS.md` mis à jour : la visibilité des rubriques vient uniquement de la liste d'accès renvoyée par le serveur.
