import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  category: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export const validateSearchBarReactivity = async (): Promise<ValidationResult[]> => {
  const results: ValidationResult[] = [];

  try {
    // 1. Vérifier l'existence de la table cadastral_search_config
    const { data: configData, error: configError } = await supabase
      .from('cadastral_search_config')
      .select('*');

    if (configError) {
      results.push({
        category: 'Configuration DB',
        status: 'error',
        message: 'Erreur lors de la récupération de la configuration',
        details: configError.message
      });
      return results;
    }

    results.push({
      category: 'Configuration DB',
      status: 'success',
      message: `✓ Table cadastral_search_config accessible (${configData?.length || 0} configs)`
    });

    // 2. Vérifier les configurations essentielles
    const requiredConfigs = ['animated_examples', 'format_urbain', 'format_rural', 'error_messages'];
    const existingConfigs = configData?.map(c => c.config_key) || [];
    
    requiredConfigs.forEach(key => {
      if (existingConfigs.includes(key)) {
        const config = configData?.find(c => c.config_key === key);
        results.push({
          category: 'Configs requises',
          status: config?.is_active ? 'success' : 'warning',
          message: `✓ ${key} - ${config?.is_active ? 'Active' : 'Inactive'}`,
          details: config?.config_value
        });
      } else {
        results.push({
          category: 'Configs requises',
          status: 'error',
          message: `✗ ${key} - Manquante`
        });
      }
    });

    // 3. Vérifier la validité du JSON dans les configs
    configData?.forEach(config => {
      try {
        if (typeof config.config_value === 'string') {
          JSON.parse(config.config_value);
        }
        results.push({
          category: 'Validité JSON',
          status: 'success',
          message: `✓ ${config.config_key} - JSON valide`
        });
      } catch (e) {
        results.push({
          category: 'Validité JSON',
          status: 'error',
          message: `✗ ${config.config_key} - JSON invalide`,
          details: (e as Error).message
        });
      }
    });

    // 4. Vérifier la cohérence des exemples animés
    const animatedConfig = configData?.find(c => c.config_key === 'animated_examples');
    if (animatedConfig) {
      const examples = animatedConfig.config_value;
      if (Array.isArray(examples) && examples.length > 0) {
        results.push({
          category: 'Exemples animés',
          status: 'success',
          message: `✓ ${examples.length} exemples configurés`,
          details: examples
        });
      } else {
        results.push({
          category: 'Exemples animés',
          status: 'warning',
          message: `⚠ Aucun exemple configuré ou format invalide`
        });
      }
    }

    // 5. Vérifier la cohérence format_urbain
    const urbainConfig = configData?.find(c => c.config_key === 'format_urbain');
    if (urbainConfig?.config_value) {
      const format = urbainConfig.config_value as any;
      if (format.code && format.label && format.format && format.examples) {
        results.push({
          category: 'Format Urbain',
          status: 'success',
          message: `✓ Format urbain complet (${format.examples.length} exemples)`
        });
      } else {
        results.push({
          category: 'Format Urbain',
          status: 'error',
          message: `✗ Format urbain incomplet`,
          details: format
        });
      }
    }

    // 6. Vérifier la cohérence format_rural
    const ruralConfig = configData?.find(c => c.config_key === 'format_rural');
    if (ruralConfig?.config_value) {
      const format = ruralConfig.config_value as any;
      if (format.code && format.label && format.format && format.examples) {
        results.push({
          category: 'Format Rural',
          status: 'success',
          message: `✓ Format rural complet (${format.examples.length} exemples)`
        });
      } else {
        results.push({
          category: 'Format Rural',
          status: 'error',
          message: `✗ Format rural incomplet`,
          details: format
        });
      }
    }

    // 7. Vérifier les messages d'erreur
    const errorMsgConfig = configData?.find(c => c.config_key === 'error_messages');
    if (errorMsgConfig?.config_value) {
      const messages = errorMsgConfig.config_value as any;
      const requiredKeys = ['not_found', 'not_found_help', 'verification_prompt'];
      const missingKeys = requiredKeys.filter(k => !messages[k]);
      
      if (missingKeys.length === 0) {
        results.push({
          category: 'Messages d\'erreur',
          status: 'success',
          message: `✓ Tous les messages d'erreur configurés`
        });
      } else {
        results.push({
          category: 'Messages d\'erreur',
          status: 'warning',
          message: `⚠ Messages manquants: ${missingKeys.join(', ')}`
        });
      }
    }

    // 8. Vérifier la cohérence avec useCadastralStats
    const { data: services } = await supabase
      .from('cadastral_services_config')
      .select('service_id, name, is_active');

    if (services && services.length > 0) {
      results.push({
        category: 'Services cadastraux',
        status: 'success',
        message: `✓ ${services.filter(s => s.is_active).length}/${services.length} services actifs`,
        details: services
      });
    } else {
      results.push({
        category: 'Services cadastraux',
        status: 'warning',
        message: `⚠ Aucun service cadastral configuré`
      });
    }

    // 9. Tester les RLS policies
    const { error: rlsError } = await supabase
      .from('cadastral_search_config')
      .select('id')
      .limit(1);

    if (!rlsError) {
      results.push({
        category: 'Sécurité RLS',
        status: 'success',
        message: `✓ Policies RLS fonctionnelles`
      });
    } else {
      results.push({
        category: 'Sécurité RLS',
        status: 'error',
        message: `✗ Problème avec les policies RLS`,
        details: rlsError.message
      });
    }

  } catch (error: any) {
    results.push({
      category: 'Test global',
      status: 'error',
      message: `Erreur lors de la validation`,
      details: error.message
    });
  }

  return results;
};
