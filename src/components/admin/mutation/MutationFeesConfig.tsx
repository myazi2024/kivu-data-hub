import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, Plus, Edit2, Trash2, RotateCcw } from 'lucide-react';
import type { MutationFee } from '@/types/mutation';

interface Props {
  fees: MutationFee[];
  onAdd: () => void;
  onEdit: (fee: MutationFee) => void;
  onToggleActive: (feeId: string, currentlyActive: boolean) => void;
}

const MutationFeesConfig: React.FC<Props> = ({ fees, onAdd, onEdit, onToggleActive }) => {
  const activeFees = fees.filter(f => f.is_active);
  const inactiveFees = fees.filter(f => !f.is_active);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration des frais
          </CardTitle>
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {activeFees.map((fee) => (
            <div key={fee.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{fee.fee_name}</span>
                  {fee.is_mandatory && (
                    <Badge variant="secondary" className="text-[10px]">Obligatoire</Badge>
                  )}
                </div>
                {fee.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{fee.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">${Number(fee.amount_usd).toFixed(2)}</span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(fee)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive"
                  onClick={() => onToggleActive(fee.id, true)}
                  title="Désactiver"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}

          {inactiveFees.length > 0 && (
            <>
              <Separator className="my-3" />
              <p className="text-xs font-medium text-muted-foreground">Frais désactivés</p>
              {inactiveFees.map((fee) => (
                <div key={fee.id} className="flex items-center justify-between p-3 border rounded-lg opacity-60">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm line-through">{fee.fee_name}</span>
                      <Badge variant="outline" className="text-[10px]">Inactif</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">${Number(fee.amount_usd).toFixed(2)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-green-600"
                      onClick={() => onToggleActive(fee.id, false)}
                      title="Réactiver"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MutationFeesConfig;
