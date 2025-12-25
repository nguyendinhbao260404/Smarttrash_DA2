# 🤖 Smart Trash AI Service

AI backend service for trash bin fullness prediction and route optimization.

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- pip

### Installation

```bash
cd ai-service
pip install -r requirements.txt
```

### Run Server

```bash
python main.py
```

Server will start at: `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

## 📡 API Endpoints

### 1. Predict Fullness

**POST** `/api/ai/predict-fullness`

Predict when a trash bin will be full.

**Request:**
```json
{
  "node_id": "node1",
  "current_level_mm": 120,
  "fill_percentage": 40,
  "historical_fill_rate": 2.5
}
```

**Response:**
```json
{
  "node_id": "node1",
  "hours_until_full": 72.0,
  "predicted_full_at": "2024-12-26T18:30:00",
  "confidence": 0.82,
  "recommendation": "📅 Lên lịch thu gom trong 1-2 ngày tới",
  "urgency": "medium"
}
```

### 2. Optimize Route

**POST** `/api/ai/optimize-route`

Calculate optimal collection route.

**Request:**
```json
{
  "start_location": {"lat": 16.070704, "lon": 108.220329},
  "bins": [
    {
      "node_id": "node1",
      "location": {"lat": 16.071000, "lon": 108.221000},
      "fill_percentage": 95,
      "urgency": "high",
      "predicted_full_hours": 2
    },
    {
      "node_id": "node2",
      "location": {"lat": 16.072000, "lon": 108.223000},
      "fill_percentage": 75,
      "urgency": "medium",
      "predicted_full_hours": 24
    }
  ],
  "max_stops": 5
}
```

**Response:**
```json
{
  "total_distance_km": 3.5,
  "total_time_minutes": 25,
  "estimated_fuel_cost_vnd": 8750,
  "sequence": [
    {
      "stop_number": 1,
      "node_id": "node1",
      "location": {"lat": 16.071000, "lon": 108.221000},
      "estimated_arrival": "2024-12-23T08:15:00",
      "collection_time_minutes": 5,
      "reason": "HIGH priority - 95% full",
      "fill_percentage": 95
    }
  ],
  "return_to_start": "2024-12-23T08:30:00",
  "savings": {
    "vs_random_order": "~35%",
    "time_saved_minutes": "8",
    "distance_saved_km": "1.23"
  }
}
```

## 🧠 How It Works

### Prediction Algorithm
- Uses linear fill rate model
- Calculates time until bin reaches 100%
- Assigns urgency levels based on remaining time
- Provides actionable recommendations

### Route Optimization
- Nearest Neighbor TSP algorithm
- Priority-weighted distance calculation
- Considers urgency levels (critical bins first)
- Calculates fuel costs and savings

## ⚙️ Configuration

Edit constants in `main.py`:
- `TRASH_BIN_HEIGHT_MM`: Full bin height (default: 300mm)
- `GAS_PRICE_VND_PER_LITER`: Fuel price (default: 25,000 VND)
- `FUEL_CONSUMPTION_KM_PER_LITER`: Vehicle efficiency (default: 10 km/L)
- `COLLECTION_TIME_PER_BIN_MINUTES`: Time to collect each bin (default: 5 min)

## 🔮 Future Enhancements

- [ ] LSTM model for better predictions
- [ ] Historical data storage
- [ ] Model retraining pipeline
- [ ] Advanced route algorithms (Genetic, OR-Tools)
- [ ] Weather integration
- [ ] Real-time route adjustments

## 📊 Testing

Test with curl:

```bash
# Prediction
curl -X POST http://localhost:8000/api/ai/predict-fullness \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "node1",
    "current_level_mm": 120,
    "fill_percentage": 40,
    "historical_fill_rate": 2.5
  }'

# Route
curl -X POST http://localhost:8000/api/ai/optimize-route \
  -H "Content-Type: application/json" \
  -d '{
    "start_location": {"lat": 16.070704, "lon": 108.220329},
    "bins": [
      {
        "node_id": "node1",
        "location": {"lat": 16.071000, "lon": 108.221000},
        "fill_percentage": 95,
        "urgency": "high"
      }
    ]
  }'
```
