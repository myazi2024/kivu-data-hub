import React from 'react';
import { Button } from '@/components/ui/button';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle } from 'lucide-react';

interface CCCBulkActionsProps {
  selectedCount: number;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onClear: () => void;
}

export const CCCBulkActions: React.FC<CCCBulkActionsProps> = ({
  selectedCount,
  busy,
  onApprove,
  onReject,
  onClear,
}) => {
  if (selectedCount === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3 p-2 bg-muted rounded-md">
      <span className="text-xs font-medium">{selectedCount} sélectionnée(s)</span>
      <Button size="sm" variant="default" disabled={busy} onClick={onApprove} className="h-7 text-xs">
        <CheckCircle className="h-3 w-3 mr-1" /> Approuver
      </Button>
      <Button size="sm" variant="destructive" disabled={busy} onClick={onReject} className="h-7 text-xs">
        <XCircle className="h-3 w-3 mr-1" /> Rejeter
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear} className="h-7 text-xs">
        Désélectionner
      </Button>
    </div>
  );
};

export const CCCStatusTabsList: React.FC = () => (
  <TabsList className="grid w-full grid-cols-6 h-8 md:h-10">
    <TabsTrigger value="pending" className="text-xs md:text-sm px-1 md:px-3">Attente</TabsTrigger>
    <TabsTrigger value="returned" className="text-xs md:text-sm px-1 md:px-3">Renvoyés</TabsTrigger>
    <TabsTrigger value="approved" className="text-xs md:text-sm px-1 md:px-3">Approuvés</TabsTrigger>
    <TabsTrigger value="rejected" className="text-xs md:text-sm px-1 md:px-3">Rejetés</TabsTrigger>
    <TabsTrigger value="suspicious" className="text-xs md:text-sm px-1 md:px-3">Suspects</TabsTrigger>
    <TabsTrigger value="all" className="text-xs md:text-sm px-1 md:px-3">Tous</TabsTrigger>
  </TabsList>
);

export default CCCBulkActions;
