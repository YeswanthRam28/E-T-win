<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# E<T>WIN

**Autonomous Policy Simulation through Multi-Agent Reinforcement Learning.**

E<T>WIN creates a high-fidelity digital twin of urban ecosystems, modeling the complex interplay between climate, economy, and social equity. By leveraging Graph Neural Networks and Causal AI, we simulate years of policy impact in seconds, allowing leaders to stress-test decisions before they are made.

Aligned with the UN Sustainable Development Goals:
- Climate Action (SDG 13)
- Sustainable Cities (SDG 11)
- Clean Water (SDG 06)
- Clean Energy (SDG 07)
- Reduced Inequalities (SDG 10)
- Strong Institutions (SDG 16)

## Features

- **Climate Dynamics**: Real-time atmospheric modeling integrated with urban heat island effects. Simulate carbon sequestration policies and flood resilience strategies.
- **Economic Flow**: Agent-based modeling of micro-economies. Test the impact of subsidies, tax shifts, and universal basic income on local district prosperity.
- **Social Equity**: Mapping inequality shifts through causal AI. Understand how infrastructure changes affect marginalized communities before breaking ground.
- **3D Visualization**: High-fidelity 3D modeling of urban environments powered by React Three Fiber.

## Getting Started

### Prerequisites

- Node.js
- A Gemini API Key

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Set up your environment variables. Copy `.env.example` to `.env.local` and add your Gemini API key:
   ```bash
   cp .env.example .env.local
   # Edit .env.local to set GEMINI_API_KEY=your_api_key_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide React
- **3D Graphics**: Three.js, React Three Fiber, React Three Drei
- **Backend/Data**: Express, Better SQLite3, Google GenAI SDK

## License

© 2026 E<T>WIN DIGITAL TWIN SYSTEMS
