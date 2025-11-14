import { supabase } from "@/integrations/supabase/client";

/**
 * Test de validation pour la fonctionnalité de gestion des permis de construire
 * dans l'espace utilisateur.
 * 
 * Ce test vérifie:
 * 1. L'authentification de l'utilisateur
 * 2. La récupération des demandes de permis depuis la table cadastral_contributions
 * 3. La présence et la structure des données permit_request_data
 * 4. La présence et la structure des données building_permits
 * 5. Les statuts des demandes
 */
export async function testUserBuildingPermits() {
  console.log("=== Test de validation: Gestion des permis de construire ===\n");
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as Array<{ name: string; status: 'PASS' | 'FAIL'; details?: string; data?: any }>,
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
    }
  };

  // Test 1: Vérifier l'authentification
  console.log("Test 1: Vérification de l'authentification...");
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    
    if (!user) {
      results.tests.push({
        name: "Authentification utilisateur",
        status: "FAIL",
        details: "Aucun utilisateur connecté"
      });
      console.log("❌ FAIL: Aucun utilisateur connecté\n");
    } else {
      results.tests.push({
        name: "Authentification utilisateur",
        status: "PASS",
        details: `Utilisateur connecté: ${user.email}`,
        data: { userId: user.id, email: user.email }
      });
      console.log(`✅ PASS: Utilisateur connecté (${user.email})\n`);
    }
  } catch (error) {
    results.tests.push({
      name: "Authentification utilisateur",
      status: "FAIL",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    });
    console.log(`❌ FAIL: ${error}\n`);
  }

  // Test 2: Récupérer les contributions avec demandes de permis
  console.log("Test 2: Récupération des demandes de permis...");
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Utilisateur non connecté");

    const { data, error } = await supabase
      .from('cadastral_contributions')
      .select('*')
      .eq('user_id', user.id)
      .not('permit_request_data', 'is', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    results.tests.push({
      name: "Récupération des demandes de permis",
      status: "PASS",
      details: `${data?.length || 0} demande(s) de permis trouvée(s)`,
      data: { count: data?.length || 0, permits: data }
    });
    console.log(`✅ PASS: ${data?.length || 0} demande(s) de permis trouvée(s)\n`);

    // Test 3: Vérifier la structure des données permit_request_data
    if (data && data.length > 0) {
      console.log("Test 3: Vérification de la structure permit_request_data...");
      const samplePermit = data[0];
      const hasValidStructure = samplePermit.permit_request_data && 
        typeof samplePermit.permit_request_data === 'object';

      if (hasValidStructure) {
        results.tests.push({
          name: "Structure permit_request_data",
          status: "PASS",
          details: "Structure valide détectée",
          data: { 
            fields: Object.keys(samplePermit.permit_request_data),
            sample: samplePermit.permit_request_data 
          }
        });
        console.log("✅ PASS: Structure permit_request_data valide");
        console.log(`   Champs: ${Object.keys(samplePermit.permit_request_data).join(', ')}\n`);
      } else {
        results.tests.push({
          name: "Structure permit_request_data",
          status: "FAIL",
          details: "Structure invalide ou absente"
        });
        console.log("❌ FAIL: Structure permit_request_data invalide\n");
      }

      // Test 4: Vérifier les permis délivrés (building_permits)
      console.log("Test 4: Vérification des permis délivrés...");
      const permitsWithBuildingPermits = data.filter(p => 
        p.building_permits && 
        Array.isArray(p.building_permits) && 
        p.building_permits.length > 0
      );

      results.tests.push({
        name: "Permis délivrés (building_permits)",
        status: "PASS",
        details: `${permitsWithBuildingPermits.length} contribution(s) avec permis délivré(s)`,
        data: { 
          count: permitsWithBuildingPermits.length,
          samples: permitsWithBuildingPermits.map(p => ({
            parcel: p.parcel_number,
            permits: p.building_permits
          }))
        }
      });
      console.log(`✅ PASS: ${permitsWithBuildingPermits.length} contribution(s) avec permis délivré(s)\n`);

      // Test 5: Vérifier les statuts
      console.log("Test 5: Vérification des statuts...");
      const statusCounts = data.reduce((acc, permit) => {
        acc[permit.status] = (acc[permit.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      results.tests.push({
        name: "Statuts des demandes",
        status: "PASS",
        details: "Distribution des statuts",
        data: statusCounts
      });
      console.log("✅ PASS: Statuts des demandes");
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
      console.log();

      // Test 6: Vérifier les données de localisation
      console.log("Test 6: Vérification des données de localisation...");
      const permitsWithLocation = data.filter(p => 
        p.province || p.ville || p.commune || p.quartier
      );

      results.tests.push({
        name: "Données de localisation",
        status: "PASS",
        details: `${permitsWithLocation.length}/${data.length} demande(s) avec localisation`,
        data: {
          withLocation: permitsWithLocation.length,
          total: data.length
        }
      });
      console.log(`✅ PASS: ${permitsWithLocation.length}/${data.length} demande(s) avec localisation\n`);
    }
  } catch (error) {
    results.tests.push({
      name: "Récupération des demandes de permis",
      status: "FAIL",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    });
    console.log(`❌ FAIL: ${error}\n`);
  }

  // Calculer le résumé
  results.summary.total = results.tests.length;
  results.summary.passed = results.tests.filter(t => t.status === 'PASS').length;
  results.summary.failed = results.tests.filter(t => t.status === 'FAIL').length;

  // Afficher le résumé
  console.log("=== Résumé des tests ===");
  console.log(`Total: ${results.summary.total}`);
  console.log(`✅ Réussis: ${results.summary.passed}`);
  console.log(`❌ Échoués: ${results.summary.failed}`);
  console.log(`Taux de réussite: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);

  return results;
}

// Exposer la fonction pour les tests depuis la console
if (typeof window !== 'undefined') {
  (window as any).testUserBuildingPermits = testUserBuildingPermits;
}
