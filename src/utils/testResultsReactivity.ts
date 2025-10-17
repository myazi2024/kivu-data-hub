/**
 * Script de validation de la réactivité des résultats cadastraux
 * Vérifie la cohérence entre les configurations admin et l'affichage frontend
 */

import { supabase } from '@/integrations/supabase/client';

export interface ResultsValidationResult {
  test: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export const validateResultsReactivity = async (): Promise<ResultsValidationResult[]> => {
  const results: ResultsValidationResult[] = [];

  // 1. Validation de l'existence de la table de configuration
  try {
    const { data: configs, error } = await supabase
      .from('cadastral_results_config')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    if (!configs || configs.length === 0) {
      results.push({
        test: 'Configuration des résultats',
        status: 'error',
        message: 'Aucune configuration active trouvée',
      });
    } else {
      results.push({
        test: 'Configuration des résultats',
        status: 'success',
        message: `${configs.length} configuration(s) active(s) trouvée(s)`,
        details: { configs: configs.map(c => c.config_key) }
      });
    }
  } catch (error: any) {
    results.push({
      test: 'Configuration des résultats',
      status: 'error',
      message: `Erreur: ${error.message}`,
    });
  }

  // 2. Validation de la structure des modules
  try {
    const { data: modulesConfig, error } = await supabase
      .from('cadastral_results_config')
      .select('config_value')
      .eq('config_key', 'modules_info')
      .eq('is_active', true)
      .single();

    if (error) throw error;

    const modules = modulesConfig.config_value as any;
    const requiredModules = ['information', 'location_history', 'history', 'obligations'];
    const missingModules = requiredModules.filter(m => !modules[m]);

    if (missingModules.length > 0) {
      results.push({
        test: 'Structure des modules',
        status: 'error',
        message: `Modules manquants: ${missingModules.join(', ')}`,
        details: { missingModules }
      });
    } else {
      // Vérifier que chaque module a les propriétés requises
      let allValid = true;
      const invalidModules: string[] = [];

      requiredModules.forEach(moduleKey => {
        const module = modules[moduleKey];
        if (!module.title || !module.description || !module.icon) {
          allValid = false;
          invalidModules.push(moduleKey);
        }
      });

      if (!allValid) {
        results.push({
          test: 'Structure des modules',
          status: 'warning',
          message: `Modules avec structure incomplète: ${invalidModules.join(', ')}`,
          details: { invalidModules }
        });
      } else {
        results.push({
          test: 'Structure des modules',
          status: 'success',
          message: 'Tous les modules ont une structure valide',
          details: { modules: Object.keys(modules) }
        });
      }
    }
  } catch (error: any) {
    results.push({
      test: 'Structure des modules',
      status: 'error',
      message: `Erreur: ${error.message}`,
    });
  }

  // 3. Validation des paramètres d'affichage
  try {
    const { data: displayConfig, error } = await supabase
      .from('cadastral_results_config')
      .select('config_value')
      .eq('config_key', 'display_settings')
      .eq('is_active', true)
      .single();

    if (error) throw error;

    const settings = displayConfig.config_value as any;
    const requiredSettings = ['show_map', 'map_zoom_level', 'show_statistics', 'enable_pdf_download'];
    const missingSettings = requiredSettings.filter(s => settings[s] === undefined);

    if (missingSettings.length > 0) {
      results.push({
        test: 'Paramètres d\'affichage',
        status: 'warning',
        message: `Paramètres manquants: ${missingSettings.join(', ')}`,
        details: { missingSettings }
      });
    } else {
      // Valider les valeurs
      const issues: string[] = [];
      
      if (typeof settings.map_zoom_level !== 'number' || settings.map_zoom_level < 1 || settings.map_zoom_level > 20) {
        issues.push('Niveau de zoom invalide (doit être entre 1 et 20)');
      }

      if (issues.length > 0) {
        results.push({
          test: 'Paramètres d\'affichage',
          status: 'warning',
          message: issues.join(', '),
          details: { issues }
        });
      } else {
        results.push({
          test: 'Paramètres d\'affichage',
          status: 'success',
          message: 'Tous les paramètres sont valides',
          details: { settings }
        });
      }
    }
  } catch (error: any) {
    results.push({
      test: 'Paramètres d\'affichage',
      status: 'error',
      message: `Erreur: ${error.message}`,
    });
  }

  // 4. Validation de la configuration des statistiques
  try {
    const { data: statsConfig, error } = await supabase
      .from('cadastral_results_config')
      .select('config_value')
      .eq('config_key', 'statistics_config')
      .eq('is_active', true)
      .single();

    if (error) throw error;

    const stats = statsConfig.config_value as any;
    const issues: string[] = [];

    if (!stats.currency || stats.currency.length !== 3) {
      issues.push('Devise invalide (doit être un code à 3 lettres)');
    }

    if (!stats.area_unit || stats.area_unit.length === 0) {
      issues.push('Unité de superficie manquante');
    }

    if (issues.length > 0) {
      results.push({
        test: 'Configuration des statistiques',
        status: 'warning',
        message: issues.join(', '),
        details: { issues, stats }
      });
    } else {
      results.push({
        test: 'Configuration des statistiques',
        status: 'success',
        message: 'Configuration des statistiques valide',
        details: { stats }
      });
    }
  } catch (error: any) {
    results.push({
      test: 'Configuration des statistiques',
      status: 'error',
      message: `Erreur: ${error.message}`,
    });
  }

  // 5. Validation des textes d'aide
  try {
    const { data: helpConfig, error } = await supabase
      .from('cadastral_results_config')
      .select('config_value')
      .eq('config_key', 'help_texts')
      .eq('is_active', true)
      .single();

    if (error) throw error;

    const helpTexts = helpConfig.config_value as any;
    const requiredHelp = ['property_title', 'area_calculation', 'tax_status', 'gps_coordinates'];
    const missingHelp = requiredHelp.filter(h => !helpTexts[h] || helpTexts[h].length < 10);

    if (missingHelp.length > 0) {
      results.push({
        test: 'Textes d\'aide',
        status: 'warning',
        message: `Textes d'aide manquants ou trop courts: ${missingHelp.join(', ')}`,
        details: { missingHelp }
      });
    } else {
      results.push({
        test: 'Textes d\'aide',
        status: 'success',
        message: 'Tous les textes d\'aide sont définis',
        details: { helpTexts: Object.keys(helpTexts) }
      });
    }
  } catch (error: any) {
    results.push({
      test: 'Textes d\'aide',
      status: 'error',
      message: `Erreur: ${error.message}`,
    });
  }

  // 6. Test de réactivité - vérifier que updated_at est récent pour au moins une config
  try {
    const { data: recentUpdates, error } = await supabase
      .from('cadastral_results_config')
      .select('config_key, updated_at')
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .eq('is_active', true);

    if (error) throw error;

    if (!recentUpdates || recentUpdates.length === 0) {
      results.push({
        test: 'Réactivité du système',
        status: 'warning',
        message: 'Aucune mise à jour récente (< 24h) détectée',
        details: { message: 'Les configurations n\'ont pas été modifiées récemment' }
      });
    } else {
      results.push({
        test: 'Réactivité du système',
        status: 'success',
        message: `${recentUpdates.length} configuration(s) mise(s) à jour récemment`,
        details: { recentUpdates }
      });
    }
  } catch (error: any) {
    results.push({
      test: 'Réactivité du système',
      status: 'error',
      message: `Erreur: ${error.message}`,
    });
  }

  // 7. Vérifier la cohérence avec les données cadastrales réelles
  try {
    const { data: sampleParcel, error } = await supabase
      .from('cadastral_parcels')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (sampleParcel) {
      const { data: modulesConfig } = await supabase
        .from('cadastral_results_config')
        .select('config_value')
        .eq('config_key', 'modules_info')
        .single();

      if (modulesConfig) {
        const modules = modulesConfig.config_value as any;
        const infoModule = modules.information;
        
        // Vérifier que les champs configurés existent dans les données
        const missingFields: string[] = [];
        
        if (infoModule.fields.property_title?.enabled && !sampleParcel.property_title_type) {
          missingFields.push('property_title_type');
        }
        if (infoModule.fields.area?.enabled && !sampleParcel.area_sqm) {
          missingFields.push('area_sqm');
        }
        if (infoModule.fields.owner?.enabled && !sampleParcel.current_owner_name) {
          missingFields.push('current_owner_name');
        }

        if (missingFields.length > 0) {
          results.push({
            test: 'Cohérence avec les données',
            status: 'warning',
            message: `Champs configurés mais données manquantes dans l'échantillon: ${missingFields.join(', ')}`,
            details: { missingFields }
          });
        } else {
          results.push({
            test: 'Cohérence avec les données',
            status: 'success',
            message: 'Configuration cohérente avec les données cadastrales',
          });
        }
      }
    } else {
      results.push({
        test: 'Cohérence avec les données',
        status: 'warning',
        message: 'Aucune donnée cadastrale pour vérifier la cohérence',
      });
    }
  } catch (error: any) {
    results.push({
      test: 'Cohérence avec les données',
      status: 'error',
      message: `Erreur: ${error.message}`,
    });
  }

  return results;
};

export const printResultsValidation = (results: ResultsValidationResult[]) => {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   VALIDATION RÉACTIVITÉ RÉSULTATS CADASTRAUX - BIC       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

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

    console.log(`${index + 1}. ${statusColor}${statusSymbol}\x1b[0m ${result.test}`);
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
  console.log(`RÉSUMÉ: ${summary.success}/${summary.total} validés | ${summary.warnings} avertissements | ${summary.errors} erreurs`);
  console.log('═'.repeat(60));

  return summary;
};
