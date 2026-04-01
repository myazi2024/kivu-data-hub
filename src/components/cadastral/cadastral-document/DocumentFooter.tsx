import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DocumentFooterProps {
  parcelNumber: string;
  verificationCode?: string | null;
  verifyUrl?: string | null;
}

const DocumentFooter: React.FC<DocumentFooterProps> = ({ parcelNumber, verificationCode, verifyUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (verifyUrl && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, verifyUrl, {
        width: 100,
        margin: 1,
        color: { dark: '#1a1a2e', light: '#ffffff' },
      });
    }
  }, [verifyUrl]);

  return (
    <div className="px-6 sm:px-10 py-5 border-t-2 border-primary/10 bg-muted/20 print:bg-transparent space-y-4">
      {/* Verification section */}
      <div className="flex items-start gap-5">
        <div className="flex-shrink-0">
          {verifyUrl ? (
            <canvas ref={canvasRef} className="rounded-md border border-border" />
          ) : (
            <Skeleton className="h-[100px] w-[100px] rounded-md" />
          )}
        </div>

        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Document authentifié
          </div>

          {verificationCode ? (
            <>
              <p className="text-xs text-muted-foreground">
                Code de vérification :{' '}
                <span className="font-mono font-bold text-foreground tracking-wider">{verificationCode}</span>
              </p>
              {verifyUrl && (
                <a
                  href={verifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline break-all"
                >
                  {verifyUrl}
                </a>
              )}
              <p className="text-xs text-muted-foreground">
                Scannez le QR code ou visitez le lien ci-dessus pour vérifier l'authenticité de ce document.
              </p>
            </>
          ) : (
            <Skeleton className="h-4 w-48" />
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="border-t border-border/50 pt-3">
        <p className="text-xs text-muted-foreground leading-relaxed mb-2">
          <strong>Avis de non-responsabilité :</strong> Le Bureau d'Informations Cadastrales (BIC) n'assume aucune responsabilité quant à l'exactitude des données affichées,
          car elles proviennent des archives du Ministère des Affaires Foncières. BIC agit de bonne foi dans son travail de compilation et de présentation de ces informations.
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Si vous n'êtes pas satisfait des informations affichées, veuillez contacter le bureau des Affaires Foncières le plus proche de vous
          pour solliciter une mise à jour des informations concernant la parcelle <span className="font-mono font-semibold">{parcelNumber}</span>.
        </p>
      </div>
    </div>
  );
};

export default DocumentFooter;
