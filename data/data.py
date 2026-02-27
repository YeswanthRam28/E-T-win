from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
import random
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="E<T>WIN Governance API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Simulation State: The Planetary Digital Twin Core ────────────────────────

class SimulationState:
    def __init__(self):
        self.cycle_id = 1000
        self.last_update = datetime.utcnow().isoformat()
        
        # 1. Climate & Signals (SDG 13)
        self.temp_current = 30.0
        self.temp_avg = 30.0
        self.precip_current = 0.5
        self.climate_stress = 1.0
        self.anomaly_detected = False
        
        # 2. Water System (SDG 6)
        self.reservoir_percent = 85.0
        self.water_inflow = 1.2
        self.water_outflow = 1.0
        self.water_stress = 0.2
        self.water_status = "normal"
        
        # 3. Environment (SDG 15)
        self.co2_ppm = 418.0
        self.co2_growth = 0.02
        self.aqi = 42.0
        
        # 4. Economy (SDG 8, 9)
        self.gdp_growth = 2.5
        self.industry_profit = 0.75
        self.energy_price = 1.0
        self.policy_spending = 0.0
        self.econ_stability = 0.85
        
        # 5. Social Stability (SDG 10, 16)
        self.inequality_index = 0.40
        self.public_sentiment = 0.1
        self.public_pressure = 0.2
        self.gov_confidence = 0.82
        self.social_trend = "stable"
        
        # 6. High-Level Composite Metrics
        self.sdg_composite = 75.0
        self.stability_score = 90.0
        self.confidence_score = 0.85
        
        # 7. AI Insights
        self.active_policy = "Base Sustainable Framework"
        self.last_policy_run = None
        self.last_explanation = "System optimized for stable SDG progression."
        self.risk_level = "low"
        
        # 8. Memory & History
        self.alerts = []
        self.timeline = []
        
    def add_alert(self, alert_type, message, severity="medium"):
        alert = {
            "id": random.randint(1000, 9999),
            "type": alert_type,
            "severity": severity,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }
        self.alerts.insert(0, alert)
        if len(self.alerts) > 20: self.alerts.pop()
        
    def add_timeline_event(self, event_type, anomaly, policy, sdg_delta, stability):
        event = {
            "cycle_id": self.cycle_id,
            "type": event_type,
            "anomaly_score": anomaly,
            "policy_applied": policy,
            "sdg_change": sdg_delta,
            "resulting_stability": stability,
            "timestamp": datetime.utcnow().isoformat()
        }
        self.timeline.insert(0, event)
        if len(self.timeline) > 50: self.timeline.pop()

    def update_composites(self):
        self.stability_score = max(0, min(100, 100 - (self.water_stress * 30) - (self.public_pressure * 20)))
        avg_env = (self.reservoir_percent + (100 - (self.co2_ppm - 400))) / 2
        self.sdg_composite = round((avg_env + (self.gov_confidence * 100)) / 2, 1)

simulation_state = SimulationState()

class SignalUpdate(BaseModel):
    temp: float
    precip: float
    aqi: float = 42.0
    co2_delta: float = 0.01
    econ_stress: float = 1.0
    is_anomaly: bool = False

# ── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/update-digital-twin")
def update_state(payload: SignalUpdate):
    state = simulation_state
    state.cycle_id += 1
    state.last_update = datetime.utcnow().isoformat()
    
    state.temp_current = payload.temp
    state.precip_current = payload.precip
    state.aqi = payload.aqi
    state.co2_ppm += payload.co2_delta
    
    if payload.is_anomaly or payload.temp > 38:
        state.anomaly_detected = True
        state.add_alert("climate_anomaly", f"Heat spike detected: {payload.temp}°C", "high")
    else:
        state.anomaly_detected = False

    res_delta = payload.precip * 0.5 if payload.precip > 0.1 else -0.05
    state.reservoir_percent = max(0, min(100, state.reservoir_percent + res_delta))
    state.water_status = "warning" if state.reservoir_percent < 40 else "normal"
    state.gdp_growth *= payload.econ_stress
    
    state.update_composites()
    state.add_timeline_event("signal_injection", 1 if payload.is_anomaly else 0, state.active_policy, 0.2, state.stability_score)
    
    return {"status": "updated", "cycle": state.cycle_id}

@app.post("/run-emergency-simulation")
def run_emergency_simulation():
    state = simulation_state
    state.last_policy_run = datetime.utcnow().isoformat()
    state.active_policy = "Emergency Drought Mitigation v1.4"
    state.risk_level = "moderate"
    state.add_alert("policy_triggered", "Autonomous Emergency Simulation Successful", "medium")
    return {"status": "simulated", "policy": state.active_policy}

@app.get("/api/state/current")
def get_current_core():
    return {
        "timestamp": simulation_state.last_update,
        "sdg_composite_score": simulation_state.sdg_composite,
        "system_stability_score": simulation_state.stability_score,
        "confidence_score": simulation_state.confidence_score,
        "cycle_id": simulation_state.cycle_id
    }

@app.get("/api/signals/climate")
def get_climate():
    return {
        "temperature_current": simulation_state.temp_current,
        "temperature_anomaly": round(simulation_state.temp_current - simulation_state.temp_avg, 2),
        "precipitation_current": simulation_state.precip_current,
        "anomaly_detected": simulation_state.anomaly_detected
    }

@app.get("/api/systems/water")
def get_water():
    return {
        "reservoir_level_percent": round(simulation_state.reservoir_percent, 1),
        "water_stress_index": round(simulation_state.water_stress, 2),
        "status": simulation_state.water_status
    }

@app.get("/api/systems/environment")
def get_env():
    return {
        "co2_ppm": round(simulation_state.co2_ppm, 2),
        "aqi": simulation_state.aqi
    }

@app.get("/api/systems/economy")
def get_econ():
    return {
        "gdp_growth_rate": round(simulation_state.gdp_growth, 2),
        "economic_stability_score": simulation_state.econ_stability
    }

@app.get("/api/systems/social")
def get_social():
    return {
        "inequality_index": simulation_state.inequality_index,
        "governance_confidence": simulation_state.gov_confidence
    }

@app.get("/api/alerts/recent")
def get_alerts():
    return {"alerts": simulation_state.alerts}

@app.get("/api/insights/latest")
def get_insights():
    return {
        "recommended_policy": simulation_state.active_policy,
        "confidence": simulation_state.confidence_score,
        "explanation": simulation_state.last_explanation
    }

@app.get("/api/timeline")
def get_timeline(limit: int = 20):
    return {"events": simulation_state.timeline[:limit]}

@app.get("/api/forecast/7-cycle")
def get_forecast():
    return {
        "reservoir_projection": [simulation_state.reservoir_percent - i*1.2 for i in range(7)],
        "emission_projection": [simulation_state.co2_ppm + i*0.4 for i in range(7)],
        "risk_probability": 0.12
    }

@app.get("/api/meta/health")
def get_health():
    return {
        "status": "operational",
        "last_update": simulation_state.last_update
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8050)))
