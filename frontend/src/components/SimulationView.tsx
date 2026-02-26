import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { Play, Pause, RotateCcw, FastForward, Navigation } from 'lucide-react';

const CHENNAI_CENTER = { lat: 13.0827, lon: 80.2707 };
const BOUNDING_RADIUS_DEG = 0.18; // approx 20km

export default function SimulationView() {
    const cesiumContainer = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<Cesium.Viewer | null>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [speedMultiplier, setSpeedMultiplier] = useState(10);

    useEffect(() => {
        if (!cesiumContainer.current || viewerRef.current) return;

        // Initialize Cesium Viewer
        const viewer = new Cesium.Viewer(cesiumContainer.current, {
            animation: false,
            baseLayerPicker: false,
            fullscreenButton: false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            sceneModePicker: false,
            selectionIndicator: false,
            timeline: false,
            navigationHelpButton: false,
            navigationInstructionsInitiallyVisible: false,
            scene3DOnly: true,
            shouldAnimate: true, // Auto-start the clock
            requestRenderMode: true, // Optimization for React
            maximumRenderTimeChange: Infinity
        });

        // Explicitly set the clock multiplier
        viewer.clock.multiplier = 10;

        // Disable default depth testing against terrain to avoid clipping flying objects
        viewer.scene.globe.depthTestAgainstTerrain = false;

        // Remove credits for a cleaner look
        const creditContainer = viewer.cesiumWidget.creditContainer as HTMLElement;
        if (creditContainer) {
            creditContainer.style.display = "none";
        }

        viewerRef.current = viewer;

        // --- Constraints Setup --- //
        const scene = viewer.scene;
        const camera = scene.camera;

        // 1. Camera Zoom Constraints (5km to 40km)
        scene.screenSpaceCameraController.minimumZoomDistance = 5000;
        scene.screenSpaceCameraController.maximumZoomDistance = 40000;

        // 2. Camera Tilt Constraints (prevent looking perfectly horizontal, max tilt = 80 deg)
        scene.screenSpaceCameraController.minimumCollisionTerrainHeight = 100;

        // 3. Initial Position: 25km height centered on Chennai
        camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(
                CHENNAI_CENTER.lon,
                CHENNAI_CENTER.lat,
                25000
            ),
            orientation: {
                heading: 0.0,
                pitch: Cesium.Math.toRadians(-90.0), // looking straight down
                roll: 0.0
            }
        });

        // --- Data Model Generators --- //
        const start = viewer.clock.startTime;
        const duration = 120; // Generate 120 seconds of data

        const generateCircularPath = (radiusKm: number, heightM: number, freq: number) => {
            const positionProperty = new Cesium.SampledPositionProperty();
            for (let i = 0; i <= duration; i++) {
                const time = Cesium.JulianDate.addSeconds(start, i, new Cesium.JulianDate());
                const angle = i * freq * Math.PI * 2 / duration;

                // Convert radiusKm to rough degrees
                const latOffset = (radiusKm / 111) * Math.cos(angle);
                const lonOffset = (radiusKm / (111 * Math.cos(CHENNAI_CENTER.lat * Math.PI / 180))) * Math.sin(angle);

                const position = Cesium.Cartesian3.fromDegrees(
                    CHENNAI_CENTER.lon + lonOffset,
                    CHENNAI_CENTER.lat + latOffset,
                    heightM
                );
                positionProperty.addSample(time, position);
            }
            return positionProperty;
        };

        const generateLinearPath = (heightM: number) => {
            const positionProperty = new Cesium.SampledPositionProperty();
            const startLon = CHENNAI_CENTER.lon - BOUNDING_RADIUS_DEG * 0.8;
            const endLon = CHENNAI_CENTER.lon + BOUNDING_RADIUS_DEG * 0.8;

            for (let i = 0; i <= duration; i++) {
                const time = Cesium.JulianDate.addSeconds(start, i, new Cesium.JulianDate());
                const t = i / duration;
                const currentLon = startLon + (endLon - startLon) * t;

                const position = Cesium.Cartesian3.fromDegrees(
                    currentLon,
                    CHENNAI_CENTER.lat - 0.05, // slightly south of center
                    heightM
                );
                positionProperty.addSample(time, position);
            }
            return positionProperty;
        };

        // --- Add Entities --- //
        // Drone A (Circular: 5km radius, 500m height)
        viewer.entities.add({
            id: "droneA",
            name: "Drone A - Pattern Alpha",
            position: generateCircularPath(5, 500, 1),
            point: { pixelSize: 10, color: Cesium.Color.RED, outlineColor: Cesium.Color.WHITE, outlineWidth: 2 },
            path: { resolution: 1, material: new Cesium.PolylineGlowMaterialProperty({ glowPower: 0.1, color: Cesium.Color.RED }), width: 3 }
        });

        // Drone B (Linear East-West: 300m height)
        viewer.entities.add({
            id: "droneB",
            name: "Drone B - Transit Line",
            position: generateLinearPath(300),
            point: { pixelSize: 10, color: Cesium.Color.CYAN, outlineColor: Cesium.Color.WHITE, outlineWidth: 2 },
            path: { resolution: 1, material: new Cesium.PolylineGlowMaterialProperty({ glowPower: 0.1, color: Cesium.Color.CYAN }), width: 3 }
        });

        // Object C (High Altitude Patrol: 10,000m height, wide 15km circular sweep)
        viewer.entities.add({
            id: "objectC",
            name: "Satellite Patrol",
            position: generateCircularPath(15, 10000, 0.5),
            point: { pixelSize: 15, color: Cesium.Color.YELLOW, outlineColor: Cesium.Color.WHITE, outlineWidth: 2 },
            path: { resolution: 1, material: new Cesium.PolylineGlowMaterialProperty({ glowPower: 0.2, color: Cesium.Color.YELLOW }), width: 5 }
        });

        // Ensure the timeline loops
        viewer.clock.stopTime = Cesium.JulianDate.addSeconds(start, duration, new Cesium.JulianDate());
        viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;

        // Trigger render updates in React loop context
        const updateTick = () => {
            if (viewerRef.current && isPlaying) {
                viewerRef.current.scene.requestRender();
            }
            requestAnimationFrame(updateTick);
        };
        requestAnimationFrame(updateTick);

        return () => {
            viewer.destroy();
            viewerRef.current = null;
        };
    }, []);

    // Controls Handlers
    const togglePlayMode = () => {
        if (viewerRef.current) {
            viewerRef.current.clock.shouldAnimate = !viewerRef.current.clock.shouldAnimate;
            setIsPlaying(viewerRef.current.clock.shouldAnimate);
        }
    };

    const changeSpeed = (mult: number) => {
        if (viewerRef.current) {
            viewerRef.current.clock.multiplier = mult;
            setSpeedMultiplier(mult);
        }
    };

    const resetSimulation = () => {
        if (viewerRef.current) {
            viewerRef.current.clock.currentTime = viewerRef.current.clock.startTime;
            viewerRef.current.scene.requestRender();
        }
    };

    const recenterCamera = () => {
        if (viewerRef.current) {
            viewerRef.current.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(
                    CHENNAI_CENTER.lon,
                    CHENNAI_CENTER.lat,
                    25000
                ),
                duration: 1.5
            });
        }
    };

    // --- Data Fetching (Backend Integration) --- //
    const [metrics, setMetrics] = useState({
        emissions: 100.0,
        water_reserve: 85.0,
        inequality_index: 0.50,
        sdg_composite: 45.0,
        timestep: 0
    });

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const fetchMetrics = async () => {
            if (!isPlaying) return;

            try {
                // Fetch 1 step of simulation data
                const response = await fetch("http://localhost:8000/api/simulate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ steps: 1 })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.results && data.results.length > 0) {
                        const latest = data.results[0];
                        setMetrics({
                            emissions: latest.emissions,
                            water_reserve: latest.water_reserve,
                            inequality_index: latest.inequality_index,
                            sdg_composite: latest.sdg_composite,
                            timestep: data.current_timestep
                        });
                    }
                }
            } catch (err) {
                console.error("Simulation Backend Offline:", err);
            }
        };

        if (isPlaying) {
            // Poll the backend based on the time scaler
            // At 10x speed, we want to pulse faster. 
            const pollRateMs = Math.max(500, 3000 / speedMultiplier);
            interval = setInterval(fetchMetrics, pollRateMs);
        }

        return () => clearInterval(interval);
    }, [isPlaying, speedMultiplier]);

    // End Data Fetching

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden font-mono">
            {/* 3D Canvas */}
            <div ref={cesiumContainer} className="absolute inset-0 z-0" />

            {/* Overlay UI */}
            <div className="absolute top-6 left-6 z-10 bg-black/60 backdrop-blur-md border border-white/10 p-6 rounded-xl text-white max-w-sm">
                <div className="flex items-center gap-3 mb-4">
                    <Navigation className="text-emerald-500" />
                    <h2 className="text-xl font-bold uppercase tracking-widest">Chennai Zone</h2>
                </div>

                <p className="text-sm text-zinc-400 mb-6">Simulation Sandbox: 20km Bounding Radius. Real-time multi-agent spatial tracking.</p>

                {/* NEW: Live Simulation Metrics Panel */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
                        <span className="text-xs uppercase text-zinc-400">Time Step</span>
                        <span className="font-mono text-emerald-400">T+{metrics.timestep.toString().padStart(3, '0')}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Composite SDG</div>
                            <div className="font-display text-xl">{metrics.sdg_composite.toFixed(1)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Carbon Emissions</div>
                            <div className="font-display text-xl text-red-400">{metrics.emissions.toFixed(1)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Water Reserve</div>
                            <div className="font-display text-xl text-blue-400">{metrics.water_reserve.toFixed(1)}%</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Inequality Index</div>
                            <div className="font-display text-xl text-amber-400">{(metrics.inequality_index * 100).toFixed(0)}</div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Playback Controls */}
                    <div className="flex gap-2 border-b border-white/10 pb-4">
                        <button
                            onClick={togglePlayMode}
                            className="flex-1 flex justify-center items-center gap-2 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                        >
                            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                            {isPlaying ? "PAUSE" : "PLAY"}
                        </button>
                        <button
                            onClick={resetSimulation}
                            className="flex-1 flex justify-center items-center gap-2 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                        >
                            <RotateCcw size={18} />
                            RESET
                        </button>
                    </div>

                    {/* Speed Controls */}
                    <div>
                        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2 flex justify-between">
                            <span>Time Scaler</span>
                            <span className="text-emerald-500">{speedMultiplier}x SPEED</span>
                        </div>
                        <div className="flex gap-2">
                            {[1, 10, 50, 100].map(speed => (
                                <button
                                    key={speed}
                                    onClick={() => changeSpeed(speed)}
                                    className={`flex-1 py-1.5 text-xs rounded border transition-colors ${speedMultiplier === speed
                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                                        : 'bg-transparent border-white/10 text-zinc-400 hover:border-white/30'
                                        }`}
                                >
                                    {speed}x
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={recenterCamera}
                        className="w-full mt-4 py-2 text-xs uppercase tracking-widest bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-colors rounded"
                    >
                        Recenter Aerial View
                    </button>
                </div>
            </div>

            {/* Vitals Overlay */}
            <div className="absolute bottom-6 left-6 z-10 text-[10px] text-zinc-500 uppercase tracking-[0.2em] space-y-1">
                <div>BOUNDS: 13.0827°N, 80.2707°E ±20KM</div>
                <div>ALTITUDE CEILING: 40KM</div>
                <div>SYS_CLK: {isPlaying ? "ACTIVE" : "HALTED"}</div>
            </div>
        </div>
    );
}
