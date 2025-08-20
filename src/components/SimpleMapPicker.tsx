import React, { useEffect, useState, useRef } from 'react';

interface SimpleMapPickerProps {
  latitude?: number;
  longitude?: number;
  onCoordinatesChange: (lat: number, lng: number) => void;
  className?: string;
}

declare global {
  interface Window {
    L: any;
  }
}

export default function SimpleMapPicker({ 
  latitude, 
  longitude, 
  onCoordinatesChange, 
  className 
}: SimpleMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    const loadLeaflet = async () => {
      if (window.L) {
        initializeMap();
        return;
      }

      // Charger les CSS de Leaflet
      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(linkElement);

      // Charger le JS de Leaflet
      const scriptElement = document.createElement('script');
      scriptElement.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      
      scriptElement.onload = () => {
        // Fix pour les icônes par défaut de Leaflet
        if (window.L) {
          window.L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          });
        }
        initializeMap();
      };
      
      document.head.appendChild(scriptElement);
    };

    const initializeMap = () => {
      if (!mapContainerRef.current || mapRef.current) return;

      const L = window.L;
      
      // Position par défaut (centre de la France)
      const defaultLat = latitude || 46.603354;
      const defaultLng = longitude || 1.888334;
      const defaultZoom = latitude && longitude ? 13 : 6;

      // Créer la carte
      mapRef.current = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], defaultZoom);

      // Ajouter les tuiles OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);

      // Ajouter un marqueur si des coordonnées sont fournies
      if (latitude && longitude) {
        markerRef.current = L.marker([latitude, longitude], { draggable: true })
          .addTo(mapRef.current);
        
        // Événement de déplacement du marqueur
        markerRef.current.on('dragend', (e: any) => {
          const position = e.target.getLatLng();
          onCoordinatesChange(position.lat, position.lng);
        });
      }

      // Événement de clic sur la carte
      mapRef.current.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        
        // Supprimer l'ancien marqueur s'il existe
        if (markerRef.current) {
          mapRef.current.removeLayer(markerRef.current);
        }
        
        // Créer un nouveau marqueur
        markerRef.current = L.marker([lat, lng], { draggable: true })
          .addTo(mapRef.current);
        
        // Événement de déplacement du nouveau marqueur
        markerRef.current.on('dragend', (e: any) => {
          const position = e.target.getLatLng();
          onCoordinatesChange(position.lat, position.lng);
        });
        
        // Mettre à jour les coordonnées
        onCoordinatesChange(lat, lng);
      });

      setIsMapReady(true);
    };

    loadLeaflet();

    // Nettoyage
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Mettre à jour la position du marqueur quand les props changent
  useEffect(() => {
    if (mapRef.current && latitude && longitude && isMapReady) {
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        const L = window.L;
        markerRef.current = L.marker([latitude, longitude], { draggable: true })
          .addTo(mapRef.current);
        
        markerRef.current.on('dragend', (e: any) => {
          const position = e.target.getLatLng();
          onCoordinatesChange(position.lat, position.lng);
        });
      }
      
      mapRef.current.setView([latitude, longitude], 13);
    }
  }, [latitude, longitude, isMapReady, onCoordinatesChange]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-xs text-muted-foreground">Coordonnées GPS</div>
      <div 
        ref={mapContainerRef} 
        className="h-64 w-full rounded-md border overflow-hidden"
        style={{ minHeight: '256px' }}
      >
        {!isMapReady && (
          <div className="h-full flex items-center justify-center bg-muted/50">
            <div className="text-sm text-muted-foreground">Chargement de la carte...</div>
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        Cliquez sur la carte ou faites glisser le marqueur pour définir les coordonnées
      </div>
    </div>
  );
}