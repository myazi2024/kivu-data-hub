import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, TreePine } from 'lucide-react';
import { SubdivisionCommonSpace, COMMON_SPACE_LABELS, COMMON_SPACE_COLORS } from '../../types';
import { genId } from '../../utils/polygonOps';

interface Props {
  commonSpaces: SubdivisionCommonSpace[];
  setCommonSpaces: (spaces: SubdivisionCommonSpace[]) => void;
}

const CommonSpacesPanel: React.FC<Props> = ({ commonSpaces, setCommonSpaces }) => {
  const handleAdd = () => {
    const newSpace: SubdivisionCommonSpace = {
      id: genId('cs'),
      type: 'green_space',
      name: `Espace ${commonSpaces.length + 1}`,
      vertices: [],
      areaSqm: 0,
      color: COMMON_SPACE_COLORS.green_space,
    };
    setCommonSpaces([...commonSpaces, newSpace]);
  };

  return (
    <Card>
      <CardContent className="pt-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-xs flex items-center gap-1">
            <TreePine className="h-3.5 w-3.5" aria-hidden="true" />
            Espaces communs ({commonSpaces.length})
          </h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleAdd}
            aria-label="Ajouter un espace commun"
            title="Ajouter un espace commun"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="space-y-1 max-h-[150px] overflow-y-auto">
          {commonSpaces.map((space) => (
            <div key={space.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs hover:bg-muted/50">
              <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: space.color }} aria-hidden="true" />
              <div className="flex-1 space-y-1">
                <Label htmlFor={`cs-name-${space.id}`} className="sr-only">Nom de l'espace commun</Label>
                <Input
                  id={`cs-name-${space.id}`}
                  value={space.name}
                  onChange={e => setCommonSpaces(commonSpaces.map(s => s.id === space.id ? { ...s, name: e.target.value } : s))}
                  className="h-6 text-xs"
                />
                <div className="flex gap-1">
                  <Select
                    value={space.type}
                    onValueChange={(v: SubdivisionCommonSpace['type']) =>
                      setCommonSpaces(commonSpaces.map(s => s.id === space.id ? { ...s, type: v, color: COMMON_SPACE_COLORS[v] || s.color } : s))
                    }
                  >
                    <SelectTrigger className="h-6 text-[10px] flex-1" aria-label="Type d'espace commun"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(COMMON_SPACE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="m²"
                    value={space.areaSqm || ''}
                    onChange={e => setCommonSpaces(commonSpaces.map(s => s.id === space.id ? { ...s, areaSqm: parseFloat(e.target.value) || 0 } : s))}
                    className="h-6 text-[10px] w-16"
                    aria-label="Surface en m²"
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-destructive"
                onClick={() => setCommonSpaces(commonSpaces.filter(s => s.id !== space.id))}
                aria-label={`Supprimer ${space.name}`}
                title="Supprimer"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {commonSpaces.length === 0 && (
            <p className="text-center text-muted-foreground text-[10px] py-2">Aucun espace commun</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CommonSpacesPanel;
