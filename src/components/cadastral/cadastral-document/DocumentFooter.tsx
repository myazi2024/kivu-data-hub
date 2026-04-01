import React from 'react';

interface DocumentFooterProps {
  parcelNumber: string;
}

const DocumentFooter: React.FC<DocumentFooterProps> = ({ parcelNumber }) => (
  <div className="px-6 sm:px-10 py-5 border-t-2 border-primary/10 bg-muted/20 print:bg-transparent">
    <p className="text-xs text-muted-foreground leading-relaxed mb-2">
      <strong>Avis de non-responsabilité :</strong> Le Bureau d'Informations Cadastrales (BIC) n'assume aucune responsabilité quant à l'exactitude des données affichées,
      car elles proviennent des archives du Ministère des Affaires Foncières. BIC agit de bonne foi dans son travail de compilation et de présentation de ces informations.
    </p>
    <p className="text-xs text-muted-foreground leading-relaxed">
      Si vous n'êtes pas satisfait des informations affichées, veuillez contacter le bureau des Affaires Foncières le plus proche de vous
      pour solliciter une mise à jour des informations concernant la parcelle <span className="font-mono font-semibold">{parcelNumber}</span>.
    </p>
  </div>
);

export default DocumentFooter;
