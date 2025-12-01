import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

  const padding = isCompact ? 'p-1.5' : 'p-3';
  const textSize = isCompact ? 'text-[10px]' : 'text-xs';
  const buttonHeight = isCompact ? 'h-7' : 'h-8';

  return (
    <Card className={`${padding} bg-white/95 backdrop-blur-sm shadow-lg`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className={`w-full justify-between ${buttonHeight} ${textSize} font-semibold px-2`}
          >
            <div className="flex items-center gap-1.5">
              <History className={isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
              <span>Historique & Favoris</span>
              {(history.length > 0 || favorites.length > 0) && (
                <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                  {history.length + favorites.length}
                </span>
              )}
            </div>
            <ChevronDown className={`${isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className={`pt-2 ${isCompact ? 'mt-1' : 'mt-1.5'}`}>
          {/* Tabs */}
          <div className={`flex gap-1 border-b pb-1 mb-2`}>
            <Button
              variant={activeTab === 'history' ? 'default' : 'ghost'}
              size="sm"
              className={`flex-1 ${buttonHeight} ${textSize}`}
              onClick={() => setActiveTab('history')}
            >
              <History className={`${isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3'} mr-1`} />
              Historique ({history.length})
            </Button>
            <Button
              variant={activeTab === 'favorites' ? 'default' : 'ghost'}
              size="sm"
              className={`flex-1 ${buttonHeight} ${textSize}`}
              onClick={() => setActiveTab('favorites')}
            >
              <Star className={`${isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3'} mr-1`} />
              Favoris ({favorites.length})
            </Button>
          </div>

          {/* Historique */}
          {activeTab === 'history' && (
            <div className="space-y-1">
              {history.length === 0 ? (
                <p className={`${textSize} text-muted-foreground text-center py-3`}>
                  Aucune recherche récente
                </p>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`${textSize} text-muted-foreground font-semibold`}>
                      Recherches récentes
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className={`${buttonHeight} ${textSize} h-6 px-2`}
                    >
                      <Trash2 className="h-2.5 w-2.5 mr-1" />
                      Effacer tout
                    </Button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-1.5 hover:bg-muted/50 rounded cursor-pointer group"
                        onClick={() => onSelectHistory(item.query)}
                      >
                        <div className="flex-1">
                          <p className={`${textSize} font-medium`}>{item.query}</p>
                          <p className="text-[9px] text-muted-foreground">
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
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Favoris */}
          {activeTab === 'favorites' && (
            <div className="space-y-1">
              {favorites.length === 0 ? (
                <p className={`${textSize} text-muted-foreground text-center py-3`}>
                  Aucune parcelle favorite
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {favorites.map((fav) => (
                    <div
                      key={fav.id}
                      className="flex items-center justify-between p-1.5 hover:bg-muted/50 rounded cursor-pointer group"
                      onClick={() => onSelectFavorite(fav.parcel_number)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                          <p className={`${textSize} font-medium`}>{fav.parcel_number}</p>
                        </div>
                        <p className="text-[9px] text-muted-foreground">{fav.owner_name}</p>
                        <p className="text-[9px] text-muted-foreground">{fav.location}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromFavorites(fav.id);
                        }}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default SearchHistory;
