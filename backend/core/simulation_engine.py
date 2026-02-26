import torch
from typing import Dict, Any, Tuple, List
from data_generator import generate_synthetic_city_data
from graph_builder import GraphBuilder, FEATURE_KEYS
from gnn_model import EtwinGNN

class SimulationEngine:
    def __init__(self, hidden_channels: int = 32):
        """
        Initializes the Core Spatial World Model Engine.
        This represents the single source of truth for the digital twin's state.
        """
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Generate initial world state
        print("Initializing E<T>WIN World State...")
        nodes, edges = generate_synthetic_city_data()
        
        # Build graph and PyG data representations
        self.graph_builder = GraphBuilder()
        nx_graph = self.graph_builder.build_from_synthetic_data(nodes, edges)
        
        # This is the "State Tensor Engine"
        self.data = nx_graph.copy() # We keep the original for structural reference, but PyG handles the math
        self.pyg_data = self.graph_builder.convert_to_pyg_data().to(self.device)
        
        # Initialize GNN transition function
        self.num_features = len(FEATURE_KEYS)
        self.gnn = EtwinGNN(num_node_features=self.num_features, hidden_channels=hidden_channels).to(self.device)
        self.gnn.eval() # We are in inference/simulation mode by default, not backprop training mode
        
        self.current_timestep = 0
        
        # Track historical metrics for dashboarding
        self.history = []
        self._record_state()
        print(f"Engine Ready. Nodes: {self.pyg_data.num_nodes}, Edges: {self.pyg_data.num_edges}")

    def _apply_policy_modifiers(self, x: torch.Tensor, policy: Dict[str, float]) -> torch.Tensor:
        """
        Policy injection mechanism. Modifies the state tensor *before* the GNN step based on external policies.
        This provides the causal intervention modeling hook.
        
        policy keys map to multipliers on specific features.
        Example policy: {"carbon_tax": 1.2, "water_price_factor": 1.5}
        """
        if not policy:
            return x
            
        x_modified = x.clone()
        
        # Example 1: Carbon Tax reduces emissions (index 3) but might increase infrastructure stress (index 4) slightly
        if 'carbon_tax' in policy:
            tax_level = policy['carbon_tax']
            emissions_idx = FEATURE_KEYS.index('emissions')
            stress_idx = FEATURE_KEYS.index('infrastructure_stress')
            
            # Reduce emissions by tax factor (e.g., 1.2 tax -> divide by 1.2)
            x_modified[:, emissions_idx] = x_modified[:, emissions_idx] / tax_level
            # Marginally increase stress due to sudden policy shift
            x_modified[:, stress_idx] = x_modified[:, stress_idx] * (1.0 + (tax_level - 1.0) * 0.1)

        # Example 2: Public Transport Subsidy reduces energy consumption (index 1) and vulnerability (index 5)
        if 'public_transport_subsidy' in policy:
            subsidy = policy['public_transport_subsidy']
            energy_idx = FEATURE_KEYS.index('energy_consumption')
            vuln_idx = FEATURE_KEYS.index('social_vulnerability_score')
            
            x_modified[:, energy_idx] = x_modified[:, energy_idx] * (1.0 - subsidy * 0.2)
            x_modified[:, vuln_idx] = x_modified[:, vuln_idx] * (1.0 - subsidy * 0.1)

        # Example 3: Water Pricing
        if 'water_price_factor' in policy:
            price = policy['water_price_factor']
            water_idx = FEATURE_KEYS.index('water_consumption')
            x_modified[:, water_idx] = x_modified[:, water_idx] / price

        return x_modified

    @torch.no_grad()
    def step(self, policy: Dict[str, float] = None) -> Dict[str, float]:
        """
        Executes one discrete time-step of the simulation.
        1. Inject policy modifiers into current state
        2. Run GNN forward pass to compute emergent interactions
        3. Update persistent state tensor
        4. Calculate global aggregates
        """
        self.current_timestep += 1
        
        # 1. Start with current state tensor (x)
        current_x = self.pyg_data.x
        
        # 2. Apply exogenous policy interventions
        if policy:
             current_x = self._apply_policy_modifiers(current_x, policy)
        
        # 3. GNN State Transition (Message Passing)
        # The GNN computes how neighbors influence each other given the new state
        new_x = self.gnn(current_x, self.pyg_data.edge_index)
        
        # 4. Update the core state tensor
        self.pyg_data.x = new_x
        
        # 5. Record and aggregate metrics
        metrics = self._record_state()
        return metrics

    def _record_state(self) -> Dict[str, float]:
        """Aggregates node-level tensors into global city metrics."""
        x = self.pyg_data.x
        
        # Simple summation or averaging depending on the metric
        total_water = x[:, FEATURE_KEYS.index('water_consumption')].sum().item()
        total_energy = x[:, FEATURE_KEYS.index('energy_consumption')].sum().item()
        avg_income = x[:, FEATURE_KEYS.index('income_level')].mean().item()
        total_emissions = x[:, FEATURE_KEYS.index('emissions')].sum().item()
        avg_stress = x[:, FEATURE_KEYS.index('infrastructure_stress')].mean().item()
        avg_vulnerability = x[:, FEATURE_KEYS.index('social_vulnerability_score')].mean().item()
        
        # A simple composite SDG score (Higher is better)
        # Normalized based roughly on initial values (this would need calibration in a real system)
        sdg_climate = max(0, 100 - (total_emissions / 10000) * 100) 
        sdg_inequality = max(0, 100 - (avg_vulnerability * 100))
        sdg_infrastructure = max(0, 100 - (avg_stress * 100))
        
        composite_sdg = (sdg_climate + sdg_inequality + sdg_infrastructure) / 3.0

        metrics = {
            'timestep': self.current_timestep,
            'total_water_consumption': total_water,
            'total_energy_consumption': total_energy,
            'average_income': avg_income,
            'total_emissions': total_emissions,
            'average_infrastructure_stress': avg_stress,
            'average_social_vulnerability': avg_vulnerability,
            'composite_sdg_score': composite_sdg
        }
        
        self.history.append(metrics)
        return metrics

    def get_node_features(self, node_id: int) -> Dict[str, float]:
        """Returns the current state features for a specific node."""
        return self.graph_builder.extract_features_to_dict(self.pyg_data.x, node_id)

    def run_projection(self, steps: int, policy: Dict[str, float] = None) -> List[Dict[str, float]]:
        """Runs the simulation forward for N steps, returning the trajectory of metrics."""
        results = []
        for _ in range(steps):
             metrics = self.step(policy)
             results.append(metrics)
        return results

# Example Usage
if __name__ == "__main__":
    # Initialize the World Model
    engine = SimulationEngine()
    
    # Run Baseline Projection (No Policy)
    print("Running Baseline Scenario (5 steps)...")
    baseline_results = engine.run_projection(steps=5)
    print(f"Final Baseline SDG Score: {baseline_results[-1]['composite_sdg_score']:.2f}")
    
    # Run Policy Intervention Scenario
    # Note: We should ideally reset the engine to compare fairly, but for this test script we continue
    print("\nApplying Policy Intervention: Carbon Tax (1.5x) && Transport Subsidy (0.2)...")
    policy_bundle = {
        'carbon_tax': 1.5,
        'public_transport_subsidy': 0.2
    }
    policy_results = engine.run_projection(steps=5, policy=policy_bundle)
    print(f"Final Policy SDG Score: {policy_results[-1]['composite_sdg_score']:.2f}")
    print(f"Emissions Change: {baseline_results[-1]['total_emissions']:.0f} -> {policy_results[-1]['total_emissions']:.0f}")
