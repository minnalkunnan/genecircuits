import React, { useEffect, useState } from "react";
import {ProteinData, EdgeData, AppNodeData} from "../types";
import { ProteinDataForm } from '../components'
import {
    Flex,
    Text,
    Button,
    DataList,
    Code,
    IconButton,
    SegmentedControl
} from "@radix-ui/themes"
import {
    Trash2,
    Copy
} from "lucide-react"
import { useCircuitContext, useSelectionStateContext, useWindowStateContext } from '../hooks';

const LABEL_MAP: Record<'protein' | 'edge', Record<string, string>> = {
    protein: {
        id: "Node ID",
        label: "Protein Name",
        initialConcentration: "Initial Internal Concentration",
        lossRate: "Degradation Rate (gamma)",
        beta: "Max Production Rate (beta)",
        inputs: "Number of Inputs",
        outputs: "Number of Outputs",
        inputFunctionType: "External Pulse",
        "inputFunctionData.steadyStateValue": "Basal Concentration",
        "inputFunctionData.timeStart": "Pulse Start Time",
        "inputFunctionData.timeEnd": "Pulse End Time",
        "inputFunctionData.pulsePeriod": "Pulse Period",
        "inputFunctionData.amplitude": "Amplitude",
        "inputFunctionData.dutyCycle": "Duty Cycle",
    },
    edge: {
        id: "Edge ID",
        source: "Source Node ID",
        target: "Target Node ID",
    }
};
  

