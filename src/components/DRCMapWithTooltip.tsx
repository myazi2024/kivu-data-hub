import React, { useState, useEffect, useRef } from 'react';
import ProvinceTooltip from './ProvinceTooltip';

interface ProvinceData {
  id: string;
  name: string;
  prixMoyenLoyer: number;
  prixMoyenVenteM2: number;
  valeurFonciereParcelleUsd: number;
  tauxOccupationLocatif: number;
  dureeMoyenneMiseLocationJours: number;
  tauxVacanceLocative: number;
  indicePresionLocative: 'Faible' | 'Modéré' | 'Élevé' | 'Très élevé';
  volumeAnnoncesImmobilieres: number;
  nombreTransactionsEstimees: number;
  populationLocativeEstimee: number;
  recettesLocativesUsd: number;
  recettesFiscalesUsd: number;
  variationLoyer3Mois: number;
  typologieDominante: string;
}

interface DRCMapWithTooltipProps {
  provincesData: ProvinceData[];
  selectedProvince: string | null;
  onProvinceSelect: (province: ProvinceData) => void;
  onProvinceHover: (provinceId: string | null) => void;
  hoveredProvince: string | null;
  transactionType: 'location' | 'vente';
  getProvinceColor: (province: ProvinceData) => string;
}

const DRCMapWithTooltip: React.FC<DRCMapWithTooltipProps> = ({
  provincesData,
  selectedProvince,
  onProvinceSelect,
  onProvinceHover,
  hoveredProvince,
  transactionType,
  getProvinceColor
}) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [hoveredProvinceData, setHoveredProvinceData] = useState<ProvinceData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/drc-provinces.svg')
      .then(response => response.text())
      .then(svgText => {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const svg = svgDoc.querySelector('svg');
        
        if (svg) {
          svg.removeAttribute('width');
          svg.removeAttribute('height');
          svg.setAttribute('width', '100%');
          svg.setAttribute('height', '100%');
          svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          
          const paths = svg.querySelectorAll('path[id]');
          
          paths.forEach(path => {
            const provinceId = path.getAttribute('id');
            const province = provincesData.find(p => p.id === provinceId);
            
            if (province) {
              const color = getProvinceColor(province);
              path.setAttribute('fill', color);
              path.setAttribute('stroke', '#ffffff');
              path.setAttribute('stroke-width', '2');
              path.setAttribute('cursor', 'pointer');
              path.setAttribute('data-province', province.id);
              path.setAttribute('data-name', province.name);
            } else {
              path.setAttribute('fill', 'hsl(0, 0%, 75%)');
              path.setAttribute('stroke', '#ffffff');
              path.setAttribute('stroke-width', '1');
              path.setAttribute('cursor', 'pointer');
              path.setAttribute('data-province', provinceId || 'unknown');
              path.setAttribute('data-name', `Province ${provinceId}`);
            }
          });
          
          setSvgContent(svg.outerHTML);
        }
      })
      .catch(console.error);
  }, [provincesData, getProvinceColor]);

  const handleMapClick = (event: React.MouseEvent) => {
    const target = event.target as SVGElement;
    const provinceId = target.getAttribute('data-province');
    
    if (provinceId && provinceId !== 'unknown') {
      const province = provincesData.find(p => p.id === provinceId);
      if (province) {
        onProvinceSelect(province);
      }
    }
  };

  const handleMapMouseOver = (event: React.MouseEvent) => {
    const target = event.target as SVGElement;
    const provinceId = target.getAttribute('data-province');
    
    if (provinceId && provinceId !== 'unknown') {
      const province = provincesData.find(p => p.id === provinceId);
      if (province) {
        onProvinceHover(provinceId);
        setHoveredProvinceData(province);
        
        // Calculate tooltip position
        const rect = mapRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPosition({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
          });
        }
        
        setShowTooltip(true);
        target.setAttribute('fill', 'hsl(348, 100%, 54%)');
      }
    }
  };

  const handleMapMouseOut = (event: React.MouseEvent) => {
    const target = event.target as SVGElement;
    const provinceId = target.getAttribute('data-province');
    
    if (provinceId) {
      onProvinceHover(null);
      setShowTooltip(false);
      setHoveredProvinceData(null);
      
      const province = provincesData.find(p => p.id === provinceId);
      if (province) {
        target.setAttribute('fill', getProvinceColor(province));
      }
    }
  };

  const handleMapMouseMove = (event: React.MouseEvent) => {
    if (showTooltip) {
      const rect = mapRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltipPosition({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        });
      }
    }
  };

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapRef}
        className="w-full h-full flex items-center justify-center"
        style={{ maxWidth: '100%', maxHeight: '100%', overflow: 'hidden' }}
        onClick={handleMapClick}
        onMouseOver={handleMapMouseOver}
        onMouseOut={handleMapMouseOut}
        onMouseMove={handleMapMouseMove}
      >
        <div 
          className="w-full h-full"
          style={{ 
            maxWidth: '100%', 
            maxHeight: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>
      
      {/* Custom Tooltip */}
      {showTooltip && hoveredProvinceData && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <ProvinceTooltip province={hoveredProvinceData} />
        </div>
      )}
    </div>
  );
};

export default DRCMapWithTooltip;