import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrashMap } from '../components/TrashMap';
import axios from 'axios';

interface SensorData {
    id: string;
    nodeName: string;
    latitude: number;
    longitude: number;
    distance: number;
    gas: number;
    is_detected_human: boolean;
    timestamp: string;
}

export const MapView = () => {
    const navigate = useNavigate();
    const [bins, setBins] = useState<SensorData[]>([]);
    const [selectedBin, setSelectedBin] = useState<SensorData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchSensorData = async () => {
        try {
            const response = await axios.get('/api/sensor-data/latest', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                },
            });
            setBins(response.data.data || []);
            setError(null);
        } catch (err: any) {
            if (err.response?.status === 401) {
                navigate('/login');
            } else {
                setError('Lỗi khi tải dữ liệu cảm biến');
                console.error('Error fetching sensor data:', err);
            }
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch when component mounts
    useEffect(() => {
        fetchSensorData();
    }, []);

    // Auto-refresh logic
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchSensorData();
        }, 15000); // Refresh every 15 seconds

        return () => clearInterval(interval);
    }, [autoRefresh]);

    const calculateFillLevel = (distance: number): number => {
        const maxDistance = 150;
        const minDistance = 20;
        return Math.max(0, Math.min(100,
            Math.round(((maxDistance - distance) / (maxDistance - minDistance)) * 100)
        ));
    };

    const getFillLevelColor = (fillLevel: number): string => {
        if (fillLevel > 70) return 'text-red-600 bg-red-100';
        if (fillLevel > 40) return 'text-yellow-600 bg-yellow-100';
        return 'text-green-600 bg-green-100';
    };

    const getStatusText = (fillLevel: number): string => {
        if (fillLevel > 70) return 'Đầy (Cần thu gom)';
        if (fillLevel > 40) return 'Sắp đầy';
        return 'Còn trống';
    };

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            {/* Header */}
            <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold">Bản đồ Thùng rác</h1>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => fetchSensorData()}
                                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                disabled={loading}
                            >
                                {loading ? 'Đang tải...' : '🔄 Làm mới'}
                            </button>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={autoRefresh}
                                    onChange={(e) => setAutoRefresh(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm">Tự động làm mới (15s)</span>
                            </label>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">
                {/* Map */}
                <div className="flex-1 relative">
                    {error ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                            <div className="text-center">
                                <p className="text-red-600 text-lg font-semibold">{error}</p>
                                <button
                                    onClick={fetchSensorData}
                                    className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    Thử lại
                                </button>
                            </div>
                        </div>
                    ) : (
                        <TrashMap
                            bins={bins}
                            onMarkerClick={(bin) => setSelectedBin(bin)}
                        />
                    )}
                </div>

                {/* Sidebar */}
                <div className="w-80 bg-white shadow-xl overflow-y-auto">
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">
                            Danh sách thùng rác ({bins.length})
                        </h2>

                        {bins.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>Không có dữ liệu</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {bins.map((bin) => {
                                    const fillLevel = calculateFillLevel(bin.distance);
                                    const isSelected = selectedBin?.id === bin.id;

                                    return (
                                        <div
                                            key={bin.id}
                                            onClick={() => setSelectedBin(bin)}
                                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                                                ? 'border-indigo-600 bg-indigo-50 shadow-md'
                                                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="font-semibold text-gray-800">
                                                    {bin.nodeName || `Thùng #${bin.id.slice(0, 8)}`}
                                                </h3>
                                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getFillLevelColor(fillLevel)}`}>
                                                    {fillLevel}%
                                                </span>
                                            </div>

                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Trạng thái:</span>
                                                    <span className={`font-medium ${fillLevel > 70 ? 'text-red-600' :
                                                        fillLevel > 40 ? 'text-yellow-600' : 'text-green-600'
                                                        }`}>
                                                        {getStatusText(fillLevel)}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Khoảng cách:</span>
                                                    <span className="font-medium">{bin.distance.toFixed(1)} mm</span>
                                                </div>

                                                <div className="pt-2 border-t mt-2">
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(bin.timestamp).toLocaleString('vi-VN', {
                                                            timeZone: 'Asia/Ho_Chi_Minh',
                                                            year: 'numeric',
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            second: '2-digit',
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};
