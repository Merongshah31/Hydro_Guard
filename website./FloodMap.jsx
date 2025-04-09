import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Marker icons based on alert level
const greenIcon = new L.Icon({
  iconUrl: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
  iconSize: [32, 32],
});

const orangeIcon = new L.Icon({
  iconUrl: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
  iconSize: [32, 32],
});

const redIcon = new L.Icon({
  iconUrl: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
  iconSize: [32, 32],
});

const FloodMap = () => {
  const mapCenter = [4.2105, 101.9758]; // Malaysia
  const [floodData, setFloodData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [weatherWarning, setWeatherWarning] = useState(null);

  useEffect(() => {
    // Load from localStorage first
    const savedData = localStorage.getItem('floodData');
    if (savedData) {
      setFloodData(JSON.parse(savedData));
      console.log('Flood Data loaded from localStorage:', JSON.parse(savedData));
    }

    // Fetch from API
    const fetchFloodData = async () => {
      try {
        const response = await fetch('https://api.data.gov.my/flood-warning?meta=true');
        if (!response.ok) throw new Error(`Error: ${response.status} ${response.statusText}`);
        const data = await response.json();
        setFloodData(data);
        localStorage.setItem('floodData', JSON.stringify(data));
        console.log('Flood Data fetched and saved locally:', data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching flood data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFloodData();
  }, []);

  useEffect(() => {
    // Fetch weather warning data
    const fetchWeatherWarning = async () => {
      try {
        const response = await fetch('https://api.data.gov.my/weather/warning/');
        if (!response.ok) throw new Error('Failed to fetch weather warnings');
        const data = await response.json();
        setWeatherWarning(data);
        console.log('Weather Warning Data:', data);
      } catch (err) {
        console.error('Error fetching weather warning:', err);
      }
    };

    fetchWeatherWarning();
  }, []);

  return (
    <div style={{ height: '85vh', width: '80vw', margin: 'auto' }}>
      {loading && <p>Loading flood data...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {floodData && (
        <>
          <p>Flood data loaded successfully.</p>
          <div style={{ marginBottom: '10px', textAlign: 'center' }}>
            <input
              type="text"
              placeholder="Search station..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px',
                width: '60%',
                fontSize: '16px',
                borderRadius: '8px',
                border: '1px solid #ccc',
              }}
            />
          </div>
          <MapContainer center={mapCenter} zoom={7} style={{ height: '90%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {Array.isArray(floodData?.data) &&
              floodData.data
                .filter((item) =>
                  item.station_name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((item, index) => {
                  const lat = parseFloat(item.latitude);
                  const lon = parseFloat(item.longitude);
                  const current = item.water_level_current;
                  const warning = item.water_level_warning_level;
                  const danger = item.water_level_danger_level;

                  if (!lat || !lon || current == null) return null;

                  let icon = greenIcon;
                  if (current >= warning && current < danger) {
                    icon = orangeIcon;
                  } else if (current >= danger) {
                    icon = redIcon;
                  }

                  return (
                    <Marker key={index} position={[lat, lon]} icon={icon}>
                      <Popup>
                        <strong>{item.station_name}</strong>
                        <br />
                        {item.district}, {item.state}
                        <br />
                        Water Level: <b>{current}</b>
                        <br />
                        Alert: {item.water_level_indicator}
                        <hr />
                        🌩️ <b>Weather Warning:</b>
                        <br />
                        {weatherWarning?.[0]?.title_en || 'No warning'}
                      </Popup>
                    </Marker>
                  );
                })}
          </MapContainer>
        </>
      )}
    </div>
  );
};

export default FloodMap;
