
import React, { useEffect, useRef } from 'react';
import { ItineraryItem } from '../types';
import { motion } from 'framer-motion';

declare const L: any;

interface Props {
  destination: string;
  items: ItineraryItem[];
}

const PastelMap: React.FC<Props> = ({ destination, items }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerGroupRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Initialize Leaflet map with a clean Morandi-friendly base
    mapInstanceRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([0, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    markerGroupRef.current = L.featureGroup().addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !markerGroupRef.current) return;

    markerGroupRef.current.clearLayers();
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    const coords: any[] = [];

    items.forEach((item, index) => {
      // Improved check: Allow 0 as valid coordinate, but exclude undefined/null
      const lat = item.location?.lat;
      const lng = item.location?.lng;
      
      if (typeof lat === 'number' && typeof lng === 'number' && (lat !== 0 || lng !== 0)) {
        const point = [lat, lng];
        coords.push(point);

        const customIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="
            background-color: #092F26;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 800;
            border: 3px solid white;
            box-shadow: 0 4px 15px rgba(9, 47, 38, 0.2);
          ">${index + 1}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker(point, { icon: customIcon })
          .bindPopup(`
            <div style="padding: 8px; min-width: 150px;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #E47C58; letter-spacing: 0.1em; display: block; margin-bottom: 4px;">${item.time}</span>
              <h3 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #092F26;">${item.title}</h3>
              <p style="margin: 0; font-size: 12px; line-height: 1.4; color: #666;">${item.description}</p>
            </div>
          `, { closeButton: false });
        
        markerGroupRef.current.addLayer(marker);
      }
    });

    if (coords.length > 1) {
      polylineRef.current = L.polyline(coords, {
        color: '#092F26',
        weight: 3,
        opacity: 0.15,
        dashArray: '8, 12',
        lineCap: 'round'
      }).addTo(mapInstanceRef.current);
    }

    if (coords.length > 0) {
      mapInstanceRef.current.fitBounds(markerGroupRef.current.getBounds(), {
        padding: [80, 80],
        maxZoom: 14,
        animate: true,
        duration: 1.5
      });
    } else if (destination) {
      // Enhanced fallback: Geocode the destination name
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data[0] && mapInstanceRef.current) {
            mapInstanceRef.current.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 12, {
              animate: true,
              duration: 1
            });
          }
        })
        .catch(err => console.error("Geocoding fallback failed", err));
    }
  }, [items, destination]);

  return (
    <div className="absolute inset-0 w-full h-full bg-morandi-mist overflow-hidden flex flex-col">
      <div ref={mapContainerRef} className="flex-1 w-full h-full z-0" />
      
      <div className="absolute top-8 left-8 z-10 pointer-events-none">
        {/* Fix: Added missing motion from framer-motion */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/90 backdrop-blur-xl px-6 py-3 rounded-full border border-morandi-sage/30 shadow-2xl flex items-center gap-4"
        >
          <div className="w-2.5 h-2.5 bg-morandi-sunset rounded-full animate-pulse shadow-[0_0_10px_rgba(228,124,88,0.5)]" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-morandi-forest/60">
            {items.length > 0 ? `Tracking ${items.length} Points` : 'Exploring Region'}
          </span>
        </motion.div>
      </div>

      <div className="absolute left-0 top-0 bottom-0 w-px bg-morandi-forest/5 z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-px bg-morandi-forest/5 z-10" />
    </div>
  );
};

export default PastelMap;
