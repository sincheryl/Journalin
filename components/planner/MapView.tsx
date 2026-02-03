import React from 'react';
import { motion } from 'framer-motion';
import PastelMap from '../PastelMap.tsx';
import { ItineraryItem } from '../../types.ts';

interface MapViewProps {
  destination: string;
  items: ItineraryItem[];
}

export default function MapView({ destination, items }: MapViewProps) {
  return (
    <motion.div
      key="map-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-[calc(100vh-160px)] md:h-[calc(100vh-200px)] relative rounded-4xl overflow-hidden shadow-2xl"
    >
      <PastelMap destination={destination} items={items} />
    </motion.div>
  );
}
