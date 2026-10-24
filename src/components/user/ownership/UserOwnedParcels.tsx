import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserOwnershipClaims } from './UserOwnershipClaims';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Loader2, MapPin } from 'lucide-react';
import { useOwnedParcels } from '@/hooks/useOwnership';

export const UserOwnedParcels: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get('sub') === 'claim' ? 'claim' : 'list';
  const setSub = (v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v === 'claim') next.set('sub', 'claim'); else next.delete('sub');
    setSearchParams(next, { replace: true });
  };
  return (
    <Tabs value={sub} onValueChange={setSub} className="space-y-3">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="list">Mes parcelles</TabsTrigger>
        <TabsTrigger value="claim">Revendiquer une parcelle</TabsTrigger>
      </TabsList>
      <TabsContent value="list"><OwnedParcelsList onClaim={() => setSub('claim')} /></TabsContent>
      <TabsContent value="claim"><UserOwnershipClaims /></TabsContent>
    </Tabs>
  );
};

const OwnedParcelsList: React.FC<{ onClaim: () => void }> = ({ onClaim }) => {
  const { data = [], isLoading, error } = useOwnedParcels();
  const navigate = useNavigate();

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Home className="h-4 w-4 text-primary" /> Mes parcelles</CardTitle>
        <p className="text-xs text-muted-foreground">
          Parcelles dont vous êtes le propriétaire validé. Vous pouvez demander la modification de leurs informations depuis « Contributions CCC ».
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
        {error && <p className="text-sm text-destructive">Impossible de charger vos parcelles.</p>}
        {!isLoading && !error && data.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Aucune parcelle validée à votre nom pour le moment.</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button size="sm" onClick={() => navigate('/cadastral-map')}>Enregistrer ma parcelle</Button>
              <Button size="sm" variant="outline" onClick={onClaim}>Revendiquer une parcelle</Button>
            </div>
          </div>
        )}
        {data.map((p) => (
          <div key={p.id} className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{p.parcel_number}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {[p.quartier, p.commune, p.ville, p.province].filter(Boolean).join(', ') || 'Localisation non précisée'}
              </p>
              {p.owner_linked_at && (
                <p className="text-[11px] text-muted-foreground">Gérée par votre compte depuis le {new Date(p.owner_linked_at).toLocaleDateString('fr-FR')}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate(`/cadastral-map?search=${encodeURIComponent(p.parcel_number)}`)}>Voir sur la carte</Button>
              {p.contribution_id && (
                <Button size="sm" onClick={() => navigate('/mon-compte?tab=contributions')}>Demander une modification</Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default UserOwnedParcels;
