import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Activity, Droplets, Zap, Users, AlertTriangle,
    TrendingUp, TrendingDown, Minus, Brain,
    CheckCircle, Wind, Wifi, WifiOff, Server
} from 'lucide-react';
import CityHexMap, { NodeData } from './CityHexMap';
import PolicyChat from './PolicyChat';
import {
    EtwinAPI, SIM_API, GOV_API,
    StateResponse, ClimateResponse, WaterResponse,
    EnvironmentResponse, EconomyResponse, SocialResponse,
    AlertsResponse, InsightResponse, ForecastResponse, HealthResponse,
} from '../api/gaiaApi';

// ── helpers ──────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'systems' | 'alerts' | 'forecast' | 'insights';

const SEV: Record<string, string> = {
    high: 'text-red-400 border-red-400/20 bg-red-500/5',
    medium: 'text-amber-400 border-amber-400/20 bg-amber-500/5',
    low: 'text-emerald-400 border-emerald-400/20 bg-emerald-500/5',
};
const STA: Record<string, string> = { normal: 'text-emerald-400', warning: 'text-amber-400', critical: 'text-red-400' };
const TREND = {
    rising: <TrendingUp size={11} className="text-red-400" />,
    falling: <TrendingDown size={11} className="text-emerald-400" />,
    stable: <Minus size={11} className="text-zinc-400" />,
    increasing: <TrendingUp size={11} className="text-red-400" />,
    decreasing: <TrendingDown size={11} className="text-emerald-400" />,
    improving: <TrendingUp size={11} className="text-emerald-400" />,
    declining: <TrendingDown size={11} className="text-red-400" />,
};

function Bar({ value, max = 100, color = 'bg-emerald-500' }: { value: number; max?: number; color?: string }) {
    return (
        <div className="h-0.5 bg-white/5 rounded-full mt-1.5">
            <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
        </div>
    );
}

// ── Seeded LCG random ─────────────────────────────────────────────────────────
function makeRng(seed: number) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) & 0xfffffff; return (s >>> 0) / 0xfffffff; };
}

// Build hex nodes from GNN simulation step output (local engine)
interface SimMetrics { total_emissions?: number; total_water_consumption?: number; average_social_vulnerability?: number; composite_sdg_score?: number; timestep?: number; }

// ─── Derive fallback governance data from local GNN metrics ────────────────────
function deriveLocalGovData(simMetrics: SimMetrics | null, timestep: number) {
    const emissions = Math.abs(simMetrics?.total_emissions ?? 120);
    const water = Math.abs(simMetrics?.total_water_consumption ?? 85);
    const vuln = Math.abs(simMetrics?.average_social_vulnerability ?? 0.4);
    const sdg = Math.abs(simMetrics?.composite_sdg_score ?? 45);

    const baseCO2 = 420 + emissions / 10;
    const baseWaterPercent = Math.max(10, 80 - water / 50);

    const state: StateResponse = {
        timestamp: new Date().toISOString(),
        location: 'Chennai',
        sdg_composite_score: sdg,
        system_stability_score: Math.max(0, 100 - vuln * 60 - (emissions / 5)),
        confidence_score: 0.72,
        cycle_id: timestep,
    };
    const climate: ClimateResponse = {
        temperature_current: 33 + vuln * 3,
        temperature_7_cycle_avg: 30,
        temperature_anomaly: vuln * 3,
        precipitation_current: Math.max(0, 2 - vuln * 2),
        climate_stress_factor: 1 + vuln * 0.5,
        anomaly_detected: vuln > 0.5,
        trend: vuln > 0.5 ? 'rising' : 'stable',
    };
    const waterResp: WaterResponse = {
        reservoir_level_percent: baseWaterPercent,
        daily_inflow: 2.1,
        daily_outflow: water / 40,
        water_stress_index: Math.min(1, water / 200),
        days_until_critical: Math.max(1, Math.round(50 - water / 10)),
        status: water > 100 ? 'critical' : water > 60 ? 'warning' : 'normal',
    };
    const env: EnvironmentResponse = {
        co2_ppm: baseCO2,
        emission_growth_rate: Math.min(0.15, emissions / 2000),
        trend: emissions > 150 ? 'increasing' : 'stable',
        carbon_stress_index: Math.min(1, emissions / 300),
    };
    const economy: EconomyResponse = {
        gdp_growth_rate: Math.max(-2, 4 - vuln * 3),
        industry_profit_index: Math.max(0, 0.8 - vuln * 0.3),
        energy_price_index: 1 + emissions / 500,
        policy_spending: 32000000,
        economic_stability_score: Math.max(0, 0.8 - vuln * 0.4),
    };
    const social: SocialResponse = {
        inequality_index: vuln,
        public_sentiment_score: Math.max(-1, 0.3 - vuln * 1.2),
        public_pressure_score: Math.min(1, vuln * 1.5),
        governance_confidence: Math.max(0.2, 0.8 - vuln * 0.4),
        stability_trend: vuln > 0.5 ? 'declining' : vuln > 0.3 ? 'stable' : 'improving',
    };
    const forecast: ForecastResponse = {
        reservoir_projection: Array.from({ length: 7 }, (_, i) => Math.max(10, Math.round(baseWaterPercent - i * (water / 500)))),
        emission_projection: Array.from({ length: 7 }, (_, i) => Math.round(baseCO2 + i * (1.2 + emissions / 1000))),
        risk_probability: Math.min(0.95, vuln * 0.8 + emissions / 600),
    };
    return { state, climate, water: waterResp, env, economy, social, forecast };
}

