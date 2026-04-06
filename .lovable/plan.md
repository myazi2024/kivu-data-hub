

# Picklist de croisement de variables par graphique

## Concept

Ajouter un petit sélecteur (picklist) dans le coin supérieur droit de chaque `ChartCard`, à côté du bouton "Copier". Quand l'utilisateur sélectionne une variable de croisement, le graphique passe en mode **StackedBar** (ou donut segmenté) pour montrer la répartition de la variable sélectionnée au sein de chaque catégorie de l'indicateur principal.

Par exemple, sur le graphique "Type de demande" (TitleRequests), choisir la variable "Statut" transforme le bar chart en stacked bar montrant la répartition approuvé/en attente/rejeté pour chaque type de demande.

## Architecture technique

### 1. Définir les variables croisables par graphique

Créer un fichier `src/config/crossVariables.ts` contenant un registre statique `CROSS_VARIABLE_REGISTRY` qui mappe chaque `(tab_key, chart_key)` à une liste de variables pertinentes :

```typescript
export interface CrossVariable {
  label: string;        // Ex: "Statut", "Province"
  field: string;        // Ex: "status", "province"
  maxCategories?: number; // Limite pour éviter trop de segments (défaut: 5)
}

export const CROSS_VARIABLE_REGISTRY: Record<string, Record<string, CrossVariable[]>> = {
  'title-requests': {
    'request-type':    [{ label: 'Statut', field: 'status' }, { label: 'Paiement', field: 'payment_status' }, { label: 'Province', field: 'province' }, { label: 'Usage', field: 'declared_usage' }],
    'requester-type':  [{ label: 'Statut', field: 'status' }, { label: 'Genre', field: 'requester_gender' }, { label: 'Province', field: 'province' }],
    // ... etc.
  },
  // ... autres onglets
};
```

### 2. Modifier `ChartCard` pour supporter le croisement

Ajouter les props optionnelles :
- `crossVariables?: CrossVariable[]` — liste de variables disponibles
- `rawRecords?: any[]` — données brutes pour recalculer le croisement
- `groupField?: string` — le champ principal du graphique (pour regroupe par)

Quand une variable est sélectionnée, `ChartCard` :
1. Recalcule les données en mode croisé (group by `groupField`, segment by `crossField`)
2. Rend un `StackedBarChart` au lieu du graphique simple
3. Affiche un bouton "✕" pour revenir au mode normal

### 3. UI du picklist

Un petit `<Select>` compact (icône `Layers` ou `GitBranch`) en `text-[9px]` à côté du bouton Copier, qui s'ouvre en popover avec les options de croisement. Design discret, pas plus large que 24px en mode fermé (juste une icône).

### 4. Variables pertinentes par onglet et graphique

**Titres fonciers** (`title-requests`) :
| Graphique | Variables croisables |
|-----------|---------------------|
| Type demande | Statut, Paiement, Usage déclaré, Province |
| Demandeur | Statut, Genre, Province |
| Statut | Type demande, Paiement, Province |
| Paiement | Statut, Type demande, Province |
| Statut juridique | Usage déclaré, Province, Statut |
| Usage déclaré | Type construction, Province, Statut |
| Genre | Statut, Type demande, Province |
| Nationalité | Statut, Province |
| Titre déduit | Statut, Province |
| Type construction | Usage déclaré, Province, Statut |
| Nature construction | Province, Usage déclaré |
| Superficie | Province, Usage déclaré, Statut |

**Parcelles titrées** (`parcels-titled`) :
| Graphique | Variables croisables |
|-----------|---------------------|
| Type titre | Statut juridique, Usage déclaré, Province |
| Propriétaires | Type titre, Usage déclaré, Province |
| Genre | Type titre, Province |
| Construction | Usage déclaré, Province, Type titre |
| Nature construction | Province, Type titre |
| Usage déclaré | Type titre, Province |
| Type bail | Usage déclaré, Province |
| Superficie | Province, Usage déclaré |

**Contributions** (`contributions`) :
| Graphique | Variables croisables |
|-----------|---------------------|
| Type contribution | Statut, Province, Usage déclaré |
| Statut | Type contribution, Province |
| Type titre | Statut, Province, Usage déclaré |
| Statut juridique | Type contribution, Province |
| Usage déclaré | Type contribution, Statut, Province |
| Type construction | Province, Statut |
| Détection fraude | Type contribution, Province |
| Score fraude | Type contribution, Province |
| Statut appel | Province |

