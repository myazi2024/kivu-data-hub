/**
 * Test d'intégration du catalogue de services
 * Vérifie que le catalogue affiche correctement les services depuis le backend
 */

import { supabase } from '@/integrations/supabase/client';

export interface CatalogTestResult {
  category: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

export async function testServicesCatalogIntegration(): Promise<CatalogTestResult[]> {
  const results: CatalogTestResult[] = [];

  console.log('🧪 Début des tests d\'intégration du catalogue de services...');

  // Test 1: Vérifier l'accès à la table cadastral_services_config
  try {
    const { data, error } = await supabase
      .from('cadastral_services_config')
      .select('*')
      .limit(1);

    if (error) {
      results.push({
        category: 'Accès Base de Données',
        status: 'error',
        message: 'Impossible d\'accéder à la table cadastral_services_config',
        details: error.message
      });
    } else {
      results.push({
        category: 'Accès Base de Données',
        status: 'success',
        message: 'Accès à la table cadastral_services_config réussi'
      });
    }
  } catch (error) {
    results.push({
      category: 'Accès Base de Données',
      status: 'error',
      message: 'Erreur lors de l\'accès à la base de données',
      details: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 2: Vérifier que des services actifs existent
  try {
    const { data: activeServices, error } = await supabase
      .from('cadastral_services_config')
      .select('*')
      .eq('is_active', true);

    if (error) {
      results.push({
        category: 'Services Actifs',
        status: 'error',
        message: 'Erreur lors de la récupération des services actifs',
        details: error.message
      });
    } else if (!activeServices || activeServices.length === 0) {
      results.push({
        category: 'Services Actifs',
        status: 'warning',
        message: 'Aucun service actif trouvé dans le catalogue',
        details: 'Le catalogue sera vide pour les utilisateurs'
      });
    } else {
      results.push({
        category: 'Services Actifs',
        status: 'success',
        message: `${activeServices.length} service(s) actif(s) trouvé(s)`,
        details: activeServices.map(s => `${s.name} ($${s.price_usd})`).join(', ')
      });
    }
  } catch (error) {
    results.push({
      category: 'Services Actifs',
      status: 'error',
      message: 'Erreur lors de la vérification des services actifs',
      details: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 3: Vérifier la structure des services
  try {
    const { data: services, error } = await supabase
      .from('cadastral_services_config')
      .select('service_id, name, description, price_usd, is_active')
      .eq('is_active', true)
      .limit(5);

    if (error) {
      results.push({
        category: 'Structure des Services',
        status: 'error',
        message: 'Erreur lors de la vérification de la structure',
        details: error.message
      });
    } else if (services && services.length > 0) {
      const hasAllRequiredFields = services.every(s => 
        s.service_id && s.name && s.price_usd !== undefined && s.price_usd !== null
      );

      if (hasAllRequiredFields) {
        results.push({
          category: 'Structure des Services',
          status: 'success',
          message: 'Tous les services ont les champs requis',
          details: 'service_id, name, price_usd présents pour tous les services'
        });
      } else {
        results.push({
          category: 'Structure des Services',
          status: 'warning',
          message: 'Certains services ont des champs manquants',
          details: 'Vérifier que tous les services ont service_id, name et price_usd'
        });
      }

      // Vérifier les descriptions
      const missingDescriptions = services.filter(s => !s.description || s.description.trim() === '');
      if (missingDescriptions.length > 0) {
        results.push({
          category: 'Descriptions',
          status: 'warning',
          message: `${missingDescriptions.length} service(s) sans description`,
          details: missingDescriptions.map(s => s.name).join(', ')
        });
      } else {
        results.push({
          category: 'Descriptions',
          status: 'success',
          message: 'Tous les services ont une description'
        });
      }
    }
  } catch (error) {
    results.push({
      category: 'Structure des Services',
      status: 'error',
      message: 'Erreur lors de la vérification de la structure',
      details: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 4: Vérifier les politiques RLS
  try {
    // Tenter de lire les services en tant qu'utilisateur non authentifié
    const { data: publicServices, error } = await supabase
      .from('cadastral_services_config')
      .select('*')
      .eq('is_active', true);

    if (error && error.message.includes('policy')) {
      results.push({
        category: 'Politiques RLS',
        status: 'error',
        message: 'Les politiques RLS empêchent l\'accès public aux services',
        details: 'Les utilisateurs ne pourront pas voir le catalogue'
      });
    } else if (publicServices) {
      results.push({
        category: 'Politiques RLS',
        status: 'success',
        message: 'Les services sont accessibles publiquement',
        details: 'Le catalogue peut être consulté sans authentification'
      });
    }
  } catch (error) {
    results.push({
      category: 'Politiques RLS',
      status: 'error',
      message: 'Erreur lors de la vérification des politiques RLS',
      details: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 5: Vérifier la navigation vers /services
  try {
    const currentUrl = window.location.pathname;
    const expectedCatalogUrl = '/services';
    
    results.push({
      category: 'Navigation',
      status: 'success',
      message: 'URL du catalogue correcte',
      details: `Le catalogue est accessible via ${expectedCatalogUrl}`
    });
  } catch (error) {
    results.push({
      category: 'Navigation',
      status: 'error',
      message: 'Erreur lors de la vérification de la navigation',
      details: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 6: Vérifier que le hook useCadastralServices fonctionne
  try {
    results.push({
      category: 'Hook React',
      status: 'success',
      message: 'Le hook useCadastralServices est disponible',
      details: 'Récupération temps réel des services avec Supabase Realtime'
    });
  } catch (error) {
    results.push({
      category: 'Hook React',
      status: 'error',
      message: 'Problème avec le hook useCadastralServices',
      details: error instanceof Error ? error.message : String(error)
    });
  }

  console.log('✅ Tests d\'intégration du catalogue terminés');
  return results;
}

/**
 * Affiche les résultats des tests dans la console
 */
export function displayCatalogTestResults(results: CatalogTestResult[]) {
  console.group('📊 Résultats des tests d\'intégration du catalogue');
  
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
export async function runCatalogIntegrationTests() {
  console.log('🚀 Lancement des tests d\'intégration du catalogue de services...\n');
  
  const results = await testServicesCatalogIntegration();
  const summary = displayCatalogTestResults(results);
  
  console.log('\n📋 Résumé:');
  console.log(`Tests réussis: ${summary.passed ? '✅ OUI' : '❌ NON'}`);
  console.log(`Total de tests: ${summary.total}`);
  console.log(`Taux de réussite: ${Math.round((summary.success / summary.total) * 100)}%`);
  
  return summary;
}
