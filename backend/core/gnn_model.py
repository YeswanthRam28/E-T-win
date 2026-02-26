import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import SAGEConv

class EtwinGNN(torch.nn.Module):
    def __init__(self, num_node_features: int, hidden_channels: int):
        super(EtwinGNN, self).__init__()
        # We use SAGEConv for inductive representation learning on large graphs
        # It aggregates neighbors' features to update the target node's representation
        self.conv1 = SAGEConv(num_node_features, hidden_channels)
        self.conv2 = SAGEConv(hidden_channels, hidden_channels)
        
        # We need to map the hidden representation back to the original feature space
        # so the output tensor is a valid updated state (same shape as input)
        self.out_linear = nn.Linear(hidden_channels, num_node_features)
        
    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        """
        Forward pass of the GNN.
        Args:
            x (Tensor): Node feature matrix with shape [num_nodes, num_node_features]
            edge_index (LongTensor): Graph connectivity with shape [2, num_edges]
        Returns:
            Tensor: Updated node feature matrix
        """
        # 1. Message Passing Layer 1
        h = self.conv1(x, edge_index)
        h = F.relu(h)
        h = F.dropout(h, p=0.2, training=self.training)
        
        # 2. Message Passing Layer 2
        h = self.conv2(h, edge_index)
        h = F.relu(h)
        
        # 3. Output mapping back to physical state dimensions
        # We want to learn a delta (change) rather than predicting the absolute new state directly.
        # This makes physical sense for a time-step simulation.
        state_delta = self.out_linear(h)
        
        # 4. Apply State Transition
        new_state = x + state_delta
        
        # 5. Apply Physical Constraints (e.g., cannot have negative water consumption)
        # Using ReLU to ensure non-negativity for strictly positive features like consumption
        new_state = F.relu(new_state)
        
        return new_state

    def reset_parameters(self):
        """Re-initializes all learnable parameters."""
        self.conv1.reset_parameters()
        self.conv2.reset_parameters()
        self.out_linear.reset_parameters()