**Expertise** (`expertise`) :
| Graphique | Variables croisables |
|-----------|---------------------|
| Statut | Condition bien, Qualité construction, Province |
| Paiement | Statut, Province |
| État du bien | Qualité construction, Province, Accès routier |
| Qualité construction | État du bien, Province |
| Matériau murs | Matériau toiture, Province |
| Matériau toiture | Matériau murs, Province |
| Env. sonore | Province, Position bâtiment |
| Position bâtiment | Province, Env. sonore |
| Accès routier | Province, État du bien |
| Zones à risque | Province |
| Valeur marchande | Province, Qualité construction, État du bien |
| Nbre étages | Province, Qualité construction |

**Mutations** (`mutations`) :
| Graphique | Variables croisables |
|-----------|---------------------|
| Statut | Type mutation, Province, Paiement |
| Type mutation | Statut, Province, Paiement |
| Type demandeur | Statut, Province |
| Paiement | Statut, Type mutation, Province |
| Valeur vénale | Type mutation, Province |
| Ancienneté titre | Type mutation, Province |
| Retard mutation | Type mutation, Province |

**Lotissements** (`subdivision`) :
| Graphique | Variables croisables |
|-----------|---------------------|
| Statut | Objet, Province, Type demandeur |
| Distribution lots | Province, Objet |
| Objet lotissement | Statut, Province |
| Type demandeur | Statut, Province |
| Paiement | Statut, Province |
| Surface parcelle mère | Province, Objet |

**Litiges** (`disputes`) :
| Graphique | Variables croisables |
|-----------|---------------------|
| Nature | Statut (en cours/résolu), Province, Type |
| En cours vs Résolus | Nature, Province |
| Statut détaillé | Nature, Province |
| Type litige | Nature, Province, Niveau résolution |
| Niveau résolution | Nature, Province |
| Qualité déclarant | Nature, Province |
| Statut levée | Nature, Province |
| Nature litige (levée) | Province |

**Hypothèques** (`mortgages`) :
| Graphique | Variables croisables |
|-----------|---------------------|
| Type créancier | Statut, Province |
| Montants | Province, Type créancier |
| Statut | Type créancier, Province |
| Durée | Province, Type créancier |

**Permis** (`building-permits`) :
| Graphique | Variables croisables |
|-----------|---------------------|
| Statut administratif | Service émetteur, Province |
| En cours vs Expiré | Province, Service |
| Service émetteur | Statut, Province |
| Période validité | Province |

**Taxes** (`taxes`) :
| Graphique | Variables croisables |
|-----------|---------------------|
| Statut paiement | Exercice fiscal, Province |
| Exercice fiscal | Statut paiement, Province |
| Tranche montant | Statut paiement, Province |

**Propriété** (`ownership`) :
| Graphique | Variables croisables |
|-----------|---------------------|
| Statut juridique | Type mutation, Province |
| Type mutation | Statut juridique, Province |

**Fraude** (`fraud`) :
| Graphique | Variables croisables |
|-----------|---------------------|
| Type fraude | Sévérité, Province |
| Sévérité | Type fraude, Province |
| Liées contrib. | Type fraude, Sévérité |

**Certificats** (`certificates`) :
| Graphique | Variables croisables |
|-----------|---------------------|
| Type certificat | Statut, Province |
| Statut | Type certificat, Province |

**Factures** (`invoices`) :
| Graphique | Variables croisables |
|-----------|---------------------|
| Statut | Moyen paiement, Province, Zone géo |
| Moyen paiement | Statut, Province |
| Zone géographique | Statut, Province |

### 5. Logique de croisement (utilitaire)

Ajouter dans `analyticsHelpers.ts` :
```typescript
export function crossBy(
  records: any[], groupField: string, crossField: string, maxCross = 5
): { data: any[]; keys: string[] } {
  // Groupe par groupField, puis compte par crossField
  // Retourne données pour StackedBarChart + liste de clés
}
```

### 6. Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `src/config/crossVariables.ts` | **Nouveau** — registre des variables croisables par graphique |
| `src/utils/analyticsHelpers.ts` | Ajouter `crossBy()` |
| `src/components/visualizations/shared/ChartCard.tsx` | Ajouter picklist + mode croisé dans `ChartCard` |
| 14 fichiers blocs | Passer `crossVariables`, `rawRecords`, `groupField` à chaque `ChartCard` |

### 7. Exclusions

Les graphiques suivants ne sont **pas** croisables car leur structure ne s'y prête pas :
- Graphiques `area`/`evolution` (tendances temporelles)
- Graphiques `geo` (GeoCharts — déjà multi-niveaux)
- `StackedBarCard` existants (déjà croisés)
- KPIs

