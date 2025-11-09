/**
 * Expose les fonctions de test à la console du navigateur
 * Utilisation: window.cadastralTests.runFullTest('GOM/NOR/ZLE/065')
 */

import { cadastralTests } from './testCadastralIntegration';

declare global {
  interface Window {
    cadastralTests: {
      runFullTest: (parcelNumber?: string) => Promise<void>;
      testConnection: () => Promise<void>;
      testSearch: (parcelNumber: string) => Promise<void>;
      help: () => void;
    };
  }
}

export const exposeCadastralTests = () => {
  window.cadastralTests = {
    runFullTest: async (parcelNumber?: string) => {
      console.log('🧪 Exécution de tous les tests...');
      await cadastralTests.runAllTests(parcelNumber);
    },
    
    testConnection: async () => {
      console.log('🔌 Test de connexion...');
      const result = await cadastralTests.testSupabaseConnection();
      console.log(result);
    },
    
    testSearch: async (parcelNumber: string) => {
      console.log(`🔍 Test de recherche pour ${parcelNumber}...`);
      const result = await cadastralTests.testSearchParcel(parcelNumber);
      console.log(result);
    },
    
    help: () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║          Tests de Validation Cadastrale                    ║
╚════════════════════════════════════════════════════════════╝

📋 Commandes disponibles:

1️⃣  window.cadastralTests.runFullTest('PARCEL_NUMBER')
   Exécute tous les tests de validation
   Exemple: window.cadastralTests.runFullTest('GOM/NOR/ZLE/065')

2️⃣  window.cadastralTests.testConnection()
   Teste uniquement la connexion Supabase

3️⃣  window.cadastralTests.testSearch('PARCEL_NUMBER')
   Teste la recherche d'une parcelle spécifique
   Exemple: window.cadastralTests.testSearch('GOM/NOR/ZLE/065')

4️⃣  window.cadastralTests.help()
   Affiche cette aide

💡 Astuce: Ouvrez la console (F12) et exécutez ces commandes
      `);
    }
  };

  // Afficher l'aide au chargement
  console.log('🧪 Tests cadastraux disponibles! Tapez window.cadastralTests.help() pour voir les commandes.');
};
