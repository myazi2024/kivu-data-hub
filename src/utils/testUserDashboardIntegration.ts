import { supabase } from '@/integrations/supabase/client';

/**
 * Test de l'intégration complète de l'espace utilisateur
 * Vérifie que tous les composants sont bien connectés au back-end
 */
export async function testUserDashboardIntegration() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as Array<{ name: string; status: 'success' | 'error'; details: string }>,
    summary: { total: 0, passed: 0, failed: 0 }
  };

  console.log('🔍 Début du test d\'intégration de l\'espace utilisateur...\n');

  // Test 1: Authentification utilisateur
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    
    if (user) {
      results.tests.push({
        name: 'Authentification utilisateur',
        status: 'success',
        details: `Utilisateur connecté: ${user.email}`
      });
      console.log('✅ Test 1: Authentification - OK');
    } else {
      results.tests.push({
        name: 'Authentification utilisateur',
        status: 'error',
        details: 'Aucun utilisateur connecté'
      });
      console.log('❌ Test 1: Authentification - ÉCHEC (aucun utilisateur)');
    }
  } catch (error: any) {
    results.tests.push({
      name: 'Authentification utilisateur',
      status: 'error',
      details: error.message
    });
    console.log('❌ Test 1: Authentification - ERREUR:', error.message);
  }

  // Test 2: Profil utilisateur
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;

    results.tests.push({
      name: 'Récupération du profil',
      status: 'success',
      details: `Profil trouvé pour ${profile.email}`
    });
    console.log('✅ Test 2: Profil utilisateur - OK');
  } catch (error: any) {
    results.tests.push({
      name: 'Récupération du profil',
      status: 'error',
      details: error.message
    });
    console.log('❌ Test 2: Profil utilisateur - ERREUR:', error.message);
  }

  // Test 3: Contributions cadastrales
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data: contributions, error } = await supabase
      .from('cadastral_contributions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    results.tests.push({
      name: 'Contributions cadastrales',
      status: 'success',
      details: `${contributions?.length || 0} contribution(s) trouvée(s)`
    });
    console.log(`✅ Test 3: Contributions - OK (${contributions?.length || 0} contributions)`);
  } catch (error: any) {
    results.tests.push({
      name: 'Contributions cadastrales',
      status: 'error',
      details: error.message
    });
    console.log('❌ Test 3: Contributions - ERREUR:', error.message);
  }

  // Test 4: Codes CCC
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data: codes, error } = await supabase
      .from('cadastral_contributor_codes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const availableCodes = codes?.filter(c => c.is_valid && !c.is_used && new Date(c.expires_at) > new Date()) || [];

    results.tests.push({
      name: 'Codes CCC',
      status: 'success',
      details: `${codes?.length || 0} code(s) total, ${availableCodes.length} disponible(s)`
    });
    console.log(`✅ Test 4: Codes CCC - OK (${codes?.length || 0} codes, ${availableCodes.length} disponibles)`);
  } catch (error: any) {
    results.tests.push({
      name: 'Codes CCC',
      status: 'error',
      details: error.message
    });
    console.log('❌ Test 4: Codes CCC - ERREUR:', error.message);
  }

  // Test 5: Factures cadastrales
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data: invoices, error } = await supabase
      .from('cadastral_invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    results.tests.push({
      name: 'Factures cadastrales',
      status: 'success',
      details: `${invoices?.length || 0} facture(s) trouvée(s)`
    });
    console.log(`✅ Test 5: Factures - OK (${invoices?.length || 0} factures)`);
  } catch (error: any) {
    results.tests.push({
      name: 'Factures cadastrales',
      status: 'error',
      details: error.message
    });
    console.log('❌ Test 5: Factures - ERREUR:', error.message);
  }

  // Test 6: Statistiques utilisateur (fonction RPC)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    const { data: stats, error } = await supabase.rpc('get_user_statistics', {
      target_user_id: user.id,
      start_date: startDate,
      end_date: endDate
    });

    if (error) throw error;

    results.tests.push({
      name: 'Statistiques utilisateur (RPC)',
      status: 'success',
      details: `Statistiques récupérées: ${JSON.stringify(stats).substring(0, 100)}...`
    });
    console.log('✅ Test 6: Statistiques (RPC) - OK');
  } catch (error: any) {
    results.tests.push({
      name: 'Statistiques utilisateur (RPC)',
      status: 'error',
      details: error.message
    });
    console.log('❌ Test 6: Statistiques (RPC) - ERREUR:', error.message);
  }

  // Test 7: Préférences utilisateur
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    results.tests.push({
      name: 'Préférences utilisateur',
      status: 'success',
      details: preferences ? 'Préférences trouvées' : 'Aucune préférence (valeurs par défaut)'
    });
    console.log('✅ Test 7: Préférences - OK');
  } catch (error: any) {
    results.tests.push({
      name: 'Préférences utilisateur',
      status: 'error',
      details: error.message
    });
    console.log('❌ Test 7: Préférences - ERREUR:', error.message);
  }

  // Test 8: Notifications
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

    results.tests.push({
      name: 'Notifications',
      status: 'success',
      details: `${notifications?.length || 0} notification(s), ${unreadCount} non lue(s)`
    });
    console.log(`✅ Test 8: Notifications - OK (${notifications?.length || 0} notifications, ${unreadCount} non lues)`);
  } catch (error: any) {
    results.tests.push({
      name: 'Notifications',
      status: 'error',
      details: error.message
    });
    console.log('❌ Test 8: Notifications - ERREUR:', error.message);
  }

  // Calcul du résumé
  results.summary.total = results.tests.length;
  results.summary.passed = results.tests.filter(t => t.status === 'success').length;
  results.summary.failed = results.tests.filter(t => t.status === 'error').length;

  console.log('\n📊 RÉSUMÉ DES TESTS:');
  console.log(`   Total: ${results.summary.total}`);
  console.log(`   Réussis: ${results.summary.passed} ✅`);
  console.log(`   Échoués: ${results.summary.failed} ❌`);
  console.log(`   Taux de réussite: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%\n`);

  if (results.summary.failed > 0) {
    console.log('⚠️  ÉCHECS DÉTECTÉS:');
    results.tests.filter(t => t.status === 'error').forEach(t => {
      console.log(`   - ${t.name}: ${t.details}`);
    });
  } else {
    console.log('🎉 Tous les tests sont passés avec succès!');
  }

  return results;
}

// Export pour utilisation dans la console du navigateur
if (typeof window !== 'undefined') {
  (window as any).testUserDashboardIntegration = testUserDashboardIntegration;
}
