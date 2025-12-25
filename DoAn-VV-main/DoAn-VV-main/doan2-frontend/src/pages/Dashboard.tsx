import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { mqttAPI } from '../api/mqtt';
import { MqttCredentialsResponse } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mqttDevices, setMqttDevices] = React.useState<MqttCredentialsResponse[]>([]);
  const [brokerStatus, setBrokerStatus] = React.useState({ isConnected: false });
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [devicesRes, statusRes] = await Promise.all([
        mqttAPI.getActive(),
        mqttAPI.getBrokerStatus(),
      ]);
      setMqttDevices(devicesRes.data);
      setBrokerStatus(statusRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const renderDevicesList = () => {
    if (loading) {
      return <p className="text-gray-500">Đang tải dữ liệu...</p>;
    }
    if (mqttDevices.length === 0) {
      return <p className="text-gray-500">Không có thiết bị nào</p>;
    }
    return (
      <div className="space-y-3">
        {mqttDevices.slice(0, 5).map((device) => (
          <div key={device.id} className="card p-4 flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800">{device.mqttUsername}</h3>
              <p className="text-sm text-gray-600">Broker: {device.brokerUrl}</p>
              <p className="text-sm text-gray-600">Tạo lúc: {new Date(device.createdAt).toLocaleString('vi-VN')}</p>
            </div>
            {device.isActive && <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Hoạt động</span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-lg">Xin chào, {user?.username}</span>
            <button onClick={handleLogout} className="btn-secondary">
              Đăng Xuất
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-3 flex gap-2">
          <button
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
            onClick={() => navigate('/dashboard')}
          >
            📊 Tổng quan
          </button>
          <button
            className="px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 font-medium"
            onClick={() => navigate('/mqtt')}
          >
            🔧 Quản lý MQTT
          </button>
          <button
            className="px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 font-medium"
            onClick={() => navigate('/sensor-data')}
          >
            📈 Dữ liệu Cảm biến
          </button>
          <button
            className="px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 font-medium"
            onClick={() => navigate('/map')}
          >
            🗺️ Bản đồ Thùng rác
          </button>
          <button
            className="px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 font-medium"
            onClick={() => navigate('/ai-dashboard')}
          >
            🤖 AI Dashboard
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="card p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Trạng Thái Broker MQTT</h2>
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${brokerStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-lg font-semibold ${brokerStatus.isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {brokerStatus.isConnected ? 'Đã kết nối' : 'Chưa kết nối'}
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Thiết Bị MQTT Đang Hoạt Động</h2>
            <button
              className="text-indigo-600 hover:text-purple-600 font-semibold transition-colors"
              onClick={() => navigate('/mqtt')}
            >
              Xem tất cả →
            </button>
          </div>
          {renderDevicesList()}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
