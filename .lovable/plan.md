

## Audit — Données du formulaire CCC sans visuel dédié dans "Données foncières"

### Méthode
Croisement entre :
- **Colonnes collectées** dans `cadastral_contributions` (BD) + champs dérivés du formulaire CCC
- **Visuels existants** dans `ContributionsBlock.tsx`, `ParcelsWithTitleBlock.tsx` et autres blocs (`Taxes`, `Mortgages`, `OwnershipHistory`, `BuildingPermits`)

Note : "manuellement écarté" — je liste tout ce qui n'a pas de visuel ; vous me direz lesquels exclure. Les champs administratifs internes (id, user_id, reviewed_by, timestamps techniques) sont déjà exclus d'office.

---

### A. Champs collectés mais NON visualisés

#### 1. Bloc « Localisation / Géométrie »
| Champ CCC | Type | Présent dans block ? |
|---|---|---|
| `gps_coordinates` | jsonb (sommets) | ❌ Aucun visuel (carte ne consomme pas le polygone) |
| `parcel_sides` | jsonb (dimensions des côtés) | ❌ Aucun (distrib. longueurs / périmètre) |
| `road_sides` | jsonb (côtés donnant sur voie) | ❌ Aucun (% parcelles avec accès route) |
| `area_sqm` (contributions) | numeric | ❌ Distribution surface absente du bloc Contributions (présente uniquement dans ParcelsWithTitle) |
| `house_number` | text | ❌ Non analysé (taux de remplissage adresse) |

#### 2. Bloc « Propriétaires / Droits »
| Champ | Manque |
|---|---|
| `current_owners_details` | jsonb multi-propriétaires | ❌ Pas de visuel sur **nb de copropriétaires**, répartition genre/nationalité des co-propriétaires |
| `current_owner_since` | date | ❌ Pas de distribution **ancienneté de propriété** |
| `is_title_in_current_owner_name` | bool | ❌ Pas de KPI/donut « titre au nom du propriétaire actuel » |
| `title_issue_date` | date | ❌ Pas de distribution par décennie d'émission du titre (existe pour construction_year, pas pour title) |
| `title_reference_number` | text | ❌ Taux de remplissage référence titre |
| `whatsapp_number` | text | ❌ Taux de joignabilité WhatsApp |

#### 3. Bloc « Construction / Bâti »
| Champ | Manque |
|---|---|
| `construction_year` (contributions) | int | ❌ Présent dans ParcelsWithTitle, **absent** du bloc Contributions |
| `construction_materials` | text | ❌ Absent du bloc Contributions (présent ParcelsWithTitle) |
| `standing` | text | ❌ Absent du bloc Contributions |
| `floor_number` / `apartment_number` | text | ❌ Aucun visuel (distribution étages, % appartements vs maisons) |
| `additional_constructions` | jsonb | ❌ Aucun visuel (nb moyen de bâtiments secondaires) |
| `building_shapes` | jsonb | ⚠️ Partiellement (taille/hauteur dans ParcelsWithTitle) — **manque** : nb de bâtiments par parcelle, géométrie (rectangle/L/U) |

#### 4. Bloc « Occupation »
| Champ | Manque |
|---|---|
| `occupant_count` | int | ❌ Pas de distribution (densité d'occupation) |
| `hosting_capacity` | int | ❌ Pas de KPI capacité totale |
| `lease_years` | int | ❌ Pas de distribution durée des baux |
| `rental_start_date` | date | ❌ Pas de tendance/ancienneté locative |

#### 5. Bloc « Servitudes & contraintes »
| Champ | Manque |
|---|---|
| `servitude_data` | jsonb | ❌ **Aucun visuel** (types de servitudes, % parcelles grevées) |
| `dispute_data` | jsonb (détail litige déclaré dans CCC) | ❌ Pas exploité dans bloc Contributions (DisputesBlock utilise table dédiée) |

#### 6. Bloc « Historiques JSONB embarqués »
Ces champs sont stockés directement dans `cadastral_contributions` et dupliqués dans tables dédiées — mais le contenu CCC brut n'est **jamais comparé** :
| Champ | Manque |
|---|---|
| `ownership_history` (jsonb) | ❌ Pas de KPI « contributions avec historique propriété déclaré » |
| `boundary_history` (jsonb) | ❌ **Aucun bloc dédié** au bornage (existe dans CCC, absent des blocs analytics) |
| `tax_history` (jsonb embarqué) | ❌ Non comparé au bloc Taxes (cohérence déclaratif vs payé) |
| `mortgage_history` (jsonb embarqué) | ❌ Non comparé au bloc Mortgages |

#### 7. Bloc « Workflow / Modération »
| Champ | Manque |
|---|---|
| `changed_fields` / `change_justification` (mises à jour) | ❌ Pas de visuel sur **champs les plus modifiés** ni motifs de modif |
| `verified_by` / `verified_at` (vs reviewed) | ❌ Pas de KPI vérification distincte de l'approbation |
| `rejection_reasons` (jsonb détaillé) | ❌ Seul `fraud_reason` est visualisé ; raisons de rejet structurées non exploitées |
| `original_parcel_id` (lien contribution-correction) | ❌ Pas de KPI « contributions correctives » |
| `previous_permit_number` | text | ❌ Aucun visuel (lien régularisation ↔ ancien permis) |
| `permit_request_data` (demandes embarquées CCC) | ❌ Distinct du bloc BuildingPermits — pas de visuel sur les **demandes initiées via CCC** |

---

### B. Synthèse — Top manquements à fort potentiel analytique

| # | Indicateur manquant | Champ source | Valeur métier |
|---|---|---|---|
| 1 | **Servitudes** (types, % grevés) | `servitude_data` | Élevée — risque foncier |
| 2 | **Bornage déclaré** (ancienneté, méthode) | `boundary_history` | Élevée — qualité cadastre |
| 3 | **Multi-propriété** (nb co-propriétaires, genre) | `current_owners_details` | Élevée — équité foncière |
| 4 | **Densité d'occupation** (occupants/m²) | `occupant_count`, `area_sqm` | Élevée — urbanisme |
| 5 | **Distribution surface contributions** | `area_sqm` | Moyenne — alignement parcels |
| 6 | **Ancienneté de propriété** | `current_owner_since` | Moyenne |
| 7 | **Étages / appartements** | `floor_number`, `apartment_number` | Moyenne — verticalité |
| 8 | **Bâtiments secondaires** | `additional_constructions` | Moyenne |
| 9 | **Cohérence déclaratif vs officiel** (taxes/hypothèques embarqués vs tables) | jsonb embarqués | Moyenne — anti-fraude |
| 10 | **Justifications de modification** | `change_justification`, `changed_fields` | Faible-moyenne |

---

### C. Question

**Lesquels de ces champs avez-vous manuellement écartés** (à retirer de la liste avant que je propose un plan d'ajout de visuels) ?

Une fois la liste filtrée, je proposerai un plan structuré (lots S1, S2, S3) pour intégrer les visuels manquants en respectant l'architecture existante (`ContributionsBlock` + nouveaux blocs `ServitudesBlock` / `BoundaryBlock` si nécessaire).

