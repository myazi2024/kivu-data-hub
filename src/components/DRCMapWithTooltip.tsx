import React, { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import ProvinceTooltip from './ProvinceTooltip';
import { ProvinceData } from '@/types/province';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface TooltipLineConfig {
  key: string;
  visible: boolean;
  title: string;
}

interface DRCMapWithTooltipProps {
  provincesData: ProvinceData[];
  selectedProvince: string | null;
  externalZoomProvinceId?: string | null;
  onProvinceSelect: (province: ProvinceData) => void;
  onProvinceHover: (provinceId: string | null) => void;
  hoveredProvince: string | null;
  getProvinceColor: (province: ProvinceData) => string;
  onMapReady?: (map: any) => void;
  tooltipLineConfigs?: TooltipLineConfig[];
  onZoomChange?: (isZoomed: boolean) => void;
}

/** Linearly interpolate between two values */
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Ease-out cubic */
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

const DRCMapWithTooltip: React.FC<DRCMapWithTooltipProps> = ({
  provincesData,
  selectedProvince,
  externalZoomProvinceId,
  onProvinceSelect,
  onProvinceHover,
  hoveredProvince,
  getProvinceColor,
  onMapReady,
  tooltipLineConfigs,
  onZoomChange
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
  const [zoomedProvinceId, setZoomedProvinceId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const originalViewBox = useRef<string>('');
  const animFrameRef = useRef<number>(0);

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
          const defaultColor = 'hsl(210, 20%, 82%)';
          
          paths.forEach(path => {
            const provinceId = path.getAttribute('id');
            const province = provincesData.find(p => p.id === provinceId);
            const fillColor = province ? getProvinceColor(province) : defaultColor;
            path.setAttribute('fill', fillColor);
            path.setAttribute('stroke', '#ffffff');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('cursor', 'pointer');
            path.setAttribute('style', 'transition: opacity 0.4s ease, fill 0.2s ease;');
            
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
  }, [provincesData, getProvinceColor]);

  const animateViewBox = useCallback((
    svg: SVGSVGElement,
    fromVB: number[],
    toVB: number[],
    duration: number,
    onComplete?: () => void
  ) => {
    const startTime = performance.now();
    cancelAnimationFrame(animFrameRef.current);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const rawT = Math.min(elapsed / duration, 1);
      const t = easeOutCubic(rawT);

      const currentVB = fromVB.map((v, i) => lerp(v, toVB[i], t));
      svg.setAttribute('viewBox', currentVB.join(' '));

      if (rawT < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        onComplete?.();
      }
    };
    animFrameRef.current = requestAnimationFrame(step);
  }, []);

  const zoomToProvince = useCallback((provinceId: string) => {
    if (isAnimating || !mapRef.current) return;
    const svg = mapRef.current.querySelector('svg');
    const path = mapRef.current.querySelector(`path[data-province="${provinceId}"]`) as SVGGraphicsElement | null;
    if (!svg || !path) return;

    setIsAnimating(true);
    setZoomedProvinceId(provinceId);
    onZoomChange?.(true);

    // Hide tooltip during zoom
    setShowTooltip(false);
    setHoveredProvinceData(null);

    // Save original viewBox
    if (!originalViewBox.current) {
      originalViewBox.current = svg.getAttribute('viewBox') || '';
    }

    // Fade other provinces
    const allPaths = svg.querySelectorAll('path[data-province]');
    allPaths.forEach(p => {
      const id = p.getAttribute('data-province');
      if (id !== provinceId) {
        (p as SVGElement).style.opacity = '0.08';
        (p as SVGElement).style.pointerEvents = 'none';
      } else {
        (p as SVGElement).style.opacity = '1';
        (p as SVGElement).setAttribute('stroke-width', '3');
      }
    });

    // Get bounding box and animate viewBox
    const bbox = path.getBBox();
    const padding = Math.max(bbox.width, bbox.height) * 0.1;
    const targetVB = [
      bbox.x - padding,
      bbox.y - padding,
      bbox.width + padding * 2,
      bbox.height + padding * 2
    ];

    const currentVBStr = svg.getAttribute('viewBox') || '0 0 1000 1000';
    const fromVB = currentVBStr.split(/[\s,]+/).map(Number);

    animateViewBox(svg, fromVB, targetVB, 600, () => {
      setIsAnimating(false);
    });
  }, [isAnimating, animateViewBox, onZoomChange]);

  const zoomOut = useCallback(() => {
    if (isAnimating || !mapRef.current || !originalViewBox.current) return;
    const svg = mapRef.current.querySelector('svg');
    if (!svg) return;

    setIsAnimating(true);

    // Restore all provinces
    const allPaths = svg.querySelectorAll('path[data-province]');
    allPaths.forEach(p => {
      (p as SVGElement).style.opacity = '1';
      (p as SVGElement).style.pointerEvents = 'auto';
      const provinceId = p.getAttribute('data-province');
      const province = provinceId ? provincesData.find(pr => pr.id === provinceId) : null;
      (p as SVGElement).setAttribute('stroke-width', '2');
      (p as SVGElement).setAttribute('fill', province ? getProvinceColor(province) : 'hsl(210, 20%, 82%)');
    });

    const currentVBStr = svg.getAttribute('viewBox') || '0 0 1000 1000';
    const fromVB = currentVBStr.split(/[\s,]+/).map(Number);
    const toVB = originalViewBox.current.split(/[\s,]+/).map(Number);

    animateViewBox(svg, fromVB, toVB, 500, () => {
      setZoomedProvinceId(null);
      setIsAnimating(false);
      onZoomChange?.(false);
    });
  }, [isAnimating, provincesData, getProvinceColor, animateViewBox, onZoomChange]);

  // Attach events after SVG is rendered
  useEffect(() => {
    if (svgContent && mapRef.current) {
      const paths = mapRef.current.querySelectorAll('path[data-province]');
      
      const handlePathMouseOver = (event: Event) => {
        if (zoomedProvinceId) return; // No hover interaction while zoomed
        const target = event.target as SVGElement;
        const provinceId = target.getAttribute('data-province');
        
        if (provinceId && provinceId !== 'unknown') {
          const province = provincesData.find(p => p.id === provinceId);
          if (province) {
            onProvinceHover(provinceId);
            setHoveredProvinceData(province);
            setShowTooltip(true);
            target.setAttribute('fill', 'hsl(348, 100%, 54%)');
            
            if (!isManuallyPositioned) {
              const position = calculateTooltipPosition(target);
              setTooltipPosition({ x: position.x, y: position.y });
              setTooltipAlignment({ horizontal: position.horizontal, vertical: position.vertical });
            }
          }
        }
      };

      const handlePathMouseMove = (event: Event) => {
        if (zoomedProvinceId) return;
        const target = event.target as SVGElement;
        if (showTooltip && !isManuallyPositioned) {
          const position = calculateTooltipPosition(target);
          setTooltipPosition({ x: position.x, y: position.y });
          setTooltipAlignment({ horizontal: position.horizontal, vertical: position.vertical });
        }
      };

      const handlePathMouseOut = (event: Event) => {
        if (zoomedProvinceId) return;
        const target = event.target as SVGElement;
        const provinceId = target.getAttribute('data-province');
        const province = provinceId ? provincesData.find(p => p.id === provinceId) : null;
        
        target.setAttribute('fill', province ? getProvinceColor(province) : 'hsl(210, 20%, 82%)');

        if (isDragging || isManuallyPositioned || overTooltip) return;
        
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
            // Trigger zoom animation
            if (!zoomedProvinceId) {
              zoomToProvince(provinceId);
            }
          }
        }
      };

      paths.forEach(path => {
        path.addEventListener('mouseover', handlePathMouseOver);
        path.addEventListener('mousemove', handlePathMouseMove);
        path.addEventListener('mouseout', handlePathMouseOut);
        path.addEventListener('click', handlePathClick);
      });

      return () => {
        paths.forEach(path => {
          path.removeEventListener('mouseover', handlePathMouseOver);
          path.removeEventListener('mousemove', handlePathMouseMove);
          path.removeEventListener('mouseout', handlePathMouseOut);
          path.removeEventListener('click', handlePathClick);
        });
      };
    }
  }, [svgContent, provincesData, onProvinceHover, onProvinceSelect, getProvinceColor, zoomedProvinceId, zoomToProvince]);

  // Global drag listeners
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

    const handleMouseUp = () => setIsDragging(false);

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

    const handleTouchEnd = () => setIsDragging(false);

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

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const calculateTooltipPosition = (provinceElement: SVGElement) => {
    const mapEl = mapRef.current;
    if (!mapEl) return { x: 0, y: 0, horizontal: 'right', vertical: 'bottom' };

    const mapRect = mapEl.getBoundingClientRect();
    const provinceRect = (provinceElement as SVGGraphicsElement).getBoundingClientRect();

    const provinceLeft = provinceRect.left - mapRect.left;
    const provinceTop = provinceRect.top - mapRect.top;
    const provinceWidth = provinceRect.width;
    const provinceHeight = provinceRect.height;

    const isSmallScreen = window.innerWidth < 640;
    const tooltipWidth = isSmallScreen ? 192 : 256;
    const tooltipHeight = isSmallScreen ? 240 : 280;
    const offset = 16;

    const anchorPoints = [
      { x: provinceLeft + provinceWidth + offset, y: provinceTop + provinceHeight / 2 - tooltipHeight / 2, horizontal: 'right', vertical: 'center', priority: 1 },
      { x: provinceLeft - tooltipWidth - offset, y: provinceTop + provinceHeight / 2 - tooltipHeight / 2, horizontal: 'left', vertical: 'center', priority: 2 },
      { x: provinceLeft + provinceWidth / 2 - tooltipWidth / 2, y: provinceTop + provinceHeight + offset, horizontal: 'center', vertical: 'bottom', priority: 3 },
      { x: provinceLeft + provinceWidth / 2 - tooltipWidth / 2, y: provinceTop - tooltipHeight - offset, horizontal: 'center', vertical: 'top', priority: 4 },
    ];

    const pad = 10;
    const validPositions = anchorPoints.filter(
      (p) => p.x >= pad && p.x + tooltipWidth <= mapRect.width - pad && p.y >= pad && p.y + tooltipHeight <= mapRect.height - pad
    );

    const bestPosition = validPositions.length > 0 ? validPositions.sort((a, b) => a.priority - b.priority)[0] : anchorPoints[0];

    return {
      x: Math.max(pad, Math.min(bestPosition.x, mapRect.width - tooltipWidth - pad)),
      y: Math.max(pad, Math.min(bestPosition.y, mapRect.height - tooltipHeight - pad)),
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
          style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(svgContent, { USE_PROFILES: { svg: true, svgFilters: true }, ADD_TAGS: ['use'], ADD_ATTR: ['preserveAspectRatio', 'viewBox', 'data-province', 'data-name'] }) }}
        />
      </div>

      {/* Back button when zoomed */}
      {zoomedProvinceId && !isAnimating && (
        <button
          className="absolute top-2 right-2 z-20 animate-fade-in h-6 w-6 flex items-center justify-center rounded-full bg-background/90 backdrop-blur-sm border border-border/50 shadow-md hover:bg-background transition-colors"
          onClick={zoomOut}
          title="Retour à la carte"
          aria-label="Retour à la carte"
        >
          <ArrowLeft className="h-3 w-3 text-foreground" />
        </button>
      )}
      
      {/* Tooltip */}
      {showTooltip && hoveredProvinceData && !zoomedProvinceId && (
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
          aria-label="Infobulle province"
          onMouseEnter={() => setOverTooltip(true)}
          onMouseLeave={() => setOverTooltip(false)}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDragging(true);
            const rect = mapRef.current?.getBoundingClientRect();
            if (rect) {
              setDragOffset({ x: e.clientX - rect.left - tooltipPosition.x, y: e.clientY - rect.top - tooltipPosition.y });
            }
          }}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            setIsDragging(true);
            const rect = mapRef.current?.getBoundingClientRect();
            if (rect) {
              setDragOffset({ x: touch.clientX - rect.left - tooltipPosition.x, y: touch.clientY - rect.top - tooltipPosition.y });
            }
          }}
        >
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary/20 hover:bg-primary/30 rounded-full px-3 py-1 text-xs text-primary cursor-grab hover:cursor-grabbing transition-colors">
            ⋮⋮⋮
          </div>
          <ProvinceTooltip province={hoveredProvinceData} lineConfigs={tooltipLineConfigs} />
        </div>
      )}
    </div>
  );
};

export default DRCMapWithTooltip;
