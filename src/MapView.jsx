import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";

// Automatically fit the map to the complete route
function FitRoute({ coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (!coordinates || coordinates.length === 0) return;

    const bounds = L.latLngBounds(coordinates);
    map.fitBounds(bounds, { padding: [45, 45] });
  }, [coordinates, map]);

  return null;
}

// Custom map markers
const startIcon = L.divIcon({
  className: "wayfinder-marker",
  html: '<div class="wayfinder-pin wayfinder-pin-start"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const destinationIcon = L.divIcon({
  className: "wayfinder-marker",
  html: '<div class="wayfinder-pin wayfinder-pin-end"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function MapView({
  routeData,
  currentLocation,
  locationLoading,
  locationError,
}) {
  if (!routeData) {
    if (!currentLocation) {
      return (
        <div className="map-empty-state">
          <div className="map-empty-icon">⌖</div>
          <p>
            {locationLoading
              ? "Detecting your location..."
              : "Your route will appear here"}
          </p>
          <span>{locationError || "Enter a journey to get started"}</span>
        </div>
      );
    }

    return (
      <MapContainer
        center={[currentLocation.lat, currentLocation.lon]}
        zoom={14}
        scrollWheelZoom={true}
        className="wayfinder-leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker
          position={[currentLocation.lat, currentLocation.lon]}
          icon={startIcon}
        >
          <Popup>
            <strong>Your current location</strong>
          </Popup>
        </Marker>
      </MapContainer>
    );
  }

  const { origin, destination, geometry } = routeData;

  // GeoJSON coordinates are [longitude, latitude].
  // Leaflet expects [latitude, longitude].
  const coordinates = geometry.coordinates.map(([lon, lat]) => [lat, lon]);

  const startPosition = [origin.lat, origin.lon];
  const endPosition = [destination.lat, destination.lon];

  return (
    <MapContainer
      center={startPosition}
      zoom={7}
      scrollWheelZoom={true}
      className="wayfinder-leaflet-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={startPosition} icon={startIcon}>
        <Popup>
          <strong>Starting point</strong>
          <br />
          {origin.name}
        </Popup>
      </Marker>

      <Marker position={endPosition} icon={destinationIcon}>
        <Popup>
          <strong>Destination</strong>
          <br />
          {destination.name}
        </Popup>
      </Marker>

      <Polyline
        positions={coordinates}
        pathOptions={{
          color: "#a78bfa",
          weight: 5,
          opacity: 0.9,
        }}
      />

      <FitRoute coordinates={coordinates} />
    </MapContainer>
  );
}
