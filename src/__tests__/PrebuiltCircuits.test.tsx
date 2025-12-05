import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CircuitTemplate, ProteinData, HillCoefficientData } from '../types';
import { Node, Edge } from '@xyflow/react';
import { prebuiltCircuitTemplates } from '../components/Circuits/prebuiltCircuitTemplates';

// Mock the PrebuiltCircuits component
const MockPrebuiltCircuits = ({ applyCircuitTemplate }: { applyCircuitTemplate: (template: CircuitTemplate) => void }) => {
  return (
    <div data-testid="prebuilt-circuits">
      <h2>Prebuilt Circuit Templates</h2>
      <div data-testid="circuit-templates-list">
        {prebuiltCircuitTemplates.map((template: CircuitTemplate) => (
          <div key={template.id} data-testid={`template-${template.id}`}>
            <div data-testid={`template-name-${template.id}`}>{template.name}</div>
            <div data-testid={`template-description-${template.id}`}>{template.description}</div>
            <div data-testid={`template-nodes-count-${template.id}`}>
              {template.nodes.length} nodes
            </div>
            <button
              data-testid={`apply-template-${template.id}`}
              onClick={() => applyCircuitTemplate(template)}
            >
              Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main test component
const TestApp = () => {
  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [edges, setEdges] = React.useState<Edge[]>([]);
  const [proteins, setProteins] = React.useState<{ [label: string]: ProteinData }>({});
  const [hillCoefficients, setHillCoefficients] = React.useState<HillCoefficientData[]>([]);
  const nodeIdRef = React.useRef<number>(0);
  const gateIdRef = React.useRef<number>(0);

  const applyCircuitTemplate = React.useCallback((template: CircuitTemplate) => {
    // Track original ID to new ID mapping
    const idMap: { [originalId: string]: string } = {};

    // Create new nodes with updated IDs and positions
    const newNodes: Node[] = template.nodes.map((node: Node) => {
      // Generate new ID based on node type
      const newId: string = node.type === 'custom' ?
        `${nodeIdRef.current++}` :
        `g${gateIdRef.current++}`;

      idMap[node.id] = newId;

      // Calculate position offset to center the template in the visible viewport
      const xOffset = 100;
      const yOffset = 100;

      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + xOffset,
          y: node.position.y + yOffset
        }
      };
    });

    // Create new edges with updated source/target IDs
    const newEdges: Edge[] = template.edges.map((edge: Edge) => {
      const newSource: string = idMap[edge.source];
      const newTarget: string = idMap[edge.target];

      return {
        ...edge,
        id: `edge-${newSource}-${newTarget}`,
        source: newSource,
        target: newTarget
      };
    });

    // Add the new proteins
    const mergedProteins: { [label: string]: ProteinData } = { ...proteins };

    // Handle potential protein label conflicts
    Object.entries(template.proteins).forEach(([label, proteinData]) => {
      mergedProteins[label] = proteinData;
    });

    // Update state
    setNodes((prevNodes: Node[]) => [...prevNodes, ...newNodes]);
    setEdges((prevEdges: Edge[]) => [...prevEdges, ...newEdges]);
    setProteins(() => mergedProteins);
    setHillCoefficients((prevCoeffs: HillCoefficientData[]) => [...prevCoeffs, ...template.hillCoefficients]);
  }, [proteins]);

  React.useEffect(() => {
    (window as any).testApplyCircuitTemplate = applyCircuitTemplate;
    (window as any).testNodes = nodes;
    (window as any).testEdges = edges;
    (window as any).testProteins = proteins;
    (window as any).testHillCoefficients = hillCoefficients;
  }, [applyCircuitTemplate, nodes, edges, proteins, hillCoefficients]);

  return (
    <div>
      <MockPrebuiltCircuits applyCircuitTemplate={applyCircuitTemplate} />
      <div data-testid="circuit-canvas">
        <div data-testid="node-count">Nodes: {nodes.length}</div>
        <div data-testid="edge-count">Edges: {edges.length}</div>
        <div data-testid="protein-count">Proteins: {Object.keys(proteins).length}</div>
        <div data-testid="hill-coefficient-count">Hill Coefficients: {hillCoefficients.length}</div>
        {nodes.map((node) => (
          <div key={node.id} data-testid={`node-${node.id}`}>
            {node.type === 'custom' ? (node.data as any)?.label : node.type}
          </div>
        ))}
        {edges.map((edge) => (
          <div key={edge.id} data-testid={`edge-${edge.id}`}>
            {edge.source} → {edge.target} ({String(edge.markerEnd || 'default')})
          </div>
        ))}
        {Object.keys(proteins).map((label) => (
          <div key={label} data-testid={`protein-${label}`}>
            {label}
          </div>
        ))}
        {hillCoefficients.map((coeff) => (
          <div key={coeff.id} data-testid={`hill-coeff-${coeff.id}`}>
            {coeff.id}: {coeff.value}
          </div>
        ))}
      </div>
    </div>
  );
};

describe('Prebuilt Circuit Templates Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (window as any).testApplyCircuitTemplate;
    delete (window as any).testNodes;
    delete (window as any).testEdges;
    delete (window as any).testProteins;
    delete (window as any).testHillCoefficients;
  });

  test('should render all prebuilt circuit templates', () => {
    render(<TestApp />);

    // Verify all templates are rendered
    expect(screen.getByTestId('template-toggle-switch')).toBeInTheDocument();
    expect(screen.getByTestId('template-oscillator')).toBeInTheDocument();
    expect(screen.getByTestId('template-feedforward-loop')).toBeInTheDocument();
    expect(screen.getByTestId('template-incoherent-feedforward-loop')).toBeInTheDocument();
  });

  test('should display correct template information', () => {
    render(<TestApp />);

    // Check Toggle Switch template
    expect(screen.getByTestId('template-name-toggle-switch')).toHaveTextContent('Toggle Switch');
    expect(screen.getByTestId('template-description-toggle-switch')).toHaveTextContent('A genetic toggle switch with mutual repression');
    expect(screen.getByTestId('template-nodes-count-toggle-switch')).toHaveTextContent('2 nodes');

    // Check Repressilator template
    expect(screen.getByTestId('template-name-oscillator')).toHaveTextContent('Repressilator');
    expect(screen.getByTestId('template-description-oscillator')).toHaveTextContent('A three-gene oscillating circuit');
    expect(screen.getByTestId('template-nodes-count-oscillator')).toHaveTextContent('3 nodes');

    // Check Feed-Forward Loop template
    expect(screen.getByTestId('template-name-feedforward-loop')).toHaveTextContent('Feed-Forward Loop');
    expect(screen.getByTestId('template-description-feedforward-loop')).toHaveTextContent('A coherent feed-forward loop circuit');
    expect(screen.getByTestId('template-nodes-count-feedforward-loop')).toHaveTextContent('4 nodes');
  });

  test('should apply Toggle Switch template to canvas', async () => {
    render(<TestApp />);

    // Click the Add button for Toggle Switch
    fireEvent.click(screen.getByTestId('apply-template-toggle-switch'));

    // Verify nodes were added
    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 2');
    });

    // Verify edges were added
    await waitFor(() => {
      expect(screen.getByTestId('edge-count')).toHaveTextContent('Edges: 2');
    });

    // Verify proteins were added
    await waitFor(() => {
      expect(screen.getByTestId('protein-count')).toHaveTextContent('Proteins: 2');
      expect(screen.getByTestId('protein-ProteinA')).toBeInTheDocument();
      expect(screen.getByTestId('protein-ProteinB')).toBeInTheDocument();
    });

    // Verify hill coefficients were added
    await waitFor(() => {
      expect(screen.getByTestId('hill-coefficient-count')).toHaveTextContent('Hill Coefficients: 4');
    });
  });

  test('should apply Repressilator template to canvas', async () => {
    render(<TestApp />);

    // Click the Add button for Repressilator
    fireEvent.click(screen.getByTestId('apply-template-oscillator'));

    // Verify nodes were added
    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 3');
    });

    // Verify edges were added (circular connections)
    await waitFor(() => {
      expect(screen.getByTestId('edge-count')).toHaveTextContent('Edges: 3');
    });

    // Verify proteins were added
    await waitFor(() => {
      expect(screen.getByTestId('protein-count')).toHaveTextContent('Proteins: 3');
      expect(screen.getByTestId('protein-Gene1')).toBeInTheDocument();
      expect(screen.getByTestId('protein-Gene2')).toBeInTheDocument();
      expect(screen.getByTestId('protein-Gene3')).toBeInTheDocument();
    });

    // Verify hill coefficients were added
    await waitFor(() => {
      expect(screen.getByTestId('hill-coefficient-count')).toHaveTextContent('Hill Coefficients: 9');
    });
  });

  test('should apply Feed-Forward Loop template to canvas', async () => {
    render(<TestApp />);

    // Click the Add button for Feed-Forward Loop
    fireEvent.click(screen.getByTestId('apply-template-feedforward-loop'));

    // Verify nodes were added (includes AND gate)
    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 4');
    });

    // Verify edges were added
    await waitFor(() => {
      expect(screen.getByTestId('edge-count')).toHaveTextContent('Edges: 4');
    });

    // Verify proteins were added
    await waitFor(() => {
      expect(screen.getByTestId('protein-count')).toHaveTextContent('Proteins: 3');
      expect(screen.getByTestId('protein-Input')).toBeInTheDocument();
      expect(screen.getByTestId('protein-Intermediate')).toBeInTheDocument();
      expect(screen.getByTestId('protein-Output')).toBeInTheDocument();
    });

    // Verify hill coefficients were added
    await waitFor(() => {
      expect(screen.getByTestId('hill-coefficient-count')).toHaveTextContent('Hill Coefficients: 9');
    });
  });

  test('should apply Incoherent Feed-Forward Loop template to canvas', async () => {
    render(<TestApp />);

    // Click the Add button for Incoherent Feed-Forward Loop
    fireEvent.click(screen.getByTestId('apply-template-incoherent-feedforward-loop'));

    // Verify nodes were added
    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 4');
    });

    // Verify edges were added
    await waitFor(() => {
      expect(screen.getByTestId('edge-count')).toHaveTextContent('Edges: 4');
    });

    // Verify proteins were added
    await waitFor(() => {
      expect(screen.getByTestId('protein-count')).toHaveTextContent('Proteins: 3');
    });
  });

  test('should apply multiple templates sequentially', async () => {
    render(<TestApp />);

    // Apply Toggle Switch
    fireEvent.click(screen.getByTestId('apply-template-toggle-switch'));

    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 2');
    });

    // Apply Repressilator
    fireEvent.click(screen.getByTestId('apply-template-oscillator'));

    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 5');
      expect(screen.getByTestId('edge-count')).toHaveTextContent('Edges: 5');
    });

    // Apply Feed-Forward Loop
    fireEvent.click(screen.getByTestId('apply-template-feedforward-loop'));

    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 9');
      expect(screen.getByTestId('edge-count')).toHaveTextContent('Edges: 9');
    });
  });

  test('should correctly map node IDs when applying templates', async () => {
    render(<TestApp />);

    // Apply Toggle Switch
    fireEvent.click(screen.getByTestId('apply-template-toggle-switch'));

    await waitFor(() => {
      // Verify nodes have correct IDs (should start from 0)
      expect(screen.getByTestId('node-0')).toBeInTheDocument();
      expect(screen.getByTestId('node-1')).toBeInTheDocument();
    });

    // Apply Repressilator (should continue from 2)
    fireEvent.click(screen.getByTestId('apply-template-oscillator'));

    await waitFor(() => {
      expect(screen.getByTestId('node-2')).toBeInTheDocument();
      expect(screen.getByTestId('node-3')).toBeInTheDocument();
      expect(screen.getByTestId('node-4')).toBeInTheDocument();
    });
  });

  test('should correctly map edge IDs when applying templates', async () => {
    render(<TestApp />);

    // Apply Toggle Switch
    fireEvent.click(screen.getByTestId('apply-template-toggle-switch'));

    await waitFor(() => {
      // Verify edges have correct IDs based on new node IDs
      expect(screen.getByTestId('edge-edge-1-0')).toBeInTheDocument();
      expect(screen.getByTestId('edge-edge-0-1')).toBeInTheDocument();
    });
  });

  test('should handle gate nodes (AND gates) correctly', async () => {
    render(<TestApp />);

    // Apply Feed-Forward Loop which contains an AND gate
    fireEvent.click(screen.getByTestId('apply-template-feedforward-loop'));

    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 4');
      // Verify AND gate node exists (should have type 'and')
      const nodes = (window as any).testNodes;
      const andGateNode = nodes.find((node: Node) => node.type === 'and');
      expect(andGateNode).toBeDefined();
      expect(andGateNode.id).toMatch(/^g\d+$/); // Should start with 'g' followed by number
    });
  });

  test('should merge proteins when applying multiple templates', async () => {
    render(<TestApp />);

    // Apply Toggle Switch (has ProteinA, ProteinB)
    fireEvent.click(screen.getByTestId('apply-template-toggle-switch'));

    await waitFor(() => {
      expect(screen.getByTestId('protein-ProteinA')).toBeInTheDocument();
      expect(screen.getByTestId('protein-ProteinB')).toBeInTheDocument();
    });

    // Apply Repressilator (has Gene1, Gene2, Gene3)
    fireEvent.click(screen.getByTestId('apply-template-oscillator'));

    await waitFor(() => {
      expect(screen.getByTestId('protein-count')).toHaveTextContent('Proteins: 5');
      expect(screen.getByTestId('protein-ProteinA')).toBeInTheDocument();
      expect(screen.getByTestId('protein-ProteinB')).toBeInTheDocument();
      expect(screen.getByTestId('protein-Gene1')).toBeInTheDocument();
      expect(screen.getByTestId('protein-Gene2')).toBeInTheDocument();
      expect(screen.getByTestId('protein-Gene3')).toBeInTheDocument();
    });
  });

  test('should accumulate hill coefficients when applying multiple templates', async () => {
    render(<TestApp />);

    // Apply Toggle Switch (4 hill coefficients)
    fireEvent.click(screen.getByTestId('apply-template-toggle-switch'));

    await waitFor(() => {
      expect(screen.getByTestId('hill-coefficient-count')).toHaveTextContent('Hill Coefficients: 4');
    });

    // Apply Repressilator (9 hill coefficients)
    fireEvent.click(screen.getByTestId('apply-template-oscillator'));

    await waitFor(() => {
      expect(screen.getByTestId('hill-coefficient-count')).toHaveTextContent('Hill Coefficients: 13');
    });
  });

  test('should apply node position offsets correctly', async () => {
    render(<TestApp />);

    // Apply Toggle Switch
    fireEvent.click(screen.getByTestId('apply-template-toggle-switch'));

    await waitFor(() => {
      const nodes = (window as any).testNodes;
      // Original positions from template: x: 225, y: 75 and x: 225.5, y: 169
      // With offset: x: 325, y: 175 and x: 325.5, y: 269
      const node0 = nodes.find((n: Node) => n.id === '0');
      const node1 = nodes.find((n: Node) => n.id === '1');
      
      expect(node0.position.x).toBe(325); // 225 + 100
      expect(node0.position.y).toBe(175); // 75 + 100
      expect(node1.position.x).toBe(325.5); // 225.5 + 100
      expect(node1.position.y).toBe(269); // 169 + 100
    });
  });

  test('should handle edge marker types correctly', async () => {
    render(<TestApp />);

    // Apply Toggle Switch (has repress markers)
    fireEvent.click(screen.getByTestId('apply-template-toggle-switch'));

    await waitFor(() => {
      const edges = (window as any).testEdges;
      // Toggle Switch has repress markers
      const repressEdges = edges.filter((e: Edge) => e.markerEnd === 'repress');
      expect(repressEdges.length).toBe(2);
    });

    // Apply Feed-Forward Loop (has promote markers)
    fireEvent.click(screen.getByTestId('apply-template-feedforward-loop'));

    await waitFor(() => {
      const edges = (window as any).testEdges;
      const promoteEdges = edges.filter((e: Edge) => e.markerEnd === 'promote');
      // Feed-Forward Loop has 4 promote edges
      expect(promoteEdges.length).toBeGreaterThanOrEqual(4);
    });
  });

  test('should handle Incoherent Feed-Forward Loop with mixed markers', async () => {
    render(<TestApp />);

    // Apply Incoherent Feed-Forward Loop (has both promote and repress)
    fireEvent.click(screen.getByTestId('apply-template-incoherent-feedforward-loop'));

    await waitFor(() => {
      const edges = (window as any).testEdges;
      const promoteEdges = edges.filter((e: Edge) => e.markerEnd === 'promote');
      const repressEdges = edges.filter((e: Edge) => e.markerEnd === 'repress');
      
      // Should have both promote and repress edges
      expect(promoteEdges.length).toBeGreaterThan(0);
      expect(repressEdges.length).toBeGreaterThan(0);
    });
  });

  test('should apply all four templates and verify complete state', async () => {
    render(<TestApp />);

    // Apply all templates
    fireEvent.click(screen.getByTestId('apply-template-toggle-switch'));
    fireEvent.click(screen.getByTestId('apply-template-oscillator'));
    fireEvent.click(screen.getByTestId('apply-template-feedforward-loop'));
    fireEvent.click(screen.getByTestId('apply-template-incoherent-feedforward-loop'));

    await waitFor(() => {
      // Total nodes: 2 + 3 + 4 + 4 = 13
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 13');
      
      // Total edges: 2 + 3 + 4 + 4 = 13
      expect(screen.getByTestId('edge-count')).toHaveTextContent('Edges: 13');
      
      // Proteins: ProteinA, ProteinB, Gene1, Gene2, Gene3, Input, Intermediate, Output (from last two)
      // Note: Input, Intermediate, Output appear twice but should be merged
      expect(screen.getByTestId('protein-count')).toHaveTextContent('Proteins: 8');
    });
  });

  test('should verify template button is clickable for all templates', () => {
    render(<TestApp />);

    const templateIds = ['toggle-switch', 'oscillator', 'feedforward-loop', 'incoherent-feedforward-loop'];

    templateIds.forEach(templateId => {
      const button = screen.getByTestId(`apply-template-${templateId}`);
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });
  });

  test('should handle applying same template multiple times', async () => {
    render(<TestApp />);

    // Apply Toggle Switch twice
    fireEvent.click(screen.getByTestId('apply-template-toggle-switch'));

    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 2');
    });

    fireEvent.click(screen.getByTestId('apply-template-toggle-switch'));

    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('Nodes: 4');
      expect(screen.getByTestId('edge-count')).toHaveTextContent('Edges: 4');
    });
  });
});

