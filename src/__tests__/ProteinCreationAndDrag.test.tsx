import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProteinData } from '../types';

// Mock dataTransfer for drag and drop events
const createMockDataTransfer = () => {
  const data: { [key: string]: string } = {};
  return {
    getData: jest.fn((key: string) => data[key] || ''),
    setData: jest.fn((key: string, value: string) => {
      data[key] = value;
    }),
    dropEffect: 'move' as DataTransfer['dropEffect'],
    effectAllowed: 'move' as DataTransfer['effectAllowed'],
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [] as readonly string[],
    clearData: jest.fn(),
  };
};

// Mock the context
const mockCircuitContext = {
  setProteinData: jest.fn(),
  setNodes: jest.fn(),
};

jest.mock('../hooks', () => ({
  useCircuitContext: () => mockCircuitContext,
}));

// Mock CreateProteinWindow component
const MockCreateProteinWindow = ({ open, onCreate, onClose }: { open: boolean; onCreate: (data: ProteinData) => void; onClose?: () => void }) => {
  const [proteinData, setProteinData] = React.useState<ProteinData>({
    label: '',
    initialConcentration: 1,
    lossRate: 1,
    beta: 1,
    inputs: 1,
    outputs: 1,
    inputFunctionType: 'steady-state',
    inputFunctionData: {
      steadyStateValue: 0,
      timeStart: 0,
      timeEnd: 1,
      pulsePeriod: 1,
      amplitude: 1,
      dutyCycle: 0.5,
    }
  });

  const handleCreate = () => {
    if (proteinData.label.trim()) {
      onCreate(proteinData);
      setProteinData(prev => ({ ...prev, label: '' }));
      if (onClose) {
        onClose();
      }
    }
  };

  if (!open) return null;

  return (
    <div data-testid="create-protein-dialog">
      <input
        data-testid="protein-name-input"
        placeholder="e.g., GFP, LacI"
        value={proteinData.label}
        onChange={(e) => setProteinData(prev => ({ ...prev, label: e.target.value }))}
      />
      <button data-testid="create-protein-button" onClick={handleCreate}>
        Create Protein
      </button>
    </div>
  );
};

// Mock Toolbox component
const MockToolbox = () => {
  const [showCreateProteinWindow, setShowCreateProteinWindow] = React.useState(false);
  const [proteins, setProteins] = React.useState<ProteinData[]>([]);

  const handleCreateProtein = (data: ProteinData) => {
    if (!proteins.find(p => p.label === data.label)) {
      const newProtein = { ...data, id: `protein-${proteins.length}` };
      setProteins(prev => [...prev, newProtein]);
      mockCircuitContext.setProteinData(data.label, data);
    }
  };

  const onDragStart = (e: React.DragEvent, protein: ProteinData) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData("application/reactflow", "custom");
      e.dataTransfer.setData("application/node-data", JSON.stringify(protein));
    }
  };

  return (
    <div data-testid="toolbox">
      <button 
        data-testid="create-protein-button-open"
        onClick={() => setShowCreateProteinWindow(true)}
      >
        Create Protein
      </button>
      
      <div data-testid="protein-list">
        {proteins.map((protein) => (
          <div
            key={protein.id as string}
            data-testid={`protein-item-${protein.label}`}
            draggable
            onDragStart={(e) => onDragStart(e, protein)}
          >
            {protein.label}
          </div>
        ))}
      </div>

      <MockCreateProteinWindow 
        open={showCreateProteinWindow} 
        onCreate={handleCreateProtein}
        onClose={() => setShowCreateProteinWindow(false)}
      />
    </div>
  );
};