const PropertiesWindow: React.FC = () => {
    const {
        nodes, setNodes, edges, setEdges, getProteinData, setProteinData
    } = useCircuitContext();
    const {
        selectedNodeId,
        selectedNodeType,
        selectedEdgeId,
        editingProtein,
        setEditingProtein,
        resetSelectedStateData
    } = useSelectionStateContext();
    const { setActiveTab } = useWindowStateContext();
    const edgeData = edges.find(edge => edge.id === selectedEdgeId) ?? null;
    const proteinData = (() => {
        if (!selectedNodeId) return null;
        const node = nodes.find(n => n.id === selectedNodeId);
        if (!node || node.type !== 'custom') return null;
        const label = (node.data).label;
        if (typeof label !== 'string') return null;
        return getProteinData(label);
    })();
    const [localProteinData, setLocalProteinData] = useState<ProteinData | null>(null);
    const [isFormValid, setIsFormValid] = useState<boolean>(true);
    const [localEdgeData, setLocalEdgeData] = useState<EdgeData | null>(null);

    const hasIncomingRegulation = (label: string) => {
        const matchingNodeIds = new Set(
            nodes
                .filter(node => node.type === "custom" && node.data.label === label)
                .map(node => node.id)
        );
        return edges.some(edge => matchingNodeIds.has(edge.target));
    };
    
    // Reset proteinData when new node clicked
    useEffect(() => {
        if (proteinData) {
            setLocalProteinData(proteinData);
        } else { // no data at all, something going wrong, nothing to display => reset all values
            setLocalProteinData(null);
        }
    }, [proteinData]);

    // Reset edgeData when new edge clicked
    useEffect(() => setLocalEdgeData((edgeData ?? null) as EdgeData | null), [edgeData]);

    // Reset proteinData when new node clicked
    useEffect(() => {
        if (editingProtein) {
            setLocalProteinData(editingProtein);
        }
    }, [editingProtein]);
    
    // Called when user submits the updated protein data
    const handleUpdate = () => {
        if (!isFormValid) return; // prevent update when form invalid
        if (localProteinData) {
            setProteinData(localProteinData.label, localProteinData);

            // Update the nodes array so React Flow re-renders the node with new data
            setNodes((prevNodes) =>
                prevNodes.map((node) =>
                    node.type === "custom" && node.data.label === localProteinData.label
                        ? { ...node, data: { ...localProteinData } }
                        : node
                )
            );

        }
        if(editingProtein) { // if editing protein directly from toolbox, not properties window
            setEditingProtein(null);
            setActiveTab('toolbox')
        }
    };

    const handleCancelEdit = () => {
        if (editingProtein) {
            setEditingProtein(null);
            setActiveTab('toolbox');
            return;
        }
        setLocalProteinData(proteinData);
    };

    // Delete handler
    const handleDelete = () => {
        if (selectedNodeId) {
            setNodes((prev: AppNodeData[]) => prev.filter((node: AppNodeData) => node.id !== selectedNodeId));
            setEdges((prev: AppNodeData[]) => prev.filter((edge: AppNodeData) => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
        } else if (selectedEdgeId) {
            setEdges((prev: AppNodeData[]) => prev.filter((edge: AppNodeData) => edge.id !== selectedEdgeId));
        }
        resetSelectedStateData();
        setActiveTab('toolbox');
    };

    // Render box w/ styling that encloses properties data
    const commonBox = (title: string, children: React.ReactNode) => (
        <Flex direction="column" gap="4"> {/* Flex enclosing entire properties window content */}
            <Text size="4" weight="bold">{title}</Text>
            <Flex direction="column" // Flex enclosing properties data
                style={{ 
                    border: '1px solid var(--gray-a6)', 
                    borderRadius: 'var(--radius-3)', 
                    padding: '1rem', 
                    backgroundColor: 'var(--color-surface)' 
                }}
            >
                {children}
            </Flex>
        </Flex>
    );

    // Render properties data for nodes and edges
    const renderDataList = (data: EdgeData | ProteinData, type: 'protein' | 'edge') => (
        <DataList.Root>
            {/* ID */}
            <DataList.Item>
                <DataList.Label minWidth="88px">{type === 'protein' ? "Node ID" : "Edge ID"}</DataList.Label>
                <DataList.Value>
                    <Flex align="center" gap="2">
                        <Code variant="ghost">{type === 'protein' ? selectedNodeId : selectedEdgeId}</Code>
                        <IconButton
                            size="1"
                            aria-label="Copy value"
                            color="gray"
                            variant="ghost"
                        >
                            <Copy size={15} />
                        </IconButton>
                    </Flex>
                </DataList.Value>
            </DataList.Item>

            {/* ALL OTHER PROPERTIES */}
            {Object.entries(data).map(([key, value]) =>
                (key === "inputFunctionData" && typeof value === "object")
                ? Object.entries(value).map(([innerKey, innerValue]) => (
                    // generate inputFunctionData properties
                    <DataList.Item key={innerKey}>
                        <DataList.Label minWidth="88px">
                            {LABEL_MAP.protein[`inputFunctionData.${innerKey}`] ?? innerKey}
                        </DataList.Label>
                        <DataList.Value><Code variant="ghost">{String(innerValue)}</Code></DataList.Value>
                    </DataList.Item>
                ))
                : type === 'protein' || (key === 'source' || key === 'target') ? (
                    // generate protein and edge data
                    <DataList.Item key={key}>
                        <DataList.Label minWidth="88px">{LABEL_MAP[type][key] ?? key}</DataList.Label>
                        <DataList.Value><Code variant="ghost">{String(value)}</Code></DataList.Value>
                    </DataList.Item>
                ) 
                : null
            )}

            {/* EDGE TYPE SWITCH */}
            { type === 'edge' && (
                <DataList.Item>
                    <DataList.Label minWidth="88px">Edge Type</DataList.Label>
                    <DataList.Value>
                    <SegmentedControl.Root
                        value={localEdgeData?.markerEnd}
                        onValueChange={(val) => {
                            const markerEnd = val as "promote" | "repress";
                            setLocalEdgeData((current) => current ? { ...current, markerEnd } : current);
                            setEdges((prev: EdgeData[]) => prev.map((edge: EdgeData) => edge.id === selectedEdgeId ? { ...edge, markerEnd } : edge));
                        }}
                    >
                        <SegmentedControl.Item value="promote">Activates</SegmentedControl.Item>
                        <SegmentedControl.Item value="repress">Inhibits</SegmentedControl.Item>
                    </SegmentedControl.Root>
                    <Text size="1" color="gray">Arrowhead = activation; T-bar = inhibition.</Text>
                    </DataList.Value>
                </DataList.Item>
            )}
        </DataList.Root>
    );

    // Render delete button for edges and logic gates.
    const renderFunctionButtons = () => (
        <Flex direction="row" justify="between" align="center">
            <Button variant="outline" color="red" onClick={handleDelete}>
                <Trash2 size={20}/> <Text size="4" weight="bold">Delete</Text>
            </Button>
        </Flex>
    )

    const renderProteinEditor = () => (
        <Flex className="protein-properties-editor" direction="column" gap="4" pb="4">
            <ProteinDataForm
                mode="edit"
                proteinData={localProteinData}
                setProteinData={setLocalProteinData}
                hasIncomingRegulation={localProteinData ? hasIncomingRegulation(localProteinData.label) : false}
                onValidityChange={setIsFormValid}
            />
            <Flex className="protein-editor-actions" gap="3" justify="between" wrap="wrap">
                {selectedNodeId && (
                    <Button variant="outline" color="red" onClick={handleDelete}>
                        <Trash2 size={18}/> Delete
                    </Button>
                )}
                <Flex gap="3">
                    <Button variant="soft" color="gray" onClick={handleCancelEdit}>
                        {editingProtein ? "Cancel" : "Reset"}
                    </Button>
                    <Button onClick={handleUpdate} disabled={!isFormValid}>Save Changes</Button>
                </Flex>
            </Flex>
        </Flex>
    );

    // Toolbox edits and node edits both use the same slider editor.
    if (editingProtein) return renderProteinEditor();

    if (selectedNodeId && selectedNodeType === "custom" && proteinData) {
        return renderProteinEditor();
    }

    // Text displayed when no node or edge is selected
    if (!selectedNodeId && !selectedEdgeId) return (
        <Flex align="center" justify="center">
            <Text color="gray" size="2" align="center">Select a node, protein, or edge to view its properties.</Text>
        </Flex>
    ) 

    return (
        <Flex direction="column" gap="4">
            {/* NODE PROPERTIES */}
            {( selectedNodeId && selectedNodeType === "custom" && proteinData ) && ( // display selected node data
            <>
                {commonBox("Node Properties", (<>
                    <DataList.Root>
                        {renderDataList(proteinData, 'protein')}
                    </DataList.Root>
                </>))}

                {renderFunctionButtons()}
            </>
            )}

            {/* -------------------------------------------------------------------------------------------- */}
            {/* EDGE PROPERTIES */}
            {selectedEdgeId && edgeData && (
                <>
                    {commonBox("Edge Properties", (
                        <DataList.Root>
                            {renderDataList(edgeData, 'edge')}
                        </DataList.Root>
                    ))}
                    {renderFunctionButtons()}
                </>
            )}

            {/* -------------------------------------------------------------------------------------------- */}
            {/* LOGIC GATE PROPERTIES */}
            {selectedNodeId && (selectedNodeType === "and" || selectedNodeType === "or") && (
                <>
                    {commonBox("Logic Gate Properties", (
                        <DataList.Root>
                            <DataList.Item>
                                <DataList.Label minWidth="88px">Gate ID</DataList.Label>
                            <DataList.Value>
                                <Flex align="center" gap="2">
                                    <Code variant="ghost">{selectedNodeId}</Code>
                                    <IconButton size="1" aria-label="Copy value" color="gray" variant="ghost">
                                        <Copy size={15} />
                                    </IconButton>
                                </Flex>
                            </DataList.Value>
                        </DataList.Item>
                        <DataList.Item>
                            <DataList.Label minWidth="88px">Gate Type</DataList.Label>
                            <DataList.Value>
                                <Code variant="ghost">{(selectedNodeType === "and") ? "AND" : "OR"}</Code>
                            </DataList.Value>
                            </DataList.Item>
                        </DataList.Root>
                    ))}
                    {renderFunctionButtons()}
                </>
            )}

        </Flex>
    );
};
export default PropertiesWindow;
