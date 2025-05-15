'use client'

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Ensure Leaflet CSS is imported here
import { Icon as IconifyIcon } from '@iconify/react'; // Alias to avoid conflict if Icon is used elsewhere
import ReactDOMServer from 'react-dom/server';

// It's good practice to set a default icon path if not already configured globally
// L.Icon.Default.imagePath = '/path/to/leaflet/images/'; // Adjust if necessary

const MapDisplay = ({ latitude, longitude, truckName }) => {
  const [customTruckIcon, setCustomTruckIcon] = useState(null);

  // Ensure Leaflet related objects are created only on the client side
  useEffect(() => {
    // This check is a bit redundant due to 'use client' and dynamic import with ssr:false,
    // but doesn't hurt as an extra safeguard.
    if (typeof window !== 'undefined') {
      const truckIconHtml = ReactDOMServer.renderToString(
        <IconifyIcon icon="mdi:truck" className="text-blue-500 text-3xl" />
      );

      const icon = new L.DivIcon({
        html: truckIconHtml,
        className: 'custom-leaflet-div-icon', // Important: Use a className that doesn't conflict or get stripped
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      });
      setCustomTruckIcon(icon);
    }
  }, []); // Empty dependency array ensures this runs once on mount

  if (typeof window === 'undefined' || !customTruckIcon) {
    // Don't render on the server or until the icon is created
    // You could return a placeholder/loader here if preferred
    return <div style={{ height: '300px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>Loading map...</div>;
  }

  const position = [latitude, longitude];

  return (
    <MapContainer center={position} zoom={15} style={{ height: '300px', width: '100%' }} attributionControl={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {customTruckIcon && ( // Only render Marker if icon is ready
        <Marker position={position} icon={customTruckIcon}>
          <Popup>
            {truckName}
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
};

export default MapDisplay;