// Generate hex map nodes from NodeData returned by /api/nodes endpoint
type RawNode = { id: number; lat: number; lon: number; stress: number; emissions: number; vulnerability: number };
function buildNodesFromAPI(raw: RawNode[]): NodeData[] {
    return raw.map(n => ({ id: n.id, lat: n.lat, lon: n.lon, stress: n.stress, emissions: n.emissions, vulnerability: n.vulnerability }));
}

// Fallback: generate synthetic nodes from stress factor
function generateSyntheticNodes(stressFactor: number, seed = 42): NodeData[] {
    const rand = makeRng(seed);
    const CL = 13.0827, CO = 80.2707, R = 0.18;
    return Array.from({ length: 200 }, (_, id) => {
        const lat = CL - R + rand() * R * 2;
        const lon = CO - R + rand() * R * 2;
        const stress = Math.min(1, (rand() * 0.5) + stressFactor * 0.5 + rand() * 0.15);
        return { id, lat, lon, stress, emissions: stress * 400, vulnerability: stressFactor };
    });
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function SimulationDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [simOnline, setSimOnline] = useState(false);
    const [govOnline, setGovOnline] = useState(false);
    const [nodes, setNodes] = useState<NodeData[]>([]);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; node: NodeData } | null>(null);
    const [timestep, setTimestep] = useState(0);
    const [simLoading, setSimLoading] = useState(false);
    const [lastSimMetrics, setLastSimMetrics] = useState<SimMetrics | null>(null);

    // Governance data (from friend's API or derived from local sim)
    const [stateData, setStateData] = useState<StateResponse | null>(null);
    const [climate, setClimate] = useState<ClimateResponse | null>(null);
    const [water, setWater] = useState<WaterResponse | null>(null);
    const [env, setEnv] = useState<EnvironmentResponse | null>(null);
    const [economy, setEconomy] = useState<EconomyResponse | null>(null);
    const [social, setSocial] = useState<SocialResponse | null>(null);
    const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
    const [insight, setInsight] = useState<InsightResponse | null>(null);
    const [forecast, setForecast] = useState<ForecastResponse | null>(null);
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [lastManualSimTime, setLastManualSimTime] = useState(0);

    // Ping both backends for status
    const pingBoth = useCallback(async () => {
        const [simRes, govRes] = await Promise.all([
            fetch(`${SIM_API}/`).then(r => r.ok).catch(() => false),
            fetch(`${GOV_API}/api/meta/health`).then(r => r.ok).catch(() => false),
        ]);
        setSimOnline(simRes as boolean);
        setGovOnline(govRes as boolean);
    }, []);

    // Step the local simulation engine
    const stepSim = useCallback(async (policy?: Record<string, number>) => {
        setSimLoading(true);
        try {
            const steps = 1; // Assuming 'steps' should be 1 based on original code
            const result = await EtwinAPI.simulate(steps, policy);
            if (!result?.results?.length) return null;
            const m: SimMetrics = result.results[result.results.length - 1];

            // Atomically update metrics and timestep
            setLastSimMetrics(m);
            setTimestep(result.current_timestep ?? 0);
            return { m, ts: result.current_timestep ?? 0 };
        } catch (err) {
            console.error("[SimulationDashboard] stepSim failed:", err);
            return null;
        } finally {
            setSimLoading(false);
        }
    }, []);


    // Fetch governance data — if govOnline use real API, else derive from sim
    const fetchGov = useCallback(async (simMetrics: SimMetrics | null, ts: number, govUp: boolean) => {
        if (govUp) {
            const [st, cl, wa, en, ec, so, al, ins, fc, he] = await Promise.all([
                EtwinAPI.state(),
                EtwinAPI.climate(),
                EtwinAPI.water(),
                EtwinAPI.environment(),
                EtwinAPI.economy(),
                EtwinAPI.social(),
                EtwinAPI.alerts(),
                EtwinAPI.insight(),
                EtwinAPI.forecast(),
                EtwinAPI.health(),
            ]);
            if (st) setStateData(st);
            if (cl) setClimate(cl);
            if (wa) setWater(wa);
            if (en) setEnv(en);
            if (ec) setEconomy(ec);
            if (so) setSocial(so);
            if (al) setAlerts(al);
            if (ins) setInsight(ins);
            if (fc) setForecast(fc);
            if (he) setHealth(he);
        } else {
            // Derive from local GNN data
            const d = deriveLocalGovData(simMetrics, ts);
            setStateData(d.state); setClimate(d.climate); setWater(d.water);
            setEnv(d.env); setEconomy(d.economy); setSocial(d.social); setForecast(d.forecast);
        }
    }, []);

    // Fetch hex nodes
    const fetchNodes = useCallback(async (stressFactor: number) => {
        const data = await EtwinAPI.nodes();
        if (data?.nodes?.length) {
            setNodes(buildNodesFromAPI(data.nodes as RawNode[]));
        } else {
            setNodes(generateSyntheticNodes(stressFactor));
        }
    }, []);

    const applyPolicy = useCallback(async (policy: Record<string, number>) => {
        console.log("[SimulationDashboard] applyPolicy triggered:", policy);
        setLastManualSimTime(Date.now()); // Set immediately to block ticker

        const result = await stepSim(policy);
        if (result) {
            const { m, ts } = result;
            console.log("[SimulationDashboard] Policy step successful, updating UI at t=", ts);
            const stressFactor = Math.min(1, Math.abs(m.average_social_vulnerability ?? 0.35) + 0.1);

            await Promise.all([
                fetchGov(m, ts, govOnline),
                fetchNodes(stressFactor),
            ]);
        }
    }, [stepSim, fetchGov, fetchNodes, govOnline]);

    // Main poll loop
    const tick = useCallback(async () => {
        const now = Date.now();
        if (now - lastManualSimTime < 15000) { // Increased to 15s for extra safety
            console.log("[SimulationDashboard] Skipping tick (manual override active)");
            return;
        }

        const [simUp, govUp] = await Promise.all([
            fetch(`${SIM_API}/`).then(r => r.ok).catch(() => false),
            fetch(`${GOV_API}/api/meta/health`).then(r => r.ok).catch(() => false),
        ]);

        setSimOnline(simUp as boolean);
        setGovOnline(govUp as boolean);

        if (simUp) {
            const result = await stepSim();
            if (result) {
                const { m, ts } = result;
                const stressFactor = Math.min(1, Math.abs(m.average_social_vulnerability ?? 0.35) + 0.1);
                await Promise.all([
                    fetchGov(m, ts, govUp as boolean),
                    fetchNodes(stressFactor),
                ]);
            }
        }
    }, [stepSim, fetchGov, fetchNodes, lastManualSimTime]);

    useEffect(() => {
        tick();
        const id = setInterval(tick, 6000);
        return () => clearInterval(id);
    }, [tick]);

    const sdg = stateData?.sdg_composite_score ?? 0;
    const sdgColor = sdg > 65 ? 'text-emerald-400' : sdg > 40 ? 'text-amber-400' : 'text-red-400';
    const criticalAlerts = alerts?.alerts.filter(a => a.severity === 'high').length ?? 0;

    return (
        <div className="w-full h-screen bg-[#07070f] flex overflow-hidden font-mono text-white">

            {/* ── Sidebar ───────────────────────────────────────────────────── */}
            <div className="w-80 flex-shrink-0 flex flex-col bg-[#0b0b18]/95 border-r border-white/5 overflow-y-auto">

                {/* Header */}
                <div className="p-4 border-b border-white/5">
                    <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[9px] text-zinc-600 hover:text-zinc-300 mb-3 transition-colors uppercase tracking-widest">
                        <ArrowLeft size={11} /> Landing
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-lg font-bold font-display tracking-[0.2em] text-emerald-400">E&lt;T&gt;WIN</div>
                            <p className="text-[9px] text-zinc-600 uppercase tracking-[0.2em]">Chennai · Digital Twin</p>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[7px] uppercase ${simOnline ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400'}`}>
                                <Server size={8} /> SIM {simOnline ? '✓' : '✗'}
                            </div>
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[7px] uppercase ${govOnline ? 'border-emerald-500/30 text-emerald-400' : 'border-amber-500/30 text-amber-500'}`}>
                                <Wifi size={8} /> GOV {govOnline ? '✓' : '~'}
                            </div>
                        </div>
                    </div>
                    {!govOnline && (
                        <div className="mt-2 text-[8px] text-amber-500/70 border border-amber-500/20 bg-amber-500/5 rounded px-2 py-1">
                            Governance API offline — showing GNN-derived metrics
                        </div>
                    )}
                </div>

                {/* Top metrics strip */}
                <div className="grid grid-cols-2 gap-px bg-white/5">
                    {[
                        { label: 'SDG Score', value: sdg.toFixed(1), color: sdgColor },
                        { label: 'Stability', value: (stateData?.system_stability_score ?? 0).toFixed(1), color: 'text-blue-400' },
                        { label: 'Confidence', value: `${((stateData?.confidence_score ?? 0) * 100).toFixed(0)}%`, color: 'text-purple-400' },
                        { label: 'Cycle', value: `#${stateData?.cycle_id ?? timestep}`, color: 'text-zinc-400' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-[#0b0b18] p-3">
                            <div className="text-[8px] text-zinc-600 uppercase tracking-widest mb-0.5">{label}</div>
                            <div className={`text-base font-bold font-mono ${color}`}>{value}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 flex-shrink-0">
                    {(['overview', 'systems', 'alerts', 'forecast', 'insights'] as Tab[]).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2.5 text-[8px] uppercase tracking-wider transition-colors border-b ${activeTab === tab ? 'text-emerald-400 border-emerald-400' : 'text-zinc-600 border-transparent hover:text-zinc-300'}`}>
                            {tab}
                            {tab === 'alerts' && criticalAlerts > 0 && <span className="ml-0.5 bg-red-500 text-white text-[6px] rounded-full px-1">{criticalAlerts}</span>}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">

                    {activeTab === 'overview' && (<>
                        <div className="border border-white/5 rounded-lg p-3 bg-white/[0.02]">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[9px] text-zinc-500 uppercase flex items-center gap-1"><Wind size={10} /> Climate</span>
                                {climate && <span className="flex items-center gap-1">{TREND[climate.trend]} <span className="text-[8px] text-zinc-500">{climate.trend}</span></span>}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div><span className="text-zinc-600">Temp</span><div className={`font-mono font-bold ${climate?.anomaly_detected ? 'text-red-400' : 'text-white'}`}>{climate?.temperature_current.toFixed(1) ?? '—'}°C {climate?.anomaly_detected && '⚠'}</div></div>
                                <div><span className="text-zinc-600">Anomaly</span><div className="font-mono font-bold text-amber-400">+{climate?.temperature_anomaly.toFixed(1) ?? '0'}°C</div></div>
                                <div><span className="text-zinc-600">Precip</span><div className="font-mono text-blue-400">{climate?.precipitation_current.toFixed(1) ?? '—'} mm</div></div>
                                <div><span className="text-zinc-600">Stress</span><div className="font-mono text-orange-400">{climate?.climate_stress_factor.toFixed(2) ?? '—'}x</div></div>
                            </div>
                        </div>

                        <div className="border border-white/5 rounded-lg p-3 bg-white/[0.02]">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[9px] text-zinc-500 uppercase flex items-center gap-1"><Droplets size={10} /> Water</span>
                                {water && <span className={`text-[8px] uppercase font-bold ${STA[water.status]}`}>{water.status}</span>}
                            </div>
                            <div className="flex gap-3 text-[10px]">
                                <div className="flex-1">
                                    <span className="text-zinc-600">Reservoir</span>
                                    <div className="font-mono font-bold text-blue-400">{water?.reservoir_level_percent.toFixed(1) ?? '—'}%</div>
                                    <Bar value={water?.reservoir_level_percent ?? 0} color="bg-blue-500" />
                                </div>
                                <div className="flex-1">
                                    <span className="text-zinc-600">Days to Critical</span>
                                    <div className={`font-mono font-bold ${(water?.days_until_critical ?? 99) < 20 ? 'text-red-400' : 'text-emerald-400'}`}>{water?.days_until_critical ?? '—'}d</div>
                                </div>
                            </div>
                        </div>

                        <div className="border border-white/5 rounded-lg p-3 bg-white/[0.02]">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[9px] text-zinc-500 uppercase flex items-center gap-1"><Users size={10} /> Social</span>
                                {social && <span className="flex items-center gap-1">{TREND[social.stability_trend]} <span className="text-[8px] text-zinc-500">{social.stability_trend}</span></span>}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div><span className="text-zinc-600">Inequality</span><div className="font-mono font-bold text-amber-400">{social?.inequality_index.toFixed(2) ?? '—'}</div></div>
                                <div><span className="text-zinc-600">Sentiment</span><div className={`font-mono font-bold ${(social?.public_sentiment_score ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{social?.public_sentiment_score?.toFixed(2) ?? '—'}</div></div>
                                <div><span className="text-zinc-600">Gov. Conf.</span><div className="font-mono text-purple-400">{((social?.governance_confidence ?? 0) * 100).toFixed(0)}%</div></div>
                                <div><span className="text-zinc-600">Pressure</span><div className="font-mono text-orange-400">{((social?.public_pressure_score ?? 0) * 100).toFixed(0)}%</div></div>
                            </div>
                        </div>
                    </>)}

                    {activeTab === 'systems' && (<>
                        <div className="border border-white/5 rounded-lg p-3 bg-white/[0.02] space-y-3">
                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Environment</p>
                            {[
                                { label: 'CO₂ (ppm)', value: env?.co2_ppm.toFixed(1) ?? '—', color: 'text-red-400', bar: (env?.co2_ppm ?? 420) - 400, max: 80 },
                                { label: 'Emission Growth', value: `${((env?.emission_growth_rate ?? 0) * 100).toFixed(1)}%`, color: 'text-orange-400', bar: (env?.emission_growth_rate ?? 0) * 100, max: 10 },
                                { label: 'Carbon Stress', value: (env?.carbon_stress_index ?? 0).toFixed(2), color: 'text-amber-400', bar: (env?.carbon_stress_index ?? 0) * 100 },
                            ].map(({ label, value, color, bar, max = 100 }) => (
                                <div key={label}>
                                    <div className="flex justify-between text-[10px]"><span className="text-zinc-600">{label}</span><span className={`font-mono font-bold ${color}`}>{value}</span></div>
                                    <Bar value={bar} max={max} color={color.replace('text-', 'bg-')} />
                                </div>
                            ))}
                            <div className="flex items-center gap-1.5 text-[9px] pt-1">{env && <>{TREND[env.trend]} <span className="text-zinc-500">{env.trend}</span></>}</div>
                        </div>

                        <div className="border border-white/5 rounded-lg p-3 bg-white/[0.02] space-y-3">
                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Economy</p>
                            {[
                                { label: 'GDP Growth', value: `${economy?.gdp_growth_rate.toFixed(1) ?? '—'}%`, color: 'text-emerald-400' },
                                { label: 'Industry Profit', value: (economy?.industry_profit_index ?? 0).toFixed(2), color: 'text-blue-400' },
                                { label: 'Energy Price', value: `${economy?.energy_price_index.toFixed(2) ?? '—'}x`, color: 'text-amber-400' },
                                { label: 'Econ Stability', value: `${((economy?.economic_stability_score ?? 0) * 100).toFixed(0)}%`, color: 'text-purple-400' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="flex justify-between text-[10px]">
                                    <span className="text-zinc-600">{label}</span>
                                    <span className={`font-mono font-bold ${color}`}>{value}</span>
                                </div>
                            ))}
                            <div className="text-[9px] text-zinc-600 border-t border-white/5 pt-2">Policy Spend: <span className="text-white">₹{((economy?.policy_spending ?? 0) / 1e6).toFixed(1)}M</span></div>
                        </div>
                    </>)}

                    {activeTab === 'alerts' && (
                        <div className="space-y-2">
                            {!govOnline && (
                                <div className="text-[9px] border border-amber-500/20 bg-amber-500/5 text-amber-500 rounded-lg p-3">
                                    ⚡ Governance API offline — alerts require friend's server connection (172.16.45.169:8050)
                                </div>
                            )}
                            {alerts?.alerts.length ? alerts.alerts.map(a => (
                                <div key={a.id} className={`border rounded-lg p-3 text-[10px] ${SEV[a.severity]}`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="uppercase text-[8px] tracking-widest font-bold">{a.type.replace(/_/g, ' ')}</span>
                                        <span className="text-[7px] text-zinc-600">{new Date(a.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-zinc-300">{a.message}</p>
                                </div>
                            )) : (
                                <div className="text-center text-zinc-700 text-[9px] py-10">
                                    <CheckCircle size={20} className="mx-auto mb-2 text-emerald-500/20" />
                                    {govOnline ? 'No active alerts' : 'Connect friend\'s API to receive alerts'}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'forecast' && (<>
                        <div className="border border-white/5 rounded-lg p-3 bg-white/[0.02]">
                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-3">7-Cycle Reservoir %</p>
                            <div className="flex items-end gap-1 h-20">
                                {(forecast?.reservoir_projection ?? []).map((v, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                        <div className="w-full rounded-sm bg-blue-500/20 border border-blue-500/20" style={{ height: `${(v / 100) * 80}px` }} />
                                        <span className="text-[7px] text-zinc-600">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="border border-white/5 rounded-lg p-3 bg-white/[0.02]">
                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-3">7-Cycle CO₂ (ppm)</p>
                            <div className="flex items-end gap-1 h-20">
                                {(forecast?.emission_projection ?? []).map((v, i) => {
                                    const base = Math.min(...(forecast?.emission_projection ?? [v]));
                                    const top = Math.max(...(forecast?.emission_projection ?? [v]));
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                            <div className="w-full rounded-sm bg-red-500/20 border border-red-500/20" style={{ height: `${((v - base) / (top - base + 1)) * 72 + 8}px` }} />
                                            <span className="text-[7px] text-zinc-600">{v}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="border border-white/5 rounded-lg p-3 bg-white/[0.02] flex justify-between text-[10px]">
                            <span className="text-zinc-500">Risk Probability</span>
                            <span className={`font-mono font-bold ${(forecast?.risk_probability ?? 0) > 0.6 ? 'text-red-400' : 'text-amber-400'}`}>{((forecast?.risk_probability ?? 0) * 100).toFixed(0)}%</span>
                        </div>
                    </>)}

                    {activeTab === 'insights' && (<>
                        {insight ? (
                            <div className="space-y-2">
                                <div className="border border-purple-500/20 bg-purple-500/5 rounded-lg p-3">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Brain size={11} className="text-purple-400" />
                                        <span className="text-[9px] uppercase text-purple-400 tracking-widest">AI Recommendation</span>
                                    </div>
                                    <p className="text-[10px] text-white font-semibold mb-2">{insight.recommended_policy}</p>
                                    <p className="text-[9px] text-zinc-500 leading-relaxed">{insight.explanation}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'SDG Δ', value: `+${(insight.expected_sdg_delta ?? 0).toFixed(1)}`, color: 'text-emerald-400' },
                                        { label: 'Econ Impact', value: `${(insight.expected_economic_impact ?? 0).toFixed(1)}%`, color: (insight.expected_economic_impact ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400' },
                                        { label: 'Confidence', value: `${((insight.confidence ?? 0) * 100).toFixed(0)}%`, color: 'text-blue-400' },
                                        { label: 'Risk', value: (insight.risk_level ?? 'unknown').toUpperCase(), color: insight.risk_level === 'high' ? 'text-red-400' : insight.risk_level === 'moderate' ? 'text-amber-400' : 'text-emerald-400' },
                                    ].map(({ label, value, color }) => (
                                        <div key={label} className="border border-white/5 bg-white/[0.02] rounded-lg p-2.5">
                                            <div className="text-[8px] text-zinc-600 uppercase">{label}</div>
                                            <div className={`font-mono font-bold text-sm ${color}`}>{value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-zinc-700 text-[9px] py-10">
                                <Brain size={20} className="mx-auto mb-2 text-purple-500/20" />
                                {govOnline ? 'Loading insights...' : 'Connect friend\'s API for AI insights'}
                            </div>
                        )}
                    </>)}
                </div>

                {/* Footer */}
                <div className="px-3 py-2 border-t border-white/5 text-[8px] text-zinc-700 space-y-0.5">
                    <div className="flex items-center gap-1">Simulation Engine: <span className={simOnline ? 'text-emerald-600' : 'text-red-600'}>{simOnline ? 'operational' : 'offline'}</span></div>
                    <div>Governance: <span className={govOnline ? 'text-emerald-600' : 'text-amber-600'}>{govOnline ? 'live · 172.16.45.169:8050' : 'offline · E<T>WIN fallback active'}</span></div>
                </div>
            </div>

            {/* ── Map ─────────────────────────────────────────────────────────── */}
            <div className="flex-1 relative">
                <CityHexMap nodes={nodes} timestep={timestep} onHover={(info) => setTooltip(info as typeof tooltip)} />

                {tooltip && (
                    <div className="absolute z-30 pointer-events-none bg-[#0b0b18]/95 border border-white/10 rounded-lg p-3 text-[10px] backdrop-blur-sm min-w-44 shadow-2xl"
                        style={{ left: tooltip.x + 16, top: Math.max(8, tooltip.y - 16) }}>
                        <div className="text-[8px] text-zinc-600 mb-1">Zone #{tooltip.node.id}</div>
                        <div className="text-sm font-bold mb-1.5" style={{ color: `hsl(${(1 - tooltip.node.stress) * 120}, 80%, 55%)` }}>
                            {tooltip.node.stress > 0.75 ? 'CRITICAL' : tooltip.node.stress > 0.5 ? 'HIGH STRESS' : tooltip.node.stress > 0.25 ? 'MODERATE' : 'HEALTHY'}
                        </div>
                        <div className="space-y-0.5 text-zinc-400">
                            <div className="flex justify-between gap-4"><span>Stress</span><span className="font-mono text-white">{(tooltip.node.stress * 100).toFixed(0)}/100</span></div>
                            <div className="flex justify-between gap-4"><span>Emissions</span><span className="font-mono text-red-400">{Math.abs(tooltip.node.emissions).toFixed(0)} Kt</span></div>
                            <div className="flex justify-between gap-4"><span>Vulnerability</span><span className="font-mono text-amber-400">{(Math.abs(tooltip.node.vulnerability) * 100).toFixed(0)}</span></div>
                        </div>
                        {tooltip.node.stress > 0.75 && <div className="mt-1.5 text-[8px] text-red-400 border-t border-white/5 pt-1.5">⚠ Traffic Congestion &amp; Air Quality</div>}
                    </div>
                )}

                <div className="absolute bottom-3 inset-x-4 z-10 flex justify-between items-center bg-[#0b0b18]/80 backdrop-blur-md border border-white/5 rounded-lg px-4 py-2 text-[8px] text-zinc-600 uppercase tracking-widest">
                    <span>Chennai 13.0827°N · 20km Zone</span>
                    <span>{nodes.length} Nodes</span>
                    <span>Cycle #{timestep}</span>
                    <span className={simOnline ? 'text-emerald-500' : 'text-red-500'}>{simOnline ? '● GNN Live' : '○ GNN Offline'}</span>
                    <span className={govOnline ? 'text-emerald-500' : 'text-amber-500'}>{govOnline ? '● Gov Live' : '~ Gov Derived'}</span>
                </div>
            </div>

            {/* Simulating Overlay */}
            {simLoading && (
                <div className="absolute inset-x-4 top-4 z-40 flex items-center gap-2 bg-purple-600/90 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm animate-pulse">
                    <Brain size={14} className="animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Simulation in Progress...</span>
                </div>
            )}

            {/* Floating LLM Policy Advisor */}
            <PolicyChat onSimulate={applyPolicy} />
        </div>
    );
}
