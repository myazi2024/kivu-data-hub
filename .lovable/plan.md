

## Carte RDC dynamique synchronisée à l'onglet Analytics actif

### Objectif
Lorsque l'utilisateur change d'onglet dans le panneau Analytics (Litiges, Hypothèques, Mutations, Titres, etc.), la **carte RDC** (choroplèthe + légende + tooltip) se reconfigure automatiquement pour afficher uniquement les données de cet onglet, avec un dégradé de couleurs et des paliers adaptés à la métrique.

### Architecture de la synchronisation

```text
ProvinceDataVisualization (activeTab) ───┐
                                          │ lifted up via prop / context
                                          ▼
                              DRCInteractiveMap
                                          │
                              ┌───────────┴────────────┐
                              ▼                        ▼
                      Choroplèthe par tab        Légende par tab
                      (metric + palette)         (paliers + tooltip)
```

**Implémentation** : remonter `activeTab` de `ProvinceDataVisualization` vers `DRCInteractiveMap` via un nouveau prop `onTabChange` + `currentTab`, ou via un nouveau contexte `ActiveAnalyticsTabContext`. Approche retenue : **prop callback** (plus explicite, pas d'effet de bord global).

### 1. Registre `MAP_TAB_PROFILES` (nouveau fichier)

Créer `src/config/mapTabProfiles.ts` qui définit, pour chaque `tabKey` du registre Analytics, comment colorer la carte et alimenter la légende :

```ts
type MapTabProfile = {
  tabKey: string;
  label: string;              // Affiché en en-tête de carte
  legendTitle: string;        // Ex. "Densité de litiges fonciers"
  metric: (analytics, provinceName) => number; // valeur par province
  tiers: { label, min, max, color }[];         // 4 paliers semantic
  tooltipLines: { label, getValue }[];         // jusqu'à 4 lignes spécifiques
};
```

Profils prévus (alignés sur les onglets existants) :

| Tab | Métrique colorante | Palette | Tooltip lines |
|---|---|---|---|
| `title-requests` | parcelles titrées | bleu | Cert. enreg., Contrats loc., Fiches parc., % titrées |
| `parcels-titled` | constructions déclarées | violet | Constructions, % habitées, multi-constr., hauteur moy. |
| `contributions` | contributions soumises | indigo | Soumises, validées, frauduleuses, en appel |
| `expertise` | demandes expertise | cyan | Total, en cours, terminées, délai moy. |
| `mutations` | mutations en cours | ambre | Total, en cours, finalisées, type principal |
| `mortgages` | hypothèques actives | vert | Inscriptions, actives, radiations, % bancaires |
| `subdivision` | lotissements | turquoise | Total, en cours, validés, lots créés |
| `disputes` | litiges fonciers | rouge | Total, ouverts, résolus, nature dominante |
| `ownership` | transferts propriété | rose | Transferts, anciens prop., % discordants |
| `certificates` | certificats émis | émeraude | Total, par type principal |
| `invoices` | factures | gris-bleu | Total, payées, impayées, montant moy. |
| `building-permits` | autorisations | orange | Total, approuvées, rejetées, en cours |
| `taxes` | taxes foncières | jaune | Total, payées, en retard, montant moy. |
| `rdc-map` *(défaut)* | parcelles totales | gris→rouge actuel | Configuration tooltipLineConfigs existante |

Toutes les couleurs utilisent les jetons sémantiques HSL (cf. `mem://design/standard-thematisation-semantique-fr`) — pas de couleurs codées en dur autres que via `hsl(var(--...))` ou les variables existantes.

### 2. Modifications fichiers

**`src/components/visualizations/ProvinceDataVisualization.tsx`**
- Ajouter prop `onActiveTabChange?: (tabKey: string) => void`.
- Notifier le parent quand `activeTab` change via `useEffect`.

**`src/components/DRCInteractiveMap.tsx`**
- Ajouter `const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<string>('rdc-map')`.
- Passer `onActiveTabChange={setActiveAnalyticsTab}` à `<ProvinceDataVisualization>`.
- Calculer dynamiquement :
  - `activeProfile = MAP_TAB_PROFILES[activeAnalyticsTab] ?? MAP_TAB_PROFILES['rdc-map']`
  - `provincesData` : recalculer la **valeur métrique** par province via `activeProfile.metric(analytics, provinceName)` et la stocker dans un champ générique `metricValue`.
  - `getProvinceColor` : utiliser `activeProfile.tiers` au lieu de `DENSITY_TIERS` quand un onglet métier est actif.
  - `tooltipLineConfigs` : remplacer par les lignes définies par `activeProfile.tooltipLines` quand un profil métier est actif (sinon, garder la config admin actuelle).
  - En-tête de la carte : afficher `activeProfile.label` (ex. "Litiges fonciers — RDC") au lieu du titre générique.
  - Légende contextuelle (bloc bottom-left) : si profil métier actif, afficher les 3-4 indicateurs clés du profil au lieu du bloc générique « Certif. enreg. / Titres dem. / Litiges / Sup. moy. ».
  - Bloc « Données géographiques » (panneau gauche bas) : **conserver** l'affichage exhaustif global (utile pour la vue complète) mais ajouter en haut le bloc spécifique au profil actif.

**`src/components/DRCMapWithTooltip.tsx`**
- Aucun changement structurel : il reçoit déjà `getProvinceColor` et `tooltipLineConfigs` via props ; il suffira que ces props soient calculés depuis `activeProfile`.

### 3. Mini-légende choroplèthe

Sur la carte, en bas à droite (à côté des boutons fullscreen/copier), ajouter une mini-légende de 4 paliers colorés (carrés + label) issue de `activeProfile.tiers`, repliable. Visible uniquement si `activeAnalyticsTab !== 'rdc-map'` (la vue par défaut conserve sa mini-légende actuelle).

### 4. Comportement visuel

- **Transition fluide** : `transition-colors duration-300` sur les `path` SVG (déjà supporté par DRCMapWithTooltip via les attributs fill).
- **Respect du scope** : la métrique reste calculée à l'échelle province (pas de double filtrage avec `selectedVille/Commune`, qui restent gérés indépendamment dans le panneau « Données géographiques »).
- **Mode test isolé** : l'analytics utilisé reste celui retourné par `useLandDataAnalytics(isTestRoute)` — aucune fuite cross-environment.

### Résultat attendu

- Onglet **Litiges fonciers** sélectionné → carte colorée par densité de litiges (palette rouge), légende « Densité de litiges fonciers », tooltip indique nature/statut/résolus.
- Onglet **Hypothèques** → palette verte, légende hypothèques actives, tooltip créancier dominant.
- Onglet **Carte RDC** (défaut) → comportement actuel inchangé.
- Onglet **Mutations**, **Titres**, etc. → idem, chacun avec sa palette et ses indicateurs.

### Validation

- Vérifier sur desktop et viewport compact que :
  - le changement d'onglet recolore la carte et met à jour la mini-légende sans flash.
  - le tooltip de survol reflète les bons indicateurs par onglet.
  - les filtres ville/commune/quartier continuent de fonctionner en parallèle.
  - le mode plein écran et le bouton « Copier en image » capturent bien la carte avec ses nouvelles couleurs.

