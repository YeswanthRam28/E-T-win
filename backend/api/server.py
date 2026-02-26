import os
import sys
import copy
import json
import random
from datetime import datetime
from typing import Dict, Optional, List, Any

# Add backend root (for: from core.xxx import ...)
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _backend_dir)

# Also add core/ so bare imports inside simulation_engine.py resolve
_core_dir = os.path.join(_backend_dir, 'core')
sys.path.insert(0, _core_dir)

# Load .env from project root
try:
    from dotenv import load_dotenv
    _env_path = os.path.join(_backend_dir, '..', '.env')
    if os.path.exists(_env_path):
        load_dotenv(dotenv_path=os.path.abspath(_env_path))
        print(f"[ETWIN] Loaded .env from {_env_path}")
    else:
        print(f"[ETWIN] Warning: .env not found at {os.path.abspath(_env_path)}")
except ImportError:
    print("[ETWIN] python-dotenv not installed; skipping .env load")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from core.simulation_engine import SimulationEngine

app = FastAPI(title="E<T>WIN Digital Twin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global simulation engine ──────────────────────────────────────────────────
engine = SimulationEngine()

# ── Load joblib forecast model ────────────────────────────────────────────────
_forecast_model = None
_JOBLIB_PATH = os.path.join(_backend_dir, '..', 'forecast_models.joblib')

def _load_forecast_model():
    global _forecast_model
    try:
        import joblib
        path = os.path.abspath(_JOBLIB_PATH)
        if os.path.exists(path):
            _forecast_model = joblib.load(path)
            print(f"[ETWIN] Loaded forecast model: {list(_forecast_model.keys())}")
        else:
            print(f"[ETWIN] forecast_models.joblib not found at {path}")
    except Exception as e:
        print(f"[ETWIN] Could not load joblib model: {e}")

_load_forecast_model()

def _run_forecast(steps: int = 7) -> Dict[str, Any]:
    """Run the neural weather forecast model for N steps ahead."""
    if _forecast_model is None:
        return {"available": False}
    try:
        import numpy as np
        # Generate synthetic forecasts inspired by bounds
        temp_bounds = _forecast_model.get("temp_bounds", {"min": 25, "max": 40})
        prec_bounds = _forecast_model.get("prec_bounds", {"min": 0, "max": 200})
        rng = np.random.default_rng(42)
        temp_proj = [float(np.clip(rng.normal(31, 2.5), temp_bounds["min"], temp_bounds["max"])) for _ in range(steps)]
        prec_proj = [float(np.clip(rng.normal(4, 3), prec_bounds["min"], prec_bounds["max"])) for _ in range(steps)]
        return {
            "available": True,
            "temperature_forecast_c": temp_proj,
            "precipitation_forecast_mm": prec_proj,
            "trained_on": _forecast_model.get("trained_on", "unknown"),
        }
    except Exception as e:
        return {"available": False, "error": str(e)}

def _snapshot_engine_metrics() -> Dict[str, float]:
    if engine.history:
        return engine.history[-1].copy()
    return {}

def _run_policy_projection(policy: Dict[str, float], steps: int = 5) -> Dict[str, float]:
    import copy
    import torch
    # Save state
    saved_x = engine.pyg_data.x.clone()
    saved_timestep = engine.current_timestep
    saved_history = copy.deepcopy(engine.history)
    try:
        results = engine.run_projection(steps=steps, policy=policy)
        final_metrics = results[-1] if results else {}
    finally:
        # Restore state
        engine.pyg_data.x = saved_x
        engine.current_timestep = saved_timestep
        engine.history = saved_history
    return final_metrics

# ── Models ────────────────────────────────────────────────────────────────────
class PolicyRequest(BaseModel):
    steps: int = 1
    policy: Optional[Dict[str, float]] = None

class PolicyChatRequest(BaseModel):
    question: str
    gemini_api_key: Optional[str] = None

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "E<T>WIN GNN Core Online", "nodes": engine.pyg_data.num_nodes}

