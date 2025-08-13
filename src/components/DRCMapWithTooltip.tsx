import React, { useState, useEffect, useRef } from 'react';
import ProvinceTooltip from './ProvinceTooltip';
import { ProvinceData } from '@/types/province';

interface DRCMapWithTooltipProps {
  provincesData: ProvinceData[];
  selectedProvince: string | null;
  onProvinceSelect: (province: ProvinceData) => void;
  onProvinceHover: (provinceId: string | null) => void;
  hoveredProvince: string | null;
  getProvinceColor: (province: ProvinceData) => string;
}

const DRCMapWithTooltip: React.FC<DRCMapWithTooltipProps> = ({
  provincesData,
  selectedProvince,
  onProvinceSelect,
  onProvinceHover,
  hoveredProvince,
  getProvinceColor
}) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [hoveredProvinceData, setHoveredProvinceData] = useState<ProvinceData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipAlignment, setTooltipAlignment] = useState({ horizontal: 'right', vertical: 'top' });
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
              // Couleur uniforme pour toutes les provinces
              path.setAttribute('fill', 'hsl(210, 40%, 85%)'); // gris-bleu clair uniforme
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

  const calculateTooltipPosition = (mouseX: number, mouseY: number) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return { x: mouseX, y: mouseY, horizontal: 'right', vertical: 'top' };

    // Dimensions de l'infobulle (approximatives)
    const tooltipWidth = 240; // 60 * 4 (w-60 = 240px)
    const tooltipHeight = 280; // hauteur approximative

    // Position relative dans le conteneur
    const relativeX = mouseX - rect.left;
    const relativeY = mouseY - rect.top;

    // Déterminer l'alignement horizontal
    const spaceRight = rect.width - relativeX;
    const spaceLeft = relativeX;
    const horizontal = spaceRight >= tooltipWidth ? 'right' : 'left';

    // Déterminer l'alignement vertical  
    const spaceBelow = rect.height - relativeY;
    const spaceAbove = relativeY;
    const vertical = spaceBelow >= tooltipHeight ? 'bottom' : 'top';

    // Calculer la position finale
    let finalX = relativeX;
    let finalY = relativeY;

    // Ajustement horizontal
    if (horizontal === 'right') {
      finalX = Math.min(relativeX + 10, rect.width - tooltipWidth - 10);
    } else {
      finalX = Math.max(relativeX - tooltipWidth - 10, 10);
    }

    // Ajustement vertical
    if (vertical === 'bottom') {
      finalY = Math.min(relativeY + 10, rect.height - tooltipHeight - 10);
    } else {
      finalY = Math.max(relativeY - tooltipHeight - 10, 10);
    }

    return {
      x: finalX,
      y: finalY,
      horizontal,
      vertical
    };
  };

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
        
        // Calculer la position adaptative
        const position = calculateTooltipPosition(event.clientX, event.clientY);
        setTooltipPosition({ x: position.x, y: position.y });
        setTooltipAlignment({ horizontal: position.horizontal, vertical: position.vertical });
        
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
        // Restaurer la couleur uniforme
        target.setAttribute('fill', 'hsl(210, 40%, 85%)');
      }
    }
  };

  const handleMapMouseMove = (event: React.MouseEvent) => {
    if (showTooltip && hoveredProvinceData) {
      // Mettre à jour la position adaptative en temps réel
      const position = calculateTooltipPosition(event.clientX, event.clientY);
      setTooltipPosition({ x: position.x, y: position.y });
      setTooltipAlignment({ horizontal: position.horizontal, vertical: position.vertical });
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
      
      {/* Infobulle adaptative */}
      {showTooltip && hoveredProvinceData && (
        <div
          className="absolute z-50 pointer-events-none transition-all duration-150 ease-out"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: `translate(${tooltipAlignment.horizontal === 'left' ? '-100%' : '0'}, ${tooltipAlignment.vertical === 'top' ? '-100%' : '0'})`,
            transformOrigin: `${tooltipAlignment.horizontal === 'left' ? 'right' : 'left'} ${tooltipAlignment.vertical === 'top' ? 'bottom' : 'top'}`
          }}
        >
          <ProvinceTooltip province={hoveredProvinceData} />
        </div>
      )}
    </div>
  );
};

export default DRCMapWithTooltip;