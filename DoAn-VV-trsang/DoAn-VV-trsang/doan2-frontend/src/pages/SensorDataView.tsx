import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface SensorReading {
  id: string;
  nodeName: string;
  timestamp: string;
  distance: number;
  gas: number;
  is_detected_human: boolean;
  latitude: number;
  longitude: number;
}

export const SensorDataView = () => {
  const navigate = useNavigate();
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSensorData();

    // Auto-refresh every 10 seconds (silent update)
    const interval = setInterval(() => {
      loadSensorData(false);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadSensorData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/sensor-data/history', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      setSensorReadings(response.data.data || []);
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError('Lỗi khi tải dữ liệu cảm biến');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const calculateFillLevel = (distance: number): number => {
    const maxDistance = 150;
    const minDistance = 20;
    return Math.max(0, Math.min(100,
      Math.round(((maxDistance - distance) / (maxDistance - minDistance)) * 100)
    ));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dữ liệu Cảm biến</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            ← Quay lại
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <div className="card p-4 bg-red-100 text-red-700">{error}</div>}

        {loading && <div className="text-center text-gray-600 py-8">Đang tải...</div>}

        {!loading && sensorReadings.length === 0 && (
          <div className="card p-8 text-center text-gray-500">
            <p>Không có dữ liệu cảm biến</p>
          </div>
        )}

        {!loading && sensorReadings.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-6 bg-gradient-to-br from-blue-400 to-blue-500 text-white">
                <div className="text-sm font-semibold opacity-90">Tổng số bản ghi</div>
                <div className="text-3xl font-bold mt-2">{sensorReadings.length}</div>
              </div>

              <div className="card p-6 bg-gradient-to-br from-green-400 to-green-500 text-white">
                <div className="text-sm font-semibold opacity-90">Mức trung bình</div>
                <div className="text-3xl font-bold mt-2">
                  {Math.round(sensorReadings.reduce((acc, r) => acc + calculateFillLevel(r.distance), 0) / sensorReadings.length)}%
                </div>
              </div>

              <div className="card p-6 bg-gradient-to-br from-orange-400 to-orange-500 text-white">
                <div className="text-sm font-semibold opacity-90">Khí gas trung bình</div>
                <div className="text-3xl font-bold mt-2">
                  {Math.round(sensorReadings.reduce((acc, r) => acc + r.gas, 0) / sensorReadings.length)}
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Lịch sử dữ liệu ({sensorReadings.length} bản ghi)</h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">🔄 Tự động cập nhật mỗi 10s</span>
                  <button
                    onClick={() => loadSensorData(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    ⟳ Làm mới ngay
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-200 text-gray-800">
                      <th className="px-4 py-2 text-left">Thời gian</th>
                      <th className="px-4 py-2 text-center">Node</th>
                      <th className="px-4 py-2 text-right">Khoảng cách</th>
                      <th className="px-4 py-2 text-right">Mức đầy</th>
                      <th className="px-4 py-2 text-right">Khí gas</th>
                      <th className="px-4 py-2 text-right">GPS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sensorReadings.map((reading) => {
                      const fillLevel = calculateFillLevel(reading.distance);
                      return (
                        <tr key={reading.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-700">
                            {new Date(reading.timestamp + 'Z').toLocaleString('vi-VN', {
                              timeZone: 'Asia/Ho_Chi_Minh',
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-indigo-100 text-indigo-700">
                              {reading.nodeName || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 font-mono">
                            {reading.distance.toFixed(1)} mm
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`px-2 py-1 rounded text-sm font-semibold ${fillLevel > 70 ? 'bg-red-100 text-red-600' :
                              fillLevel > 40 ? 'bg-yellow-100 text-yellow-600' :
                                'bg-green-100 text-green-600'
                              }`}>
                              {fillLevel}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 font-mono">
                            {reading.gas}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-500">
                            {reading.latitude.toFixed(6)}, {reading.longitude.toFixed(6)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
