import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, StatusType } from '@/components/shared/StatusBadge';
import { Receipt, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { TaxDeclaration, TaxInfo } from './taxDeclarationTypes';

type ActionType = 'approve' | 'reject' | 'return' | null;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  declaration: TaxDeclaration | null;
  info: TaxInfo | null;
  actionType: ActionType;
  setActionType: (v: ActionType) => void;
  rejectionReason: string;
  setRejectionReason: (v: string) => void;
  returnReason: string;
  setReturnReason: (v: string) => void;
  processing: boolean;
  onConfirm: () => void;
}

export const TaxDeclarationDetailDialog = ({
  open, onOpenChange, declaration, info, actionType, setActionType,
  rejectionReason, setRejectionReason, returnReason, setReturnReason,
  processing, onConfirm,
}: Props) => {
  const isActionable = declaration && (declaration.status === 'pending' || declaration.status === 'returned');

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!processing) onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Déclaration fiscale
          </DialogTitle>
          <DialogDescription>
            {declaration?.parcel_number} — {info?.taxType}
          </DialogDescription>
        </DialogHeader>

        {declaration && info && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Parcelle</Label>
                <p className="font-mono font-medium">{declaration.parcel_number}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Statut</Label>
                <div><StatusBadge status={declaration.status as StatusType} /></div>
              </div>
              {declaration.current_owner_name && (
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Propriétaire</Label>
                  <p>{declaration.current_owner_name}</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-secondary rounded-lg space-y-2">
              <h4 className="font-semibold text-xs uppercase text-muted-foreground">Détails fiscaux</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs text-muted-foreground">Type</Label><p>{info.taxType}</p></div>
                <div><Label className="text-xs text-muted-foreground">Exercice</Label><p>{info.taxYear}</p></div>
                <div>
                  <Label className="text-xs text-muted-foreground">Montant total</Label>
                  <p className="font-bold text-emerald-600">{info.amount.toLocaleString()} USD</p>
                </div>
                {info.nif && (
                  <div><Label className="text-xs text-muted-foreground">NIF</Label><p className="font-mono">{info.nif}</p></div>
                )}
                {info.baseTax > 0 && (
                  <div><Label className="text-xs text-muted-foreground">Base imposable</Label><p>{info.baseTax.toLocaleString()} USD</p></div>
                )}
                {info.penalties > 0 && (
                  <div><Label className="text-xs text-muted-foreground">Pénalités</Label><p className="text-destructive">{info.penalties.toLocaleString()} USD</p></div>
                )}
                {info.fees > 0 && (
                  <div><Label className="text-xs text-muted-foreground">Frais</Label><p>{info.fees.toLocaleString()} USD</p></div>
                )}
                {info.fiscalZone && (
                  <div><Label className="text-xs text-muted-foreground">Zone fiscale</Label><p>{info.fiscalZone}</p></div>
                )}
                {info.isExempt && (
                  <div className="col-span-2">
                    <Badge variant="outline" className="text-emerald-600 border-emerald-300">Exonéré</Badge>
                  </div>
                )}
              </div>
              {info.exemptions?.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Exonérations</Label>
                  {info.exemptions.map((ex, i) => <p key={i} className="text-xs">• {ex}</p>)}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs text-muted-foreground">Province</Label><p>{declaration.province || '—'}</p></div>
              <div><Label className="text-xs text-muted-foreground">Ville</Label><p>{declaration.ville || '—'}</p></div>
              <div><Label className="text-xs text-muted-foreground">Superficie</Label><p>{declaration.area_sqm ? `${declaration.area_sqm.toLocaleString()} m²` : '—'}</p></div>
              <div>
                <Label className="text-xs text-muted-foreground">Date soumission</Label>
                <p>{format(new Date(declaration.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
              </div>
            </div>

            {isActionable && (
              <div className="space-y-3 pt-2 border-t">
                {actionType === 'reject' && (
                  <div>
                    <Label className="text-xs">Motif de rejet *</Label>
                    <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                      placeholder="Indiquez le motif du rejet..." className="mt-1 text-xs" rows={3} />
                  </div>
                )}
                {actionType === 'return' && (
                  <div>
                    <Label className="text-xs">Motif du renvoi *</Label>
                    <Textarea value={returnReason} onChange={e => setReturnReason(e.target.value)}
                      placeholder="Indiquez les corrections nécessaires..." className="mt-1 text-xs" rows={3} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isActionable && (
            <>
              {actionType === null ? (
                <>
                  <Button variant="outline" size="sm" className="gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                    onClick={() => setActionType('return')}>
                    <RotateCcw className="h-3.5 w-3.5" /> Renvoyer
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => setActionType('reject')}>
                    <XCircle className="h-3.5 w-3.5" /> Rejeter
                  </Button>
                  <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setActionType('approve')}>
                    <CheckCircle className="h-3.5 w-3.5" /> Approuver
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setActionType(null)} disabled={processing}>Annuler</Button>
                  <Button size="sm" disabled={processing} onClick={onConfirm}
                    className={
                      actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                      actionType === 'reject' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' :
                      'bg-orange-600 hover:bg-orange-700 text-white'
                    }>
                    {processing ? 'Traitement...' : 'Confirmer'}
                  </Button>
                </>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
