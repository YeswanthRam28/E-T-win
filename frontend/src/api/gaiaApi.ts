// ─── E<T>WIN Digital Twin API Client ─────────────────────────────────────────
// SIM_API  → GNN simulation engine (backend/api/server.py)
// GOV_API  → Governance / signal injection API (n8n.py equivalent)

export const SIM_API = import.meta.env.VITE_SIM_API_URL || 'http://localhost:8000';
export const GOV_API = import.meta.env.VITE_GOV_API_URL || 'http://localhost:8000';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StateResponse {
    timestamp: string;
    location: string;
    sdg_composite_score: number;
    system_stability_score: number;
    confidence_score: number;
    cycle_id: number;
}

export interface ClimateResponse {
    temperature_current: number;
    temperature_7_cycle_avg: number;
    temperature_anomaly: number;
    precipitation_current: number;
    climate_stress_factor: number;
    anomaly_detected: boolean;
    trend: 'rising' | 'falling' | 'stable';
}

export interface WaterResponse {
    reservoir_level_percent: number;
    daily_inflow: number;
    daily_outflow: number;
    water_stress_index: number;
    days_until_critical: number;
    status: 'normal' | 'warning' | 'critical';
}

export interface EnvironmentResponse {
    co2_ppm: number;
    emission_growth_rate: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    carbon_stress_index: number;
}

export interface EconomyResponse {
    gdp_growth_rate: number;
    industry_profit_index: number;
    energy_price_index: number;
    policy_spending: number;
    economic_stability_score: number;
}

export interface SocialResponse {
    inequality_index: number;
    public_sentiment_score: number;
    public_pressure_score: number;
    governance_confidence: number;
    stability_trend: 'improving' | 'declining' | 'stable';
}

export interface Alert {
    id: number;
    type: 'climate_anomaly' | 'resource_threshold' | 'policy_triggered' | 'sdg_shift' | 'economic_shock';
    severity: 'high' | 'medium' | 'low';
    message: string;
    timestamp: string;
}

export interface AlertsResponse {
    alerts: Alert[];
}

export interface InsightResponse {
    recommended_policy: string;
    expected_sdg_delta: number;
    expected_economic_impact: number;
    confidence: number;
    risk_level: 'low' | 'moderate' | 'high' | 'critical';
    explanation: string;
}

export interface TimelineEvent {
    cycle_id: number;
    real_signal: string;
    anomaly_score: number;
    policy_applied: string;
    sdg_change: number;
    resulting_stability: number;
}

export interface TimelineResponse {
    events: TimelineEvent[];
}

export interface ForecastResponse {
    reservoir_projection: number[];
    emission_projection: number[];
    risk_probability: number;
}

export interface HealthResponse {
    simulation_engine_status: string;
    last_signal_injection: string;
    last_policy_run: string;
}

// ─── Fetch helpers ───────────────────────────────────────────────────────────

async function get<T>(base: string, path: string): Promise<T | null> {
    try {
        const res = await fetch(`${base}${path}`, {
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch {
        return null;
    }
}

// Governance API (friend's laptop: 172.16.45.169:8050)
const gov = <T>(path: string) => get<T>(GOV_API, path);

// Simulation API (this laptop: localhost:8000)
const sim = <T>(path: string) => get<T>(SIM_API, path);

// POST helper for governance API
const govPost = (path: string, body: Record<string, unknown> = {}) =>
    fetch(`${GOV_API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
    }).then(r => r.ok ? r.json() : null).catch(() => null);

export const EtwinAPI = {
    // ── Governance GET (friend's laptop: GOV_API 172.16.45.169:8050) ──────
    state: () => gov<StateResponse>('/api/state/current'),
    climate: () => gov<ClimateResponse>('/api/signals/climate'),
    water: () => gov<WaterResponse>('/api/systems/water'),
    environment: () => gov<EnvironmentResponse>('/api/systems/environment'),
    economy: () => gov<EconomyResponse>('/api/systems/economy'),
    social: () => gov<SocialResponse>('/api/systems/social'),
    alerts: () => gov<AlertsResponse>('/api/alerts/recent'),
    insight: () => gov<InsightResponse>('/api/insights/latest'),
    timeline: (limit = 20) => gov<TimelineResponse>(`/api/timeline?limit=${limit}`),
    forecast: () => gov<ForecastResponse>('/api/forecast/7-cycle'),
    health: () => gov<HealthResponse>('/api/meta/health'),

    // ── Governance POST (friend's laptop: GOV_API) ─────────────────────────
    updateDigitalTwin: (body: Record<string, unknown>) => govPost('/update-digital-twin', body),
    runEmergencySimulation: (body: Record<string, unknown> = {}) => govPost('/run-emergency-simulation', body),

    // ── Local GNN Simulation (your laptop: SIM_API localhost:8000) ─────────
    simulate: (steps: number, policy?: Record<string, number>) =>
        fetch(`${SIM_API}/api/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ steps, policy }),
            signal: AbortSignal.timeout(8000),
        }).then(r => r.ok ? r.json() : null).catch(() => null),

    nodes: () => sim<{ nodes: unknown[]; timestep: number }>('/api/nodes'),
    reset: () => fetch(`${SIM_API}/api/reset`, { method: 'POST' }).catch(() => null),
};

