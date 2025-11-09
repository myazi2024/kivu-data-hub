import { runFullIntegrationTest } from './testCadastralIntegration';

// Exposer les fonctions de test dans l'objet window pour un accès depuis la console
declare global {
  interface Window {
    cadastralTests: {
      runFullTest: () => Promise<any>;
    };
  }
}

// Initialiser les tests disponibles dans la console
if (typeof window !== 'undefined') {
  window.cadastralTests = {
    runFullTest: runFullIntegrationTest
  };
  
  console.log('%c🧪 Tests cadastraux disponibles!', 'color: #00b894; font-size: 16px; font-weight: bold');
  console.log('%cUtilisez: window.cadastralTests.runFullTest()', 'color: #0984e3; font-size: 14px');
}

export {};
