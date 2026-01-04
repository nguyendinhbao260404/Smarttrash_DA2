export const GOOGLE_MAPS_CONFIG = {
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY',  // Đặt key trong file .env
    defaultCenter: {
        lat: 21.028511,
        lng: 105.804817
    },
    defaultZoom: 15,
    mapOptions: {
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
    }
};
