import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  category: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

const getParcelSectionType = (parcelNumber: string): 'SU' | 'SR' => {
  const parts = parcelNumber.split('/');
  
  if (parcelNumber.includes('Avenue') || parcelNumber.includes('Av.') || parts.length <= 4) {
    return 'SU';
  }
  
  return 'SR';
};

export const validateSectionTypeDisplay = async (): Promise<ValidationResult[]> => {
  const results: ValidationResult[] = [];

  try {
    // 1. Vérifier que nous pouvons récupérer des parcelles
    const { data: parcels, error: parcelsError } = await supabase
      .from('cadastral_parcels')
      .select('id, parcel_number, parcel_type, ville, commune, quartier')
      .is('deleted_at', null)
      .limit(10);

    if (parcelsError) {
      results.push({
        category: 'Récupération des parcelles',
        status: 'error',
        message: 'Erreur lors de la récupération des parcelles',
        details: parcelsError.message
      });
      return results;
    }

    results.push({
      category: 'Récupération des parcelles',
      status: 'success',
      message: `✓ ${parcels?.length || 0} parcelles récupérées pour le test`
    });

    // 2. Vérifier la logique de détermination du type de section
    if (parcels && parcels.length > 0) {
      const typesDetected = {
        SU: 0,
        SR: 0
      };

      const examples: { parcel: string; detected: string; actual?: string }[] = [];

      parcels.forEach(parcel => {
        const detectedType = getParcelSectionType(parcel.parcel_number);
        typesDetected[detectedType]++;
        
        examples.push({
          parcel: parcel.parcel_number,
          detected: detectedType,
          actual: parcel.parcel_type
        });
      });

      results.push({
        category: 'Détection des types',
        status: 'success',
        message: `✓ Types détectés - SU: ${typesDetected.SU}, SR: ${typesDetected.SR}`,
        details: examples
      });

      // 3. Vérifier la cohérence avec le type de parcelle en base
      const incoherences = examples.filter(ex => {
        if (!ex.actual) return false;
        const actualNormalized = ex.actual.toLowerCase();
        const isUrban = actualNormalized.includes('urbain') || actualNormalized === 'urban';
        const isRural = actualNormalized.includes('rural');
        
        if (isUrban && ex.detected !== 'SU') return true;
        if (isRural && ex.detected !== 'SR') return true;
        return false;
      });

      if (incoherences.length === 0) {
        results.push({
          category: 'Cohérence des types',
          status: 'success',
          message: `✓ Tous les types détectés sont cohérents avec la base de données`
        });
      } else {
        results.push({
          category: 'Cohérence des types',
          status: 'warning',
          message: `⚠ ${incoherences.length} incohérences détectées`,
          details: incoherences
        });
      }
    }

    // 4. Tester la recherche prédictive
    const testSearches = ['GOMA', 'NK', 'Avenue'];
    
    for (const searchQuery of testSearches) {
      const { data: searchResults, error: searchError } = await supabase
        .from('cadastral_parcels')
        .select('id, parcel_number, parcel_type, ville, commune, quartier')
        .ilike('parcel_number', `%${searchQuery}%`)
        .is('deleted_at', null)
        .limit(5);

      if (searchError) {
        results.push({
          category: `Recherche "${searchQuery}"`,
          status: 'error',
          message: `✗ Erreur lors de la recherche`,
          details: searchError.message
        });
      } else {
        const searchWithTypes = searchResults?.map(r => ({
          parcel: r.parcel_number,
          type: getParcelSectionType(r.parcel_number)
        }));

        results.push({
          category: `Recherche "${searchQuery}"`,
          status: 'success',
          message: `✓ ${searchResults?.length || 0} résultats trouvés`,
          details: searchWithTypes
        });
      }
    }

    // 5. Résumé final
    const errorCount = results.filter(r => r.status === 'error').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const successCount = results.filter(r => r.status === 'success').length;

    results.push({
      category: 'Résumé',
      status: errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'success',
      message: `Test terminé - ✓ ${successCount} succès, ⚠ ${warningCount} avertissements, ✗ ${errorCount} erreurs`
    });

  } catch (error: any) {
    results.push({
      category: 'Test global',
      status: 'error',
      message: `Erreur lors de la validation`,
      details: error.message
    });
  }

  return results;
};
