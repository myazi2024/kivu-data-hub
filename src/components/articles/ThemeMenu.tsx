import { ArticleTheme } from '@/hooks/useArticles';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeMenuProps {
  themes: ArticleTheme[];
  activeThemeId?: string;
  onThemeSelect: (themeId: string | undefined) => void;
}

const ThemeMenu = ({ themes, activeThemeId, onThemeSelect }: ThemeMenuProps) => {
  const getIcon = (iconName: string) => {
    const Icon = Icons[iconName as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
    return Icon || Icons.FileText;
  };

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 p-3 min-w-max">
          {/* Bouton "Tous" */}
          <button
            onClick={() => onThemeSelect(undefined)}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 whitespace-nowrap min-w-[80px]",
              !activeThemeId
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <Icons.Grid3x3 className="h-5 w-5" />
            <span className="text-xs font-medium">Tous</span>
          </button>

          {/* Thématiques */}
          {themes.map((theme) => {
            const IconComponent = getIcon(theme.icon_name);
            return (
              <button
                key={theme.id}
                onClick={() => onThemeSelect(theme.id)}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 whitespace-nowrap min-w-[80px]",
                  activeThemeId === theme.id
                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:scale-105"
                )}
              >
                <IconComponent className="h-5 w-5" />
                <span className="text-xs font-medium">{theme.short_name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ThemeMenu;
