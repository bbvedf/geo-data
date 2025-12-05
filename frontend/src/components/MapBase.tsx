// src/components/MapBase.tsx
import { useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapBaseProps {
  onMapReady: (map: L.Map, markers: L.LayerGroup) => void;
  height?: string;
}

export default function MapBase({ onMapReady, height = '500px' }: MapBaseProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersInstance = useRef<L.LayerGroup | null>(null);
  const isInitialized = useRef(false);

  // Fix para iconos de Leaflet - UNA SOLA VEZ
  useEffect(() => {
    if (typeof window === 'undefined') return;

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  }, []);

  // Función para limpiar el mapa
  const cleanupMap = useCallback(() => {
    if (markersInstance.current && mapInstance.current) {
      try {
        markersInstance.current.clearLayers();
        mapInstance.current.removeLayer(markersInstance.current);
      } catch (error) {
        console.warn('Error limpiando marcadores:', error);
      }
      markersInstance.current = null;
    }

    if (mapInstance.current) {
      try {
        mapInstance.current.remove();
      } catch (error) {
        console.warn('Error removiendo mapa:', error);
      }
      mapInstance.current = null;
    }

    isInitialized.current = false;
  }, []);

  // Inicializar mapa - OPTIMIZADO
  useEffect(() => {
    if (!mapContainerRef.current || isInitialized.current) {
      return;
    }

    console.log('MapBase: Inicializando mapa...');

    try {
      // Configuración ALTAMENTE optimizada para miles de marcadores
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
        zoomAnimation: false,        // Desactivar para mejor rendimiento
        fadeAnimation: false,        // Desactivar para mejor rendimiento
        markerZoomAnimation: false,  // Desactivar animación de marcadores
        preferCanvas: true,          // ¡CRÍTICO! Usar canvas para mejor rendimiento
        maxZoom: 18,
        minZoom: 3,
        inertia: false,              // Desactivar inercia para evitar bucles
        keyboard: false,             // Desactivar controles de teclado temporalmente
        scrollWheelZoom: 'center',   // Solo zoom al centro
        maxBoundsViscosity: 1.0,     // Restricción de bounds más estricta
      });

      // Tile layer optimizado para rendimiento
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
        tileSize: 256,
        zoomOffset: 0,
        updateWhenIdle: true,        // Solo actualizar cuando para de moverse
        updateWhenZooming: false,    // No actualizar durante zoom
        updateInterval: 500,         // 500ms entre updates
        keepBuffer: 6,               // Mantener más tiles en buffer
        detectRetina: false,         // Desactivar retina para mejor rendimiento
      }).addTo(map);

      // Vista inicial (España)
      map.setView([40.4168, -3.7038], 6, {
        animate: false,  // Sin animación inicial
        duration: 0
      });

      // Crear grupo de marcadores
      const markers = L.layerGroup().addTo(map);

      // Guardar referencias
      mapInstance.current = map;
      markersInstance.current = markers;
      isInitialized.current = true;

      // Deshabilitar algunos eventos que pueden causar bucles
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      
      // Habilitar controles gradualmente después de inicialización
      setTimeout(() => {
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
        if (map.keyboard) map.keyboard.enable();
      }, 1000);

      // Notificar que el mapa está listo (con retardo para estabilización)
      setTimeout(() => {
        console.log('MapBase: Mapa listo, notificando...');
        onMapReady(map, markers);
      }, 300);

      // Handler para resize
      let resizeTimer: ReturnType<typeof setTimeout>;
      const handleResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (mapInstance.current) {
            try {
              // Usar método público en lugar de propiedad interna
              mapInstance.current.invalidateSize({ animate: false });
            } catch (error) {
              console.warn('Error al redimensionar mapa:', error);
            }
          }
        }, 250);
      };

      window.addEventListener('resize', handleResize);

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(resizeTimer);
        cleanupMap();
      };

    } catch (error) {
      console.error('MapBase: Error inicializando mapa:', error);
      isInitialized.current = false;
    }
  }, [onMapReady, cleanupMap]);

  // Efecto para limpiar al desmontar
  useEffect(() => {
    return () => {
      cleanupMap();
    };
  }, [cleanupMap]);

  return (
    <div style={{ 
      height, 
      width: '100%', 
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div 
        ref={mapContainerRef} 
        style={{ 
          height: '100%', 
          width: '100%', 
          borderRadius: '8px',
          zIndex: 1,
          backgroundColor: '#f0f0f0' // Color de fondo mientras carga
        }}
      />
    </div>
  );
}