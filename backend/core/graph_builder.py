import networkx as nx
import torch
from torch_geometric.data import Data
from typing import List, Dict, Tuple, Any

# Map node types to integers for PyG
NODE_TYPE_MAP = {
    'household': 0,
    'industry': 1,
    'reservoir': 2,
    'transport_hub': 3,
    'socio_economic_cluster': 4,
    'hospital': 5
}

# Map edge types to integers for PyG
EDGE_TYPE_MAP = {
    'water_pipeline': 0,
    'road': 1,
    'energy_grid': 2,
    'economic_transaction': 3
}

# Define the consistent ordering of features to create the tensor
FEATURE_KEYS = [
    'water_consumption',
    'energy_consumption',
    'income_level',
    'emissions',
    'infrastructure_stress',
    'social_vulnerability_score'
]

class GraphBuilder:
    def __init__(self):
        self.nx_graph = nx.DiGraph()
        
    def build_from_synthetic_data(self, nodes: List[Dict[str, Any]], edges: List[Tuple[int, int, Dict[str, Any]]]):
        """
        Builds a NetworkX graph from raw node and edge data.
        """
        self.nx_graph.clear()
        
        for node in nodes:
            self.nx_graph.add_node(
                node['id'], 
                node_type=node['type'], 
                **node['features']
            )
            
        for source, target, edge_attr in edges:
            self.nx_graph.add_edge(source, target, **edge_attr)
            
        return self.nx_graph

    def convert_to_pyg_data(self) -> Data:
        """
        Converts the internal NetworkX graph to a PyTorch Geometric Data object.
        Preserves node features as a single tensor and extracts edge indices/types.
        """
        if len(self.nx_graph.nodes) == 0:
            raise ValueError("NetworkX graph is empty. Build it first.")

        # Ensure node IDs are contiguous integers from 0 to N-1 for PyG
        # (Our synthetic generator already does this, but good practice to map)
        node_mapping = {n: i for i, n in enumerate(self.nx_graph.nodes())}
        num_nodes = len(node_mapping)
        
        # 1. Node Features (x)
        # Shape: [num_nodes, num_features]
        x = torch.zeros((num_nodes, len(FEATURE_KEYS)), dtype=torch.float)
        node_types = torch.zeros(num_nodes, dtype=torch.long)
        
        for n, data in self.nx_graph.nodes(data=True):
            mapped_idx = node_mapping[n]
            node_types[mapped_idx] = NODE_TYPE_MAP[data['node_type']]
            
            for i, key in enumerate(FEATURE_KEYS):
                # Use base features, defaulting to 0.0 if not perfectly matched
                x[mapped_idx, i] = data.get(key, 0.0)

        # 2. Edge Index (edge_index) and Edge Attributes (edge_attr)
        # edge_index Shape: [2, num_edges]
        edge_indices = []
        edge_types = []
        edge_weights = [] # Optional, e.g., capacity or volume
        
        for u, v, data in self.nx_graph.edges(data=True):
            edge_indices.append([node_mapping[u], node_mapping[v]])
            edge_types.append(EDGE_TYPE_MAP[data['type']])
            
            # Simple weight extraction if needed for advanced GNN
            weight = data.get('capacity', data.get('volume', 1.0))
            edge_weights.append([weight])

        edge_index = torch.tensor(edge_indices, dtype=torch.long).t().contiguous()
        edge_attr = torch.tensor(edge_weights, dtype=torch.float)
        edge_type_tensor = torch.tensor(edge_types, dtype=torch.long)

        # Create PyG Data Object
        data = Data(
            x=x, 
            edge_index=edge_index, 
            edge_attr=edge_attr,
            node_type=node_types, # Store type info for heterogenous-like processing if needed
            edge_type=edge_type_tensor
        )
        
        return data

    def extract_features_to_dict(self, x: torch.Tensor, node_id: int) -> Dict[str, float]:
        """Utility to convert tensor slice back to readable dict based on schema."""
        features = {}
        for i, key in enumerate(FEATURE_KEYS):
            features[key] = x[node_id, i].item()
        return features
