import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Shield } from 'lucide-react';
import { SubdivisionServitude } from '../../types';
import { genId } from '../../utils/polygonOps';

interface Props {
  servitudes: SubdivisionServitude[];
  setServitudes: (servitudes: SubdivisionServitude[]) => void;
}

const ServitudesPanel: React.FC<Props> = ({ servitudes, setServitudes }) => {
  const handleAdd = () => {
    const newServitude: SubdivisionServitude = {
      id: genId('srv'),
      type: 'passage',
      description: '',
      affectedLots: [],
      widthM: 3,
    };
    setServitudes([...servitudes, newServitude]);
  };

  return (
    <Card>
      <CardContent className="pt-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-xs flex items-center gap-1">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            Servitudes ({servitudes.length})
          </h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleAdd}
            aria-label="Ajouter une servitude"
            title="Ajouter une servitude"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
          {servitudes.map(srv => (
            <div key={srv.id} className="px-2 py-1.5 rounded-lg text-xs hover:bg-muted/50 space-y-1">
              <div className="flex items-center gap-1">
                <Select
                  value={srv.type}
                  onValueChange={(v: SubdivisionServitude['type']) =>
                    setServitudes(servitudes.map(s => s.id === srv.id ? { ...s, type: v } : s))
                  }
                >
                  <SelectTrigger className="h-6 text-[10px] flex-1" aria-label="Type de servitude"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passage">Passage</SelectItem>
                    <SelectItem value="drainage">Drainage</SelectItem>
                    <SelectItem value="utility">Réseau (eau/élec)</SelectItem>
                    <SelectItem value="view">Vue</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="m"
                  value={srv.widthM || ''}
                  onChange={e => setServitudes(servitudes.map(s => s.id === srv.id ? { ...s, widthM: parseFloat(e.target.value) || 0 } : s))}
                  className="h-6 text-[10px] w-14"
                  aria-label="Largeur en mètres"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-destructive"
                  onClick={() => setServitudes(servitudes.filter(s => s.id !== srv.id))}
                  aria-label="Supprimer la servitude"
                  title="Supprimer"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <Input
                value={srv.description}
                onChange={e => setServitudes(servitudes.map(s => s.id === srv.id ? { ...s, description: e.target.value } : s))}
                className="h-6 text-[10px]"
                placeholder="Description de la servitude..."
                aria-label="Description de la servitude"
              />
            </div>
          ))}
          {servitudes.length === 0 && (
            <p className="text-center text-muted-foreground text-[10px] py-2">Aucune servitude</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ServitudesPanel;
