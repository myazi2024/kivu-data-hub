import React, { useState, useEffect } from 'react';
import { Tooltip, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ProvinceTooltip from './ProvinceTooltip';
import DOMPurify from 'dompurify';
import { ProvinceData } from '@/types/province';

interface DRCMapProps {
  provincesData: ProvinceData[];
  selectedProvince: string | null;
  onProvinceSelect: (province: ProvinceData) => void;
  onProvinceHover: (provinceId: string | null) => void;
  hoveredProvince: string | null;
  transactionType: 'location' | 'vente';
  getProvinceColor: (province: ProvinceData) => string;
}

const DRCMap: React.FC<DRCMapProps> = ({
  provincesData,
  selectedProvince,
  onProvinceSelect,
  onProvinceHover,
  hoveredProvince,
  transactionType,
  getProvinceColor
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
          // Force SVG to be responsive by removing fixed dimensions
          svg.removeAttribute('width');
          svg.removeAttribute('height');
          svg.setAttribute('width', '100%');
          svg.setAttribute('height', '100%');
          svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          
          // Find all path elements and add province data
          const paths = svg.querySelectorAll('path[id]');
          console.log(`Found ${paths.length} provinces in SVG`);
          
          paths.forEach(path => {
            const provinceId = path.getAttribute('id');
            const province = provincesData.find(p => p.id === provinceId);
            
            console.log(`Processing province: ${provinceId}, found data: ${!!province}`);
            
            if (province) {
              // Set color based on current filters and transaction type
              const color = getProvinceColor(province);
              path.setAttribute('fill', color);
              path.setAttribute('stroke', '#ffffff');
              path.setAttribute('stroke-width', '2');
              path.setAttribute('cursor', 'pointer');
              
              // Add data attributes
              path.setAttribute('data-province', province.id);
              path.setAttribute('data-name', province.name);
            } else {
              // Make non-data provinces still clickable with default styling
              path.setAttribute('fill', 'hsl(0, 0%, 75%)');
              path.setAttribute('stroke', '#ffffff');
              path.setAttribute('stroke-width', '1');
              path.setAttribute('cursor', 'pointer');
              path.setAttribute('data-province', provinceId || 'unknown');
              path.setAttribute('data-name', `Province ${provinceId}`);
              console.warn(`No data found for province: ${provinceId}`);
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
    
    console.log('Clicked province:', provinceId);
    
    if (provinceId && provinceId !== 'unknown') {
      const province = provincesData.find(p => p.id === provinceId);
      if (province) {
        console.log('Found province data:', province.name);
        onProvinceSelect(province);
      } else {
        console.warn('No data available for province:', provinceId);
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
        target.setAttribute('fill', getProvinceColor(province));
      }
    }
  };

  return (
    <TooltipProvider>
      <div 
        className="w-full h-full flex items-center justify-center"
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
        >
          {svgContent && (
            <div
              onClick={handleMapClick}
              onMouseOver={handleMapMouseOver}
              onMouseOut={handleMapMouseOut}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(svgContent, { USE_PROFILES: { svg: true, svgFilters: true }, ADD_TAGS: ['use'], ADD_ATTR: ['preserveAspectRatio', 'viewBox', 'data-province', 'data-name'] }) }}
            />
          )}
          
          {/* Tooltips for each province */}
          {provincesData.map((province) => (
            <Tooltip key={province.id}>
              <TooltipTrigger asChild>
                <div
                  style={{
                    position: 'absolute',
                    pointerEvents: 'none',
                    opacity: 0,
                    width: 1,
                    height: 1,
                  }}
                  data-province={province.id}
                />
              </TooltipTrigger>
              <ProvinceTooltip province={province} />
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default DRCMap;
