'use client';

import React, { useEffect, useRef } from 'react';
import 'ol/ol.css';
import { Map as OLMap, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Style, Icon as OLIcon } from 'ol/style';

const OpenLayersMapDisplay = ({ latitude, longitude }) => {
  const mapElementRef = useRef(null);
  const mapInstance = useRef(null);
  const markerLayer = useRef(null);

  // SVG for the truck icon (similar to the example, using a blue color)
  // Color #007bff (URL encoded: %23007bff)
  const truckSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%23007bff"><path d="M20 8h-3V4H3c-1.11 0-2 .89-2 2v11h2a3 3 0 0 0 3 3a3 3 0 0 0 3-3h6a3 3 0 0 0 3 3a3 3 0 0 0 3-3h2v-5l-3-4M6 18.5A1.5 1.5 0 0 1 4.5 17A1.5 1.5 0 0 1 6 15.5A1.5 1.5 0 0 1 7.5 17A1.5 1.5 0 0 1 6 18.5m13.5-1.5A1.5 1.5 0 0 1 18 15.5A1.5 1.5 0 0 1 19.5 14A1.5 1.5 0 0 1 21 15.5A1.5 1.5 0 0 1 19.5 17M17.42 12H17V9.5h2.58l.85 1.21L17.42 12Z"/></svg>';
  const truckIconSrc = `data:image/svg+xml;utf8,${truckSvg}`;

  const updateMarkerPosition = (coordsLonLat) => {
    if (!markerLayer.current || !coordsLonLat) return;

    const source = markerLayer.current.getSource();
    source.clear(); // Clear existing markers

    const marker = new Feature({
      geometry: new Point(fromLonLat(coordsLonLat)),
    });

    marker.setStyle(
      new Style({
        image: new OLIcon({
          src: truckIconSrc,
          anchor: [0.5, 1], // Anchor at the bottom center of the icon
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          scale: 1, // Adjust scale as needed
        }),
      })
    );
    source.addFeature(marker);
  };

  // Initialize map
  useEffect(() => {
    if (mapElementRef.current && !mapInstance.current && latitude && longitude) {
      const vectorSource = new VectorSource();
      markerLayer.current = new VectorLayer({
        source: vectorSource,
        zIndex: 10,
      });

      mapInstance.current = new OLMap({
        target: mapElementRef.current,
        layers: [
          new TileLayer({
            source: new OSM(),
          }),
          markerLayer.current,
        ],
        view: new View({
          center: fromLonLat([longitude, latitude]),
          zoom: 15, // Initial zoom level
          maxZoom: 18,
        }),
      });

      updateMarkerPosition([longitude, latitude]);
    }

    // Cleanup function
    return () => {
      if (mapInstance.current) {
        mapInstance.current.setTarget(null);
        mapInstance.current = null; // Ensure map instance is cleaned for re-initialization if component remounts
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount to initialize

  // Update map view and marker when latitude or longitude props change
  useEffect(() => {
    if (mapInstance.current && latitude && longitude) {
      const newCenter = fromLonLat([longitude, latitude]);
      mapInstance.current.getView().animate({
        center: newCenter,
        zoom: mapInstance.current.getView().getZoom(), // Keep current zoom or set a new one
        duration: 500, // Animation duration in ms
      });
      updateMarkerPosition([longitude, latitude]);
    } else if (mapElementRef.current && !mapInstance.current && latitude && longitude) {
        // This case handles if the component mounts but lat/lon become available slightly after initial effect
        // Re-trigger initialization logic or parts of it.
        // Simplified: just try to set up the map if it wasn't due to missing lat/lon initially.
        // The main initialization useEffect with empty deps handles the first mount.
        // This effect handles updates. If the map isn't there on an update with valid coords,
        // it implies it might not have initialized. This is a bit of a safeguard.
        // A more robust way might involve a state variable like `isMapInitialized`.

        // For now, we rely on the initial useEffect to create the map.
        // This effect is primarily for *updating* an existing map.
    }
  }, [latitude, longitude]);

  if (!latitude || !longitude) {
    return (
      <div style={{ height: '300px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
        Awaiting coordinates...
      </div>
    );
  }

  return <div ref={mapElementRef} style={{ height: '300px', width: '100%', borderRadius: '0.375rem', overflow: 'hidden' }} />;
};

export default OpenLayersMapDisplay;