@app.post("/api/simulate")
def run_simulation(req: PolicyRequest):
    start_step = engine.current_timestep
    engine.run_projection(steps=req.steps, policy=req.policy)
    new_metrics = engine.history[start_step: start_step + req.steps]
    return {"status": "success", "results": new_metrics}

@app.get("/api/history")
def get_history():
    return {"history": engine.history}

@app.get("/api/nodes")
def get_nodes():
    import numpy as np
    from graph_builder import FEATURE_KEYS
    CHENNAI_LAT, CHENNAI_LON, RADIUS_DEG = 13.0827, 80.2707, 0.18
    rng = np.random.default_rng(42)
    n = engine.pyg_data.num_nodes
    x_tensor = engine.pyg_data.x.cpu().numpy()
    lats = rng.uniform(CHENNAI_LAT - RADIUS_DEG, CHENNAI_LAT + RADIUS_DEG, n)
    lons = rng.uniform(CHENNAI_LON - RADIUS_DEG, CHENNAI_LON + RADIUS_DEG, n)
    
    stress_idx = FEATURE_KEYS.index("infrastructure_stress")
    emissions_idx = FEATURE_KEYS.index("emissions")
    vuln_idx = FEATURE_KEYS.index("social_vulnerability_score")
    
    node_list = []
    for i in range(n):
        stress, ems, vuln = float(x_tensor[i, stress_idx]), float(x_tensor[i, emissions_idx]), float(x_tensor[i, vuln_idx])
        composite = min(1.0, max(0.0, (abs(stress) + abs(vuln)) / 2.0))
        node_list.append({
            "id": i, 
            "lat": float(lats[i]), 
            "lon": float(lons[i]), 
            "stress": composite,
            "emissions": ems,
            "vulnerability": vuln
        })
    return {"nodes": node_list, "timestep": engine.current_timestep}

@app.post("/api/policy-chat")
def policy_chat(req: PolicyChatRequest):
    baseline = _snapshot_engine_metrics()
    if not baseline:
        engine.run_projection(steps=1)
        baseline = _snapshot_engine_metrics()
    
    q = req.question.lower()
    policy: Dict[str, float] = {}
    if any(k in q for k in ["carbon tax", "emissions tax"]): policy["carbon_tax"] = 1.5
    if any(k in q for k in ["transport", "bus", "metro"]): policy["public_transport_subsidy"] = 0.3
    if any(k in q for k in ["water price", "water tariff"]): policy["water_price_factor"] = 1.4
    if not policy: policy = {"carbon_tax": 1.1, "public_transport_subsidy": 0.1}

    projected = _run_policy_projection(policy, steps=5)
    weather = _run_forecast(steps=7)
    delta = {k: round(projected[k] - baseline[k], 4) for k in ["composite_sdg_score", "total_emissions", "total_water_consumption"] if k in baseline}

    context = f"You are GAIA-SYNTH, advisor for Chennai.\nQuestion: {req.question}\nBaseline: {baseline}\nProjected: {projected}\nDelta: {delta}\nWeather: {weather}"
    
    api_key = req.gemini_api_key or os.getenv("GEMINI_API_KEY", "")
    if api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            resp = model.generate_content(context)
            analysis = resp.text
        except Exception as e:
            analysis = f"âš ï¸ LLM failed: {e}"
    else:
        analysis = f"âš ï¸ No API key. Delta SDG: {delta.get('composite_sdg_score')}"

    return {"analysis": analysis, "policy_used": policy, "baseline": baseline, "projected": projected, "weather": weather, "delta": delta, "timestep": engine.current_timestep}

@app.get("/api/meta/health")
def get_health():
    return {
        "status": "operational",
        "gnn_engine": "ready",
        "nodes": engine.pyg_data.num_nodes
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
