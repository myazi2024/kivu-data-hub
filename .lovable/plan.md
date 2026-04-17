
## Audit du mode test

### Vue d'ensemble

| Aspect | État |
|---|---|
| Configuration DB | ✅ `test_mode.enabled = true`, `auto_cleanup = false` |
| Données générées | ✅ 3 510 parcelles, 3 510 contributions, 1 170 factures, 702 paiements, 13k+ entités liées |
| RPC serveur | ✅ `cleanup_all_test_data()`, `count_test_data_stats()` présentes et fonctionnelles |
| Index partiels TEST-% | ✅ 14 index pour accélérer cleanup/count |
| Filtre test/prod | ✅ `applyTestFilter()` utilisé dans 31 fichiers (hooks user + carte) |
| Routes miroir | ⚠️ Présentes (`/test/map`, `/test/cadastral-map`, `/test/mon-compte`) mais **pas protégées par rôle** |
| Bannière visuelle | ✅ `TestEnvironmentBanner` discrète en bas à droite |
| Simulation paiement | ✅ `processTestPayment` + bouton test conditionnel `isTestModeActive` |

### Points forts

1. **Architecture serveur robuste** — Cleanup et stats déléguées à des RPC SECURITY DEFINER (vérification rôle admin), avec ordre FK correct et `statement_timeout = 120s`.
2. **Isolation des données** — Préfixe `TEST-` systématique sur `parcel_number`, `reference_number`, `invoice_number`, `transaction_reference` + `metadata.test_mode = 'true'` sur les paiements.
3. **Filtre transversal** — `applyTestFilter()` appliqué dans tous les hooks user (mutations, expertises, autorisations, lotissements, litiges, recherche).
4. **Génération idempotente** — Garde anti-duplication (vérifie `count > 0` avant génération), bouton « Régénérer » qui nettoie + recrée, suffixe unique par génération.
5. **Génération résiliente** — Étapes non-bloquantes pour les entités secondaires (services, codes CCC, historiques), retry réseau, batch de 50 avec throttle 60ms.
6. **UI/UX claire** — Stepper de progression, dialogues de confirmation pour désactivation/cleanup, bouton « Générer » conditionné à `isTestModeActive && total === 0`.

### Problèmes identifiés

#### 🔴 Critiques

1. **Routes test non protégées par rôle** — `/test/map` est public (pas de `ProtectedRoute`), `/test/cadastral-map` et `/test/mon-compte` ne vérifient que l'authentification, pas le rôle admin. **N'importe quel utilisateur connecté peut accéder à l'environnement test.**
2. **Bug texte dupliqué dans `TestModeGuide.tsx` ligne 9** — Le texte JSX est concaténé sur lui-même (`<>À l'activation… 26 lotissements</>,</>,` apparaît deux fois imbriqué). Cassé visuellement.

#### 🟠 Importants

3. **Incohérence des compteurs déclarés vs réels** :
   - Guide annonce : ~700 autorisations, ~585 hypothèques, ~470 bornages
   - Réel : 351 autorisations, 293 hypothèques, 234 bornages
   - Le `BASE_PARCELS` a été divisé par 2 (de 20 à 10 = 3 510 parcelles, pas 7 020) mais le texte du Guide n'a pas suivi.
4. **`TestDataStatsCard` annonce 19 tables** mais la RPC `count_test_data_stats()` couvre 20 entités et `cleanup_all_test_data()` agit sur ~17 tables réelles. Chiffre à harmoniser.
5. **Auto-cleanup non automatisé** — `auto_cleanup = true` configurable, retention en jours, mais **aucun cron côté serveur**. La doc et le Guide promettent un nettoyage automatique qui n'existe pas (uniquement appel manuel à `cleanup_all_test_data()`).

#### 🟡 Mineurs

6. **`uniqueSuffix()` utilise `Math.random()`** alors que la mémoire projet impose `crypto.randomUUID()` pour les identifiants (constraint mémoire `file-storage-naming-standard-fr`). Faible impact ici (pas de stockage fichier) mais incohérent.
7. **Métadonnée `test_mode` typée incohérente** :
   - `payment_transactions` : `'true'` (string)
   - `generated_certificates` : `true` (boolean)
   - Le cleanup filtre uniquement `'true'` (string) → certificats peuvent ne pas être détectés via metadata si recherche par metadata.
8. **Pas d'indicateur global** dans la nav/header en mode test — bannière unique en bas-droite, peu visible.
9. **Pages user en prod** (`/mon-compte`, `/services`) ne préviennent pas l'utilisateur si la base contient des données test résiduelles ; isolation garantie uniquement par filtre, pas par DB.

### Recommandations priorisées

| # | Action | Fichier(s) |
|---|---|---|
| 1 | Protéger les routes `/test/*` avec `requiredRoles={['admin','super_admin']}` | `src/App.tsx` |
| 2 | Réparer le texte dupliqué du Guide | `src/components/admin/test-mode/TestModeGuide.tsx` ligne 9 |
| 3 | Mettre à jour les chiffres annoncés (3 510 parcelles, valeurs réelles) | `TestModeGuide.tsx` |
| 4 | Harmoniser le nombre de tables (« 19 » → « 20 ») | `TestDataStatsCard.tsx` ligne 165 |
| 5 | Soit implémenter un cron `pg_cron` pour `cleanup_all_test_data()` selon `test_data_retention_days`, soit retirer la promesse « Nettoyage automatique » | DB migration + UI |
| 6 | Uniformiser `metadata.test_mode` en string `'true'` partout | `testDataGenerators.ts` ligne 1143 |
| 7 | Remplacer `Math.random()` dans `uniqueSuffix()` par `crypto.randomUUID().slice(0,5)` | `testDataGenerators.ts` ligne 9 |

### Validation finale
- Mode test actuellement actif avec un jeu de données complet et cohérent.
- Le système fonctionne sur le plan métier (génération, cleanup, isolation analytics).
- Les corrections #1 (sécurité) et #2 (bug visible) devraient être traitées en priorité.
