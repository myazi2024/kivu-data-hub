# Guide des Tests d'Intégration Cadastrale

## 📋 Vue d'ensemble

Ce document décrit les tests de validation mis en place pour l'intégration cadastrale, couvrant à la fois le front-end et le back-end.

## 🎯 Objectifs des Tests

1. ✅ Vérifier la connexion Supabase
2. ✅ Valider la récupération des données cadastrales
3. ✅ Tester la recherche par numéro de parcelle
4. ✅ Vérifier l'intégrité des coordonnées GPS
5. ✅ Valider la structure des données
6. ✅ Tester les URLs de redirection
7. ✅ Vérifier le LocalStorage (panier)
8. ✅ Tester la configuration de recherche

## 🚀 Utilisation

### Option 1: Interface Web

Accédez à la page de test: **`/test-cadastral`**

1. Entrez un numéro de parcelle (optionnel)
2. Cliquez sur "Lancer les tests"
3. Consultez les résultats détaillés

### Option 2: Console du Navigateur

Ouvrez la console (F12) et utilisez les commandes suivantes:

```javascript
// Afficher l'aide
window.cadastralTests.help()

// Exécuter tous les tests
window.cadastralTests.runFullTest('GOM/NOR/ZLE/065')

// Tester uniquement la connexion
window.cadastralTests.testConnection()

// Tester la recherche d'une parcelle
window.cadastralTests.testSearch('GOM/NOR/ZLE/065')
```

## 📊 Tests Inclus

### Tests Back-end

| Test | Description | Critères de Succès |
|------|-------------|-------------------|
| **Connexion Supabase** | Vérifie la connexion à la base de données | Connexion établie sans erreur |
| **Récupération Parcelles** | Teste la lecture des parcelles | Au moins 1 parcelle récupérée |
| **Configuration Recherche** | Vérifie les configs actives | Configs présentes et valides |
| **Recherche Parcelle** | Cherche une parcelle spécifique | Parcelle trouvée avec données |
| **Validation GPS** | Vérifie les coordonnées GPS | Min. 3 coords avec lat/lng |
| **Structure Données** | Valide les champs requis | Tous les champs obligatoires présents |

### Tests Front-end

| Test | Description | Critères de Succès |
|------|-------------|-------------------|
| **URL Redirection** | Vérifie le format des URLs | Format `/services?parcel=XXX` correct |
| **LocalStorage** | Teste le stockage local | Lecture/écriture fonctionnelle |

## 🎨 Interprétation des Résultats

### Statuts

- ✅ **Succès** (Vert): Le test est passé sans problème
- ⚠️ **Avertissement** (Jaune): Le test a réussi mais avec des remarques
- ❌ **Erreur** (Rouge): Le test a échoué

### Score de Santé

Le score de santé est calculé comme suit:
```
Score = (Nombre de succès / Total des tests) × 100%
```

- **90-100%**: Excellent ✨
- **75-89%**: Bon, quelques améliorations possibles
- **60-74%**: Moyen, corrections recommandées
- **<60%**: Nécessite attention immédiate

## 🔧 Dépannage

### Erreur de Connexion Supabase

```
❌ Connexion Supabase: Échec de connexion
```

**Solutions:**
1. Vérifier les variables d'environnement
2. Vérifier la connexion internet
3. Vérifier les credentials Supabase

### Aucune Parcelle Trouvée

```
⚠️ Récupération des parcelles: Aucune parcelle trouvée
```

**Solutions:**
1. Vérifier que la table `cadastral_parcels` contient des données
2. Vérifier les permissions RLS
3. Vérifier la structure de la table

### Coordonnées GPS Invalides

```
⚠️ Validation GPS: Nombre insuffisant de coordonnées
```

**Solutions:**
1. Vérifier que chaque parcelle a au moins 3 coordonnées GPS
2. Vérifier le format des coordonnées (lat, lng)
3. Vérifier la saisie des données

## 📝 Exemple de Résultat

```
════════════════════════════════════════════════════════════
📋 RÉSULTATS DES TESTS
════════════════════════════════════════════════════════════

✅ Test 1: Connexion Supabase
   Status: SUCCESS
   Message: Connexion à Supabase établie avec succès

✅ Test 2: Récupération des parcelles
   Status: SUCCESS
   Message: 5 parcelle(s) récupérée(s) avec succès

✅ Test 3: Configuration de recherche
   Status: SUCCESS
   Message: 12 configuration(s) active(s)

✅ Test 4: Recherche de parcelle
   Status: SUCCESS
   Message: Parcelle GOM/NOR/ZLE/065 trouvée avec succès

✅ Test 5: Validation GPS
   Status: SUCCESS
   Message: 4 coordonnées GPS valides

✅ Test 6: Structure de données
   Status: SUCCESS
   Message: Tous les champs requis sont présents

✅ Test 7: URL de redirection
   Status: SUCCESS
   Message: Format d'URL correct

✅ Test 8: LocalStorage (Panier)
   Status: SUCCESS
   Message: LocalStorage fonctionne correctement

════════════════════════════════════════════════════════════
✅ Succès: 8
⚠️  Avertissements: 0
❌ Erreurs: 0
📊 Total: 8 tests
════════════════════════════════════════════════════════════

🎯 Score de santé: 100.0%
🎉 Tous les tests sont passés avec succès!
```

## 🔄 Automatisation

Les tests peuvent être intégrés dans un pipeline CI/CD en utilisant:

```bash
# Dans package.json
"scripts": {
  "test:cadastral": "node -e \"require('./src/utils/testCadastralIntegration').cadastralTests.runAllTests()\""
}
```

## 📞 Support

Si des problèmes persistent après avoir suivi ce guide:

1. Vérifier les logs de la console
2. Consulter la documentation Supabase
3. Contacter l'équipe de développement