// Main test component
const TestApp = () => {
  const [nodes, setNodes] = React.useState<any[]>([]);
  const [edges, setEdges] = React.useState<any[]>([]);

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    
    if (event.dataTransfer) {
      const nodeType = event.dataTransfer.getData("application/reactflow");
      if (nodeType === "custom") {
        const rawData = JSON.parse(event.dataTransfer.getData("application/node-data")) as ProteinData;
        const newNode = {
          id: `node-${nodes.length}`,
          type: nodeType,
          position: { x: 100, y: 100 },
          data: rawData,
        };
        setNodes((prev: any[]) => [...prev, newNode]);
        mockCircuitContext.setNodes((prev: any[]) => [...prev, newNode]);
      }
    }
  };

  const onConnect = React.useCallback((params: any) => {
    setEdges(prevEdges => {
      const filteredEdges = prevEdges.filter((edge: any) => !(edge.source === params.source && edge.target === params.target));
      const selfConnection = params.source === params.target;
      const newEdge = {
        ...params,
        id: `edge-${params.source}-${params.target}`,
        type: `${selfConnection ? 'selfConnecting' : 'default'}`,
        markerEnd: "promote"
      };
      
      return [...filteredEdges, newEdge];
    });
  }, []);

  const updateEdgeMarker = React.useCallback((edgeId: string, markerEnd: string) => {
    setEdges(prevEdges => 
      prevEdges.map(edge => 
        edge.id === edgeId ? { ...edge, markerEnd } : edge
      )
    );
  }, []);

  const deleteEdge = React.useCallback((edgeId: string) => {
    setEdges(prevEdges => prevEdges.filter(edge => edge.id !== edgeId));
  }, []);

  React.useEffect(() => {
    (window as any).testOnConnect = onConnect;
    (window as any).testUpdateEdgeMarker = updateEdgeMarker;
    (window as any).testDeleteEdge = deleteEdge;
  }, [onConnect, updateEdgeMarker, deleteEdge]);

  return (
    <div>
      <MockToolbox />
      <div 
        data-testid="circuit-canvas"
        onDrop={onDrop}
      >
        <div data-testid="node-count">Nodes: {nodes.length}</div>
        <div data-testid="edge-count">Edges: {edges.length}</div>
        {nodes.map((node) => (
          <div key={node.id} data-testid={`node-${node.id}`}>
            {node.data.label}
          </div>
        ))}
        {edges.map((edge) => (
          <div key={edge.id} data-testid={`edge-${edge.id}`}>
            {edge.source} → {edge.target} ({edge.markerEnd}) {edge.type === 'selfConnecting' ? '[selfConnecting]' : ''} {edge.sourceHandle && edge.targetHandle ? `[${edge.sourceHandle} → ${edge.targetHandle}]` : ''}
          </div>
        ))}
      </div>
    </div>
  );
};

