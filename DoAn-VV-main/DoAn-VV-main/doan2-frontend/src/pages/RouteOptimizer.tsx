import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AI_SERVICE_URL = 'http://localhost:8000';

interface Location {
    lat: number;
    lon: number;
}

interface BinData {
    node_id: string;
    name: string;
    location: Location;
    fill_percentage: number;
    urgency: string;
}

interface RouteStop {
    stop_number: number;
    node_id: string;
    location: Location;
    estimated_arrival: string;
    collection_time_minutes: number;
    reason: string;
    fill_percentage: number;
}

interface OptimizedRoute {
    total_distance_km: number;
    total_time_minutes: number;
    estimated_fuel_cost_vnd: number;
    sequence: RouteStop[];
    return_to_start: string;
    savings: {
        vs_random_order: string;
        time_saved_minutes: string;
        distance_saved_km: string;
    };
}

export const RouteOptimizer = () => {
    const navigate = useNavigate();
    const [startLocation] = useState<Location>({ lat: 16.070704, lon: 108.220329 });
    const [availableBins] = useState<BinData[]>([
        {
            node_id: 'node1',
            name: 'Thùng rác chính',
            location: { lat: 16.071000, lon: 108.221000 },
            fill_percentage: 95,
            urgency: 'high',
        },
        {
            node_id: 'node2',
            name: 'Thùng rác phụ',
            location: { lat: 16.072000, lon: 108.223000 },
            fill_percentage: 75,
            urgency: 'medium',
        },
    ]);
    const [selectedBins, setSelectedBins] = useState<Set<string>>(new Set(['node1', 'node2']));
    const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleBinSelection = (nodeId: string) => {
        const newSelection = new Set(selectedBins);
        if (newSelection.has(nodeId)) {
            newSelection.delete(nodeId);
        } else {
            newSelection.add(nodeId);
        }
        setSelectedBins(newSelection);
    };

    const optimizeRoute = async () => {
        if (selectedBins.size === 0) {
            setError('Vui lòng chọn ít nhất 1 thùng rác để thu gom');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const binsToCollect = availableBins
                .filter((bin) => selectedBins.has(bin.node_id))
                .map((bin) => ({
                    node_id: bin.node_id,
                    location: bin.location,
                    fill_percentage: bin.fill_percentage,
                    urgency: bin.urgency,
                }));

            const response = await axios.post(`${AI_SERVICE_URL}/api/ai/optimize-route`, {
                start_location: startLocation,
                bins: binsToCollect,
                max_stops: 10,
            });

            setOptimizedRoute(response.data);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Lỗi khi tối ưu route. Đảm bảo AI service đang chạy.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'critical':
            case 'high':
                return 'bg-red-500';
            case 'medium':
                return 'bg-yellow-500';
            default:
                return 'bg-green-500';
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-3xl font-bold">🗺️ Tối ưu Route Thu gom</h1>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/ai-dashboard')}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
                        >
                            ← AI Dashboard
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
                        >
                            🏠 Home
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel - Bin Selection */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="card p-6">
                            <h2 className="text-xl font-bold mb-4">Chọn thùng rác cần thu gom</h2>
                            <div className="space-y-3">
                                {availableBins.map((bin) => (
                                    <div
                                        key={bin.node_id}
                                        className={`p-4 rounded-lg border-2 cursor-pointer transition ${selectedBins.has(bin.node_id)
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-200 hover:border-green-300'
                                            }`}
                                        onClick={() => toggleBinSelection(bin.node_id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="font-semibold">{bin.name}</div>
                                                <div className="text-sm text-gray-500">{bin.node_id}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold">{bin.fill_percentage}%</div>
                                                <span
                                                    className={`px-2 py-1 rounded-full text-white text-xs ${getUrgencyColor(
                                                        bin.urgency
                                                    )}`}
                                                >
                                                    {bin.urgency}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={optimizeRoute}
                                disabled={loading || selectedBins.size === 0}
                                className="w-full mt-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Đang tính toán...
                                    </span>
                                ) : (
                                    `⚡ Tối ưu route (${selectedBins.size} thùng)`
                                )}
                            </button>

                            {error && (
                                <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Start Location Info */}
                        <div className="card p-6">
                            <h3 className="font-bold mb-2">📍 Điểm xuất phát</h3>
                            <div className="text-sm text-gray-600">
                                <div>Lat: {startLocation.lat.toFixed(6)}</div>
                                <div>Lon: {startLocation.lon.toFixed(6)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Route Visualization */}
                    <div className="lg:col-span-2">
                        {optimizedRoute ? (
                            <div className="space-y-6">
                                {/* Route Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="card p-6 bg-gradient-to-br from-blue-400 to-blue-500 text-white">
                                        <div className="text-sm font-semibold opacity-90">Tổng quãng đường</div>
                                        <div className="text-3xl font-bold mt-2">{optimizedRoute.total_distance_km} km</div>
                                    </div>

                                    <div className="card p-6 bg-gradient-to-br from-purple-400 to-purple-500 text-white">
                                        <div className="text-sm font-semibold opacity-90">Thời gian ước tính</div>
                                        <div className="text-3xl font-bold mt-2">{optimizedRoute.total_time_minutes} phút</div>
                                    </div>

                                    <div className="card p-6 bg-gradient-to-br from-green-400 to-green-500 text-white">
                                        <div className="text-sm font-semibold opacity-90">Chi phí xăng</div>
                                        <div className="text-3xl font-bold mt-2">
                                            {(optimizedRoute.estimated_fuel_cost_vnd / 1000).toFixed(0)}k đ
                                        </div>
                                    </div>
                                </div>

                                {/* Savings */}
                                <div className="card p-6 bg-gradient-to-br from-yellow-50 to-orange-50">
                                    <h3 className="font-bold text-lg mb-3 text-orange-900">💰 Tiết kiệm so với route ngẫu nhiên</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <div className="text-sm text-orange-700">Thời gian</div>
                                            <div className="text-2xl font-bold text-orange-900">
                                                {optimizedRoute.savings.time_saved_minutes} phút
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-orange-700">Quãng đường</div>
                                            <div className="text-2xl font-bold text-orange-900">
                                                {optimizedRoute.savings.distance_saved_km} km
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-orange-700">Tổng tiết kiệm</div>
                                            <div className="text-2xl font-bold text-orange-900">
                                                {optimizedRoute.savings.vs_random_order}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Route Sequence */}
                                <div className="card p-6">
                                    <h3 className="font-bold text-lg mb-4">🚛 Lộ trình thu gom tối ưu</h3>
                                    <div className="space-y-4">
                                        {/* Start */}
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                                                🏁
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-semibold">Điểm xuất phát</div>
                                                <div className="text-sm text-gray-500">
                                                    {startLocation.lat.toFixed(6)}, {startLocation.lon.toFixed(6)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stops */}
                                        {optimizedRoute.sequence.map((stop) => (
                                            <div key={stop.stop_number}>
                                                <div className="flex items-start gap-4">
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                                            {stop.stop_number}
                                                        </div>
                                                        {stop.stop_number < optimizedRoute.sequence.length && (
                                                            <div className="w-0.5 h-12 bg-blue-300 my-1"></div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 pb-4">
                                                        <div className="font-semibold text-lg">
                                                            {availableBins.find((b) => b.node_id === stop.node_id)?.name || stop.node_id}
                                                        </div>
                                                        <div className="text-sm text-gray-600 mt-1">{stop.reason}</div>
                                                        <div className="flex items-center gap-4 mt-2 text-sm">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-gray-500">🕒 Đến:</span>
                                                                <span className="font-medium">
                                                                    {new Date(stop.estimated_arrival).toLocaleTimeString('vi-VN', {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                    })}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-gray-500">⏱️ Thu gom:</span>
                                                                <span className="font-medium">{stop.collection_time_minutes} phút</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-gray-500">📊 Đầy:</span>
                                                                <span className="font-medium">{stop.fill_percentage}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-1">
                                                            GPS: {stop.location.lat.toFixed(6)}, {stop.location.lon.toFixed(6)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Return */}
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                                                🏁
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-semibold">Quay về điểm xuất phát</div>
                                                <div className="text-sm text-gray-500">
                                                    Thời gian: {new Date(optimizedRoute.return_to_start).toLocaleTimeString('vi-VN')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="card p-6">
                                    <div className="flex gap-3">
                                        <button className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold">
                                            ✅ Chấp nhận route này
                                        </button>
                                        <button
                                            onClick={optimizeRoute}
                                            className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                                        >
                                            🔄 Tính lại route
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="card p-12 text-center text-gray-500">
                                <div className="text-6xl mb-4">🗺️</div>
                                <p className="text-lg">Chọn thùng rác và nhấn "Tối ưu route" để xem lộ trình</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};
