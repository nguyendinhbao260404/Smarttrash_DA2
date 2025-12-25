# AI Service for Smart Trash System
# FastAPI backend for ML predictions and route optimization

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import math

app = FastAPI(title="Smart Trash AI Service", version="1.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== MODELS ====================

class NodeData(BaseModel):
    node_id: str
    trash_level_mm: float
    fill_percentage: float
    timestamp: str
    lat: float
    lon: float

class PredictionRequest(BaseModel):
    node_id: str
    current_level_mm: float
    fill_percentage: float
    historical_fill_rate: Optional[float] = None  # mm per hour

class PredictionResponse(BaseModel):
    node_id: str
    hours_until_full: float
    predicted_full_at: str
    confidence: float
    recommendation: str
    urgency: str  # low, medium, high, critical

class Location(BaseModel):
    lat: float
    lon: float

class BinToCollect(BaseModel):
    node_id: str
    location: Location
    fill_percentage: float
    urgency: str
    predicted_full_hours: Optional[float] = None

class RouteOptimizationRequest(BaseModel):
    start_location: Location
    bins: List[BinToCollect]
    max_stops: Optional[int] = 10
    max_duration_hours: Optional[float] = 4.0

class RouteStop(BaseModel):
    stop_number: int
    node_id: str
    location: Location
    estimated_arrival: str
    collection_time_minutes: int
    reason: str
    fill_percentage: float

class OptimizedRoute(BaseModel):
    total_distance_km: float
    total_time_minutes: float
    estimated_fuel_cost_vnd: float
    sequence: List[RouteStop]
    return_to_start: str
    savings: Dict[str, str]

# ==================== CONSTANTS ====================

TRASH_BIN_HEIGHT_MM = 300  # Full height of trash bin
GAS_PRICE_VND_PER_LITER = 25000
FUEL_CONSUMPTION_KM_PER_LITER = 10
COLLECTION_TIME_PER_BIN_MINUTES = 5

# ==================== HELPER FUNCTIONS ====================

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two GPS coordinates in km"""
    R = 6371  # Earth radius in kilometers
    
    # Convert to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c

def calculate_fill_rate(historical_data: List[Dict]) -> float:
    """Calculate average fill rate from historical data"""
    # Simple implementation - can be enhanced with ML
    if len(historical_data) < 2:
        return 2.0  # Default: 2mm per hour
    
    # Calculate rate from last 2 data points
    latest = historical_data[-1]
    previous = historical_data[-2]
    
    time_diff_hours = (datetime.fromisoformat(latest['timestamp']) - 
                      datetime.fromisoformat(previous['timestamp'])).total_seconds() / 3600
    level_diff_mm = latest['trash_level_mm'] - previous['trash_level_mm']
    
    if time_diff_hours > 0:
        return level_diff_mm / time_diff_hours
    return 2.0  # Default

def get_urgency_level(fill_percentage: float, hours_until_full: float) -> str:
    """Determine urgency level"""
    if fill_percentage >= 95 or hours_until_full <= 2:
        return "critical"
    elif fill_percentage >= 85 or hours_until_full <= 12:
        return "high"
    elif fill_percentage >= 70 or hours_until_full <= 24:
        return "medium"
    else:
        return "low"

# ==================== PREDICTION ENDPOINTS ====================

@app.post("/api/ai/predict-fullness", response_model=PredictionResponse)
async def predict_fullness(request: PredictionRequest):
    """
    Predict when a trash bin will be full
    Simple linear model based on fill rate
    """
    try:
        # Calculate fill rate (mm per hour)
        fill_rate = request.historical_fill_rate or 2.0  # Default 2mm/hour
        
        # Calculate remaining capacity
        remaining_mm = TRASH_BIN_HEIGHT_MM - request.current_level_mm
        
        # Predict hours until full
        if fill_rate > 0:
            hours_until_full = remaining_mm / fill_rate
        else:
            hours_until_full = 999  # Very long time if not filling
        
        # Calculate predicted timestamp
        predicted_time = datetime.now() + timedelta(hours=hours_until_full)
        
        # Determine urgency
        urgency = get_urgency_level(request.fill_percentage, hours_until_full)
        
        # Generate recommendation
        if hours_until_full < 6:
            recommendation = "🚨 Thu gom NGAY - Thùng sắp đầy!"
        elif hours_until_full < 24:
            recommendation = "⚠️ Lên lịch thu gom trong hôm nay"
        elif hours_until_full < 48:
            recommendation = "📅 Lên lịch thu gom trong 1-2 ngày tới"
        else:
            recommendation = "✅ Thùng còn trống, chưa cần thu gom"
        
        # Confidence calculation (simple version)
        # Higher confidence when fill percentage is consistent
        confidence = min(0.95, 0.6 + (request.fill_percentage / 200))
        
        return PredictionResponse(
            node_id=request.node_id,
            hours_until_full=round(hours_until_full, 1),
            predicted_full_at=predicted_time.isoformat(),
            confidence=round(confidence, 2),
            recommendation=recommendation,
            urgency=urgency
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

# ==================== ROUTE OPTIMIZATION ENDPOINTS ====================

def nearest_neighbor_tsp(start: Location, bins: List[BinToCollect]) -> List[int]:
    """
    Nearest Neighbor algorithm for TSP
    Returns indices of bins in visit order
    """
    if not bins:
        return []
    
    visited = []
    current_location = start
    remaining = list(range(len(bins)))
    
    while remaining:
        # Find nearest unvisited bin
        nearest_idx = None
        nearest_dist = float('inf')
        
        for idx in remaining:
            dist = haversine_distance(
                current_location.lat, current_location.lon,
                bins[idx].location.lat, bins[idx].location.lon
            )
            
            # Apply priority weighting
            priority_weight = 1.0
            if bins[idx].urgency == "critical":
                priority_weight = 0.5  # Makes distance seem shorter
            elif bins[idx].urgency == "high":
                priority_weight = 0.7
            elif bins[idx].urgency == "medium":
                priority_weight = 0.9
            
            weighted_dist = dist * priority_weight
            
            if weighted_dist < nearest_dist:
                nearest_dist = weighted_dist
                nearest_idx = idx
        
        visited.append(nearest_idx)
        remaining.remove(nearest_idx)
        current_location = bins[nearest_idx].location
    
    return visited

@app.post("/api/ai/optimize-route", response_model=OptimizedRoute)
async def optimize_route(request: RouteOptimizationRequest):
    """
    Optimize collection route using TSP algorithm
    """
    try:
        if not request.bins:
            raise HTTPException(status_code=400, detail="No bins to collect")
        
        # Sort bins by urgency first (critical bins must be collected)
        bins_sorted = sorted(
            request.bins,
            key=lambda b: {"critical": 0, "high": 1, "medium": 2, "low": 3}[b.urgency]
        )
        
        # Limit number of bins
        bins_to_visit = bins_sorted[:request.max_stops]
        
        # Get optimal order using Nearest Neighbor
        visit_order = nearest_neighbor_tsp(request.start_location, bins_to_visit)
        
        # Calculate route details
        total_distance = 0.0
        total_time = 0.0
        sequence = []
        current_location = request.start_location
        current_time = datetime.now()
        
        for stop_num, bin_idx in enumerate(visit_order, 1):
            bin_data = bins_to_visit[bin_idx]
            
            # Calculate distance to this stop
            dist = haversine_distance(
                current_location.lat, current_location.lon,
                bin_data.location.lat, bin_data.location.lon
            )
            total_distance += dist
            
            # Calculate travel time (assume 30 km/h average speed)
            travel_time_minutes = (dist / 30) * 60
            total_time += travel_time_minutes + COLLECTION_TIME_PER_BIN_MINUTES
            
            # Update current time
            current_time += timedelta(minutes=travel_time_minutes)
            
            # Generate stop reason
            reason = f"{bin_data.urgency.upper()} priority - {bin_data.fill_percentage}% full"
            
            sequence.append(RouteStop(
                stop_number=stop_num,
                node_id=bin_data.node_id,
                location=bin_data.location,
                estimated_arrival=current_time.isoformat(),
                collection_time_minutes=COLLECTION_TIME_PER_BIN_MINUTES,
                reason=reason,
                fill_percentage=bin_data.fill_percentage
            ))
            
            current_location = bin_data.location
            current_time += timedelta(minutes=COLLECTION_TIME_PER_BIN_MINUTES)
        
        # Calculate return distance
        return_dist = haversine_distance(
            current_location.lat, current_location.lon,
            request.start_location.lat, request.start_location.lon
        )
        total_distance += return_dist
        total_time += (return_dist / 30) * 60
        
        return_time = current_time + timedelta(minutes=(return_dist / 30) * 60)
        
        # Calculate fuel cost
        fuel_liters = total_distance / FUEL_CONSUMPTION_KM_PER_LITER
        fuel_cost = fuel_liters * GAS_PRICE_VND_PER_LITER
        
        # Calculate savings (compared to random order - estimate)
        random_distance = total_distance * 1.35  # Assume 35% worse
        time_saved = (random_distance - total_distance) / 30 * 60
        
        return OptimizedRoute(
            total_distance_km=round(total_distance, 2),
            total_time_minutes=round(total_time, 0),
            estimated_fuel_cost_vnd=round(fuel_cost, 0),
            sequence=sequence,
            return_to_start=return_time.isoformat(),
            savings={
                "vs_random_order": "~35%",
                "time_saved_minutes": f"{round(time_saved, 0)}",
                "distance_saved_km": f"{round(random_distance - total_distance, 2)}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Route optimization error: {str(e)}")

# ==================== HEALTH CHECK ====================

@app.get("/")
async def root():
    return {
        "service": "Smart Trash AI Service",
        "version": "1.0",
        "status": "running",
        "endpoints": {
            "prediction": "/api/ai/predict-fullness",
            "route_optimization": "/api/ai/optimize-route"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
