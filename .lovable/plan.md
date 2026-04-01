

# Suppression de "Kiosque" du menu Media

## Modification

**Fichier** : `src/components/ui/navigation.tsx`, ligne 27

Supprimer l'entrée `{ name: 'Kiosque', href: '/publications', icon: BookOpen, description: 'Publications et documents' }` de la colonne "Ressources" du mega-menu Media.

L'import `BookOpen` sera aussi supprimé s'il n'est plus utilisé ailleurs dans ce fichier.

La route `/publications` et le composant `CartSidebar.tsx` (qui mentionne "kiosque" dans un texte d'aide) ne sont pas affectés — seul le lien de navigation est retiré.

