import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Shield, ShieldX, Search, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  report: 'Rapport',
  invoice: 'Facture',
  permit: 'Permis',
  certificate: 'Certificat',
  expertise: 'Expertise',
  mortgage_receipt: 'Hypothèque',
};

const AdminDocumentVerifications: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [invalidateDoc, setInvalidateDoc] = useState<any>(null);
  const [invalidationReason, setInvalidationReason] = useState('');

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['admin-document-verifications', search],
    queryFn: async () => {
      let query = supabase
        .from('document_verifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (search.trim()) {
        query = query.or(`verification_code.ilike.%${search}%,parcel_number.ilike.%${search}%,client_name.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const invalidateMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('document_verifications')
        .update({
          is_valid: false,
          invalidated_at: new Date().toISOString(),
          invalidated_by: user?.id,
          invalidation_reason: reason,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Document invalidé');
      queryClient.invalidateQueries({ queryKey: ['admin-document-verifications'] });
      setInvalidateDoc(null);
      setInvalidationReason('');
    },
    onError: () => toast.error("Erreur lors de l'invalidation"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Vérifications de Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par code, parcelle ou nom..."
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Parcelle</TableHead>
                  <TableHead>Bénéficiaire</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc: any) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-mono text-xs">{doc.verification_code}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{doc.parcel_number}</TableCell>
                    <TableCell className="text-sm">{doc.client_name || '—'}</TableCell>
                    <TableCell className="text-xs">{new Date(doc.generated_at).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>
                      {doc.is_valid ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Valide</Badge>
                      ) : (
                        <Badge variant="destructive">Invalidé</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {doc.is_valid && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInvalidateDoc(doc)}
                          className="text-destructive hover:text-destructive"
                        >
                          <ShieldX className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {documents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Aucun document trouvé
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Invalidation dialog */}
        <Dialog open={!!invalidateDoc} onOpenChange={() => setInvalidateDoc(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invalider le document</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Code : <span className="font-mono">{invalidateDoc?.verification_code}</span>
            </p>
            <Textarea
              value={invalidationReason}
              onChange={e => setInvalidationReason(e.target.value)}
              placeholder="Raison de l'invalidation..."
              rows={3}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setInvalidateDoc(null)}>Annuler</Button>
              <Button
                variant="destructive"
                disabled={!invalidationReason.trim() || invalidateMutation.isPending}
                onClick={() => invalidateMutation.mutate({ id: invalidateDoc.id, reason: invalidationReason })}
              >
                {invalidateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Invalider
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AdminDocumentVerifications;
