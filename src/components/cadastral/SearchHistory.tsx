import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Star, X, ChevronDown, Trash2 } from 'lucide-react';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SearchHistoryProps {
  onSelectHistory: (query: string) => void;
  onSelectFavorite: (parcelNumber: string) => void;
  isCompact?: boolean;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({
  onSelectHistory,
  onSelectFavorite,
  isCompact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'favorites'>('history');
  const { history, favorites, removeFromHistory, clearHistory, removeFromFavorites } = useSearchHistory();

  return (
    <Card className="p-3 bg-background/95 backdrop-blur-md shadow-lg rounded-2xl border border-border/50 max-w-[360px]">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between h-10 text-sm font-semibold px-3 rounded-xl hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <History className="h-4 w-4 text-primary" />
              </div>
              <span>Historique & Favoris</span>
              {(history.length > 0 || favorites.length > 0) && (
                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-bold">
                  {history.length + favorites.length}
                </span>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3">
          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-muted/30 rounded-xl mb-3">
            <Button
              variant={activeTab === 'history' ? 'default' : 'ghost'}
              size="sm"
              className={`flex-1 h-9 text-sm rounded-lg ${activeTab === 'history' ? 'shadow-md' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <History className="h-3.5 w-3.5 mr-1.5" />
              Historique ({history.length})
            </Button>
            <Button
              variant={activeTab === 'favorites' ? 'default' : 'ghost'}
              size="sm"
              className={`flex-1 h-9 text-sm rounded-lg ${activeTab === 'favorites' ? 'shadow-md' : ''}`}
              onClick={() => setActiveTab('favorites')}
            >
              <Star className="h-3.5 w-3.5 mr-1.5" />
              Favoris ({favorites.length})
            </Button>
          </div>

          {/* Historique */}
          {activeTab === 'history' && (
            <div className="space-y-2">
              {history.length === 0 ? (
                <div className="p-4 rounded-xl bg-muted/20 text-center">
                  <History className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Aucune recherche récente
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground font-medium">
                      Recherches récentes
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className="h-8 text-sm px-2.5 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Effacer
                    </Button>
                  </div>
                  <ScrollArea className="h-[180px]">
                    <div className="space-y-1.5 pr-3">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 hover:bg-muted/50 rounded-xl cursor-pointer group transition-colors"
                          onClick={() => onSelectHistory(item.query)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.query}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(item.timestamp, { addSuffix: true, locale: fr })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromHistory(item.id);
                            }}
                            className="h-7 w-7 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          )}

          {/* Favoris */}
          {activeTab === 'favorites' && (
            <div className="space-y-2">
              {favorites.length === 0 ? (
                <div className="p-4 rounded-xl bg-muted/20 text-center">
                  <Star className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Aucune parcelle favorite
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[180px]">
                  <div className="space-y-1.5 pr-3">
                    {favorites.map((fav) => (
                      <div
                        key={fav.id}
                        className="flex items-center justify-between p-2.5 hover:bg-muted/50 rounded-xl cursor-pointer group transition-colors"
                        onClick={() => onSelectFavorite(fav.parcel_number)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                            <p className="text-sm font-medium truncate">{fav.parcel_number}</p>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{fav.owner_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{fav.location}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromFavorites(fav.id);
                          }}
                          className="h-7 w-7 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default SearchHistory;
