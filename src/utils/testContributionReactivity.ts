import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  indicator: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export const testContributionReactivity = async (): Promise<ValidationResult[]> => {
  const results: ValidationResult[] = [];
  
  console.log('🔍 Début du test de réactivité du formulaire de contribution CCC...');

  // Test 1: Vérifier la présence de la table de configuration
  try {
    const { data: configTable, error: configError } = await supabase
      .from('cadastral_contribution_config')
      .select('*')
      .limit(1);

    if (configError) {
      results.push({
        indicator: 'Configuration Table',
        status: 'error',
        message: 'Table cadastral_contribution_config introuvable ou inaccessible',
        details: configError
      });
    } else {
      results.push({
        indicator: 'Configuration Table',
        status: 'success',
        message: 'Table cadastral_contribution_config présente et accessible'
      });
    }
  } catch (error) {
    results.push({
      indicator: 'Configuration Table',
      status: 'error',
      message: 'Erreur lors de la vérification de la table',
      details: error
    });
  }

  // Test 2: Vérifier la présence des configurations par défaut
  try {
    const requiredConfigs = [
      'form_sections',
      'required_fields',
      'field_labels',
      'help_texts',
      'validation_rules',
      'ccc_calculation'
    ];

    const { data: configs, error } = await supabase
      .from('cadastral_contribution_config')
      .select('config_key, is_active')
      .in('config_key', requiredConfigs);

    if (error) throw error;

    const foundKeys = configs?.map(c => c.config_key) || [];
    const missingKeys = requiredConfigs.filter(k => !foundKeys.includes(k));

    if (missingKeys.length > 0) {
      results.push({
        indicator: 'Default Configurations',
        status: 'warning',
        message: `Configurations manquantes: ${missingKeys.join(', ')}`,
        details: { missing: missingKeys, found: foundKeys }
      });
    } else {
      results.push({
        indicator: 'Default Configurations',
        status: 'success',
        message: 'Toutes les configurations par défaut sont présentes'
      });
    }

    // Vérifier que toutes les configs sont actives
    const inactiveConfigs = configs?.filter(c => !c.is_active) || [];
    if (inactiveConfigs.length > 0) {
      results.push({
        indicator: 'Active Configurations',
        status: 'warning',
        message: `Configurations inactives: ${inactiveConfigs.map(c => c.config_key).join(', ')}`
      });
    } else {
      results.push({
        indicator: 'Active Configurations',
        status: 'success',
        message: 'Toutes les configurations sont actives'
      });
    }
  } catch (error) {
    results.push({
      indicator: 'Default Configurations',
      status: 'error',
      message: 'Erreur lors de la vérification des configurations',
      details: error
    });
  }

  // Test 3: Vérifier la structure JSON des configurations
  try {
    const { data: formSections } = await supabase
      .from('cadastral_contribution_config')
      .select('config_value')
      .eq('config_key', 'form_sections')
      .single();

    if (formSections?.config_value) {
      const sections = formSections.config_value;
      const requiredSections = [
        'general_info',
        'building_permits',
        'location',
        'gps_coordinates',
        'ownership_history',
        'obligations',
        'attachments'
      ];

      const missingSections = requiredSections.filter(s => !sections[s]);

      if (missingSections.length > 0) {
        results.push({
          indicator: 'Form Sections Structure',
          status: 'warning',
          message: `Sections manquantes: ${missingSections.join(', ')}`,
          details: { sections: Object.keys(sections) }
        });
      } else {
        results.push({
          indicator: 'Form Sections Structure',
          status: 'success',
          message: 'Toutes les sections du formulaire sont configurées'
        });
      }
    }
  } catch (error) {
    results.push({
      indicator: 'Form Sections Structure',
      status: 'error',
      message: 'Erreur lors de la vérification de la structure des sections',
      details: error
    });
  }

  // Test 4: Vérifier la cohérence des champs obligatoires
  try {
    const { data: requiredFields } = await supabase
      .from('cadastral_contribution_config')
      .select('config_value')
      .eq('config_key', 'required_fields')
      .single();

    const { data: fieldLabels } = await supabase
      .from('cadastral_contribution_config')
      .select('config_value')
      .eq('config_key', 'field_labels')
      .single();

    if (requiredFields?.config_value && fieldLabels?.config_value) {
      const required = Object.keys(requiredFields.config_value);
      const labels = Object.keys(fieldLabels.config_value);
      
      const missingLabels = required.filter(f => !labels.includes(f));

      if (missingLabels.length > 0) {
        results.push({
          indicator: 'Field Labels Consistency',
          status: 'warning',
          message: `Labels manquants pour les champs: ${missingLabels.join(', ')}`,
          details: { requiredFields: required, labels }
        });
      } else {
        results.push({
          indicator: 'Field Labels Consistency',
          status: 'success',
          message: 'Tous les champs obligatoires ont des labels'
        });
      }
    }
  } catch (error) {
    results.push({
      indicator: 'Field Labels Consistency',
      status: 'error',
      message: 'Erreur lors de la vérification de la cohérence des labels',
      details: error
    });
  }

  // Test 5: Vérifier la cohérence avec la table cadastral_contributions
  try {
    const { data: contributions, error } = await supabase
      .from('cadastral_contributions')
      .select('*')
      .limit(1);

    if (error) throw error;

    if (contributions && contributions.length > 0) {
      const contribution = contributions[0];
      const { data: fieldLabels } = await supabase
        .from('cadastral_contribution_config')
        .select('config_value')
        .eq('config_key', 'field_labels')
        .single();

      if (fieldLabels?.config_value) {
        const configuredFields = Object.keys(fieldLabels.config_value);
        const actualFields = Object.keys(contribution);
        
        // Vérifier que les champs configurés existent dans la table
        const missingFields = configuredFields.filter(f => !actualFields.includes(f));

        if (missingFields.length > 0) {
          results.push({
            indicator: 'Database Schema Consistency',
            status: 'warning',
            message: `Champs configurés mais absents de la table: ${missingFields.join(', ')}`,
            details: { configured: configuredFields, actual: actualFields }
          });
        } else {
          results.push({
            indicator: 'Database Schema Consistency',
            status: 'success',
            message: 'La configuration est cohérente avec le schéma de la base'
          });
        }
      }
    } else {
      results.push({
        indicator: 'Database Schema Consistency',
        status: 'warning',
        message: 'Aucune contribution existante pour vérifier la cohérence',
        details: 'Créez au moins une contribution pour valider la cohérence'
      });
    }
  } catch (error) {
    results.push({
      indicator: 'Database Schema Consistency',
      status: 'warning',
      message: 'Impossible de vérifier la cohérence avec les contributions',
      details: error
    });
  }

  // Test 6: Vérifier les règles de validation
  try {
    const { data: validationRules } = await supabase
      .from('cadastral_contribution_config')
      .select('config_value')
      .eq('config_key', 'validation_rules')
      .single();

    if (validationRules?.config_value) {
      const rules = validationRules.config_value as any;
      
      // Vérifier la cohérence des règles
      if (rules.min_area_sqm >= rules.max_area_sqm) {
        results.push({
          indicator: 'Validation Rules',
          status: 'error',
          message: 'Superficie min >= Superficie max (incohérent)',
          details: rules
        });
      } else if (rules.min_gps_points < 3) {
        results.push({
          indicator: 'Validation Rules',
          status: 'warning',
          message: 'Minimum de points GPS < 3 (peut causer des problèmes de calcul)',
          details: rules
        });
      } else {
        results.push({
          indicator: 'Validation Rules',
          status: 'success',
          message: 'Règles de validation cohérentes'
        });
      }
    }
  } catch (error) {
    results.push({
      indicator: 'Validation Rules',
      status: 'error',
      message: 'Erreur lors de la vérification des règles de validation',
      details: error
    });
  }

  // Test 7: Vérifier la configuration de calcul CCC
  try {
    const { data: cccCalc } = await supabase
      .from('cadastral_contribution_config')
      .select('config_value')
      .eq('config_key', 'ccc_calculation')
      .single();

    if (cccCalc?.config_value) {
      const calc = cccCalc.config_value as any;
      
      if (calc.min_value > calc.base_value) {
        results.push({
          indicator: 'CCC Calculation',
          status: 'error',
          message: 'Valeur min > Valeur de base (incohérent)',
          details: calc
        });
      } else if (calc.base_value <= 0 || calc.min_value <= 0) {
        results.push({
          indicator: 'CCC Calculation',
          status: 'error',
          message: 'Valeurs de calcul CCC invalides (≤ 0)',
          details: calc
        });
      } else {
        results.push({
          indicator: 'CCC Calculation',
          status: 'success',
          message: 'Configuration de calcul CCC valide'
        });
      }
    }
  } catch (error) {
    results.push({
      indicator: 'CCC Calculation',
      status: 'error',
      message: 'Erreur lors de la vérification du calcul CCC',
      details: error
    });
  }

  // Test 8: Tester la réactivité en temps réel (simulation)
  try {
    // Créer un canal de test
    const testChannel = supabase
      .channel('test-contribution-config')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cadastral_contribution_config'
        },
        () => {
          // Callback réactif
        }
      );

    await testChannel.subscribe();

    results.push({
      indicator: 'Realtime Reactivity',
      status: 'success',
      message: 'Canal temps réel créé avec succès'
    });
    
    // Nettoyer
    await supabase.removeChannel(testChannel);
  } catch (error) {
    results.push({
      indicator: 'Realtime Reactivity',
      status: 'error',
      message: 'Erreur lors du test de réactivité temps réel',
      details: error
    });
  }

  console.log('✅ Test de réactivité du formulaire de contribution terminé');
  return results;
};

export const printContributionTestResults = (results: ValidationResult[]) => {
  console.log('\n📊 RÉSULTATS DU TEST DE RÉACTIVITÉ DU FORMULAIRE CCC\n');
  console.log('='.repeat(60));
  
  const successCount = results.filter(r => r.status === 'success').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  results.forEach(result => {
    const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.log(`\n${icon} ${result.indicator}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Détails:`, result.details);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`\n📈 RÉSUMÉ:`);
  console.log(`   ✅ Succès: ${successCount}`);
  console.log(`   ⚠️  Avertissements: ${warningCount}`);
  console.log(`   ❌ Erreurs: ${errorCount}`);
  console.log('\n');
};
