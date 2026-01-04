import { GoogleMap, Marker, InfoWindow, useLoadScript } from '@react-google-maps/api';
import { useState, useMemo } from 'react';
import { GOOGLE_MAPS_CONFIG } from '../config/maps';

interface TrashBinData {
    id: string;
    nodeName: string;
    latitude: number;
    longitude: number;
    distance: number;
    gas: number;
    is_detected_human: boolean;
    timestamp: string;
}

interface TrashMapProps {
    bins: TrashBinData[];
    onMarkerClick?: (bin: TrashBinData) => void;
}

export const TrashMap = ({ bins, onMarkerClick }: TrashMapProps) => {
    const [selectedBin, setSelectedBin] = useState<TrashBinData | null>(null);

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: GOOGLE_MAPS_CONFIG.apiKey,
    });

    const center = useMemo(() => {
        if (bins.length > 0) {
            return {
                lat: bins[0].latitude,
                lng: bins[0].longitude,
            };
        }
        return GOOGLE_MAPS_CONFIG.defaultCenter;
    }, [bins]);

    const calculateFillLevel = (distance: number): number => {
        const maxDistance = 150; // mm (empty bin)
        const minDistance = 20;  // mm (full bin)
        const fillLevel = Math.max(0, Math.min(100,
            ((maxDistance - distance) / (maxDistance - minDistance)) * 100
        ));
        return Math.round(fillLevel);
    };

    const getMarkerIcon = (fillLevel: number) => {
        let color = '#10b981'; // green
        if (fillLevel > 70) color = '#ef4444'; // red
        else if (fillLevel > 40) color = '#f59e0b'; // yellow

        return {
            path: 'M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z',
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 2,
        };
    };

    if (loadError) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-100">
                <div className="text-red-600">
                    <p className="text-lg font-semibold">Lỗi tải Google Maps</p>
                    <p className="text-sm">{loadError.message}</p>
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-100">
                <div className="text-gray-600">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4">Đang tải bản đồ...</p>
                </div>
            </div>
        );
    }

    return (
        <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={center}
            zoom={GOOGLE_MAPS_CONFIG.defaultZoom}
            options={GOOGLE_MAPS_CONFIG.mapOptions}
        >
            {bins.map((bin) => {
                const fillLevel = calculateFillLevel(bin.distance);

                return (
                    <Marker
                        key={bin.id}
                        position={{ lat: bin.latitude, lng: bin.longitude }}
                        icon={getMarkerIcon(fillLevel)}
                        onClick={() => {
                            setSelectedBin(bin);
                            onMarkerClick?.(bin);
                        }}
                    />
                );
            })}

            {selectedBin && (
                <InfoWindow
                    position={{ lat: selectedBin.latitude, lng: selectedBin.longitude }}
                    onCloseClick={() => setSelectedBin(null)}
                >
                    <div className="p-2 min-w-[200px]">
                        <h3 className="font-bold text-lg mb-2">
                            {selectedBin.nodeName || 'Thùng rác'}
                        </h3>

                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Mức độ đầy:</span>
                                <span className="font-semibold">
                                    {calculateFillLevel(selectedBin.distance)}%
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-600">Khoảng cách:</span>
                                <span className="font-semibold">{selectedBin.distance.toFixed(1)} mm</span>
                            </div>

                            <div className="pt-2 border-t mt-2">
                                <span className="text-xs text-gray-500">
                                    Cập nhật: {new Date(selectedBin.timestamp).toLocaleString('vi-VN', {
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
                </InfoWindow>
            )}
        </GoogleMap>
    );
};
