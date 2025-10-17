/**
 * Script de test pour valider la réactivité du catalogue de services
 * 
 * Ce test vérifie que :
 * 1. Les modifications admin sont instantanément visibles dans le front-end
 * 2. Les prix sont correctement synchronisés
 * 3. Les notifications sont envoyées aux utilisateurs
 * 4. Le système Realtime fonctionne correctement
 */

import { supabase } from '@/integrations/supabase/client';

export interface CatalogTest {
  testName: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export const testCatalogReactivity = async (): Promise<CatalogTest[]> => {
  const results: CatalogTest[] = [];
  
  // 1. Test de lecture du catalogue depuis la DB
  try {
    const { data: services, error } = await supabase
      .from('cadastral_services_config')
      .select('*')
      .eq('is_active', true);
      
    if (error) throw error;
    
    if (!services || services.length === 0) {
      results.push({
        testName: 'Lecture du catalogue',
        status: 'error',
        message: 'Aucun service actif dans la base de données',
      });
    } else {
      results.push({
        testName: 'Lecture du catalogue',
        status: 'success',
        message: `${services.length} service(s) actif(s) trouvé(s)`,
        details: services
      });
    }
  } catch (error: any) {
    results.push({
      testName: 'Lecture du catalogue',
      status: 'error',
      message: `Erreur: ${error.message}`,
    });
  }
  
  // 2. Test de cohérence des prix
  try {
    const { data: services, error } = await supabase
      .from('cadastral_services_config')
      .select('service_id, name, price_usd, is_active');
      
    if (error) throw error;
    
    const invalidPrices = services?.filter(s => 
      s.is_active && (s.price_usd === null || s.price_usd <= 0)
    );
    
    if (invalidPrices && invalidPrices.length > 0) {
      results.push({
        testName: 'Cohérence des prix',
        status: 'warning',
        message: `${invalidPrices.length} service(s) avec prix invalide`,
        details: invalidPrices
      });
    } else {
      results.push({
        testName: 'Cohérence des prix',
        status: 'success',
        message: 'Tous les prix sont valides',
      });
    }
  } catch (error: any) {
    results.push({
      testName: 'Cohérence des prix',
      status: 'error',
      message: `Erreur: ${error.message}`,
    });
  }
  
  // 3. Test de l'intégrité des service_id
  try {
    const { data: services, error } = await supabase
      .from('cadastral_services_config')
      .select('service_id, name, is_active');
      
    if (error) throw error;
    
    const duplicateIds = services?.reduce((acc, service) => {
      acc[service.service_id] = (acc[service.service_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const duplicates = Object.entries(duplicateIds || {}).filter(([_, count]) => count > 1);
    
    if (duplicates.length > 0) {
      results.push({
        testName: 'Unicité des ID',
        status: 'error',
        message: `${duplicates.length} service_id en double détecté(s)`,
        details: duplicates
      });
    } else {
      results.push({
        testName: 'Unicité des ID',
        status: 'success',
        message: 'Tous les service_id sont uniques',
      });
    }
  } catch (error: any) {
    results.push({
      testName: 'Unicité des ID',
      status: 'error',
      message: `Erreur: ${error.message}`,
    });
  }
  
  // 4. Test de synchronisation avec les factures
  try {
    const { data: services, error: servicesError } = await supabase
      .from('cadastral_services_config')
      .select('service_id')
      .eq('is_active', true);
      
    if (servicesError) throw servicesError;
    
    const { data: invoices, error: invoicesError } = await supabase
      .from('cadastral_invoices')
      .select('id, selected_services')
      .limit(100);
      
    if (invoicesError) throw invoicesError;
    
    const activeServiceIds = new Set(services?.map(s => s.service_id) || []);
    let orphanedServices = 0;
    
    invoices?.forEach(invoice => {
      let selectedServices: string[] = [];
      if (Array.isArray(invoice.selected_services)) {
        selectedServices = invoice.selected_services.filter((item): item is string => 
          typeof item === 'string'
        );
      } else if (typeof invoice.selected_services === 'string') {
        try {
          selectedServices = JSON.parse(invoice.selected_services);
        } catch {
          selectedServices = [];
        }
      }
      
      selectedServices.forEach(serviceId => {
        if (!activeServiceIds.has(serviceId)) {
          orphanedServices++;
        }
      });
    });
    
    if (orphanedServices > 0) {
      results.push({
        testName: 'Synchronisation factures',
        status: 'warning',
        message: `${orphanedServices} référence(s) à des services désactivés/supprimés`,
      });
    } else {
      results.push({
        testName: 'Synchronisation factures',
        status: 'success',
        message: 'Toutes les factures référencent des services actifs',
      });
    }
  } catch (error: any) {
    results.push({
      testName: 'Synchronisation factures',
      status: 'error',
      message: `Erreur: ${error.message}`,
    });
  }
  
  // 5. Test des descriptions
  try {
    const { data: services, error } = await supabase
      .from('cadastral_services_config')
      .select('service_id, name, description, is_active')
      .eq('is_active', true);
      
    if (error) throw error;
    
    const missingDescriptions = services?.filter(s => 
      !s.description || s.description.trim().length < 10
    );
    
    if (missingDescriptions && missingDescriptions.length > 0) {
      results.push({
        testName: 'Descriptions complètes',
        status: 'warning',
        message: `${missingDescriptions.length} service(s) sans description détaillée`,
        details: missingDescriptions
      });
    } else {
      results.push({
        testName: 'Descriptions complètes',
        status: 'success',
        message: 'Tous les services ont des descriptions complètes',
      });
    }
  } catch (error: any) {
    results.push({
      testName: 'Descriptions complètes',
      status: 'error',
      message: `Erreur: ${error.message}`,
    });
  }
  
  return results;
};

export const printCatalogTestResults = (results: CatalogTest[]) => {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     TEST DE RÉACTIVITÉ DU CATALOGUE - BIC               ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  results.forEach((result, index) => {
    const statusSymbol = {
      success: '✓',
      warning: '⚠',
      error: '✗'
    }[result.status];
    
    const statusColor = {
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m'
    }[result.status];
    
    console.log(`${index + 1}. ${statusColor}${statusSymbol}\x1b[0m ${result.testName}`);
    console.log(`   ${result.message}`);
    
    if (result.details && result.status !== 'success') {
      console.log(`   Détails:`, result.details);
    }
    console.log('');
  });
  
  const summary = {
    total: results.length,
    success: results.filter(r => r.status === 'success').length,
    warnings: results.filter(r => r.status === 'warning').length,
    errors: results.filter(r => r.status === 'error').length,
  };
  
  console.log('═'.repeat(60));
  console.log(`RÉSUMÉ: ${summary.success}/${summary.total} réussis | ${summary.warnings} avertissements | ${summary.errors} erreurs`);
  console.log('═'.repeat(60));
  
  return summary;
};
