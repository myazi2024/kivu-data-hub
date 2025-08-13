import React, { useState, useEffect } from 'react';

interface ProvinceData {
  id: string;
  name: string;
  // Prix & Valeur
  prixMoyenLoyer: number;
  prixMoyenVenteM2: number;
  valeurFonciereParcelleUsd: number;
  // Performance locative
  tauxOccupationLocatif: number;
  dureeMoyenneMiseLocationJours: number;
  tauxVacanceLocative: number;
  indicePresionLocative: 'Faible' | 'Modéré' | 'Élevé' | 'Très élevé';
  // Activité du marché
  volumeAnnoncesImmobilieres: number;
  nombreTransactionsEstimees: number;
  // Population & usage
  populationLocativeEstimee: number;
  // Recettes & fiscalité
  recettesLocativesUsd: number;
  recettesFiscalesUsd: number;
  // Autres
  variationLoyer3Mois: number;
  typologieDominante: string;
}

interface DRCMapProps {
  provincesData: ProvinceData[];
  selectedProvince: string | null;
  onProvinceSelect: (province: ProvinceData) => void;
  onProvinceHover: (provinceId: string | null) => void;
  hoveredProvince: string | null;
}

const DRCMap: React.FC<DRCMapProps> = ({
  provincesData,
  selectedProvince,
  onProvinceSelect,
  onProvinceHover,
  hoveredProvince
}) => {
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    // Load the SVG file
    fetch('/drc-provinces.svg')
      .then(response => response.text())
      .then(svgText => {
        // Process the SVG to add interactivity
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const svg = svgDoc.querySelector('svg');
        
        if (svg) {
          // Find all path elements and add province data
          const paths = svg.querySelectorAll('path[id]');
          paths.forEach(path => {
            const provinceId = path.getAttribute('id');
            const province = provincesData.find(p => p.id === provinceId);
            
            if (province) {
              // Set color based on pressure index
              const color = getColorByPressure(province.indicePresionLocative);
              path.setAttribute('fill', color);
              path.setAttribute('stroke', '#ffffff');
              path.setAttribute('stroke-width', '2');
              path.setAttribute('cursor', 'pointer');
              
              // Add data attributes
              path.setAttribute('data-province', province.id);
              path.setAttribute('data-name', province.name);
            }
          });
          
          setSvgContent(svg.outerHTML);
        }
      })
      .catch(console.error);
  }, [provincesData]);

  const getColorByPressure = (pression: string) => {
    switch (pression) {
      case 'Très élevé': return 'hsl(348, 100%, 44%)'; // seloger-red
      case 'Élevé': return 'hsl(20, 90%, 56%)'; // orange
      case 'Modéré': return 'hsl(45, 93%, 47%)'; // amber
      case 'Faible': return 'hsl(142, 71%, 45%)'; // emerald
      default: return 'hsl(0, 0%, 45%)'; // gray
    }
  };

  const handleMapClick = (event: React.MouseEvent) => {
    const target = event.target as SVGElement;
    const provinceId = target.getAttribute('data-province');
    
    if (provinceId) {
      const province = provincesData.find(p => p.id === provinceId);
      if (province) {
        onProvinceSelect(province);
      }
    }
  };

  const handleMapMouseOver = (event: React.MouseEvent) => {
    const target = event.target as SVGElement;
    const provinceId = target.getAttribute('data-province');
    
    if (provinceId) {
      onProvinceHover(provinceId);
      target.setAttribute('fill', 'hsl(348, 100%, 54%)');
    }
  };

  const handleMapMouseOut = (event: React.MouseEvent) => {
    const target = event.target as SVGElement;
    const provinceId = target.getAttribute('data-province');
    
    if (provinceId) {
      onProvinceHover(null);
      const province = provincesData.find(p => p.id === provinceId);
      if (province) {
        target.setAttribute('fill', getColorByPressure(province.indicePresionLocative));
      }
    }
  };

  return (
    <div 
      className="w-full h-full max-w-full max-h-full overflow-hidden flex items-center justify-center"
      onClick={handleMapClick}
      onMouseOver={handleMapMouseOver}
      onMouseOut={handleMapMouseOut}
    >
      <div 
        className="w-full h-auto max-w-full"
        style={{ aspectRatio: '16/10' }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
};

export default DRCMap;