/**
 * Script de validation de la cohérence des indicateurs cadastraux
 * Fix #2: Utilise directement la DB au lieu de la variable globale deprecated
 */

import { supabase } from '@/integrations/supabase/client';

export interface ValidationResult {
  indicator: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export const validateCadastralSystem = async (): Promise<ValidationResult[]> => {
  const results: ValidationResult[] = [];

  // 1. Validation du catalogue de services — directement depuis la DB
  try {
    const { data: servicesDB, error } = await supabase
      .from('cadastral_services_config')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    if (!servicesDB || servicesDB.length === 0) {
      results.push({
        indicator: 'Catalogue de services',
        status: 'error',
        message: 'Aucun service actif dans la base de données',
      });
    } else {
      results.push({
        indicator: 'Catalogue de services',
        status: 'success',
        message: `${servicesDB.length} services actifs dans la base de données`,
        details: { services: servicesDB }
      });
    }
  } catch (error: any) {
    results.push({
      indicator: 'Catalogue de services',
      status: 'error',
      message: `Erreur de validation: ${error.message}`,
    });
  }

  // 2. Validation des parcelles cadastrales
  try {
    const { count: parcelCount, error } = await supabase
      .from('cadastral_parcels')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    const { data: invalidParcels, error: validationError } = await supabase
      .from('cadastral_parcels')
      .select('id, parcel_number, area_sqm, property_title_type')
      .or('area_sqm.lte.0,property_title_type.is.null');

    if (validationError) throw validationError;

    if (invalidParcels && invalidParcels.length > 0) {
      results.push({
        indicator: 'Résultats cadastraux',
        status: 'warning',
        message: `${parcelCount} parcelles totales, ${invalidParcels.length} avec données manquantes`,
        details: { invalidParcels }
      });
    } else {
      results.push({
        indicator: 'Résultats cadastraux',
        status: 'success',
        message: `${parcelCount} parcelles cadastrales, toutes valides`,
        details: { total: parcelCount }
      });
    }
  } catch (error: any) {
    results.push({
      indicator: 'Résultats cadastraux',
      status: 'error',
      message: `Erreur de validation: ${error.message}`,
    });
  }

  // 3. Validation du système CCC
  try {
    const { data: contributions, error: contribError } = await supabase
      .from('cadastral_contributions')
      .select('id, status, is_suspicious, fraud_score')
      .order('created_at', { ascending: false })
      .limit(100);

    if (contribError) throw contribError;

    const { data: codes, error: codesError } = await supabase
      .from('cadastral_contributor_codes')
      .select('id, code, is_valid, is_used, value_usd')
      .order('created_at', { ascending: false })
      .limit(100);

    if (codesError) throw codesError;

    const stats = {
      total_contributions: contributions?.length || 0,
      pending: contributions?.filter(c => c.status === 'pending').length || 0,
      approved: contributions?.filter(c => c.status === 'approved').length || 0,
      suspicious: contributions?.filter(c => c.is_suspicious).length || 0,
      total_codes: codes?.length || 0,
      valid_codes: codes?.filter(c => c.is_valid && !c.is_used).length || 0,
      total_value: codes?.reduce((sum, c) => sum + Number(c.value_usd), 0) || 0,
    };

    const { data: approvedWithoutCode, error: checkError } = await supabase
      .from('cadastral_contributions')
      .select(`
        id,
        parcel_number,
        cadastral_contributor_codes (
          id
        )
      `)
      .eq('status', 'approved')
      .is('cadastral_contributor_codes.id', null);

    if (checkError) throw checkError;

    if (approvedWithoutCode && approvedWithoutCode.length > 0) {
      results.push({
        indicator: 'Formulaire CCC',
        status: 'warning',
        message: `${approvedWithoutCode.length} contribution(s) approuvée(s) sans code CCC généré`,
        details: { stats, approvedWithoutCode }
      });
    } else {
      results.push({
        indicator: 'Formulaire CCC',
        status: 'success',
        message: `Système CCC cohérent: ${stats.total_contributions} contributions, ${stats.total_codes} codes`,
        details: { stats }
      });
    }
  } catch (error: any) {
    results.push({
      indicator: 'Formulaire CCC',
      status: 'error',
      message: `Erreur de validation: ${error.message}`,
    });
  }

  // 4. Validation des RLS policies
  try {
    const tables = [
      'cadastral_services_config',
      'cadastral_parcels',
      'cadastral_contributions',
      'cadastral_contributor_codes'
    ];

    const accessTests = await Promise.all(
      tables.map(async (table) => {
        try {
          const { error } = await supabase
            .from(table as any)
            .select('id')
            .limit(1);
          return { table, accessible: !error, error: error?.message };
        } catch (e: any) {
          return { table, accessible: false, error: e.message };
        }
      })
    );

    const inaccessible = accessTests.filter(t => !t.accessible);

    if (inaccessible.length > 0) {
      results.push({
        indicator: 'Sécurité RLS',
        status: 'error',
        message: `${inaccessible.length} table(s) inaccessible(s)`,
        details: { inaccessible }
      });
    } else {
      results.push({
        indicator: 'Sécurité RLS',
        status: 'success',
        message: 'Toutes les tables sont accessibles',
        details: { accessTests }
      });
    }
  } catch (error: any) {
    results.push({
      indicator: 'Sécurité RLS',
      status: 'error',
      message: `Erreur de validation: ${error.message}`,
    });
  }

  // 5. Validation du système de notifications
  try {
    const { data: notificationStats, error: notifError } = await supabase
      .from('notifications')
      .select('type, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (notifError) throw notifError;

    const stats = {
      total: notificationStats?.length || 0,
      unread: notificationStats?.filter(n => !n.is_read).length || 0,
      by_type: {
        info: notificationStats?.filter(n => n.type === 'info').length || 0,
        success: notificationStats?.filter(n => n.type === 'success').length || 0,
        warning: notificationStats?.filter(n => n.type === 'warning').length || 0,
        error: notificationStats?.filter(n => n.type === 'error').length || 0,
      }
    };

    const { data: orphanNotifications, error: orphanError } = await supabase
      .from('notifications')
      .select(`
        id,
        user_id,
        profiles!notifications_user_id_fkey (
          user_id
        )
      `)
      .is('profiles.user_id', null)
      .limit(10);

    if (orphanError) throw orphanError;

    if (orphanNotifications && orphanNotifications.length > 0) {
      results.push({
        indicator: 'Notifications système',
        status: 'warning',
        message: `${orphanNotifications.length} notification(s) orpheline(s) détectée(s)`,
        details: { stats, orphanNotifications }
      });
    } else {
      results.push({
        indicator: 'Notifications système',
        status: 'success',
        message: `${stats.total} notifications, ${stats.unread} non lues, système cohérent`,
        details: { stats }
      });
    }
  } catch (error: any) {
    results.push({
      indicator: 'Notifications système',
      status: 'error',
      message: `Erreur de validation: ${error.message}`,
    });
  }

  // 6. Validation des alerts/toasts cohérence
  try {
    const { data: recentContributions, error: contribError } = await supabase
      .from('cadastral_contributions')
      .select('id, user_id, status, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (contribError) throw contribError;

    const approvedContribs = recentContributions?.filter(c => c.status === 'approved') || [];
    
    let missingNotifications = 0;
    for (const contrib of approvedContribs) {
      const { data: notif } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', contrib.user_id)
        .gte('created_at', contrib.created_at)
        .maybeSingle();
      
      if (!notif) missingNotifications++;
    }

    if (missingNotifications > 0) {
      results.push({
        indicator: 'Cohérence Notifications/Événements',
        status: 'warning',
        message: `${missingNotifications} événement(s) sans notification associée`,
        details: { approvedContribs: approvedContribs.length, missingNotifications }
      });
    } else {
      results.push({
        indicator: 'Cohérence Notifications/Événements',
        status: 'success',
        message: 'Toutes les contributions approuvées ont déclenché des notifications',
        details: { verifiedContributions: approvedContribs.length }
      });
    }
  } catch (error: any) {
    results.push({
      indicator: 'Cohérence Notifications/Événements',
      status: 'error',
      message: `Erreur de validation: ${error.message}`,
    });
  }

  return results;
};

export const printValidationResults = (results: ValidationResult[]) => {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     VALIDATION DES INDICATEURS CADASTRAUX - BIC         ║');
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

    console.log(`${index + 1}. ${statusColor}${statusSymbol}\x1b[0m ${result.indicator}`);
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
