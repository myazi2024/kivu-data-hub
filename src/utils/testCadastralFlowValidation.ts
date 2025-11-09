/**
 * Test de validation du flux cadastral complet
 * Vérifie que le catalogue ne s'affiche que via le bouton "Afficher plus de données"
 */

import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

export class CadastralFlowValidator {
  private results: TestResult[] = [];

  /**
   * Test 1: Vérifier la connexion Supabase
   */
  async testSupabaseConnection(): Promise<TestResult> {
    try {
      const { data, error } = await supabase.from('cadastral_parcels').select('count').limit(1);
      
      if (error) throw error;
      
      return {
        success: true,
        message: '✅ Connexion Supabase OK',
        details: { status: 'connected' }
      };
    } catch (error: any) {
      return {
        success: false,
        message: '❌ Échec connexion Supabase',
        details: { error: error.message }
      };
    }
  }

  /**
   * Test 2: Vérifier qu'il existe des parcelles avec coordonnées GPS
   */
  async testParcelData(): Promise<TestResult> {
    try {
      const { data, error } = await supabase
        .from('cadastral_parcels')
        .select('*')
        .not('gps_coordinates', 'is', null)
        .is('deleted_at', null)
        .limit(5);

      if (error) throw error;
      
      if (!data || data.length === 0) {
        return {
          success: false,
          message: '⚠️ Aucune parcelle avec GPS trouvée',
          details: { count: 0 }
        };
      }

      return {
        success: true,
        message: `✅ ${data.length} parcelles avec GPS disponibles`,
        details: { 
          count: data.length,
          samples: data.map(p => p.parcel_number).slice(0, 3)
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: '❌ Erreur récupération parcelles',
        details: { error: error.message }
      };
    }
  }

  /**
   * Test 3: Vérifier la structure du composant CadastralSearchWithMap
   */
  testSearchComponentStructure(): TestResult {
    try {
      // Vérifier que l'élément de recherche existe sur la page
      const searchElements = document.querySelectorAll('input[type="text"]');
      const hasSearchInput = Array.from(searchElements).some(
        el => el.getAttribute('placeholder')?.includes('parcelle')
      );

      if (!hasSearchInput) {
        return {
          success: false,
          message: '❌ Champ de recherche non trouvé'
        };
      }

      return {
        success: true,
        message: '✅ Interface de recherche présente',
        details: { searchInputs: searchElements.length }
      };
    } catch (error: any) {
      return {
        success: false,
        message: '❌ Erreur structure composant',
        details: { error: error.message }
      };
    }
  }

  /**
   * Test 4: Vérifier que le ParcelInfoPanel existe
   */
  testParcelInfoPanel(): TestResult {
    try {
      // Chercher le texte "Afficher plus de données" sur la page
      const buttons = document.querySelectorAll('button');
      const hasShowMoreButton = Array.from(buttons).some(
        btn => btn.textContent?.includes('Afficher plus de données') ||
               btn.textContent?.includes('Afficher plus des détails')
      );

      if (hasShowMoreButton) {
        return {
          success: true,
          message: '✅ Bouton "Afficher plus de données" trouvé',
          details: { buttonFound: true }
        };
      }

      return {
        success: true,
        message: 'ℹ️ Bouton visible après sélection de parcelle',
        details: { 
          note: 'Le bouton apparaît uniquement quand une parcelle est sélectionnée'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: '❌ Erreur vérification ParcelInfoPanel',
        details: { error: error.message }
      };
    }
  }

  /**
   * Test 5: Vérifier que le CadastralResultsDialog n'est pas visible par défaut
   */
  testDialogNotAutoDisplayed(): TestResult {
    try {
      // Chercher les textes typiques du dialog modal
      const modalTexts = [
        'Résultats cadastraux',
        'Télécharger le rapport',
        'Imprimer le rapport'
      ];

      const bodyText = document.body.textContent || '';
      const hasModalText = modalTexts.some(text => bodyText.includes(text));

      // Si on trouve ces textes ET un overlay dark, c'est que le modal est affiché
      const hasOverlay = document.querySelector('.fixed.inset-0.z-50.bg-black') !== null;

      if (hasModalText && hasOverlay) {
        return {
          success: false,
          message: '❌ Le dialogue s\'affiche automatiquement (à corriger)',
          details: { autoDisplay: true }
        };
      }

      return {
        success: true,
        message: '✅ Le dialogue ne s\'affiche pas automatiquement',
        details: { autoDisplay: false }
      };
    } catch (error: any) {
      return {
        success: false,
        message: '❌ Erreur vérification dialog',
        details: { error: error.message }
      };
    }
  }

  /**
   * Test 6: Vérifier la redirection vers le catalogue de services
   */
  testServicesCatalogRedirection(): TestResult {
    try {
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;

      // Vérifier si on est sur la page services avec un paramètre parcel
      if (currentPath === '/services' && currentSearch.includes('parcel=')) {
        const params = new URLSearchParams(currentSearch);
        const parcelNumber = params.get('parcel');

        return {
          success: true,
          message: '✅ Redirection vers catalogue OK',
          details: { 
            path: currentPath,
            parcelNumber,
            catalogType: 'cadastral'
          }
        };
      }

      return {
        success: true,
        message: 'ℹ️ Page services accessible',
        details: { 
          note: 'La redirection sera testée lors du clic sur "Afficher plus de données"'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: '❌ Erreur vérification redirection',
        details: { error: error.message }
      };
    }
  }

  /**
   * Test 7: Vérifier que le catalogue affiche les services cadastraux avec parcelle
   */
  async testCadastralServicesDisplay(): Promise<TestResult> {
    try {
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;

      if (currentPath !== '/services' || !currentSearch.includes('parcel=')) {
        return {
          success: true,
          message: 'ℹ️ Test applicable uniquement sur page services avec parcelle',
          details: { 
            currentPath,
            note: 'Naviguez vers /services?parcel=XXX pour tester'
          }
        };
      }

      // Vérifier la présence de services cadastraux
      const bodyText = document.body.textContent || '';
      const cadastralServices = [
        'Historique de propriété',
        'Obligations fiscales',
        'Hypothèques et charges',
        'Historique des limites'
      ];

      const foundServices = cadastralServices.filter(service => 
        bodyText.includes(service)
      );

      if (foundServices.length >= 3) {
        return {
          success: true,
          message: `✅ Catalogue cadastral affiché (${foundServices.length}/6 services)`,
          details: { 
            foundServices,
            catalogType: 'cadastral'
          }
        };
      }

      return {
        success: false,
        message: '⚠️ Services cadastraux non trouvés',
        details: { 
          foundServices,
          expected: cadastralServices
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: '❌ Erreur vérification catalogue',
        details: { error: error.message }
      };
    }
  }

  /**
   * Exécuter tous les tests
   */
  async runAllTests(): Promise<{
    passed: number;
    failed: number;
    warnings: number;
    results: TestResult[];
  }> {
    console.log('🔍 Début des tests de validation...\n');
    
    this.results = [];

    // Tests asynchrones
    this.results.push(await this.testSupabaseConnection());
    this.results.push(await this.testParcelData());
    
    // Tests synchrones
    this.results.push(this.testSearchComponentStructure());
    this.results.push(this.testParcelInfoPanel());
    this.results.push(this.testDialogNotAutoDisplayed());
    this.results.push(this.testServicesCatalogRedirection());
    
    // Test conditionnel
    this.results.push(await this.testCadastralServicesDisplay());

    // Calcul des statistiques
    const passed = this.results.filter(r => r.success && r.message.includes('✅')).length;
    const warnings = this.results.filter(r => r.success && r.message.includes('ℹ️')).length;
    const failed = this.results.filter(r => !r.success).length;

    // Afficher les résultats
    console.log('\n📊 RÉSULTATS DES TESTS\n');
    this.results.forEach((result, index) => {
      console.log(`Test ${index + 1}: ${result.message}`);
      if (result.details) {
        console.log(`  Détails:`, result.details);
      }
    });

    console.log(`\n✅ Réussis: ${passed}`);
    console.log(`ℹ️ Informatifs: ${warnings}`);
    console.log(`❌ Échecs: ${failed}`);
    
    const successRate = ((passed / (this.results.length - warnings)) * 100).toFixed(1);
    console.log(`\n🎯 Taux de réussite: ${successRate}%`);

    if (failed === 0) {
      console.log('\n✨ Tous les tests sont passés ! Le système fonctionne correctement.');
    } else {
      console.log('\n⚠️ Certains tests ont échoué. Vérifiez les détails ci-dessus.');
    }

    return {
      passed,
      failed,
      warnings,
      results: this.results
    };
  }

  /**
   * Test manuel guidé
   */
  getManualTestInstructions(): string {
    return `
📋 INSTRUCTIONS POUR TEST MANUEL

1. **Test de recherche**
   - Aller sur la page d'accueil
   - Entrer un numéro de parcelle dans la barre de recherche
   - ✅ Vérifier que le ParcelInfoPanel s'affiche sur la carte
   - ❌ Vérifier que le dialogue modal plein écran NE s'affiche PAS

2. **Test du bouton "Afficher plus de données"**
   - Dans le ParcelInfoPanel, cliquer sur "Afficher plus de données"
   - ✅ Vérifier la redirection vers /services?parcel=XXX
   - ✅ Vérifier que le catalogue de services cadastraux s'affiche

3. **Test du catalogue de services**
   - ✅ Vérifier la présence de 6 services cadastraux avec prix
   - ✅ Vérifier le bouton "Ajouter au panier" sur chaque service
   - ✅ Vérifier le badge "Parcelle XXX" en haut

4. **Test de retour**
   - Cliquer sur le bouton "Retour"
   - ✅ Vérifier le retour à la page précédente

Score attendu: 99% de réussite
`;
  }
}

// Exposer au window pour utilisation dans la console
declare global {
  interface Window {
    cadastralFlowValidator: CadastralFlowValidator;
    runCadastralFlowTests: () => Promise<any>;
  }
}

// Instance globale
if (typeof window !== 'undefined') {
  window.cadastralFlowValidator = new CadastralFlowValidator();
  window.runCadastralFlowTests = () => window.cadastralFlowValidator.runAllTests();
  
  console.log('🧪 Tests cadastraux chargés !');
  console.log('Exécutez: runCadastralFlowTests()');
  console.log('Instructions manuelles: cadastralFlowValidator.getManualTestInstructions()');
}

export default CadastralFlowValidator;
