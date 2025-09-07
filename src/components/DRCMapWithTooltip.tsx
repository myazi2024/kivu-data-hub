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
  onMapReady?: (map: any) => void;
}

const DRCMapWithTooltip: React.FC<DRCMapWithTooltipProps> = ({
  provincesData,
  selectedProvince,
  onProvinceSelect,
  onProvinceHover,
  hoveredProvince,
  getProvinceColor,
  onMapReady
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
              console.log(`✓ Matched province: ${provinceId} -> ${province.name}`);
            } else {
              path.setAttribute('data-province', provinceId || 'unknown');
              path.setAttribute('data-name', `Province ${provinceId}`);
              console.warn(`✗ No data for province: ${provinceId}`);
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
      console.log(`Found ${paths.length} paths with data-province attribute`);
      
      // Log all province IDs from SVG and data
      const svgProvinceIds: string[] = [];
      paths.forEach(path => {
        const id = path.getAttribute('data-province');
        if (id) svgProvinceIds.push(id);
      });
      console.log('SVG Province IDs:', svgProvinceIds);
      console.log('Data Province IDs:', provincesData.map(p => p.id));
      
      const handlePathMouseOver = (event: Event) => {
        const target = event.target as SVGElement;
        const provinceId = target.getAttribute('data-province');
        
        console.log(`Mouse over province: ${provinceId}`);
        
        if (provinceId && provinceId !== 'unknown') {
          const province = provincesData.find(p => p.id === provinceId);
          if (province) {
            console.log(`Found province data for ${provinceId}: ${province.name}`);
            onProvinceHover(provinceId);
            setHoveredProvinceData(province);
            setShowTooltip(true);
            target.setAttribute('fill', 'hsl(348, 100%, 54%)');
            
            // Calculer la position initiale de l'infobulle
            const position = calculateTooltipPosition(target);
            setTooltipPosition({ x: position.x, y: position.y });
            setTooltipAlignment({ horizontal: position.horizontal, vertical: position.vertical });
          } else {
            console.warn(`No province data found for ID: ${provinceId}`);
          }
        } else {
          console.warn(`Invalid province ID: ${provinceId}`);
        }
      };

      const handlePathMouseMove = (event: Event) => {
        const target = event.target as SVGElement;
        if (showTooltip) {
          const position = calculateTooltipPosition(target);
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

  const calculateTooltipPosition = (provinceElement: SVGElement) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0, horizontal: 'right', vertical: 'bottom' };

    // Obtenir les limites de la province SVG
    const provincePath = provinceElement as SVGGraphicsElement;
    const provinceBBox = provincePath.getBBox();
    const svgElement = provinceElement.closest('svg');
    if (!svgElement) return { x: 0, y: 0, horizontal: 'right', vertical: 'bottom' };

    // Obtenir les dimensions du conteneur SVG
    const svgRect = svgElement.getBoundingClientRect();
    const mapRect = rect;

    // Calculer les coordonnées de la province dans le conteneur
    const scaleX = mapRect.width / svgRect.width;
    const scaleY = mapRect.height / svgRect.height;
    
    const provinceLeft = (provinceBBox.x * svgRect.width / svgElement.viewBox?.baseVal.width || 1) * scaleX;
    const provinceTop = (provinceBBox.y * svgRect.height / svgElement.viewBox?.baseVal.height || 1) * scaleY;
    const provinceWidth = (provinceBBox.width * svgRect.width / svgElement.viewBox?.baseVal.width || 1) * scaleX;
    const provinceHeight = (provinceBBox.height * svgRect.height / svgElement.viewBox?.baseVal.height || 1) * scaleY;

    // Dimensions de l'infobulle
    const isSmallScreen = window.innerWidth < 640;
    const tooltipWidth = isSmallScreen ? 192 : 256;
    const tooltipHeight = isSmallScreen ? 240 : 280;
    const offset = 16; // distance de la province

    // Points d'ancrage possibles autour de la province
    const anchorPoints = [
      // À droite de la province
      {
        x: provinceLeft + provinceWidth + offset,
        y: provinceTop + provinceHeight / 2 - tooltipHeight / 2,
        horizontal: 'right',
        vertical: 'center',
        priority: 1
      },
      // À gauche de la province
      {
        x: provinceLeft - tooltipWidth - offset,
        y: provinceTop + provinceHeight / 2 - tooltipHeight / 2,
        horizontal: 'left',
        vertical: 'center',
        priority: 2
      },
      // En bas de la province
      {
        x: provinceLeft + provinceWidth / 2 - tooltipWidth / 2,
        y: provinceTop + provinceHeight + offset,
        horizontal: 'center',
        vertical: 'bottom',
        priority: 3
      },
      // En haut de la province
      {
        x: provinceLeft + provinceWidth / 2 - tooltipWidth / 2,
        y: provinceTop - tooltipHeight - offset,
        horizontal: 'center',
        vertical: 'top',
        priority: 4
      }
    ];

    // Trouver la meilleure position (celle qui reste dans les limites)
    const validPositions = anchorPoints.filter(point => 
      point.x >= 10 && 
      point.x + tooltipWidth <= mapRect.width - 10 &&
      point.y >= 10 && 
      point.y + tooltipHeight <= mapRect.height - 10
    );

    // Choisir la position avec la priorité la plus élevée
    const bestPosition = validPositions.length > 0 
      ? validPositions.sort((a, b) => a.priority - b.priority)[0]
      : anchorPoints[0]; // Fallback à droite

    // Contraindre la position finale dans les limites
    let finalX = Math.max(10, Math.min(bestPosition.x, mapRect.width - tooltipWidth - 10));
    let finalY = Math.max(10, Math.min(bestPosition.y, mapRect.height - tooltipHeight - 10));

    return {
      x: finalX,
      y: finalY,
      horizontal: bestPosition.horizontal === 'center' ? 'right' : bestPosition.horizontal,
      vertical: bestPosition.vertical === 'center' ? 'bottom' : bestPosition.vertical
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