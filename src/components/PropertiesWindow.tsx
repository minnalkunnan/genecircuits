import React, { useEffect, useState } from "react";
import {ProteinData, EdgeData, AppNodeData} from "../types";
import { ProteinDataForm } from '../components'
import {
    Flex,
    Text,
    Button,
    ScrollArea,
    DataList,
    Code,
    IconButton,
    SegmentedControl
} from "@radix-ui/themes"
import {
    Trash2,
    Pencil,
    Copy
} from "lucide-react"
import { useCircuitContext, useSelectionStateContext, useWindowStateContext } from '../hooks';

const LABEL_MAP: Record<'protein' | 'edge', Record<string, string>> = {
    protein: {
        id: "Node ID",
        label: "Protein Name",
        initialConcentration: "Initial Concentration",
        lossRate: "Loss Rate",
        beta: "Beta",
        inputs: "Number of Inputs",
        outputs: "Number of Outputs",
        "inputFunctionData.steadyStateValue": "Steady State Value",
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
    const [showProteinEditor, setShowProteinEditor] = useState(false);
    const [isFormValid, setIsFormValid] = useState<boolean>(true);
    const [localEdgeData, setLocalEdgeData] = useState<EdgeData | null>(null);
    
    // Reset proteinData when new node clicked
    useEffect(() => {
        if (proteinData) {
            setLocalProteinData(proteinData);
            setShowProteinEditor(false); // reset edit mode when new node selected. close the protein editor
        } else { // no data at all, something going wrong, nothing to display => reset all values
            setLocalProteinData(null);
            setShowProteinEditor(false);
        }
    }, [proteinData]);

    // Reset edgeData when new edge clicked
    useEffect(() => setLocalEdgeData((edgeData ?? null) as EdgeData | null), [edgeData]);

    // Reset proteinData when new node clicked
    useEffect(() => {
        if (editingProtein) {
            setLocalProteinData(editingProtein);
            setShowProteinEditor(true);          
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

            setShowProteinEditor(false); // exit edit mode after update
        }
        if(editingProtein) { // if editing protein directly from toolbox, not properties window
            setShowProteinEditor(false);
            setActiveTab('toolbox')
        }
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
                    <SegmentedControl.Root value={localEdgeData?.markerEnd} onValueChange={(val) => setEdges((prev: EdgeData[]) => prev.map((edge: EdgeData) => edge.id === selectedEdgeId ? { ...edge, markerEnd: val as "promote" | "repress" } : edge))}>
                        <SegmentedControl.Item value="promote">Promote</SegmentedControl.Item>
                        <SegmentedControl.Item value="repress">Repress</SegmentedControl.Item>
                    </SegmentedControl.Root>
                    </DataList.Value>
                </DataList.Item>
            )}
        </DataList.Root>
    );

    // Render delete and edit buttons
    const renderFunctionButtons = () => (
        <Flex direction="row" justify="between" align="center">
            <Button variant="outline" color="red" onClick={handleDelete}>
                <Trash2 size={20}/> <Text size="4" weight="bold">Delete</Text>
            </Button>
            {selectedNodeId && selectedNodeType === "custom" && proteinData && (
                <Button variant="outline" onClick={() => setShowProteinEditor((prev) => !prev)}>
                    <Pencil size={20} />
                    <Text size="4" weight="bold">{showProteinEditor ? "Cancel" : "Edit"}</Text>
                </Button>
            )}
        </Flex>
    )

    // Show protein editor if user clicks edit on a protein from the toolbox
    if (editingProtein) return (
        <ScrollArea
            type="auto"
            scrollbars="vertical"
            style={{
                maxHeight: 'calc(100vh - 200px)',
                border: '1px solid var(--gray-a6)',
                borderRadius: 'var(--radius-3)',
                padding: '1rem',
                width: 'auto'
            }}
        >
            <Flex direction="column" gap="4" pb="4">
                <ProteinDataForm
                    mode="edit"
                    proteinData={editingProtein}
                    setProteinData={setEditingProtein}
                    edges={edges}
                    onValidityChange={setIsFormValid}
                />
                <Button onClick={handleUpdate} disabled={!isFormValid}><Text>Update Protein</Text></Button>
            </Flex>
        </ScrollArea>
    )

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
        
                {/* PROTEIN DATA EDITOR */}
                { showProteinEditor && ( 
                    <ScrollArea type="auto" scrollbars="vertical"
                        style={{
                            maxHeight: 'calc(100vh - 200px)',
                            border: '1px solid var(--gray-a6)',
                            borderRadius: 'var(--radius-3)',
                            padding: '1rem',
                            width: 'auto'
                        }}
                    >
                        <Flex direction="column" gap="4" pb="4">
                            <ProteinDataForm
                                mode="edit"
                                proteinData={localProteinData}
                                setProteinData={setLocalProteinData}
                                edges={edges}
                                onValidityChange={setIsFormValid}
                            />
                            <Button onClick={handleUpdate} disabled={!isFormValid}><Text>Update Protein</Text></Button>
                        </Flex>
                    </ScrollArea>
                )}
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