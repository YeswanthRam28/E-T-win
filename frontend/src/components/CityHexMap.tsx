import React, { useState, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { Map, Layer } from 'react-map-gl/maplibre';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { ScatterplotLayer, TextLayer, PathLayer } from '@deck.gl/layers';
import type { MapViewState } from '@deck.gl/core';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface NodeData {
    id: number;
    lat: number;
    lon: number;
    stress: number;
    emissions: number;
    vulnerability: number;
}

interface CityHexMapProps {
    nodes: NodeData[];
    timestep: number;
    onHover?: (info: { x: number; y: number; node: NodeData } | null) => void;
}

const INITIAL_VIEW: MapViewState = {
    longitude: 80.2707,
    latitude: 13.0480,
    zoom: 12.5,
    pitch: 55,
    bearing: -12,
};

// All Chennai neighbourhoods
const AREAS = [
    // Central / Inner
    { name: 'T. Nagar', lon: 80.2330, lat: 13.0400, size: 15 },
    { name: 'Mylapore', lon: 80.2695, lat: 13.0358, size: 14 },
    { name: 'Anna Nagar', lon: 80.2095, lat: 13.0850, size: 14 },
    { name: 'Adyar', lon: 80.2565, lat: 13.0012, size: 13 },
    { name: 'Egmore', lon: 80.2609, lat: 13.0732, size: 13 },
    { name: 'Nungambakkam', lon: 80.2425, lat: 13.0569, size: 13 },
    { name: 'Kilpauk', lon: 80.2380, lat: 13.0836, size: 12 },
    { name: 'Guindy', lon: 80.2206, lat: 13.0067, size: 13 },
    { name: 'Royapettah', lon: 80.2648, lat: 13.0463, size: 12 },
    { name: 'Kodambakkam', lon: 80.2209, lat: 13.0524, size: 12 },
    { name: 'Teynampet', lon: 80.2561, lat: 13.0421, size: 12 },
    { name: 'Besant Nagar', lon: 80.2706, lat: 12.9990, size: 12 },
    { name: 'Perambur', lon: 80.2448, lat: 13.1170, size: 12 },
    { name: 'Velachery', lon: 80.2209, lat: 12.9815, size: 12 },
    { name: 'Koyambedu', lon: 80.1972, lat: 13.0695, size: 12 },
    { name: 'Ashok Nagar', lon: 80.2188, lat: 13.0380, size: 11 },
    // North Chennai
    { name: 'George Town', lon: 80.2856, lat: 13.0902, size: 12 },
    { name: 'Tondiarpet', lon: 80.2922, lat: 13.1172, size: 11 },
    { name: 'Washermanpet', lon: 80.2841, lat: 13.1072, size: 11 },
    { name: 'Sowcarpet', lon: 80.2782, lat: 13.0924, size: 10 },
    { name: 'Purasawalkam', lon: 80.2573, lat: 13.0875, size: 11 },
    { name: 'Otteri', lon: 80.2645, lat: 13.0919, size: 10 },
    { name: 'Villivakkam', lon: 80.2211, lat: 13.1051, size: 11 },
    { name: 'Kolathur', lon: 80.2200, lat: 13.1176, size: 11 },
    { name: 'Mogappair', lon: 80.1726, lat: 13.0941, size: 11 },
    { name: 'Madhavaram', lon: 80.2458, lat: 13.1479, size: 11 },
    { name: 'Padi', lon: 80.2147, lat: 13.1029, size: 10 },
    // East / Coastal
    { name: 'Triplicane', lon: 80.2773, lat: 13.0581, size: 11 },
    { name: 'Chepauk', lon: 80.2833, lat: 13.0621, size: 10 },
    { name: 'Santhome', lon: 80.2768, lat: 13.0363, size: 11 },
    { name: 'Mandaveli', lon: 80.2660, lat: 13.0220, size: 10 },
    { name: 'Thiruvanmiyur', lon: 80.2609, lat: 12.9830, size: 11 },
    { name: 'Perungudi', lon: 80.2487, lat: 12.9594, size: 10 },
    // West
    { name: 'Virugambakkam', lon: 80.2031, lat: 13.0556, size: 11 },
    { name: 'Saligramam', lon: 80.1935, lat: 13.0531, size: 10 },
    { name: 'Porur', lon: 80.1573, lat: 13.0368, size: 11 },
    { name: 'Valasaravakkam', lon: 80.1729, lat: 13.0470, size: 10 },
    { name: 'Ambattur', lon: 80.1545, lat: 13.1143, size: 11 },
    { name: 'Korattur', lon: 80.1953, lat: 13.1042, size: 10 },
    // South
    { name: 'Nandanam', lon: 80.2494, lat: 13.0275, size: 10 },
    { name: 'Saidapet', lon: 80.2216, lat: 13.0218, size: 11 },
    { name: 'West Mambalam', lon: 80.2288, lat: 13.0424, size: 10 },
    { name: 'KK Nagar', lon: 80.2001, lat: 13.0374, size: 10 },
    { name: 'Nanganallur', lon: 80.1939, lat: 12.9981, size: 10 },
    { name: 'Alandur', lon: 80.2013, lat: 13.0045, size: 10 },
    { name: 'Pallavaram', lon: 80.1491, lat: 12.9737, size: 10 },
    { name: 'Pallikaranai', lon: 80.2149, lat: 12.9394, size: 10 },
    { name: 'Sholinganallur', lon: 80.2279, lat: 12.9010, size: 10 },
];

// Lat/lon grid (0.03° ≈ 3 km spacing)
function buildGrid() {
    const paths: { path: [number, number][] }[] = [];
    const LON_MIN = 80.12, LON_MAX = 80.38, LAT_MIN = 12.87, LAT_MAX = 13.18, STEP = 0.03;
    for (let lon = LON_MIN; lon <= LON_MAX + 0.001; lon += STEP)
        paths.push({ path: [[+lon.toFixed(4), LAT_MIN], [+lon.toFixed(4), LAT_MAX]] });
    for (let lat = LAT_MIN; lat <= LAT_MAX + 0.001; lat += STEP)
        paths.push({ path: [[LON_MIN, +lat.toFixed(4)], [LON_MAX, +lat.toFixed(4)]] });
    return paths;
}
const GRID_DATA = buildGrid();

function stressRGB(s: number): [number, number, number] {
    const c = Math.max(0, Math.min(1, s));
    if (c < 0.33) { const t = c / 0.33; return [Math.round(20 + t * 235), Math.round(200 - t * 30), Math.round(80 - t * 80)]; }
    if (c < 0.66) { const t = (c - 0.33) / 0.33; return [255, Math.round(170 - t * 90), 0]; }
    const t = (c - 0.66) / 0.34; return [255, Math.round(80 - t * 80), 0];
}

// Dark CARTO map — no API key, rich street detail
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export default function CityHexMap({ nodes, timestep, onHover }: CityHexMapProps) {
    const [viewState, setViewState] = useState<MapViewState>(INITIAL_VIEW);

    const layers = useMemo(() => {
        if (nodes.length === 0) return [];

        const heatmap = new HeatmapLayer<NodeData>({
            id: 'stress-heat',
            data: nodes,
            getPosition: (d) => [d.lon, d.lat],
            getWeight: (d) => Math.max(0.01, d.stress),
            radiusPixels: 90,
            intensity: 1.6,
            threshold: 0.04,
            colorRange: [
                [0, 200, 80, 0],
                [20, 220, 80, 50],
                [255, 220, 0, 110],
                [255, 120, 0, 170],
                [255, 30, 0, 210],
                [200, 0, 0, 255],
            ],
            updateTriggers: { getWeight: [timestep] },
        });

        const allDots = new ScatterplotLayer<NodeData>({
            id: 'all-nodes',
            data: nodes,
            pickable: true,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 40,
            radiusUnits: 'meters',
            getFillColor: (d) => [...stressRGB(d.stress), 160] as [number, number, number, number],
            opacity: 0.7,
            updateTriggers: { getFillColor: [timestep] },
        });

        const critNodes = nodes.filter((n) => n.stress > 0.6);
        const critScatter = new ScatterplotLayer<NodeData>({
            id: 'critical-zones',
            data: critNodes,
            pickable: true,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: (d) => 60 + d.stress * 140,
            radiusUnits: 'meters',
            getFillColor: (d) => [...stressRGB(d.stress), 190] as [number, number, number, number],
            getLineColor: (d) => [...stressRGB(d.stress), 100] as [number, number, number, number],
            stroked: true,
            lineWidthMinPixels: 1,
            transitions: { getFillColor: { duration: 700 }, getRadius: { duration: 500 } },
            updateTriggers: { getFillColor: [timestep], getRadius: [timestep] },
        });

        const gridLayer = new PathLayer({
            id: 'coord-grid',
            data: GRID_DATA,
            getPath: (d) => d.path,
            getColor: [80, 160, 255, 35],
            getWidth: 0.8,
            widthUnits: 'pixels',
        });

        const textLayer = new TextLayer({
            id: 'area-labels',
            data: AREAS,
            getPosition: (d) => [d.lon, d.lat, 80],
            getText: (d) => d.name,
            getSize: (d) => d.size,
            getColor: [220, 240, 255, 230],
            fontFamily: '"Inter", "Helvetica Neue", sans-serif',
            fontWeight: 600,
            getTextAnchor: 'middle' as const,
            getAlignmentBaseline: 'center' as const,
            billboard: true,
            background: true,
            getBackgroundColor: [6, 8, 20, 170],
            backgroundPadding: [4, 2, 4, 2],
        });

        return [heatmap, allDots, critScatter, gridLayer, textLayer];
    }, [nodes, timestep]);

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <DeckGL
                viewState={viewState}
                onViewStateChange={({ viewState: vs }) => setViewState(vs as unknown as MapViewState)}
                controller={true}
                layers={layers}
                useDevicePixels={false}
                onHover={({ object, x, y }) => {
                    if (onHover) onHover(object ? { x, y, node: object as NodeData } : null);
                }}
            >
                <Map mapStyle={MAP_STYLE}>
                    <Layer
                        id="3d-buildings"
                        source="carto"
                        source-layer="building"
                        type="fill-extrusion"
                        minzoom={15}
                        paint={{
                            'fill-extrusion-color': '#1a1a2e',
                            'fill-extrusion-height': [
                                'interpolate',
                                ['linear'],
                                ['zoom'],
                                15,
                                0,
                                15.05,
                                ['get', 'render_height']
                            ],
                            'fill-extrusion-base': [
                                'interpolate',
                                ['linear'],
                                ['zoom'],
                                15,
                                0,
                                15.05,
                                ['get', 'render_min_height']
                            ],
                            'fill-extrusion-opacity': 0.8
                        }}
                    />
                </Map>
            </DeckGL>
        </div>
    );
}
