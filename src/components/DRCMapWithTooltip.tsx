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
          
          // Couleur uniforme pour TOUTES les provinces
          const uniformColor = 'hsl(210, 40%, 85%)'; // gris-bleu clair uniforme
          
          paths.forEach(path => {
            const provinceId = path.getAttribute('id');
            const province = provincesData.find(p => p.id === provinceId);
            
            // Appliquer la couleur uniforme à TOUTES les provinces
            path.setAttribute('fill', uniformColor);
            path.setAttribute('stroke', '#ffffff');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('cursor', 'pointer');
            
            if (province) {
              path.setAttribute('data-province', province.id);
              path.setAttribute('data-name', province.name);
            } else {
              path.setAttribute('data-province', provinceId || 'unknown');
              path.setAttribute('data-name', `Province ${provinceId}`);
            }
          });
          
          setSvgContent(svg.outerHTML);
        }
      })
      .catch(console.error);
  }, [provincesData]);

  // Attacher les événements après que le SVG soit rendu
  useEffect(() => {
    if (svgContent && mapRef.current) {
      const paths = mapRef.current.querySelectorAll('path[data-province]');
      
      const handlePathMouseOver = (event: Event) => {
        const target = event.target as SVGElement;
        const provinceId = target.getAttribute('data-province');
        
        if (provinceId && provinceId !== 'unknown') {
          const province = provincesData.find(p => p.id === provinceId);
          if (province) {
            onProvinceHover(provinceId);
            setHoveredProvinceData(province);
            setShowTooltip(true);
            target.setAttribute('fill', 'hsl(348, 100%, 54%)');
          }
        }
      };

      const handlePathMouseMove = (event: Event) => {
        const mouseEvent = event as MouseEvent;
        if (showTooltip) {
          const position = calculateTooltipPosition(mouseEvent.clientX, mouseEvent.clientY);
          setTooltipPosition({ x: position.x, y: position.y });
          setTooltipAlignment({ horizontal: position.horizontal, vertical: position.vertical });
        }
      };

      const handlePathMouseOut = (event: Event) => {
        const target = event.target as SVGElement;
        
        // Remettre à zéro tous les états
        onProvinceHover(null);
        setShowTooltip(false);
        setHoveredProvinceData(null);
        
        // Restaurer la couleur uniforme
        target.setAttribute('fill', 'hsl(210, 40%, 85%)');
      };

      const handlePathClick = (event: Event) => {
        const target = event.target as SVGElement;
        const provinceId = target.getAttribute('data-province');
        
        if (provinceId && provinceId !== 'unknown') {
          const province = provincesData.find(p => p.id === provinceId);
          if (province) {
            onProvinceSelect(province);
          }
        }
      };

      // Attacher les événements à chaque path
      paths.forEach(path => {
        path.addEventListener('mouseover', handlePathMouseOver);
        path.addEventListener('mousemove', handlePathMouseMove);
        path.addEventListener('mouseout', handlePathMouseOut);
        path.addEventListener('click', handlePathClick);
      });

      // Cleanup function
      return () => {
        paths.forEach(path => {
          path.removeEventListener('mouseover', handlePathMouseOver);
          path.removeEventListener('mousemove', handlePathMouseMove);
          path.removeEventListener('mouseout', handlePathMouseOut);
          path.removeEventListener('click', handlePathClick);
        });
      };
    }
  }, [svgContent, provincesData, onProvinceHover, onProvinceSelect]);

  const calculateTooltipPosition = (mouseX: number, mouseY: number) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return { x: mouseX, y: mouseY, horizontal: 'right', vertical: 'bottom' };

    // Dimensions adaptatives de l'infobulle selon la taille d'écran
    const isSmallScreen = window.innerWidth < 640; // sm breakpoint
    const tooltipWidth = isSmallScreen ? 192 : 256; // w-48 vs w-64
    const tooltipHeight = isSmallScreen ? 240 : 280;
    const offset = 12; // distance du curseur

    // Position relative dans le conteneur
    let relativeX = mouseX - rect.left;
    let relativeY = mouseY - rect.top;

    // Détermine l'alignement en fonction de l'espace disponible
    const spaceRight = rect.width - relativeX;
    const spaceLeft = relativeX;
    const spaceBelow = rect.height - relativeY;
    const spaceAbove = relativeY;

    // Prioriser l'affichage à droite et en bas du curseur
    let horizontal: 'left' | 'right' = 'right';
    let vertical: 'top' | 'bottom' = 'bottom';

    // Ajuster horizontal si pas assez d'espace à droite
    if (spaceRight < tooltipWidth + offset && spaceLeft > tooltipWidth + offset) {
      horizontal = 'left';
    }

    // Ajuster vertical si pas assez d'espace en bas
    if (spaceBelow < tooltipHeight + offset && spaceAbove > tooltipHeight + offset) {
      vertical = 'top';
    }

    // Calculer la position finale avec contraintes
    let finalX = relativeX;
    let finalY = relativeY;

    // Position horizontale
    if (horizontal === 'right') {
      finalX = Math.min(relativeX + offset, rect.width - tooltipWidth - 10);
    } else {
      finalX = Math.max(relativeX - offset - tooltipWidth, 10);
    }

    // Position verticale
    if (vertical === 'bottom') {
      finalY = Math.min(relativeY + offset, rect.height - tooltipHeight - 10);
    } else {
      finalY = Math.max(relativeY - offset - tooltipHeight, 10);
    }

    // S'assurer que l'infobulle reste dans les limites
    finalX = Math.max(10, Math.min(finalX, rect.width - tooltipWidth - 10));
    finalY = Math.max(10, Math.min(finalY, rect.height - tooltipHeight - 10));

    return {
      x: finalX,
      y: finalY,
      horizontal,
      vertical
    };
  };

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapRef}
        className="w-full h-full flex items-center justify-center touch-pan-x touch-pan-y"
        style={{ maxWidth: '100%', maxHeight: '100%', overflow: 'hidden' }}
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
          className="absolute z-50 pointer-events-none transition-all duration-100 ease-out"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            opacity: showTooltip ? 1 : 0,
            transform: `scale(${showTooltip ? 1 : 0.95})`,
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