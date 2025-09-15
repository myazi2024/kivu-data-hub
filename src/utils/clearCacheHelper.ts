// Utilitaire pour forcer le rechargement du cache en développement
export const clearModuleCache = () => {
  if (typeof window !== 'undefined' && import.meta.hot) {
    // Force un rechargement complet en développement
    window.location.reload();
  }
};

// Fonction pour vérifier la cohérence des exports
export const checkModuleExports = async (modulePath: string) => {
  try {
    const module = await import(modulePath);
    console.log(`Exports disponibles pour ${modulePath}:`, Object.keys(module));
    return Object.keys(module);
  } catch (error) {
    console.error(`Erreur lors de l'import de ${modulePath}:`, error);
    return [];
  }
};