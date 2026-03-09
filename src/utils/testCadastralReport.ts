/**
 * Script de test pour valider la génération du rapport cadastral
 * Fix #2: Charge les services depuis la DB au lieu de la variable globale deprecated
 */

import { generateCadastralReport } from '@/lib/pdf';
import { supabase } from '@/integrations/supabase/client';
import type { CadastralService } from '@/hooks/useCadastralServices';

// Données de test simulant un résultat cadastral avec contribution validée
const mockCadastralResult = {
  parcel: {
    parcel_number: 'TEST-001-2024',
    parcel_type: 'SU',
    property_title_type: 'Certificat d\'enregistrement',
    current_owner_name: 'Test Owner',
    current_owner_legal_status: 'Personne physique',
    current_owner_since: '2020-01-01',
    area_sqm: 500,
    province: 'Nord-Kivu',
    ville: 'Goma',
    commune: 'Goma',
    quartier: 'Himbi',
    avenue: 'Patrice Lumumba',
    circonscription_fonciere: 'Circonscription Foncière de Goma',
    construction_type: 'Maison individuelle',
    construction_nature: 'Durable',
    declared_usage: 'Résidentiel',
    gps_coordinates: [
      { lat: -1.6789, lng: 29.2234 },
      { lat: -1.6790, lng: 29.2235 },
      { lat: -1.6791, lng: 29.2234 },
      { lat: -1.6790, lng: 29.2233 }
    ],
    current_owners_details: [
      {
        lastName: 'Doe',
        firstName: 'John',
        middleName: 'Smith',
        legalStatus: 'Personne physique'
      }
    ]
  },
  ownership_history: [
    {
      owner_name: 'Previous Owner 1',
      ownership_start_date: '2015-01-01',
      ownership_end_date: '2020-01-01',
      legal_status: 'Personne physique',
      mutation_type: 'Vente'
    },
    {
      owner_name: 'Previous Owner 2',
      ownership_start_date: '2010-01-01',
      ownership_end_date: '2015-01-01',
      legal_status: 'Personne morale',
      mutation_type: 'Succession'
    }
  ],
  tax_history: [
    {
      tax_year: 2024,
      amount_usd: 150,
      payment_status: 'paid',
      payment_date: '2024-01-15'
    },
    {
      tax_year: 2023,
      amount_usd: 140,
      payment_status: 'paid',
      payment_date: '2023-01-20'
    },
    {
      tax_year: 2022,
      amount_usd: 130,
      payment_status: 'overdue',
      payment_date: null
    }
  ],
  mortgage_history: [
    {
      creditor_name: 'Banque Commerciale du Congo',
      creditor_type: 'Banque',
      mortgage_amount_usd: 50000,
      duration_months: 240,
      contract_date: '2020-01-15',
      mortgage_status: 'active'
    }
  ],
  building_permits: [
    {
      permit_number: 'PB-2020-001',
      issuing_service: 'Service Urbanisme Goma',
      issue_date: '2020-01-01',
      validity_period_months: 36,
      administrative_status: 'Délivré',
      issuing_service_contact: '+243 997 123 456'
    }
  ],
  boundary_history: [
    {
      pv_reference_number: 'PV-2019-123',
      survey_date: '2019-12-15',
      surveyor_name: 'Géomètre Jean Dupont',
      boundary_purpose: 'Délimitation initiale'
    }
  ]
};

const mockPaidServices = ['service-1', 'service-2'];

/**
 * Charge les services depuis la DB pour les tests
 */
async function loadServicesFromDB(): Promise<CadastralService[]> {
  const { data, error } = await supabase
    .from('cadastral_services_config')
    .select('*')
    .eq('is_active', true);
  
  if (error) throw error;
  
  return (data || []).map(s => ({
    id: s.service_id,
    name: s.name,
    price: Number(s.price_usd),
    description: s.description || ''
  }));
}

/**
 * Test de génération du rapport cadastral
 * Note: Ce test ne peut être exécuté qu'en environnement navigateur
 */
export async function testCadastralReportGeneration() {
  console.log('🧪 Test de génération du rapport cadastral...');
  
  try {
    // Charger les services depuis la DB
    const services = await loadServicesFromDB();
    
    if (services.length === 0) {
      throw new Error('Le catalogue de services est vide');
    }
    
    console.log('✅ Catalogue de services chargé:', services.length, 'services');
    
    // Générer le rapport
    await generateCadastralReport(
      mockCadastralResult,
      mockPaidServices,
      services,
      'TEST_Rapport_Cadastral.pdf'
    );
    
    console.log('✅ Rapport cadastral généré avec succès');
    console.log('📄 Vérifiez que le PDF contient:');
    console.log('   1. Les informations générales (parcelle, propriétaire, superficie)');
    console.log('   2. La localisation complète');
    console.log('   3. Les coordonnées GPS (4 bornes affichées)');
    console.log('   4. L\'historique de propriété (max 3 entrées)');
    console.log('   5. Les obligations financières (taxes et hypothèques)');
    console.log('   6. Les permis de bâtir et bornage');
    console.log('   7. Les services inclus');
    console.log('   8. L\'authentification avec QR code');
    console.log('   9. Le rapport ne doit PAS dépasser 2 pages');
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    return false;
  }
}

// Pour tester manuellement dans la console du navigateur:
// import { testCadastralReportGeneration } from '@/utils/testCadastralReport';
// testCadastralReportGeneration();
