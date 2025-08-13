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
      case 'Très élevé': return '#dc2626';
      case 'Élevé': return '#ea580c';
      case 'Modéré': return '#ca8a04';
      case 'Faible': return '#16a34a';
      default: return '#6b7280';
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
      target.setAttribute('fill', '#3b82f6');
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
      className="w-full"
      onClick={handleMapClick}
      onMouseOver={handleMapMouseOver}
      onMouseOut={handleMapMouseOut}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

export default DRCMap;