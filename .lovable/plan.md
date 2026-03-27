

# Audit de la Fiche Cadastrale — Données fictives et divergences

## Divergences identifiées

| Problème | Détail | Impact |
|----------|--------|--------|
| **`bypass_payment` est du code mort dans la RPC** | La fonction SQL `get_cadastral_parcel_data` lit encore `bypass_payment` dans `cadastral_search_config` (ligne 36-41), mais cette clé a été supprimée de l'admin lors de la refonte du mode de paiement. | Le bypass ne fonctionne plus ; code mort à nettoyer. |
| **Permis de bâtir : gating incohérent** | La RPC gate les permis sur le service `'permits'`, mais ce service n'existe pas dans le catalogue (`cadastral_services_config`). Le document les affiche sous `hasAccess('information')`. Résultat : la RPC ne retourne jamais les permis (aucun service `permits` ne peut être payé), mais le document les cherche dans la mauvaise clé. | **Bug actif** — les permis ne s'affichent jamais. |
| **Données parcellaires toujours retournées par la RPC** | `v_parcel` est retourné sans aucun gating (lignes 31-33), peu importe les services payés. Mais le document les masque côté client avec `hasAccess('information')`. | Double incohérence : le serveur envoie les données même sans paiement, mais le client les cache. Le gating doit être côté serveur. |
| **Service `legal_verification` sans section** | Le catalogue contient un service `legal_verification` (prix facturé), mais la Fiche Cadastrale n'affiche aucune section correspondante. L'utilisateur paie pour rien. | **Bug actif** — service facturé sans contenu. |
| **Mode test non vérifié dans la RPC** | La RPC ne consulte pas le mode test global (`test_mode` dans `cadastral_search_config`). Le mode test est uniquement géré côté client. | Incohérence avec l'architecture serveur-first. |
| **Pas de gating serveur pour `land_disputes`** | La section litiges est affichée via une requête client directe (`DisputesSection`), contournant le gating serveur de la RPC. | Faille : les litiges sont accessibles sans paiement si l'utilisateur inspecte le réseau. |
| **`legal_verification` mappé à aucune donnée** | La RPC n'a aucune branche `WHEN ... 'legal_verification'` — ce service ne retourne aucune donnée serveur. |  |

## Plan de correction

### 1. Mettre à jour la RPC `get_cadastral_parcel_data`

- Supprimer la lecture de `bypass_payment` (code mort)
- Remplacer par la lecture du mode test global (`test_mode.enabled`)
- Gater les données parcellaires (`v_parcel`) derrière le service `information` (ou mode test/paiement activé=false)
- Remplacer `'permits'` par `'information'` pour les permis (ils font partie du service Informations)
- Ajouter une branche pour `land_disputes` : requêter `cadastral_land_disputes` côté serveur au lieu de laisser le client le faire
- Ajouter une branche pour `legal_verification` (retourner les données de vérification juridique si elles existent, ou un objet vide structuré)

### 2. Supprimer la requête client `DisputesSection`

Remplacer le composant `DisputesSection` (qui fait une requête Supabase directe) par l'affichage des données `result.land_disputes` retournées par la RPC. Le gating se fait ainsi côté serveur.

### 3. Ajouter la section `legal_verification` dans le document

Créer une section « Vérification juridique » dans `CadastralDocumentView` affichant les données retournées par la RPC pour ce service (statut du titre, conformité, observations).

### 4. Synchroniser le gating client avec le serveur

Le document ne doit plus utiliser `hasAccess(serviceType)` pour décider quoi afficher. Il doit vérifier si les données sont présentes (non vides) dans le résultat RPC. Si la RPC retourne `[]` ou `null` pour une section, le placeholder verrouillé s'affiche. Le gating est ainsi entièrement piloté par le serveur.

### 5. Vérifier le mode de paiement désactivé

Quand le paiement est désactivé (`payment_mode.enabled = false`), la RPC doit retourner toutes les données (accès gratuit). Remplacer la logique `bypass_payment` supprimée par la vérification de `payment_mode.enabled`.

## Fichiers impactés

| Action | Fichier |
|--------|---------|
| Migration SQL | Mise à jour de `get_cadastral_parcel_data` — suppression bypass, ajout test_mode, gating parcelle, litiges serveur, legal_verification, correction permits |
| Modifié | `src/components/cadastral/CadastralDocumentView.tsx` — Suppression `DisputesSection`, gating par données présentes, ajout section legal_verification |
| Modifié | `src/hooks/useCadastralSearch.tsx` — Mapper `land_disputes` depuis le résultat RPC |
| Modifié | `src/types/cadastral.ts` ou types inline — Ajouter `land_disputes` au type `CadastralSearchResult` |

