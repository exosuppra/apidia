import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Icon, LatLng } from 'leaflet';

// Fix pour les icônes Leaflet
import 'leaflet/dist/leaflet.css';

// Configuration de l'icône par défaut
const DefaultIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface LocationMarkerProps {
  position: LatLng | null;
  setPosition: (position: LatLng) => void;
}

function LocationMarker({ position, setPosition }: LocationMarkerProps) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker 
      position={position} 
      icon={DefaultIcon}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          setPosition(marker.getLatLng());
        },
      }}
    />
  );
}

interface MapPickerProps {
  latitude?: number;
  longitude?: number;
  onCoordinatesChange: (lat: number, lng: number) => void;
  className?: string;
}

export default function MapPicker({ latitude, longitude, onCoordinatesChange, className }: MapPickerProps) {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [mapKey, setMapKey] = useState(0);

  // Initialiser la position depuis les props
  useEffect(() => {
    if (latitude && longitude) {
      const latLng = new LatLng(latitude, longitude);
      setPosition(latLng);
    }
  }, [latitude, longitude]);

  // Mettre à jour les coordonnées quand la position change
  const handleCoordinatesChange = useCallback((lat: number, lng: number) => {
    onCoordinatesChange(lat, lng);
  }, [onCoordinatesChange]);

  useEffect(() => {
    if (position) {
      handleCoordinatesChange(position.lat, position.lng);
    }
  }, [position, handleCoordinatesChange]);

  // Forcer le re-rendu de la carte quand elle devient visible
  useEffect(() => {
    const timer = setTimeout(() => {
      setMapKey(prev => prev + 1);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Position par défaut (centre de la France)
  const defaultCenter: [number, number] = [46.603354, 1.888334];
  const center: [number, number] = position ? [position.lat, position.lng] : defaultCenter;

  return (
    <div className={`h-64 w-full rounded-md border overflow-hidden ${className}`}>
      <MapContainer
        key={mapKey}
        center={center}
        zoom={position ? 13 : 6}
        style={{ height: '100%', width: '100%' }}
        whenReady={() => {
          // La carte est prête
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={setPosition} />
      </MapContainer>
      <div className="mt-2 text-xs text-muted-foreground">
        Cliquez sur la carte ou faites glisser le marqueur pour définir les coordonnées
      </div>
    </div>
  );
}