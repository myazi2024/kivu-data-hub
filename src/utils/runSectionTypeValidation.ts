import { validateSectionTypeDisplay } from './testSectionTypeDisplay';

// Fonction pour exécuter le test et afficher les résultats dans la console
export const runSectionTypeValidation = async () => {
  console.log('🔍 Démarrage de la validation des types de section...\n');
  
  const results = await validateSectionTypeDisplay();
  
  results.forEach(result => {
    const icon = result.status === 'success' ? '✓' : result.status === 'warning' ? '⚠' : '✗';
    const color = result.status === 'success' ? '\x1b[32m' : result.status === 'warning' ? '\x1b[33m' : '\x1b[31m';
    const reset = '\x1b[0m';
    
    console.log(`${color}${icon} [${result.category}]${reset} ${result.message}`);
    
    if (result.details) {
      console.log('   Détails:', result.details);
    }
  });
  
  console.log('\n✅ Validation terminée\n');
  
  return results;
};

// Pour exécuter directement dans la console du navigateur:
// import { runSectionTypeValidation } from '@/utils/runSectionTypeValidation';
// runSectionTypeValidation();