describe('Protein Creation and Drag Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (window as any).testOnConnect;
    delete (window as any).testUpdateEdgeMarker;
    delete (window as any).testDeleteEdge;
  });

  test('should create a protein and drag it onto canvas', async () => {
    render(<TestApp />);
    
    // Open create protein window
    fireEvent.click(screen.getByTestId('create-protein-button-open'));
    
    // Fill in protein name and create
    fireEvent.change(screen.getByTestId('protein-name-input'), { target: { value: 'ProteinA' } });
    fireEvent.click(screen.getByTestId('create-protein-button'));
    
    // Verify protein appears in toolbox
    await waitFor(() => {
      expect(screen.getByTestId('protein-item-ProteinA')).toBeInTheDocument();
    });
    
    // Drag protein to canvas
    const canvas = screen.getByTestId('circuit-canvas');
    const mockDataTransfer = createMockDataTransfer();
    mockDataTransfer.setData("application/reactflow", "custom");
    mockDataTransfer.setData("application/node-data", JSON.stringify({ label: 'ProteinA', inputs: 1, outputs: 1 }));
    
    fireEvent.drop(canvas, { dataTransfer: mockDataTransfer });
    
    // Verify node was created on canvas
    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 1');
      expect(screen.getByTestId('node-node-0')).toHaveTextContent('ProteinA');
    });
  });

  test('should create multiple proteins and drag them onto canvas', async () => {
    render(<TestApp />);
    const canvas = screen.getByTestId('circuit-canvas');
    
    // Create ProteinA
    fireEvent.click(screen.getByTestId('create-protein-button-open'));
    fireEvent.change(screen.getByTestId('protein-name-input'), { target: { value: 'ProteinA' } });
    fireEvent.click(screen.getByTestId('create-protein-button'));
    
    await waitFor(() => {
      expect(screen.getByTestId('protein-item-ProteinA')).toBeInTheDocument();
    });
    
    // Create ProteinB
    fireEvent.click(screen.getByTestId('create-protein-button-open'));
    fireEvent.change(screen.getByTestId('protein-name-input'), { target: { value: 'ProteinB' } });
    fireEvent.click(screen.getByTestId('create-protein-button'));
    
    await waitFor(() => {
      expect(screen.getByTestId('protein-item-ProteinB')).toBeInTheDocument();
    });
    
    // Drag ProteinA
    const mockDataTransferA = createMockDataTransfer();
    mockDataTransferA.setData("application/reactflow", "custom");
    mockDataTransferA.setData("application/node-data", JSON.stringify({ label: 'ProteinA', inputs: 1, outputs: 1 }));
    fireEvent.drop(canvas, { dataTransfer: mockDataTransferA });
    
    // Drag ProteinB
    const mockDataTransferB = createMockDataTransfer();
    mockDataTransferB.setData("application/reactflow", "custom");
    mockDataTransferB.setData("application/node-data", JSON.stringify({ label: 'ProteinB', inputs: 1, outputs: 1 }));
    fireEvent.drop(canvas, { dataTransfer: mockDataTransferB });
    
    // Verify both nodes on canvas
    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 2');
      expect(screen.getByTestId('node-node-0')).toHaveTextContent('ProteinA');
      expect(screen.getByTestId('node-node-1')).toHaveTextContent('ProteinB');
    });
  });

  test('should create 100 proteins and drag them onto canvas', async () => {
    render(<TestApp />);
    const canvas = screen.getByTestId('circuit-canvas');
    
    // Create 100 proteins
    for (let i = 1; i <= 100; i++) {
      fireEvent.click(screen.getByTestId('create-protein-button-open'));
      fireEvent.change(screen.getByTestId('protein-name-input'), { target: { value: `Protein${i}` } });
      fireEvent.click(screen.getByTestId('create-protein-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId(`protein-item-Protein${i}`)).toBeInTheDocument();
      });
    }
    
    // Drag all 100 proteins to canvas
    for (let i = 1; i <= 100; i++) {
      const mockDataTransfer = createMockDataTransfer();
      mockDataTransfer.setData("application/reactflow", "custom");
      mockDataTransfer.setData("application/node-data", JSON.stringify({ label: `Protein${i}`, inputs: 1, outputs: 1 }));
      
      fireEvent.drop(canvas, { dataTransfer: mockDataTransfer });
    }
    
    // Verify all 100 nodes are on canvas
    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 100');
    });
    
    // Verify all nodes exist
    for (let i = 0; i < 100; i++) {
      expect(screen.getByTestId(`node-node-${i}`)).toBeInTheDocument();
    }
  });

  test('should create edge connections between protein nodes', async () => {
    render(<TestApp />);
    
    // Create two proteins
    fireEvent.click(screen.getByTestId('create-protein-button-open'));
    fireEvent.change(screen.getByTestId('protein-name-input'), { target: { value: 'ProteinA' } });
    fireEvent.click(screen.getByTestId('create-protein-button'));
    
    fireEvent.click(screen.getByTestId('create-protein-button-open'));
    fireEvent.change(screen.getByTestId('protein-name-input'), { target: { value: 'ProteinB' } });
    fireEvent.click(screen.getByTestId('create-protein-button'));
    
    // Drag both proteins to canvas
    const canvas = screen.getByTestId('circuit-canvas');
    const mockDataTransferA = createMockDataTransfer();
    mockDataTransferA.setData("application/reactflow", "custom");
    mockDataTransferA.setData("application/node-data", JSON.stringify({ label: 'ProteinA', inputs: 1, outputs: 1 }));
    fireEvent.drop(canvas, { dataTransfer: mockDataTransferA });
    
    const mockDataTransferB = createMockDataTransfer();
    mockDataTransferB.setData("application/reactflow", "custom");
    mockDataTransferB.setData("application/node-data", JSON.stringify({ label: 'ProteinB', inputs: 1, outputs: 1 }));
    fireEvent.drop(canvas, { dataTransfer: mockDataTransferB });
    
    // Verify both nodes are on canvas
    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 2');
      expect(screen.getByTestId('node-node-0')).toHaveTextContent('ProteinA');
      expect(screen.getByTestId('node-node-1')).toHaveTextContent('ProteinB');
    });
    
    // Simulate connecting ProteinA to ProteinB
    const connectionParams = {
      source: 'node-0',
      target: 'node-1',
      sourceHandle: 'output-0',
      targetHandle: 'input-0'
    };
    
    // Call the actual onConnect function wrapped in act
    const testOnConnect = (window as any).testOnConnect;
    await act(async () => {
      testOnConnect(connectionParams);
    });
    
    // Verify edge was created
    await waitFor(() => {
      expect(screen.getByTestId('edge-count')).toHaveTextContent('Edges: 1');
      expect(screen.getByTestId('edge-edge-node-0-node-1')).toHaveTextContent('node-0 → node-1 (promote)');
    });
  });

  test('should create multiple edge connections and track edge count', async () => {
    render(<TestApp />);
    
    // Create three proteins
    const proteins = ['ProteinA', 'ProteinB', 'ProteinC'];
    for (const proteinName of proteins) {
      fireEvent.click(screen.getByTestId('create-protein-button-open'));
      fireEvent.change(screen.getByTestId('protein-name-input'), { target: { value: proteinName } });
      fireEvent.click(screen.getByTestId('create-protein-button'));
    }
    
    // Drag all proteins to canvas
    const canvas = screen.getByTestId('circuit-canvas');
    for (let i = 0; i < proteins.length; i++) {
      const mockDataTransfer = createMockDataTransfer();
      mockDataTransfer.setData("application/reactflow", "custom");
      mockDataTransfer.setData("application/node-data", JSON.stringify({ 
        label: proteins[i], 
        inputs: 1, 
        outputs: 1 
      }));
      fireEvent.drop(canvas, { dataTransfer: mockDataTransfer });
    }
    
    // Verify all nodes are on canvas
    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 3');
    });
    
    // Create multiple connections: A->B, B->C, A->C
    const connections = [
      { source: 'node-0', target: 'node-1', sourceHandle: 'output-0', targetHandle: 'input-0' },
      { source: 'node-1', target: 'node-2', sourceHandle: 'output-0', targetHandle: 'input-0' },
      { source: 'node-0', target: 'node-2', sourceHandle: 'output-0', targetHandle: 'input-0' }
    ];
    
    const testOnConnect = (window as any).testOnConnect;
    await act(async () => {
      for (const connection of connections) {
        testOnConnect(connection);
      }
    });
    
    // Verify all edges were created
    await waitFor(() => {
      expect(screen.getByTestId('edge-count')).toHaveTextContent('Edges: 3');
      expect(screen.getByTestId('edge-edge-node-0-node-1')).toBeInTheDocument();
      expect(screen.getByTestId('edge-edge-node-1-node-2')).toBeInTheDocument();
      expect(screen.getByTestId('edge-edge-node-0-node-2')).toBeInTheDocument();
    });
  });

  test('should create self-connecting edge (same node source and target)', async () => {
    render(<TestApp />);
    
    // Create one protein
    fireEvent.click(screen.getByTestId('create-protein-button-open'));
    fireEvent.change(screen.getByTestId('protein-name-input'), { target: { value: 'ProteinA' } });
    fireEvent.click(screen.getByTestId('create-protein-button'));
    
    // Drag protein to canvas
    const canvas = screen.getByTestId('circuit-canvas');
    const mockDataTransfer = createMockDataTransfer();
    mockDataTransfer.setData("application/reactflow", "custom");
    mockDataTransfer.setData("application/node-data", JSON.stringify({ 
      label: 'ProteinA', 
      inputs: 1, 
      outputs: 1 
    }));
    fireEvent.drop(canvas, { dataTransfer: mockDataTransfer });
    
    // Verify node is on canvas
    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 1');
    });
    
    // Create self-connecting edge
    const selfConnection = {
      source: 'node-0',
      target: 'node-0',
      sourceHandle: 'output-0',
      targetHandle: 'input-0'
    };
    
    const testOnConnect = (window as any).testOnConnect;
    await act(async () => {
      testOnConnect(selfConnection);
    });
    
    // Verify self-connecting edge was created
    await waitFor(() => {
      expect(screen.getByTestId('edge-count')).toHaveTextContent('Edges: 1');
      expect(screen.getByTestId('edge-edge-node-0-node-0')).toHaveTextContent('node-0 → node-0 (promote) [selfConnecting]');
    });
  });

  test('should modify edge properties (promote/repress)', async () => {
    render(<TestApp />);
    
    // Create two proteins
    fireEvent.click(screen.getByTestId('create-protein-button-open'));
    fireEvent.change(screen.getByTestId('protein-name-input'), { target: { value: 'ProteinA' } });
    fireEvent.click(screen.getByTestId('create-protein-button'));
    
    fireEvent.click(screen.getByTestId('create-protein-button-open'));
    fireEvent.change(screen.getByTestId('protein-name-input'), { target: { value: 'ProteinB' } });
    fireEvent.click(screen.getByTestId('create-protein-button'));
    
    // Drag both proteins to canvas
    const canvas = screen.getByTestId('circuit-canvas');
    const mockDataTransferA = createMockDataTransfer();
    mockDataTransferA.setData("application/reactflow", "custom");
    mockDataTransferA.setData("application/node-data", JSON.stringify({ label: 'ProteinA', inputs: 1, outputs: 1 }));
    fireEvent.drop(canvas, { dataTransfer: mockDataTransferA });
    
    const mockDataTransferB = createMockDataTransfer();
    mockDataTransferB.setData("application/reactflow", "custom");
    mockDataTransferB.setData("application/node-data", JSON.stringify({ label: 'ProteinB', inputs: 1, outputs: 1 }));
    fireEvent.drop(canvas, { dataTransfer: mockDataTransferB });
    
    // Verify both nodes are on canvas
    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 2');
    });
    
    // Create edge with promote marker
    const connectionParams = {
      source: 'node-0',
      target: 'node-1',
      sourceHandle: 'output-0',
      targetHandle: 'input-0'
    };
    
    const testOnConnect = (window as any).testOnConnect;
    await act(async () => {
      testOnConnect(connectionParams);
    });
    
    // Verify edge was created with promote marker
    await waitFor(() => {
      expect(screen.getByTestId('edge-count')).toHaveTextContent('Edges: 1');
      expect(screen.getByTestId('edge-edge-node-0-node-1')).toHaveTextContent('node-0 → node-1 (promote)');
    });
    
    // Simulate changing edge type to repress
    const testUpdateEdgeMarker = (window as any).testUpdateEdgeMarker;
    await act(async () => {
      testUpdateEdgeMarker('edge-node-0-node-1', 'repress');
    });
    
    // Verify edge property was modified
    await waitFor(() => {
      expect(screen.getByTestId('edge-edge-node-0-node-1')).toHaveTextContent('node-0 → node-1 (repress)');
    });
  });

  test('should delete edge connections', async () => {
    render(<TestApp />);
    
    // Create two proteins
    fireEvent.click(screen.getByTestId('create-protein-button-open'));
    fireEvent.change(screen.getByTestId('protein-name-input'), { target: { value: 'ProteinA' } });
    fireEvent.click(screen.getByTestId('create-protein-button'));
    
    fireEvent.click(screen.getByTestId('create-protein-button-open'));
    fireEvent.change(screen.getByTestId('protein-name-input'), { target: { value: 'ProteinB' } });
    fireEvent.click(screen.getByTestId('create-protein-button'));
    
    // Drag both proteins to canvas
    const canvas = screen.getByTestId('circuit-canvas');
    const mockDataTransferA = createMockDataTransfer();
    mockDataTransferA.setData("application/reactflow", "custom");
    mockDataTransferA.setData("application/node-data", JSON.stringify({ label: 'ProteinA', inputs: 1, outputs: 1 }));
    fireEvent.drop(canvas, { dataTransfer: mockDataTransferA });
    
    const mockDataTransferB = createMockDataTransfer();
    mockDataTransferB.setData("application/reactflow", "custom");
    mockDataTransferB.setData("application/node-data", JSON.stringify({ label: 'ProteinB', inputs: 1, outputs: 1 }));
    fireEvent.drop(canvas, { dataTransfer: mockDataTransferB });
    
    // Verify both nodes are on canvas
    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 2');
    });
    
    // Create edge
    const connectionParams = {
      source: 'node-0',
      target: 'node-1',
      sourceHandle: 'output-0',
      targetHandle: 'input-0'
    };
    
    const testOnConnect = (window as any).testOnConnect;
    await act(async () => {
      testOnConnect(connectionParams);
    });
    
    // Verify edge was created
    await waitFor(() => {
      expect(screen.getByTestId('edge-count')).toHaveTextContent('Edges: 1');
      expect(screen.getByTestId('edge-edge-node-0-node-1')).toBeInTheDocument();
    });
    
    // Simulate edge deletion
    const testDeleteEdge = (window as any).testDeleteEdge;
    await act(async () => {
      testDeleteEdge('edge-node-0-node-1');
    });
    
    // Verify edge was deleted
    await waitFor(() => {
      expect(screen.getByTestId('edge-count')).toHaveTextContent('Edges: 0');
      expect(screen.queryByTestId('edge-edge-node-0-node-1')).not.toBeInTheDocument();
    });
  });

  test('should handle edge connections with different protein configurations', async () => {
    render(<TestApp />);
    
    // Create proteins with different input/output configurations
    const proteinConfigs = [
      { name: 'ProteinA', inputs: 2, outputs: 1 },
      { name: 'ProteinB', inputs: 1, outputs: 3 },
      { name: 'ProteinC', inputs: 1, outputs: 1 }
    ];
    
    for (const config of proteinConfigs) {
      fireEvent.click(screen.getByTestId('create-protein-button-open'));
      fireEvent.change(screen.getByTestId('protein-name-input'), { target: { value: config.name } });
      fireEvent.click(screen.getByTestId('create-protein-button'));
    }
    
    // Drag all proteins to canvas
    const canvas = screen.getByTestId('circuit-canvas');
    for (let i = 0; i < proteinConfigs.length; i++) {
      const mockDataTransfer = createMockDataTransfer();
      mockDataTransfer.setData("application/reactflow", "custom");
      mockDataTransfer.setData("application/node-data", JSON.stringify({ 
        label: proteinConfigs[i].name, 
        inputs: proteinConfigs[i].inputs, 
        outputs: proteinConfigs[i].outputs 
      }));
      fireEvent.drop(canvas, { dataTransfer: mockDataTransfer });
    }
    
    // Verify all nodes are on canvas
    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 3');
    });
    
    // Create connections with different handle configurations
    const connections = [
      { source: 'node-0', target: 'node-1', sourceHandle: 'output-0', targetHandle: 'input-0' },
      { source: 'node-1', target: 'node-2', sourceHandle: 'output-1', targetHandle: 'input-0' },
      { source: 'node-0', target: 'node-2', sourceHandle: 'output-0', targetHandle: 'input-0' }
    ];
    
    const testOnConnect = (window as any).testOnConnect;
    await act(async () => {
      for (const connection of connections) {
        testOnConnect(connection);
      }
    });
    
    // Verify all edges were created successfully
    await waitFor(() => {
      expect(screen.getByTestId('edge-count')).toHaveTextContent('Edges: 3');
      expect(screen.getByTestId('edge-edge-node-0-node-1')).toHaveTextContent('node-0 → node-1 (promote) [output-0 → input-0]');
      expect(screen.getByTestId('edge-edge-node-1-node-2')).toHaveTextContent('node-1 → node-2 (promote) [output-1 → input-0]');
      expect(screen.getByTestId('edge-edge-node-0-node-2')).toHaveTextContent('node-0 → node-2 (promote) [output-0 → input-0]');
    });
  });
});