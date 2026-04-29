import { useEffect, useState, useMemo } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getAuthToken = () =>
  sessionStorage.getItem('auth_token') ||
  sessionStorage.getItem('token') ||
  localStorage.getItem('auth_token') ||
  localStorage.getItem('token');
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { MapPin, Globe, Building2, Mail, Phone, CheckCircle, Clock, XCircle, Download } from 'lucide-react';
import StatusBadge from '../../../components/StatusBadge/StatusBadge';
import L from 'leaflet';
import './TrainingCentersMapScreen.css';

// ─── Leaflet marker icon fix (required for bundlers) ─────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ─── Status colours ───────────────────────────────────────────────────────────
const STATUS_COLOR = {
  active: '#10B981',
  pending: '#F59E0B',
  suspended: '#EF4444',
  inactive: '#6B7280',
};

// ─── Custom circular pin icon ─────────────────────────────────────────────────
const makeIcon = (status) =>
  L.divIcon({
    className: '',          // no extra class, avoids Leaflet's white-box default
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${STATUS_COLOR[status] || '#3B82F6'};
      border:3px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;
    ">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      </svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });

// ─── Inner helpers (must be children of MapContainer) ────────────────────────

/** Forces Leaflet to recalculate its size when its container resizes */
const AutoSize = () => {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;

    // rAF on mount
    const id = requestAnimationFrame(() => map.invalidateSize());

    // Watch for size changes (e.g. sidebar open/close)
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => map.invalidateSize());
    });
    observer.observe(container);

    return () => {
      cancelAnimationFrame(id);
      observer.disconnect();
    };
  }, [map]);
  return null;
};

/** Fits the viewport to show all markers */
const FitBounds = ({ markers }) => {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.latitude, m.longitude]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 5 });
  }, [markers, map]);
  return null;
};

