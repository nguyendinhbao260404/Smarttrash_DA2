import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Default center (Da Nang, Vietnam)
const DEFAULT_CENTER = {
  lat: 16.070704,
  lng: 108.220329,
};

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: 'calc(100vh - 180px)',
};

interface NodeData {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  fill_percentage: number;
  trash_level_mm: number;
  gas_level: number;
  temperature: number;
  humidity: number;
  last_updated: string;
  status: 'normal' | 'warning' | 'critical';
}

export const TrashMapView = () => {
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

  // Mock data - replace with real WebSocket data
  const nodes: NodeData[] = [
    {
      id: 'node1',
      name: 'Thùng rác chính',
      location: { lat: 16.071000, lng: 108.221000 },
      fill_percentage: 85,
      trash_level_mm: 255,
      gas_level: 120,
      temperature: 28,
      humidity: 65,
      last_updated: new Date().toLocaleString('vi-VN'),
      status: 'warning',
    },
    {
      id: 'node2',
      name: 'Thùng rác phụ',
      location: { lat: 16.072000, lng: 108.223000 },
      fill_percentage: 65,
      trash_level_mm: 195,
      gas_level: 80,
      temperature: 27,
      humidity: 68,
      last_updated: new Date().toLocaleString('vi-VN'),
      status: 'normal',
    },
  ];

  const getMarkerIcon = (status: string) => {
    const colors = {
      critical: '#EF4444',
      warning: '#F59E0B',
      normal: '#10B981',
    };

    return {
      path: typeof google !== 'undefined' ? google.maps.SymbolPath.CIRCLE : 0,
      fillColor: colors[status as keyof typeof colors] || colors.normal,
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
      scale: 12,
    };
  };

  const handleMarkerClick = (node: NodeData) => {
    setSelectedNode(node);
    setMapCenter(node.location);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold">🗺️ Bản đồ Thùng rác</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
          >
            ← Quay lại
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4 bg-white">
            <div className="text-sm text-gray-600">Tổng số thùng</div>
            <div className="text-3xl font-bold text-gray-900">{nodes.length}</div>
          </div>
          <div className="card p-4 bg-red-50">
            <div className="text-sm text-red-600">Cần thu gom</div>
            <div className="text-3xl font-bold text-red-600">
              {nodes.filter((n) => n.status === 'critical').length}
            </div>
          </div>
          <div className="card p-4 bg-orange-50">
            <div className="text-sm text-orange-600">Sắp đầy</div>
            <div className="text-3xl font-bold text-orange-600">
              {nodes.filter((n) => n.status === 'warning').length}
            </div>
          </div>
          <div className="card p-4 bg-green-50">
            <div className="text-sm text-green-600">Bình thường</div>
            <div className="text-3xl font-bold text-green-600">
              {nodes.filter((n) => n.status === 'normal').length}
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Vị trí thùng rác Real-time</h2>
            <p className="text-sm text-gray-600 mt-1">
              Click vào marker để xem chi tiết. Màu sắc thể hiện tình trạng thùng.
            </p>
          </div>

          {GOOGLE_MAPS_API_KEY ? (
            <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
              <GoogleMap
                mapContainerStyle={MAP_CONTAINER_STYLE}
                center={mapCenter}
                zoom={15}
                options={{
                  disableDefaultUI: false,
                  zoomControl: true,
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: true,
                }}
              >
                {nodes.map((node) => (
                  <Marker
                    key={node.id}
                    position={node.location}
                    onClick={() => handleMarkerClick(node)}
                    icon={getMarkerIcon(node.status)}
                  />
                ))}

                {selectedNode && (
                  <InfoWindow
                    position={selectedNode.location}
                    onCloseClick={() => setSelectedNode(null)}
                  >
                    <div className="p-2 min-w-[250px]">
                      <h3 className="font-bold text-lg mb-2">{selectedNode.name}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mức đầy:</span>
                          <span className="font-semibold">{selectedNode.fill_percentage}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Khoảng cách:</span>
                          <span>{selectedNode.trash_level_mm}mm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Khí gas:</span>
                          <span>{selectedNode.gas_level} ppm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Nhiệt độ:</span>
                          <span>{selectedNode.temperature}°C</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Độ ẩm:</span>
                          <span>{selectedNode.humidity}%</span>
                        </div>
                        <div className="pt-2 border-t">
                          <span className="text-xs text-gray-500">
                            Cập nhật: {selectedNode.last_updated}
                          </span>
                        </div>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </LoadScript>
          ) : (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-bold text-yellow-900 mb-2">
                Chưa có Google Maps API Key
              </h3>
              <p className="text-yellow-700 mb-4">
                Vui lòng xem hướng dẫn trong file <code className="bg-yellow-200 px-2 py-1 rounded">GOOGLE_MAPS_SETUP.md</code>
              </p>
              <ol className="text-left max-w-md mx-auto text-sm text-yellow-800 space-y-1">
                <li>1. Lấy API key từ Google Cloud Console</li>
                <li>2. Tạo file `.env` trong doan2-frontend/</li>
                <li>3. Thêm: VITE_GOOGLE_MAPS_API_KEY=your-key-here</li>
                <li>4. Restart dev server</li>
              </ol>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Chú thích:</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm">Cần thu gom (≥90%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                <span className="text-sm">Sắp đầy (70-89%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-sm">Bình thường (&lt;70%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

