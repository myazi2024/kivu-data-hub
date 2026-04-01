

# Audit de fonctionnalité — Fiche Cadastrale (`CadastralDocumentView`)

## Architecture

La fiche cadastrale est un document A4 structuré en sections numérotées, affiché dans `CadastralDocumentView.tsx` (634 lignes). Elle est rendue par `CadastralResultCard` après paiement réussi, dans le dialogue overlay `CadastralResultsDialog`.

```text
CadastralResultsDialog (overlay z-1500)
  └─ CadastralResultCard (logique paiement/affichage)
       ├─ CadastralBillingPanel (avant paiement)
       └─ CadastralDocumentView (après paiement) ← objet de l'audit
            ├─ Toolbar (Catalogue, Télécharger PDF, Imprimer)
            ├─ Header (Bureau d'Informations Cadastrales + parcelle)
            ├─ Sections numérotées dynamiques
            └─ Footer (disclaimer)
```

## Sections de la fiche

| # | Section | Source de données | Gating |
|---|---|---|---|
| 1 | Identification de la parcelle | `parcel.*` | `hasParcelData` (current_owner_name présent) |
| 2 | Propriétaire actuel | `parcel.current_owner_*` | Idem |
| 3 | Construction | `parcel.construction_*` | Conditionnel (champs non-null) |
| 4 | Autorisations de bâtir | `building_permits[]` | `building_permits.length > 0` |
| 5 | Localisation | `parcel.province/commune/...` | `hasParcelData && parcel.province` |
| 6 | Croquis du terrain | `CadastralMap` + `gps_coordinates` | Toujours rendu si localisation visible |
| 7 | Historique de bornage | `boundary_history[]` | `boundary_history.length > 0` |
| 8 | Historique de propriété | `ownership_history[]` | `hasHistoryData` ou `paidServices.includes('history')` |
| 9 | Obligations financières | `tax_history[]` + `mortgage_history[]` | `hasObligationsData` ou `paidServices.includes('obligations')` |
| 10 | Litiges fonciers | `land_disputes[]` | `hasDisputesData` (non-null/undefined) |
| 11 | Vérification juridique | `legal_verification` | `hasLegalVerification` (non-null) |

## Résultats de l'audit

### Ce qui fonctionne bien

- **Gating server-side** : La fiche ne montre que les données renvoyées par la RPC `get_cadastral_parcel_data`. Pas de fuite côté client.
- **Numérotation dynamique** : Le compteur `sectionNumber` s'incrémente uniquement pour les sections affichées — la numérotation est toujours séquentielle.
- **Sections verrouillées** : Chaque section non-payée affiche un placeholder `🔒 Section « X » non incluse`.
- **Impression** : Styles `@media print` dédiés avec `page-break-inside: avoid`, taille 11pt, toolbar masquée.
- **Documents joints** : Composant `DocumentAttachment` réutilisable avec boutons Voir/Télécharger.
- **Hypothèques** : Alerte visuelle animée pour les hypothèques actives + calcul du total remboursé.
- **Disclaimer** : Footer juridique clair sur la non-responsabilité du BIC.
- **Protection UX** : Dialogue de confirmation avant fermeture + `beforeunload` sur le navigateur.

### Bugs et problèmes identifiés

| ID | Sévérité | Problème | Détail |
|---|---|---|---|
| B1 | **P2** | Import inutilisé : `VerificationButton` | Importé ligne 16 mais jamais utilisé dans le composant. Code mort. |
| B2 | **P2** | Doublon Superficie/Hectares | Ligne 159 affiche `formatArea(area_sqm)` qui inclut déjà les hectares si ≥ 10000 m². Ligne 160 affiche à nouveau `area_hectares` séparément → doublon d'information quand area_sqm ≥ 10000. |
| B3 | **P2** | Gating incohérent pour Litiges | `hasDisputesData` vérifie `land_disputes !== undefined && !== null`, mais la RPC renvoie toujours un tableau (même vide `[]`). Donc `hasDisputesData` est **toujours true** si le serveur gate correctement → la section Litiges s'affiche systématiquement, même si le service n'est pas payé. Le placeholder `🔒` ne s'affichera jamais. |
| B4 | **P3** | Gating Localisation non aligné | `hasLocationData` (ligne 69) est déclaré mais non utilisé. La condition réelle (ligne 258) est `hasParcelData && (!!parcel.province || !!parcel.latitude)` — logique correcte mais la variable `hasLocationData` est du code mort. |
| B5 | **P3** | Croquis rendu même sans coordonnées | Si `gps_coordinates` est un tableau vide et `latitude/longitude` sont null, `CadastralMap` est quand même rendu (ligne 295-300), potentiellement affichant une carte vide. |
| B6 | **P3** | Pas de lazy loading pour la carte | `CadastralMap` (Leaflet) est chargé immédiatement même si la section Localisation n'est pas visible (scroll long). Impact performance sur mobile. |

### Améliorations suggérées

| Priorité | Amélioration | Impact |
|---|---|---|
| P2 | Corriger le gating des Litiges : vérifier si le service litiges est payé (comme pour `history` et `obligations`) | Sécurité des données |
| P2 | Supprimer la ligne doublon Hectares (ligne 160) | Clarté du document |
| P2 | Supprimer l'import `VerificationButton` inutilisé | Propreté du code |
| P3 | Ajouter une condition pour ne pas rendre `CadastralMap` si les coordonnées sont absentes | UX |
| P3 | Supprimer la variable `hasLocationData` non utilisée | Propreté du code |
| P3 | Lazy-load `CadastralMap` avec `React.lazy` ou intersection observer | Performance mobile |

## Conclusion

La fiche cadastrale est **bien structurée et fonctionnelle** dans l'ensemble, avec un bon gating server-side et une UX soignée pour l'impression. Le **bug le plus important (B3)** concerne le gating des litiges fonciers qui ne bloque jamais l'affichage car la RPC retourne toujours un tableau. Cela pourrait exposer la section Litiges sans paiement.

**Souhaitez-vous approuver pour corriger les bugs P2 (B1, B2, B3) ?**

