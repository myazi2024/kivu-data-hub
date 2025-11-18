import { supabase } from '@/integrations/supabase/client';

export interface ParcelFormatTest {
  testName: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

/**
 * Teste que tous les numéros parcellaires dans la base de données
 * sont correctement formatés avec leur préfixe SU/ ou SR/
 */
export async function testParcelNumberFormats(): Promise<ParcelFormatTest[]> {
  const results: ParcelFormatTest[] = [];

  try {
    // Test 1: Vérifier le format des parcelles existantes
    const { data: parcels, error: parcelsError } = await supabase
      .from('cadastral_parcels')
      .select('id, parcel_number, parcel_type')
      .is('deleted_at', null)
      .limit(100);

    if (parcelsError) throw parcelsError;

    const invalidParcels = parcels?.filter(p => {
      const hasPrefix = p.parcel_number.startsWith('SU/') || p.parcel_number.startsWith('SR/');
      const matchesType = (p.parcel_number.startsWith('SU/') && p.parcel_type === 'SU') ||
                          (p.parcel_number.startsWith('SR/') && p.parcel_type === 'SR');
      return !hasPrefix || !matchesType;
    });

    if (invalidParcels && invalidParcels.length > 0) {
      results.push({
        testName: 'Format des parcelles',
        status: 'error',
        message: `${invalidParcels.length} parcelle(s) avec format invalide détectée(s)`,
        details: invalidParcels.slice(0, 5) // Afficher les 5 premières
      });
    } else {
      results.push({
        testName: 'Format des parcelles',
        status: 'success',
        message: `Tous les numéros parcellaires (${parcels?.length || 0}) sont correctement formatés avec SU/ ou SR/`
      });
    }

    // Test 2: Vérifier le format des contributions
    const { data: contributions, error: contributionsError } = await supabase
      .from('cadastral_contributions')
      .select('id, parcel_number, status')
      .limit(100);

    if (contributionsError) throw contributionsError;

    const invalidContributions = contributions?.filter(c => {
      const hasPrefix = c.parcel_number.startsWith('SU/') || c.parcel_number.startsWith('SR/');
      return !hasPrefix;
    });

    if (invalidContributions && invalidContributions.length > 0) {
      results.push({
        testName: 'Format des contributions',
        status: 'warning',
        message: `${invalidContributions.length} contribution(s) sans préfixe SU/ ou SR/`,
        details: invalidContributions.slice(0, 5)
      });
    } else {
      results.push({
        testName: 'Format des contributions',
        status: 'success',
        message: `Tous les numéros de contributions (${contributions?.length || 0}) ont un préfixe SU/ ou SR/`
      });
    }

    // Test 3: Vérifier les codes CCC
    const { data: codes, error: codesError } = await supabase
      .from('cadastral_contributor_codes')
      .select('id, code, parcel_number')
      .limit(100);

    if (codesError) throw codesError;

    const invalidCodes = codes?.filter(c => {
      return !(c.parcel_number.startsWith('SU/') || c.parcel_number.startsWith('SR/'));
    });

    if (invalidCodes && invalidCodes.length > 0) {
      results.push({
        testName: 'Format des codes CCC',
        status: 'warning',
        message: `${invalidCodes.length} code(s) CCC avec format de parcelle invalide`,
        details: invalidCodes.slice(0, 5)
      });
    } else {
      results.push({
        testName: 'Format des codes CCC',
        status: 'success',
        message: `Tous les codes CCC (${codes?.length || 0}) ont des numéros parcellaires correctement formatés`
      });
    }

    // Test 4: Vérifier les factures
    const { data: invoices, error: invoicesError } = await supabase
      .from('cadastral_invoices')
      .select('id, invoice_number, parcel_number')
      .limit(100);

    if (invoicesError) throw invoicesError;

    const invalidInvoices = invoices?.filter(i => {
      return !(i.parcel_number.startsWith('SU/') || i.parcel_number.startsWith('SR/'));
    });

    if (invalidInvoices && invalidInvoices.length > 0) {
      results.push({
        testName: 'Format des factures',
        status: 'warning',
        message: `${invalidInvoices.length} facture(s) avec format de parcelle invalide`,
        details: invalidInvoices.slice(0, 5)
      });
    } else {
      results.push({
        testName: 'Format des factures',
        status: 'success',
        message: `Toutes les factures (${invoices?.length || 0}) ont des numéros parcellaires correctement formatés`
      });
    }

    // Test 5: Simuler une nouvelle contribution et vérifier le formatage automatique
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      results.push({
        testName: 'Formatage automatique (trigger)',
        status: 'warning',
        message: 'Test ignoré (utilisateur non connecté)'
      });
      return results;
    }

    const testContribution = {
      parcel_number: '12345',
      property_title_type: 'Concession perpétuelle',
      current_owner_name: 'Test User',
      current_owner_since: new Date().toISOString().split('T')[0],
      area_sqm: 500,
      location: 'Test Location',
      province: 'Kinshasa',
      status: 'pending',
      user_id: currentUser.id
    };

    const { data: createdContrib, error: createError } = await supabase
      .from('cadastral_contributions')
      .insert(testContribution)
      .select()
      .single();

    if (createError) {
      results.push({
        testName: 'Formatage automatique (trigger)',
        status: 'error',
        message: 'Erreur lors de la création de la contribution de test',
        details: createError
      });
    } else {
      // Vérifier que le numéro a été formaté automatiquement
      if (createdContrib.parcel_number === 'SU/12345') {
        results.push({
          testName: 'Formatage automatique (trigger)',
          status: 'success',
          message: 'Le trigger formate correctement les numéros parcellaires (12345 → SU/12345)',
          details: { original: '12345', formatted: createdContrib.parcel_number }
        });

        // Nettoyer la contribution de test
        await supabase.from('cadastral_contributions').delete().eq('id', createdContrib.id);
      } else {
        results.push({
          testName: 'Formatage automatique (trigger)',
          status: 'error',
          message: 'Le trigger n\'a pas formaté correctement le numéro',
          details: { expected: 'SU/12345', actual: createdContrib.parcel_number }
        });
      }
    }

  } catch (error) {
    results.push({
      testName: 'Tests de format',
      status: 'error',
      message: 'Erreur lors de l\'exécution des tests',
      details: error
    });
  }

  return results;
}

/**
 * Affiche les résultats des tests dans la console
 */
export function printTestResults(results: ParcelFormatTest[]) {
  console.group('🧪 Tests de format des numéros parcellaires');
  
  results.forEach(result => {
    const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${result.testName}: ${result.message}`);
    if (result.details) {
      console.log('   Détails:', result.details);
    }
  });

  const successCount = results.filter(r => r.status === 'success').length;
  const totalCount = results.length;
  console.log(`\n📊 Résumé: ${successCount}/${totalCount} tests réussis`);
  
  console.groupEnd();
}
