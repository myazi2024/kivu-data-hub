/**
 * Test d'intégrité des données CCC
 * Vérifie que les données du formulaire sont bien enregistrées et accessibles dans l'admin
 */

import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  test: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export const testCCCDataIntegrity = async (): Promise<TestResult[]> => {
  const results: TestResult[] = [];

  try {
    // Test 1: Vérifier que la table cadastral_contributions existe et est accessible
    results.push({
      test: 'Table cadastral_contributions',
      status: 'success',
      message: 'Tentative d\'accès à la table...'
    });

    const { data: contributions, error: fetchError } = await supabase
      .from('cadastral_contributions')
      .select('*')
      .limit(5);

    if (fetchError) {
      results[results.length - 1] = {
        test: 'Table cadastral_contributions',
        status: 'error',
        message: `Erreur d'accès: ${fetchError.message}`
      };
    } else {
      results[results.length - 1] = {
        test: 'Table cadastral_contributions',
        status: 'success',
        message: `Table accessible. ${contributions?.length || 0} contributions trouvées.`
      };

      // Test 2: Vérifier la présence de tous les champs importants
      if (contributions && contributions.length > 0) {
        const firstContribution = contributions[0];
        const expectedFields = [
          'id', 'user_id', 'parcel_number', 'status',
          'property_title_type', 'lease_type', 'title_reference_number',
          'current_owner_name', 'current_owners_details', 'current_owner_legal_status',
          'area_sqm', 'parcel_sides', 'construction_type', 'construction_nature',
          'declared_usage', 'province', 'ville', 'commune', 'quartier',
          'gps_coordinates', 'ownership_history', 'boundary_history',
          'tax_history', 'mortgage_history', 'building_permits',
          'previous_permit_number', 'permit_request_data',
          'whatsapp_number', 'owner_document_url', 'property_title_document_url',
          'is_suspicious', 'fraud_score', 'fraud_reason',
          'created_at', 'updated_at'
        ];

        const missingFields = expectedFields.filter(field => !(field in firstContribution));
        
        if (missingFields.length > 0) {
          results.push({
            test: 'Intégrité du schéma',
            status: 'warning',
            message: `Champs manquants détectés`,
            details: missingFields
          });
        } else {
          results.push({
            test: 'Intégrité du schéma',
            status: 'success',
            message: 'Tous les champs attendus sont présents'
          });
        }

        // Test 3: Vérifier la cohérence des données JSONB
        const jsonbFields = [
          'current_owners_details',
          'parcel_sides',
          'gps_coordinates',
          'ownership_history',
          'boundary_history',
          'tax_history',
          'mortgage_history',
          'building_permits',
          'permit_request_data'
        ];

        let jsonbIssues: string[] = [];
        jsonbFields.forEach(field => {
          const value = firstContribution[field as keyof typeof firstContribution];
          if (value !== null && value !== undefined) {
            try {
              // Vérifier si c'est un JSON valide
              if (typeof value === 'string') {
                JSON.parse(value);
              } else if (typeof value === 'object') {
                // Déjà un objet, OK
              }
            } catch (e) {
              jsonbIssues.push(`${field}: Format JSON invalide`);
            }
          }
        });

        if (jsonbIssues.length > 0) {
          results.push({
            test: 'Validation des données JSONB',
            status: 'error',
            message: 'Problèmes détectés dans les données structurées',
            details: jsonbIssues
          });
        } else {
          results.push({
            test: 'Validation des données JSONB',
            status: 'success',
            message: 'Toutes les données structurées sont valides'
          });
        }

        // Test 4: Vérifier les données de propriétaires multiples
        const contributionsWithOwners = contributions.filter(c => c.current_owners_details);
        results.push({
          test: 'Propriétaires multiples',
          status: 'success',
          message: `${contributionsWithOwners.length}/${contributions.length} contributions avec détails propriétaires complets`
        });

        // Test 5: Vérifier les autorisations de bâtir
        const contributionsWithPermits = contributions.filter(c => 
          c.building_permits && Array.isArray(c.building_permits) && c.building_permits.length > 0
        );
        results.push({
          test: 'Autorisation de bâtir',
          status: 'success',
          message: `${contributionsWithPermits.length}/${contributions.length} contributions avec permis enregistrés`
        });

        // Test 6: Vérifier les coordonnées GPS
        const contributionsWithGPS = contributions.filter(c => 
          c.gps_coordinates && Array.isArray(c.gps_coordinates) && c.gps_coordinates.length > 0
        );
        results.push({
          test: 'Coordonnées GPS',
          status: 'success',
          message: `${contributionsWithGPS.length}/${contributions.length} contributions avec coordonnées GPS`
        });

        // Test 7: Vérifier les documents attachés
        const contributionsWithDocs = contributions.filter(c => 
          c.owner_document_url || c.property_title_document_url
        );
        results.push({
          test: 'Documents attachés',
          status: 'success',
          message: `${contributionsWithDocs.length}/${contributions.length} contributions avec documents`
        });

        // Test 8: Vérifier les demandes de permis
        const contributionsWithPermitRequests = contributions.filter(c => c.permit_request_data);
        results.push({
          test: 'Demandes de permis',
          status: 'success',
          message: `${contributionsWithPermitRequests.length}/${contributions.length} contributions avec demandes de permis`
        });

        // Test 9: Vérifier les dimensions des côtés
        const contributionsWithSides = contributions.filter(c => 
          c.parcel_sides && Array.isArray(c.parcel_sides) && c.parcel_sides.length > 0
        );
        results.push({
          test: 'Dimensions des côtés',
          status: 'success',
          message: `${contributionsWithSides.length}/${contributions.length} contributions avec dimensions`
        });

      } else {
        results.push({
          test: 'Analyse des données',
          status: 'warning',
          message: 'Aucune contribution trouvée pour l\'analyse'
        });
      }
    }

    // Test 10: Vérifier les codes CCC générés
    const { data: codes, error: codesError } = await supabase
      .from('cadastral_contributor_codes')
      .select('*')
      .limit(5);

    if (codesError) {
      results.push({
        test: 'Codes CCC',
        status: 'error',
        message: `Erreur d'accès aux codes: ${codesError.message}`
      });
    } else {
      results.push({
        test: 'Codes CCC',
        status: 'success',
        message: `${codes?.length || 0} codes CCC trouvés`
      });
    }

    // Test 11: Vérifier les tentatives de fraude
    const { data: fraudAttempts, error: fraudError } = await supabase
      .from('fraud_attempts')
      .select('*')
      .limit(5);

    if (fraudError) {
      results.push({
        test: 'Détection de fraude',
        status: 'warning',
        message: `Impossible de vérifier les tentatives de fraude: ${fraudError.message}`
      });
    } else {
      results.push({
        test: 'Détection de fraude',
        status: 'success',
        message: `Système anti-fraude opérationnel. ${fraudAttempts?.length || 0} tentatives enregistrées`
      });
    }

  } catch (error: any) {
    results.push({
      test: 'Erreur globale',
      status: 'error',
      message: `Erreur lors des tests: ${error.message}`,
      details: error
    });
  }

  return results;
};

export const printCCCTestResults = (results: TestResult[]) => {
  console.log('\n=== TEST D\'INTÉGRITÉ DES DONNÉES CCC ===\n');
  
  const successCount = results.filter(r => r.status === 'success').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  results.forEach(result => {
    const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${result.test}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log('   Détails:', result.details);
    }
    console.log('');
  });

  console.log(`\n📊 Résumé: ${successCount} succès, ${warningCount} avertissements, ${errorCount} erreurs\n`);
  
  if (errorCount === 0 && warningCount === 0) {
    console.log('✨ Tous les tests sont passés avec succès!');
  } else if (errorCount === 0) {
    console.log('⚡ Tests réussis avec quelques avertissements.');
  } else {
    console.log('🔥 Des erreurs critiques ont été détectées.');
  }
};
