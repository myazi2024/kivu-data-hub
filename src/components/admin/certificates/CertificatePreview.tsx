import React from 'react';
import type { CertificateTemplate } from '@/types/certificate';

interface CertificatePreviewProps {
  template: Partial<CertificateTemplate>;
}

export const CertificatePreview: React.FC<CertificatePreviewProps> = ({ template }) => {
  const primaryColor = template.primary_color || '#006432';
  const secondaryColor = template.secondary_color || '#004020';

  return (
    <div 
      className="bg-white border-2 rounded-lg shadow-lg mx-auto overflow-hidden"
      style={{ 
        width: '100%', 
        maxWidth: 420,
        aspectRatio: '210/297',
        fontSize: '0.55rem',
        color: '#000',
      }}
    >
      <div className="relative h-full p-4 flex flex-col">
        {/* Border */}
        {template.show_border && (
          <div 
            className="absolute inset-2 border-2 rounded pointer-events-none"
            style={{ borderColor: primaryColor }}
          />
        )}

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          {template.logo_url && (
            <div className="flex justify-center mb-2">
              <img 
                src={template.logo_url} 
                alt="Logo" 
                className="h-8 w-8 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-2">
            <p className="font-bold text-[0.65rem] uppercase" style={{ color: primaryColor }}>
              {template.header_title || 'RÉPUBLIQUE DÉMOCRATIQUE DU CONGO'}
            </p>
            <p className="font-bold text-[0.55rem]" style={{ color: primaryColor }}>
              {template.header_organization || "BUREAU D'INFORMATION CADASTRALE (BIC)"}
            </p>
            <p className="text-[0.5rem] text-gray-600">
              {template.header_subtitle || 'Service Agréé'}
            </p>
          </div>

          {/* Separator */}
          <div className="border-t-2 my-1" style={{ borderColor: primaryColor }} />

          {/* Title */}
          <div className="text-center my-2">
            <p className="font-bold text-[0.6rem] uppercase" style={{ color: secondaryColor }}>
              {(template.body_text?.split('\n')[0]) || 'CERTIFICAT'}
            </p>
            <p className="text-[0.5rem] mt-0.5">N° REF-XXXX-0000</p>
          </div>

          {/* Content placeholder */}
          <div className="flex-1 space-y-2 px-2">
            <div className="rounded px-2 py-1" style={{ backgroundColor: `${primaryColor}10` }}>
              <p className="font-bold text-[0.5rem]" style={{ color: primaryColor }}>IDENTIFICATION</p>
            </div>
            <div className="space-y-1 text-[0.45rem] px-1">
              <div className="flex gap-2">
                <span className="font-bold w-16">Bénéficiaire:</span>
                <span>Jean KABILA</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold w-16">N° Parcelle:</span>
                <span>NK/GOM/001</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold w-16">Date émission:</span>
                <span>{new Date().toLocaleDateString('fr-FR')}</span>
              </div>
            </div>

            {/* Body text preview */}
            {template.body_text && template.body_text.split('\n').slice(1).filter(l => l.trim()).length > 0 && (
              <div className="text-[0.42rem] text-gray-700 mt-2 px-1">
                {template.body_text.split('\n').slice(1, 4).map((line, i) => (
                  <p key={i} className="mb-0.5">{line.substring(0, 80)}{line.length > 80 ? '...' : ''}</p>
                ))}
              </div>
            )}

            {/* Legal text */}
            {template.legal_text && (
              <div className="text-[0.38rem] text-gray-400 italic mt-2 px-1">
                {template.legal_text.substring(0, 150)}...
              </div>
            )}
          </div>

          {/* Bottom: Signature + QR + Stamp */}
          <div className="mt-auto pt-2 flex justify-between items-end px-2">
            <div className="space-y-0.5">
              <p className="text-[0.42rem] text-gray-500">
                Fait à Goma, le {new Date().toLocaleDateString('fr-FR')}
              </p>
              {template.signature_image_url && (
                <img 
                  src={template.signature_image_url} 
                  alt="Signature" 
                  className="h-5 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <p className="font-bold text-[0.45rem]">{template.signature_title || 'Le Responsable'}</p>
              <p className="italic text-[0.42rem]">{template.signature_name || 'Nom du signataire'}</p>

              {/* Stamp */}
              {template.show_stamp && (
                <div 
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center mt-1"
                  style={{ borderColor: primaryColor }}
                >
                  <div className="text-center leading-tight" style={{ color: primaryColor }}>
                    {(template.stamp_text || 'CERTIFIÉ\nCONFORME').split('\n').map((line, i) => (
                      <p key={i} className="text-[0.3rem] font-bold">{line}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* QR Code placeholder */}
            {template.show_qr_code && (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-[0.35rem] text-gray-500 text-center">QR Code</span>
                </div>
                <p className="text-[0.35rem] text-gray-400 mt-0.5">Scanner pour vérifier</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {template.footer_text && (
            <p className="text-[0.35rem] text-gray-400 italic text-center mt-1 pt-1 border-t">
              {template.footer_text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
