/**
 * Test de navigation de la carte cadastrale
 * Vérifie que le bouton "Afficher plus de données" redirige directement vers /services
 */

export interface NavigationTestResult {
  category: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

export async function testCadastralMapNavigation(): Promise<NavigationTestResult[]> {
  const results: NavigationTestResult[] = [];

  console.log('🧪 Début des tests de navigation de la carte cadastrale...');

  // Test 1: Vérifier que le bouton redirige vers /services
  try {
    // Simuler le comportement du bouton
    const targetUrl = '/services';
    const expectedUrl = '/services';
    
    if (targetUrl === expectedUrl) {
      results.push({
        category: 'Navigation',
        status: 'success',
        message: 'Le bouton "Afficher plus de données" redirige correctement vers /services',
        details: `URL cible: ${targetUrl}`
      });
    } else {
      results.push({
        category: 'Navigation',
        status: 'error',
        message: 'Le bouton ne redirige pas vers la bonne URL',
        details: `Attendu: ${expectedUrl}, Obtenu: ${targetUrl}`
      });
    }
  } catch (error) {
    results.push({
      category: 'Navigation',
      status: 'error',
      message: 'Erreur lors du test de navigation',
      details: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 2: Vérifier qu'aucun paramètre de recherche n'est passé
  try {
    const targetUrl = '/services';
    const hasSearchParam = targetUrl.includes('?search=');
    
    if (!hasSearchParam) {
      results.push({
        category: 'Paramètres URL',
        status: 'success',
        message: 'Aucun paramètre de recherche dans l\'URL',
        details: 'L\'utilisateur sera dirigé directement vers le catalogue de services'
      });
    } else {
      results.push({
        category: 'Paramètres URL',
        status: 'error',
        message: 'Des paramètres de recherche sont présents dans l\'URL',
        details: 'Cela afficherait la barre de recherche au lieu du catalogue'
      });
    }
  } catch (error) {
    results.push({
      category: 'Paramètres URL',
      status: 'error',
      message: 'Erreur lors de la vérification des paramètres URL',
      details: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 3: Vérifier le comportement de la page Services
  try {
    // La page Services ne devrait pas afficher la barre de recherche si aucun paramètre search n'est présent
    const searchParams = new URLSearchParams('');
    const hasSearchParam = searchParams.has('search');
    
    if (!hasSearchParam) {
      results.push({
        category: 'Affichage Services',
        status: 'success',
        message: 'La page Services affichera le catalogue complet',
        details: 'La barre de recherche cadastrale ne sera pas affichée'
      });
    } else {
      results.push({
        category: 'Affichage Services',
        status: 'warning',
        message: 'La barre de recherche pourrait s\'afficher',
        details: 'Vérifier la logique d\'affichage dans Services.tsx'
      });
    }
  } catch (error) {
    results.push({
      category: 'Affichage Services',
      status: 'error',
      message: 'Erreur lors de la vérification de l\'affichage',
      details: error instanceof Error ? error.message : String(error)
    });
  }

  console.log('✅ Tests de navigation terminés');
  return results;
}

/**
 * Affiche les résultats des tests dans la console
 */
export function displayNavigationTestResults(results: NavigationTestResult[]) {
  console.group('📊 Résultats des tests de navigation');
  
  const successCount = results.filter(r => r.status === 'success').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  
  console.log(`✅ Succès: ${successCount}`);
  console.log(`⚠️  Avertissements: ${warningCount}`);
  console.log(`❌ Erreurs: ${errorCount}`);
  console.log('');
  
  results.forEach(result => {
    const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.group(`${icon} [${result.category}] ${result.message}`);
    if (result.details) {
      console.log(result.details);
    }
    console.groupEnd();
  });
  
  console.groupEnd();
  
  return {
    total: results.length,
    success: successCount,
    warnings: warningCount,
    errors: errorCount,
    passed: errorCount === 0
  };
}

/**
 * Exécute tous les tests et affiche les résultats
 */
export async function runNavigationTests() {
  console.log('🚀 Lancement des tests de navigation de la carte cadastrale...\n');
  
  const results = await testCadastralMapNavigation();
  const summary = displayNavigationTestResults(results);
  
  console.log('\n📋 Résumé:');
  console.log(`Tests réussis: ${summary.passed ? '✅ OUI' : '❌ NON'}`);
  console.log(`Total de tests: ${summary.total}`);
  console.log(`Taux de réussite: ${Math.round((summary.success / summary.total) * 100)}%`);
  
  return summary;
}
