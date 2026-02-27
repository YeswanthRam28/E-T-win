<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# E\<T\>WIN — Echelon Twin

**Autonomous Policy Simulation through Multi-Agent Reinforcement Learning & Real-World Signal Injection.**

E\<T\>WIN creates a high-fidelity digital twin of urban ecosystems, modeling the complex interplay between climate, economy, and social equity. By leveraging Graph Neural Networks and Causal AI, we simulate years of policy impact in seconds — and now **breathes with real planetary data** via live climate signal injection.

> "E\<T\>WIN integrates real-world signals to dynamically update policy simulations in near real time."

Aligned with the UN Sustainable Development Goals:
- 🌍 Climate Action (SDG 13)
- 🏙️ Sustainable Cities (SDG 11)
- 💧 Clean Water (SDG 06)
- ⚡ Clean Energy (SDG 07)
- ⚖️ Reduced Inequalities (SDG 10)
- 🏛️ Strong Institutions (SDG 16)

---

## 🏗 Architecture

```
[ Open-Meteo API ] ──► [ n8n Workflow ] ──POST──► [ FastAPI Backend ]
                                                         │
                                              ┌──────────┴──────────┐
                                        GNN Simulation         Governance API
                                        (PyTorch/PyG)          (Signal Injection)
                                              └──────────┬──────────┘
                                                         │
                                                 [ React Frontend ]
```

---

## ✨ Features

- **Real-World Signal Injection**: Live climate data (temperature, rainfall, wind) from Open-Meteo feeds directly into the simulation every hour via n8n.
- **Adaptive Governance**: Anomaly detection automatically triggers emergency policy simulations when climate thresholds are breached.
- **Climate Dynamics**: Real-time atmospheric modeling with urban heat island effects and carbon sequestration simulation.
- **Economic Flow**: Agent-based modeling of micro-economies. Test subsidies, tax shifts, and UBI on local district prosperity.
- **Social Equity**: Causal AI mapping of inequality shifts across infrastructure interventions.
- **3D Visualization**: High-fidelity 3D urban modeling powered by React Three Fiber and CesiumJS.

---

## 🌐 Live Endpoints

| Endpoint | Description |
| :--- | :--- |
| `GET /api/state/current` | SDG composite score, stability, confidence |
| `GET /api/signals/climate` | Live temperature, precipitation, anomaly detection |
| `GET /api/systems/water` | Reservoir levels, stress index, days to critical |
| `GET /api/systems/economy` | GDP growth, energy pricing, economic stability |
| `GET /api/systems/social` | Inequality, public sentiment, governance confidence |
| `GET /api/alerts/recent` | Real-time event & anomaly stream |
| `GET /api/insights/latest` | AI-recommended policy with confidence score |
| `GET /api/timeline` | Historical ledger of signals and SDG deltas |
| `GET /api/forecast/7-cycle` | 7-step resource projections |
| `POST /update-digital-twin` | n8n signal injection endpoint |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- A Gemini API Key

### Backend
```bash
pip install -r requirements.txt
cd backend/api
python server.py
```

### Frontend
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local — set GEMINI_API_KEY and VITE_SIM_API_URL
npm install
npm run dev
```

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion |
| **3D / Maps** | Three.js, React Three Fiber, CesiumJS, MapLibre GL |
| **Backend** | FastAPI, Uvicorn, Pydantic |
| **AI/ML** | PyTorch, PyTorch Geometric (GNN), Google Gemini |
| **Signal Injection** | n8n, Open-Meteo API |
| **Charts** | Recharts |

---

## License

© 2026 E\<T\>WIN DIGITAL TWIN SYSTEMS
