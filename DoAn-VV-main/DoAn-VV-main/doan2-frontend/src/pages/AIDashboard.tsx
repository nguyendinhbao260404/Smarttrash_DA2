import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// AI Service base URL
const AI_SERVICE_URL = 'http://localhost:8000';

interface Prediction {
    node_id: string;
    hours_until_full: number;
    predicted_full_at: string;
    confidence: number;
    recommendation: string;
    urgency: string;
}

interface NodeWithPrediction {
    id: string;
    name: string;
    fill_percentage: number;
    trash_level_mm: number;
    lat: number;
    lon: number;
    prediction?: Prediction;
}

export const AIDashboard = () => {
    const navigate = useNavigate();
    const [nodes, setNodes] = useState<NodeWithPrediction[]>([
        // Mock data - replace with real data from WebSocket
        {
            id: 'node1',
            name: 'Thùng rác chính',
            fill_percentage: 85,
            trash_level_mm: 255,
            lat: 16.070704,
            lon: 108.220329,
        },
        {
            id: 'node2',
            name: 'Thùng rác phụ',
            fill_percentage: 65,
            trash_level_mm: 195,
            lat: 16.071000,
            lon: 108.221000,
        },
    ]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Get predictions for all nodes
        fetchPredictions();
    }, []);

    const fetchPredictions = async () => {
        setLoading(true);
        setError(null);

        try {
            const predictions = await Promise.all(
                nodes.map(async (node) => {
                    try {
                        const response = await axios.post(`${AI_SERVICE_URL}/api/ai/predict-fullness`, {
                            node_id: node.id,
                            current_level_mm: node.trash_level_mm,
                            fill_percentage: node.fill_percentage,
                            historical_fill_rate: 2.5, // Default - should come from historical data
                        });
                        return { ...node, prediction: response.data };
                    } catch (err) {
                        console.error(`Error fetching prediction for ${node.id}:`, err);
                        return node;
                    }
                })
            );

            setNodes(predictions);
        } catch (err) {
            setError('Lỗi khi lấy dự đoán từ AI');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'critical':
                return 'bg-red-500';
            case 'high':
                return 'bg-orange-500';
            case 'medium':
                return 'bg-yellow-500';
            default:
                return 'bg-green-500';
        }
    };

    const getUrgencyTextColor = (urgency: string) => {
        switch (urgency) {
            case 'critical':
                return 'text-red-600';
            case 'high':
                return 'text-orange-600';
            case 'medium':
                return 'text-yellow-600';
            default:
                return 'text-green-600';
        }
    };

    const formatTimeDuration = (hours: number) => {
        if (hours < 1) {
            return `${Math.round(hours * 60)} phút`;
        } else if (hours < 24) {
            return `${Math.round(hours)} giờ`;
        } else {
            const days = Math.floor(hours / 24);
            const remainingHours = Math.round(hours % 24);
            return `${days} ngày ${remainingHours} giờ`;
        }
    };

    const handleOptimizeRoute = () => {
        navigate('/route-optimizer');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-3xl font-bold">🤖 AI Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
                        >
                            ← Quay lại
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="card p-6 bg-gradient-to-br from-red-400 to-red-500 text-white">
                        <div className="text-sm font-semibold opacity-90">Cần thu gom NGAY</div>
                        <div className="text-3xl font-bold mt-2">
                            {nodes.filter(n => n.prediction?.urgency === 'critical').length}
                        </div>
                    </div>

                    <div className="card p-6 bg-gradient-to-br from-orange-400 to-orange-500 text-white">
                        <div className="text-sm font-semibold opacity-90">Ưu tiên cao</div>
                        <div className="text-3xl font-bold mt-2">
                            {nodes.filter(n => n.prediction?.urgency === 'high').length}
                        </div>
                    </div>

                    <div className="card p-6 bg-gradient-to-br from-yellow-400 to-yellow-500 text-white">
                        <div className="text-sm font-semibold opacity-90">Ưu tiên trung bình</div>
                        <div className="text-3xl font-bold mt-2">
                            {nodes.filter(n => n.prediction?.urgency === 'medium').length}
                        </div>
                    </div>

                    <div className="card p-6 bg-gradient-to-br from-green-400 to-green-500 text-white">
                        <div className="text-sm font-semibold opacity-90">Bình thường</div>
                        <div className="text-3xl font-bold mt-2">
                            {nodes.filter(n => n.prediction?.urgency === 'low' || !n.prediction).length}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="card p-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Hành động nhanh</h2>
                        <div className="flex gap-3">
                            <button
                                onClick={fetchPredictions}
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
                            >
                                🔄 Cập nhật dự đoán
                            </button>
                            <button
                                onClick={handleOptimizeRoute}
                                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition font-semibold"
                            >
                                🗺️ Tối ưu route thu gom
                            </button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="card p-4 bg-red-100 border border-red-300 text-red-700">
                        {error}
                    </div>
                )}

                {/* Predictions Table */}
                <div className="card p-6">
                    <h2 className="text-xl font-bold mb-4">Dự đoán thùng rác đầy</h2>

                    {loading ? (
                        <div className="text-center py-8 text-gray-600">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                            <p className="mt-4">Đang tính toán dự đoán...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-800">
                                        <th className="px-4 py-3 text-left">Thùng rác</th>
                                        <th className="px-4 py-3 text-center">Mức đầy</th>
                                        <th className="px-4 py-3 text-center">Dự đoán đầy sau</th>
                                        <th className="px-4 py-3 text-center">Thời gian đầy</th>
                                        <th className="px-4 py-3 text-center">Độ tin cậy</th>
                                        <th className="px-4 py-3 text-center">Mức độ khẩn</th>
                                        <th className="px-4 py-3 text-left">Khuyến nghị</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {nodes.map((node) => (
                                        <tr key={node.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="font-semibold">{node.name}</div>
                                                <div className="text-sm text-gray-500">{node.id}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="text-2xl font-bold">{node.fill_percentage}%</div>
                                                <div className="text-xs text-gray-500">{node.trash_level_mm}mm</div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {node.prediction ? (
                                                    <div className="font-semibold text-lg">
                                                        {formatTimeDuration(node.prediction.hours_until_full)}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center text-sm">
                                                {node.prediction ? (
                                                    new Date(node.prediction.predicted_full_at).toLocaleString('vi-VN')
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {node.prediction ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="text-lg font-semibold">
                                                            {Math.round(node.prediction.confidence * 100)}%
                                                        </div>
                                                        <div className="w-16 bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className="bg-blue-600 h-2 rounded-full"
                                                                style={{ width: `${node.prediction.confidence * 100}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {node.prediction ? (
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-white font-semibold text-sm ${getUrgencyColor(
                                                            node.prediction.urgency
                                                        )}`}
                                                    >
                                                        {node.prediction.urgency.toUpperCase()}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {node.prediction ? (
                                                    <div className={`font-medium ${getUrgencyTextColor(node.prediction.urgency)}`}>
                                                        {node.prediction.recommendation}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">Không có dữ liệu</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* AI Insights */}
                <div className="card p-6 bg-gradient-to-br from-purple-50 to-indigo-50">
                    <h2 className="text-xl font-bold mb-4 text-purple-900">💡 AI Insights</h2>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">📊</div>
                            <div>
                                <div className="font-semibold text-purple-900">Phân tích xu hướng</div>
                                <div className="text-sm text-purple-700">
                                    Trung bình các thùng rác đầy sau <span className="font-bold">2-3 ngày</span>.
                                    Khuyến nghị thu gom vào <span className="font-bold">Thứ 3 và Thứ 6</span> hàng tuần.
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">⚡</div>
                            <div>
                                <div className="font-semibold text-purple-900">Tối ưu hóa</div>
                                <div className="text-sm text-purple-700">
                                    Sử dụng tính năng tối ưu route có thể tiết kiệm <span className="font-bold">30-35%</span> thời gian
                                    và chi phí xăng so với thu gom thủ công.
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">🎯</div>
                            <div>
                                <div className="font-semibold text-purple-900">Khuyến nghị</div>
                                <div className="text-sm text-purple-700">
                                    Có <span className="font-bold">{nodes.filter(n => n.prediction?.urgency === 'critical' || n.prediction?.urgency === 'high').length} thùng</span> cần
                                    thu gom trong vòng 24 giờ tới. Click "Tối ưu route" để lên lịch.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
