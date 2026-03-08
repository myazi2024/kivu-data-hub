import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isManuallyPositioned, setIsManuallyPositioned] = useState(false);
  const [overTooltip, setOverTooltip] = useState(false);
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
            
            // Calculer la position initiale de l'infobulle seulement si pas manuellement positionnée
            if (!isManuallyPositioned) {
              const position = calculateTooltipPosition(target);
              setTooltipPosition({ x: position.x, y: position.y });
              setTooltipAlignment({ horizontal: position.horizontal, vertical: position.vertical });
            }
          } else {
            console.warn(`No province data found for ID: ${provinceId}`);
          }
        } else {
          console.warn(`Invalid province ID: ${provinceId}`);
        }
      };

      const handlePathMouseMove = (event: Event) => {
        const target = event.target as SVGElement;
        if (showTooltip && !isManuallyPositioned) {
          const position = calculateTooltipPosition(target);
          setTooltipPosition({ x: position.x, y: position.y });
          setTooltipAlignment({ horizontal: position.horizontal, vertical: position.vertical });
        }
      };

      const handlePathMouseOut = (event: Event) => {
        const target = event.target as SVGElement;
        
        // Restaurer la couleur uniforme
        target.setAttribute('fill', 'hsl(210, 40%, 85%)');

        // Ne pas masquer si on est au-dessus de l'infobulle, en train de drag, ou si positionnée manuellement
        if (isDragging || isManuallyPositioned || overTooltip) {
          return;
        }
        
        // Remettre à zéro uniquement si aucune autre interaction
        onProvinceHover(null);
        setShowTooltip(false);
        setHoveredProvinceData(null);
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

      // Handlers pour le drag & drop de l'infobulle
      const handleTooltipMouseDown = (event: MouseEvent) => {
        event.preventDefault();
        setIsDragging(true);
        const rect = mapRef.current?.getBoundingClientRect();
        if (rect) {
          setDragOffset({
            x: event.clientX - rect.left - tooltipPosition.x,
            y: event.clientY - rect.top - tooltipPosition.y
          });
        }
      };

      const handleMouseMove = (event: MouseEvent) => {
        if (isDragging && mapRef.current) {
          const rect = mapRef.current.getBoundingClientRect();
          const newX = event.clientX - rect.left - dragOffset.x;
          const newY = event.clientY - rect.top - dragOffset.y;
          
          // Limiter la position dans les bounds de la carte
          const tooltipWidth = 256;
          const tooltipHeight = 280;
          const maxX = rect.width - tooltipWidth;
          const maxY = rect.height - tooltipHeight;
          
          setTooltipPosition({
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY))
          });
          setIsManuallyPositioned(true);
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
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

  // Event listeners pour le drag global (souris + tactile)
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging && mapRef.current) {
        const rect = mapRef.current.getBoundingClientRect();
        const newX = event.clientX - rect.left - dragOffset.x;
        const newY = event.clientY - rect.top - dragOffset.y;
        const tooltipWidth = 256;
        const tooltipHeight = 280;
        const maxX = rect.width - tooltipWidth;
        const maxY = rect.height - tooltipHeight;
        setTooltipPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
        setIsManuallyPositioned(true);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (isDragging && mapRef.current) {
        event.preventDefault();
        const touch = event.touches[0];
        const rect = mapRef.current.getBoundingClientRect();
        const newX = touch.clientX - rect.left - dragOffset.x;
        const newY = touch.clientY - rect.top - dragOffset.y;
        const isSmallScreen = window.innerWidth < 640;
        const tooltipWidth = isSmallScreen ? 192 : 256;
        const tooltipHeight = isSmallScreen ? 240 : 280;
        const maxX = rect.width - tooltipWidth;
        const maxY = rect.height - tooltipHeight;
        setTooltipPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
        setIsManuallyPositioned(true);
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove as any);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragOffset]);

  const calculateTooltipPosition = (provinceElement: SVGElement) => {
    // Utiliser les coordonnées écran réelles pour éviter tout chevauchement
    const mapEl = mapRef.current;
    if (!mapEl) return { x: 0, y: 0, horizontal: 'right', vertical: 'bottom' };

    const mapRect = mapEl.getBoundingClientRect();
    const provinceRect = (provinceElement as SVGGraphicsElement).getBoundingClientRect();

    // Coords relatives au conteneur de la carte
    const provinceLeft = provinceRect.left - mapRect.left;
    const provinceTop = provinceRect.top - mapRect.top;
    const provinceWidth = provinceRect.width;
    const provinceHeight = provinceRect.height;

    // Dimensions approximatives de l'infobulle
    const isSmallScreen = window.innerWidth < 640;
    const tooltipWidth = isSmallScreen ? 192 : 256;
    const tooltipHeight = isSmallScreen ? 240 : 280;
    const offset = 16; // distance de la province

    // Points d'ancrage possibles autour de la province (jamais au-dessus)
    const anchorPoints = [
      // À droite
      {
        x: provinceLeft + provinceWidth + offset,
        y: provinceTop + provinceHeight / 2 - tooltipHeight / 2,
        horizontal: 'right',
        vertical: 'center',
        priority: 1,
      },
      // À gauche
      {
        x: provinceLeft - tooltipWidth - offset,
        y: provinceTop + provinceHeight / 2 - tooltipHeight / 2,
        horizontal: 'left',
        vertical: 'center',
        priority: 2,
      },
      // En bas
      {
        x: provinceLeft + provinceWidth / 2 - tooltipWidth / 2,
        y: provinceTop + provinceHeight + offset,
        horizontal: 'center',
        vertical: 'bottom',
        priority: 3,
      },
      // En haut
      {
        x: provinceLeft + provinceWidth / 2 - tooltipWidth / 2,
        y: provinceTop - tooltipHeight - offset,
        horizontal: 'center',
        vertical: 'top',
        priority: 4,
      },
    ];

    // Garder l'infobulle dans les limites du conteneur
    const pad = 10;
    const validPositions = anchorPoints.filter(
      (p) =>
        p.x >= pad &&
        p.x + tooltipWidth <= mapRect.width - pad &&
        p.y >= pad &&
        p.y + tooltipHeight <= mapRect.height - pad
    );

    const bestPosition =
      validPositions.length > 0
        ? validPositions.sort((a, b) => a.priority - b.priority)[0]
        : anchorPoints[0]; // Fallback à droite

    const finalX = Math.max(pad, Math.min(bestPosition.x, mapRect.width - tooltipWidth - pad));
    const finalY = Math.max(pad, Math.min(bestPosition.y, mapRect.height - tooltipHeight - pad));

    return {
      x: finalX,
      y: finalY,
      horizontal: bestPosition.horizontal === 'center' ? 'right' : bestPosition.horizontal,
      vertical: bestPosition.vertical === 'center' ? 'bottom' : bestPosition.vertical,
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
      
      {/* Infobulle adaptative avec drag & drop */}
      {showTooltip && hoveredProvinceData && (
        <div
          className={`absolute z-50 transition-all duration-100 ease-out ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            opacity: showTooltip ? 1 : 0,
            transform: `scale(${showTooltip ? 1 : 0.95})`,
            transformOrigin: `${tooltipAlignment.horizontal === 'left' ? 'right' : 'left'} ${tooltipAlignment.vertical === 'top' ? 'bottom' : 'top'}`,
            userSelect: 'none',
            touchAction: 'none'
          }}
          role="dialog"
          aria-label="Infobulle province – faites glisser pour déplacer"
          onMouseEnter={() => setOverTooltip(true)}
          onMouseLeave={() => setOverTooltip(false)}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDragging(true);
            const rect = mapRef.current?.getBoundingClientRect();
            if (rect) {
              setDragOffset({
                x: e.clientX - rect.left - tooltipPosition.x,
                y: e.clientY - rect.top - tooltipPosition.y
              });
            }
          }}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            setIsDragging(true);
            const rect = mapRef.current?.getBoundingClientRect();
            if (rect) {
              setDragOffset({
                x: touch.clientX - rect.left - tooltipPosition.x,
                y: touch.clientY - rect.top - tooltipPosition.y
              });
            }
          }}
        >
          {/* Handle de drag visible */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary/20 hover:bg-primary/30 rounded-full px-3 py-1 text-xs text-primary cursor-grab hover:cursor-grabbing transition-colors">
            ⋮⋮⋮
          </div>
          <ProvinceTooltip province={hoveredProvinceData} />
        </div>
      )}
    </div>
  );
};

export default DRCMapWithTooltip;