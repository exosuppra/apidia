import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Icon, LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Icône du marqueur personnalisée pour Leaflet
const markerIcon = new Icon({
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
      icon={markerIcon}
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
  const mapRef = useRef<any>(null);

  // Initialiser la position depuis les props
  useEffect(() => {
    if (latitude && longitude) {
      const latLng = new LatLng(latitude, longitude);
      setPosition(latLng);
    }
  }, [latitude, longitude]);

  // Mettre à jour les coordonnées quand la position change
  useEffect(() => {
    if (position) {
      onCoordinatesChange(position.lat, position.lng);
    }
  }, [position, onCoordinatesChange]);

  // Position par défaut (centre de la France)
  const defaultCenter: [number, number] = [46.603354, 1.888334];
  const center: [number, number] = position ? [position.lat, position.lng] : defaultCenter;

  return (
    <div className={`h-64 w-full rounded-md border overflow-hidden ${className}`}>
      <MapContainer
        center={center}
        zoom={position ? 13 : 6}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
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