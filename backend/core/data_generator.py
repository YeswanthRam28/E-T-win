import networkx as nx
import numpy as np
import random
from typing import Dict, List, Tuple, Any

def generate_synthetic_city_data(
    num_households: int = 250,
    num_industries: int = 15,
    num_reservoirs: int = 1,
    num_transport_hubs: int = 3,
    num_socio_economic_clusters: int = 2,
    num_hospitals: int = 1,
    seed: int = 42
) -> Tuple[List[Dict[str, Any]], List[Tuple[int, int, Dict[str, Any]]]]:
    """
    Generates synthetic nodes and edges for the E<T>WIN micro-city graph.
    """
    random.seed(seed)
    np.random.seed(seed)
    
    nodes = []
    edges = []
    
    current_node_id = 0
    node_groups = {
        'household': [],
        'industry': [],
        'reservoir': [],
        'transport_hub': [],
        'socio_economic_cluster': [],
        'hospital': []
    }
    
    # helper to add node
    def add_node(node_type: str, base_features: Dict[str, float]):
        nonlocal current_node_id
        node = {
            'id': current_node_id,
            'type': node_type,
            'features': base_features
        }
        nodes.append(node)
        node_groups[node_type].append(current_node_id)
        current_node_id += 1
        return current_node_id - 1

    # Generate Nodes
    
    # 1. Reservoir
    for _ in range(num_reservoirs):
        add_node('reservoir', {
            'water_consumption': 0.0,
            'energy_consumption': 50.0,
            'income_level': 0.0,
            'emissions': 10.0,
            'infrastructure_stress': 0.1,
            'social_vulnerability_score': 0.0,
            'capacity': 10000.0 # Specific to reservoir
        })

    # 2. Hospitals
    for _ in range(num_hospitals):
        add_node('hospital', {
            'water_consumption': 200.0,
            'energy_consumption': 500.0,
            'income_level': 0.0, # Not applicable
            'emissions': 50.0,
            'infrastructure_stress': 0.3,
            'social_vulnerability_score': 0.1,
        })

    # 3. Transport Hubs
    for _ in range(num_transport_hubs):
        add_node('transport_hub', {
            'water_consumption': 50.0,
            'energy_consumption': 300.0,
            'income_level': 0.0,
            'emissions': 150.0,
            'infrastructure_stress': 0.4,
            'social_vulnerability_score': 0.2,
        })

    # 4. Socio-Economic Clusters (representing neighborhoods/centers)
    for _ in range(num_socio_economic_clusters):
        add_node('socio_economic_cluster', {
            'water_consumption': 100.0,
            'energy_consumption': 200.0,
            'income_level': np.random.normal(50000, 15000), # Avg income of cluster
            'emissions': 80.0,
            'infrastructure_stress': 0.2,
            'social_vulnerability_score': np.random.uniform(0.1, 0.8),
        })

    # 5. Industries
    for _ in range(num_industries):
        add_node('industry', {
            'water_consumption': np.random.normal(500, 100),
            'energy_consumption': np.random.normal(1000, 200),
            'income_level': np.random.normal(1000000, 200000), # Revenue proxy
            'emissions': np.random.normal(300, 50),
            'infrastructure_stress': np.random.uniform(0.4, 0.9),
            'social_vulnerability_score': 0.1,
        })

    # 6. Households
    for _ in range(num_households):
        # Assign to a cluster roughly based on income
        income = max(10000, np.random.normal(60000, 30000))
        vuln_score = max(0.0, min(1.0, 1.0 - (income / 150000) + np.random.normal(0, 0.1)))
        
        add_node('household', {
            'water_consumption': np.random.normal(10, 2),
            'energy_consumption': np.random.normal(20, 5),
            'income_level': income,
            'emissions': np.random.normal(5, 1),
            'infrastructure_stress': np.random.uniform(0.0, 0.3),
            'social_vulnerability_score': vuln_score,
        })

    # Generate Edges
    
    # 1. Water pipelines: Reservoir -> all other nodes (except itself)
    r_id = node_groups['reservoir'][0]
    for n in nodes:
        if n['id'] != r_id:
            edges.append((r_id, n['id'], {'type': 'water_pipeline', 'capacity': 100.0}))

    # 2. Road connections: connect clusters to transport hubs, households to clusters
    for cluster_id in node_groups['socio_economic_cluster']:
        # Connect cluster to a random transport hub
        hub_id = random.choice(node_groups['transport_hub'])
        edges.append((cluster_id, hub_id, {'type': 'road', 'capacity': 500.0}))
        edges.append((hub_id, cluster_id, {'type': 'road', 'capacity': 500.0})) # bidirectional

    for hh_id in node_groups['household']:
        # Connect household to a specific cluster (could be based on vulnerability/income similarity, just random for now)
        cluster_id = random.choice(node_groups['socio_economic_cluster'])
        edges.append((hh_id, cluster_id, {'type': 'road', 'capacity': 10.0}))
        edges.append((cluster_id, hh_id, {'type': 'road', 'capacity': 10.0}))

    # 3. Energy distribution: creating a central power source (implicit, just connecting nodes to form a grid)
    # Connect industries heavily to transport hubs and clusters
    for ind_id in node_groups['industry']:
        target_hub = random.choice(node_groups['transport_hub'])
        edges.append((ind_id, target_hub, {'type': 'energy_grid', 'capacity': 1000.0}))
        
        target_cluster = random.choice(node_groups['socio_economic_cluster'])
        edges.append((ind_id, target_cluster, {'type': 'economic_transaction', 'volume': np.random.uniform(1000, 5000)}))

    # 4. Economic transaction relationships: households working at industries/hospitals
    for hh_id in node_groups['household']:
        if random.random() < 0.7: # 70% chance to work at an industry
            employer_id = random.choice(node_groups['industry'])
        else: # 30% chance to work at hospital or transport hub
            employers = node_groups['hospital'] + node_groups['transport_hub']
            employer_id = random.choice(employers)
            
        edges.append((hh_id, employer_id, {'type': 'economic_transaction', 'volume': nodes[hh_id]['features']['income_level']}))

    return nodes, edges

if __name__ == "__main__":
    nodes, edges = generate_synthetic_city_data()
    print(f"Generated {len(nodes)} nodes and {len(edges)} edges.")