// ─── Main component ───────────────────────────────────────────────────────────
const TrainingCentersMapScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [trainingCenters, setTrainingCenters] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [downloadingRegion, setDownloadingRegion] = useState(null);

  // ── Header ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setHeaderTitle('Training Providers Regions');
    setHeaderSubtitle('View training providers by region on the map');
    return () => { setHeaderTitle(null); setHeaderSubtitle(null); };
  }, [setHeaderTitle, setHeaderSubtitle]);

  // ── Data fetch ───────────────────────────────────────────────────────────────
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminAPI.getTrainingCentersMap();
      if (res?.training_centers) {
        setTrainingCenters(res.training_centers);
        setSummary(res.summary);
      }
    } catch (err) {
      console.error('Map fetch error:', err);
      setError('Failed to load training providers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── CSV Export ────────────────────────────────────────────────────────────────
  /** Build the export URL for a given region, preferring the one from the API response */
  const getExportUrl = (regionName) => {
    const fromApi = summary?.export_download_urls?.[regionName];
    if (fromApi) return fromApi;
    // Fallback: construct the URL ourselves using the same base as api.js
    return `${API_BASE_URL}/admin/training-centers/map/export?region=${encodeURIComponent(regionName)}&status=active`;
  };

  const handleExportCSV = async (region) => {
    if (downloadingRegion) return;
    const url = getExportUrl(region);
    try {
      setDownloadingRegion(region);
      const token = getAuthToken();
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`Export failed: ${response.status}`);

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      // Derive filename from region name (sanitise slashes/spaces)
      const safeRegion = region.replace(/[/\\]/g, '-').replace(/\s+/g, '-').toLowerCase();
      link.download = `training-centers-${safeRegion}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('CSV export error:', err);
      alert('Failed to download CSV. Please try again.');
    } finally {
      setDownloadingRegion(null);
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────────────
  const filteredCenters = useMemo(() =>
    selectedRegion
      ? trainingCenters.filter((tc) => tc.region === selectedRegion)
      : trainingCenters,
    [trainingCenters, selectedRegion]
  );

  const mappedCenters = useMemo(() =>
    filteredCenters.filter(
      (tc) => tc.latitude != null && tc.longitude != null &&
        !isNaN(tc.latitude) && !isNaN(tc.longitude)
    ),
    [filteredCenters]
  );

  const regions = useMemo(() => {
    if (!summary?.by_region) return [];
    return Object.entries(summary.by_region)
      .map(([name, count]) => ({ name, count, isActive: selectedRegion === name }))
      .sort((a, b) => b.count - a.count);
  }, [summary, selectedRegion]);

  // ── Loading / Error ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="training-centers-map-screen">
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading training providers map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="training-centers-map-screen">
        <div className="error-container">
          <XCircle className="w-16 h-16 text-red-500 mb-4" />
          <p className="error-message">{error}</p>
          <button onClick={fetchData} className="retry-button">Try Again</button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="training-centers-map-screen">

      {/* ══ Map card ══════════════════════════════════════════════════════════ */}
      <div className="map-section">
        {/* header */}
        <div className="map-header">
          <div className="map-header-left">
            <Globe className="w-6 h-6 text-primary-600" />
            <h2>Global Training Providers</h2>
          </div>
          <div className="map-header-stats">
            <div className="stat-item">
              <span className="stat-label">Total Providers</span>
              <span className="stat-value">{summary?.total || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Regions</span>
              <span className="stat-value">{regions.length}</span>
            </div>
          </div>
        </div>

        {/* map */}
        <div className="map-wrapper">
          {/*
            Transparent blocker sits on top (z-index 1000) and swallows
            every pointer/touch event so the map is purely decorative.
          */}
          <div className="map-blocker" />

          <MapContainer
            center={[20, 0]}
            zoom={2}
            style={{ height: '100%', width: '100%' }}
            // Disable every built-in interaction
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            zoomControl={false}
            touchZoom={false}
            boxZoom={false}
            keyboard={false}
            tap={false}
            attributionControl={false}
          >
            {/* Recalculates map size after first paint */}
            <AutoSize />
            {/* Fits viewport to markers when data loads */}
            <FitBounds markers={mappedCenters} />

            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {mappedCenters.map((center) => (
              <Marker
                key={center.id}
                position={[center.latitude, center.longitude]}
                icon={makeIcon(center.status)}
              />
            ))}
          </MapContainer>

          {/* Empty state when no coordinates exist */}
          {mappedCenters.length === 0 && (
            <div className="map-empty-state">
              <MapPin className="w-16 h-16 text-gray-300 mb-4" />
              <p>No training providers with location data available</p>
              <p className="map-empty-state-hint">
                Training providers need latitude and longitude coordinates to appear on the map
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ══ Region filter ═════════════════════════════════════════════════════ */}
      <div className="regions-section">
        <div className="regions-header">
          <h3>Regions</h3>
          {selectedRegion && (
            <button onClick={() => setSelectedRegion(null)} className="clear-filter-button">
              Clear Filter
            </button>
          )}
        </div>

        <div className="regions-grid">
          {regions.map((region) => {
            const isDownloading = downloadingRegion === region.name;
            return (
              <div
                key={region.name}
                className={`region-card ${region.isActive ? 'active' : ''}`}
                onClick={() => setSelectedRegion(region.isActive ? null : region.name)}
              >
                <div className="region-icon"><MapPin className="w-6 h-6" /></div>
                <div className="region-info">
                  <h4>{region.name}</h4>
                  <p>{region.count} Training Providers</p>
                </div>
                <div className="region-card-actions">
                  <button
                    className={`region-export-btn ${isDownloading ? 'loading' : ''}`}
                    title={`Download ${region.name} CSV`}
                    disabled={isDownloading || !!downloadingRegion}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportCSV(region.name);
                    }}
                  >
                    {isDownloading
                      ? <span className="export-spinner" />
                      : <Download className="w-4 h-4" />}
                    <span>{isDownloading ? 'Downloading…' : 'CSV'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ Center cards ══════════════════════════════════════════════════════ */}
      <div className="centers-data-section">
        <div className="centers-data-header">
          <h3>{selectedRegion ? `${selectedRegion} Training Providers` : 'All Training Providers'}</h3>
          <span className="centers-count">{filteredCenters.length} providers</span>
        </div>

        {filteredCenters.length === 0 ? (
          <div className="empty-state">
            <Building2 className="w-16 h-16 text-gray-300 mb-4" />
            <p>No training providers found</p>
          </div>
        ) : (
          <div className="centers-grid">
            {filteredCenters.map((center) => (
              <div key={center.id} className="center-card">
                <div className="center-card-header">
                  <div className="center-logo">
                    {center.logo_url
                      ? <img src={center.logo_url} alt={center.name} />
                      : <Building2 className="w-8 h-8 text-gray-400" />}
                  </div>
                  <div className="center-info">
                    <h4>{center.name}</h4>
                    <p className="center-type">{center.training_provider_type}</p>
                  </div>
                  <StatusBadge status={center.status} />
                </div>

                <div className="center-card-body">
                  <div className="center-detail">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>{center.city}, {center.country}</span>
                  </div>
                  <div className="center-detail">
                    <Globe className="w-4 h-4 text-gray-500" />
                    <span>{center.region}</span>
                  </div>
                  {center.email && (
                    <div className="center-detail">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <a href={`mailto:${center.email}`}>{center.email}</a>
                    </div>
                  )}
                  {center.phone && (
                    <div className="center-detail">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <a href={`tel:${center.phone}`}>{center.phone}</a>
                    </div>
                  )}
                </div>


              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingCentersMapScreen;