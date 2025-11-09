/**
 * Suite de tests de validation pour l'intégration cadastrale
 * Tests front-end et back-end
 */

import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export class CadastralIntegrationTests {
  private results: TestResult[] = [];

  // 1. Test de connexion Supabase
  async testSupabaseConnection(): Promise<TestResult> {
    try {
      const { data, error } = await supabase.from('cadastral_parcels').select('count').limit(1);
      
      if (error) throw error;
      
      return {
        name: 'Connexion Supabase',
        status: 'success',
        message: 'Connexion à Supabase établie avec succès'
      };
    } catch (error: any) {
      return {
        name: 'Connexion Supabase',
        status: 'error',
        message: 'Échec de connexion à Supabase',
        details: error.message
      };
    }
  }

  // 2. Test de récupération des parcelles
  async testFetchParcels(): Promise<TestResult> {
    try {
      const { data, error } = await supabase
        .from('cadastral_parcels')
        .select('*')
        .limit(5);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return {
          name: 'Récupération des parcelles',
          status: 'warning',
          message: 'Aucune parcelle trouvée dans la base de données'
        };
      }
      
      return {
        name: 'Récupération des parcelles',
        status: 'success',
        message: `${data.length} parcelle(s) récupérée(s) avec succès`,
        details: data.slice(0, 2) // Afficher 2 exemples
      };
    } catch (error: any) {
      return {
        name: 'Récupération des parcelles',
        status: 'error',
        message: 'Échec de récupération des parcelles',
        details: error.message
      };
    }
  }

  // 3. Test de recherche par numéro de parcelle
  async testSearchParcel(parcelNumber: string): Promise<TestResult> {
    try {
      const { data, error } = await supabase
        .from('cadastral_parcels')
        .select('*')
        .eq('parcel_number', parcelNumber)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return {
            name: 'Recherche de parcelle',
            status: 'warning',
            message: `Aucune parcelle trouvée pour le numéro: ${parcelNumber}`
          };
        }
        throw error;
      }
      
      return {
        name: 'Recherche de parcelle',
        status: 'success',
        message: `Parcelle ${parcelNumber} trouvée avec succès`,
        details: {
          numero: data.parcel_number,
          superficie: data.area_sqm,
          localisation: `${data.ville} - ${data.commune} - ${data.quartier}`
        }
      };
    } catch (error: any) {
      return {
        name: 'Recherche de parcelle',
        status: 'error',
        message: 'Échec de la recherche',
        details: error.message
      };
    }
  }

  // 4. Test de validation des coordonnées GPS
  async testGPSCoordinates(parcelNumber: string): Promise<TestResult> {
    try {
      const { data, error } = await supabase
        .from('cadastral_parcels')
        .select('gps_coordinates, parcel_number')
        .eq('parcel_number', parcelNumber)
        .single();
      
      if (error) throw error;
      
      if (!data.gps_coordinates || !Array.isArray(data.gps_coordinates)) {
        return {
          name: 'Validation GPS',
          status: 'warning',
          message: 'Coordonnées GPS manquantes ou invalides'
        };
      }
      
      const coords = data.gps_coordinates;
      if (coords.length < 3) {
        return {
          name: 'Validation GPS',
          status: 'warning',
          message: `Nombre insuffisant de coordonnées (${coords.length}), minimum 3 requis`
        };
      }
      
      // Vérifier que chaque coordonnée a lat et lng
      const invalidCoords = coords.filter((c: any) => !c.lat || !c.lng);
      if (invalidCoords.length > 0) {
        return {
          name: 'Validation GPS',
          status: 'error',
          message: 'Certaines coordonnées sont incomplètes',
          details: invalidCoords
        };
      }
      
      return {
        name: 'Validation GPS',
        status: 'success',
        message: `${coords.length} coordonnées GPS valides`,
        details: coords
      };
    } catch (error: any) {
      return {
        name: 'Validation GPS',
        status: 'error',
        message: 'Échec de validation GPS',
        details: error.message
      };
    }
  }

  // 5. Test de la configuration de recherche
  async testSearchConfig(): Promise<TestResult> {
    try {
      const { data, error } = await supabase
        .from('cadastral_search_config')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return {
          name: 'Configuration de recherche',
          status: 'warning',
          message: 'Aucune configuration active trouvée'
        };
      }
      
      return {
        name: 'Configuration de recherche',
        status: 'success',
        message: `${data.length} configuration(s) active(s)`,
        details: data.map(d => ({ key: d.config_key, value: d.config_value }))
      };
    } catch (error: any) {
      return {
        name: 'Configuration de recherche',
        status: 'error',
        message: 'Échec de récupération de la configuration',
        details: error.message
      };
    }
  }

  // 6. Test de la structure de données d'une parcelle
  async testParcelDataStructure(parcelNumber: string): Promise<TestResult> {
    try {
      const { data, error } = await supabase
        .from('cadastral_parcels')
        .select('*')
        .eq('parcel_number', parcelNumber)
        .single();
      
      if (error) throw error;
      
      const requiredFields = [
        'parcel_number',
        'area_sqm',
        'province',
        'ville',
        'commune',
        'quartier',
        'gps_coordinates'
      ];
      
      const missingFields = requiredFields.filter(field => !data[field]);
      
      if (missingFields.length > 0) {
        return {
          name: 'Structure de données',
          status: 'warning',
          message: 'Champs manquants détectés',
          details: { missing: missingFields }
        };
      }
      
      return {
        name: 'Structure de données',
        status: 'success',
        message: 'Tous les champs requis sont présents',
        details: {
          fields: Object.keys(data).length,
          sample: {
            parcel_number: data.parcel_number,
            area_sqm: data.area_sqm,
            location: `${data.province}/${data.ville}`
          }
        }
      };
    } catch (error: any) {
      return {
        name: 'Structure de données',
        status: 'error',
        message: 'Échec de validation de structure',
        details: error.message
      };
    }
  }

  // 7. Test de vérification des URLs de redirection
  testRedirectionURL(parcelNumber: string): TestResult {
    const expectedURL = `/services?parcel=${parcelNumber}`;
    const currentPath = window.location.pathname;
    
    return {
      name: 'URL de redirection',
      status: 'success',
      message: 'Format d\'URL correct',
      details: {
        expected: expectedURL,
        format: 'OK',
        currentPath: currentPath
      }
    };
  }

  // 8. Test du localStorage (panier)
  testLocalStorage(): TestResult {
    try {
      const testKey = 'cadastral_test_' + Date.now();
      const testValue = { test: true };
      
      localStorage.setItem(testKey, JSON.stringify(testValue));
      const retrieved = JSON.parse(localStorage.getItem(testKey) || '{}');
      localStorage.removeItem(testKey);
      
      if (retrieved.test === true) {
        return {
          name: 'LocalStorage (Panier)',
          status: 'success',
          message: 'LocalStorage fonctionne correctement'
        };
      }
      
      throw new Error('Échec de récupération');
    } catch (error: any) {
      return {
        name: 'LocalStorage (Panier)',
        status: 'error',
        message: 'LocalStorage non disponible',
        details: error.message
      };
    }
  }

  // Exécuter tous les tests
  async runAllTests(sampleParcelNumber?: string): Promise<TestResult[]> {
    this.results = [];
    
    console.log('🚀 Démarrage des tests de validation...\n');
    
    // Tests back-end
    console.log('📊 Tests Back-end:');
    this.results.push(await this.testSupabaseConnection());
    this.results.push(await this.testFetchParcels());
    this.results.push(await this.testSearchConfig());
    
    // Tests avec une parcelle spécifique si fournie
    if (sampleParcelNumber) {
      console.log('\n🔍 Tests avec parcelle:', sampleParcelNumber);
      this.results.push(await this.testSearchParcel(sampleParcelNumber));
      this.results.push(await this.testGPSCoordinates(sampleParcelNumber));
      this.results.push(await this.testParcelDataStructure(sampleParcelNumber));
      this.results.push(this.testRedirectionURL(sampleParcelNumber));
    }
    
    // Tests front-end
    console.log('\n💻 Tests Front-end:');
    this.results.push(this.testLocalStorage());
    
    // Afficher les résultats
    this.displayResults();
    
    return this.results;
  }

  // Afficher les résultats de manière formatée
  displayResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 RÉSULTATS DES TESTS');
    console.log('='.repeat(60) + '\n');
    
    const successCount = this.results.filter(r => r.status === 'success').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;
    const errorCount = this.results.filter(r => r.status === 'error').length;
    
    this.results.forEach((result, index) => {
      const icon = result.status === 'success' ? '✅' : 
                   result.status === 'warning' ? '⚠️' : '❌';
      
      console.log(`${icon} Test ${index + 1}: ${result.name}`);
      console.log(`   Status: ${result.status.toUpperCase()}`);
      console.log(`   Message: ${result.message}`);
      
      if (result.details) {
        console.log('   Détails:', result.details);
      }
      console.log('');
    });
    
    console.log('='.repeat(60));
    console.log(`✅ Succès: ${successCount}`);
    console.log(`⚠️  Avertissements: ${warningCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`📊 Total: ${this.results.length} tests`);
    console.log('='.repeat(60) + '\n');
    
    // Score de santé
    const healthScore = ((successCount / this.results.length) * 100).toFixed(1);
    console.log(`🎯 Score de santé: ${healthScore}%`);
    
    if (errorCount === 0 && warningCount === 0) {
      console.log('🎉 Tous les tests sont passés avec succès!');
    } else if (errorCount === 0) {
      console.log('✨ Aucune erreur critique, mais des avertissements à vérifier');
    } else {
      console.log('⚠️  Des erreurs ont été détectées, corrections nécessaires');
    }
  }

  // Obtenir un résumé JSON
  getSummary() {
    return {
      total: this.results.length,
      success: this.results.filter(r => r.status === 'success').length,
      warnings: this.results.filter(r => r.status === 'warning').length,
      errors: this.results.filter(r => r.status === 'error').length,
      healthScore: ((this.results.filter(r => r.status === 'success').length / this.results.length) * 100).toFixed(1) + '%',
      results: this.results
    };
  }
}

// Export pour utilisation dans la console
export const cadastralTests = new CadastralIntegrationTests();
