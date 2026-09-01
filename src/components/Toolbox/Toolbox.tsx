import React, { useMemo, useState } from 'react';
import { useCircuitContext, useSelectionStateContext, useWindowStateContext, useHillCoefficientContext } from '../../hooks';
import { AppNode, ProteinData } from "../../types";
import '../../index.css';
import CreateProteinWindow from '../CreateProteinWindow';
import {
    Box,
    Text,
    Flex,
    Button,
    TextField,
    ScrollArea,
    Grid,
    IconButton,
    DropdownMenu,
    Tooltip
} from '@radix-ui/themes'
import {
    Plus,
    Ampersands,
    Tally2,
    Search,
    Ellipsis
} from 'lucide-react'
import {useAlert} from "../Alerts/AlertProvider";

export const Toolbox: React.FC = () => {
    const { proteins, setProteinData, setNodes, getId } = useCircuitContext();
    const { setEditingProtein } = useSelectionStateContext();
    const { setActiveTab } = useWindowStateContext();
    const { setHillCoefficients, hillCoefficients } = useHillCoefficientContext();

    const [searchTerm, setSearchTerm] = useState(''); // Stores user input from the protein search bar
    const [showCreateProteinWindow, setShowCreateProteinWindow] = useState(false);
    const { showAlert } = useAlert();

    // Called when the create protein button is clicked
    const handleCreateProtein = (data: ProteinData) => {
        if (proteins[data.label]) {
            showAlert("That protein already exists!");
            return;
        }
        console.log(data)
        setProteinData(data.label, data); // adds new protein to the list
    };

    // Called when user starts dragging a node, triggers onDrop in CircuitBuilderFlow when done
    const onDragStart = (e: React.DragEvent, type: string, data?: ProteinData) => {
        e.dataTransfer.setData("application/reactflow", type);
        if (type === "custom" && data) {
            e.dataTransfer.setData("application/node-data", JSON.stringify(data));
            e.dataTransfer.setData("application/node-in", String(data.inputs));
            e.dataTransfer.setData("application/node-out", String(data.outputs));
        }
        e.dataTransfer.effectAllowed = "move";
    };

    const addNodeToCanvas = (type: 'and' | 'or' | 'custom', data?: ProteinData) => {
        const nodeData = data ? ({ ...data } as ProteinData & { id?: string }) : null;
        if (nodeData) delete nodeData.id;

        setNodes((currentNodes: AppNode[]) => {
            const index = currentNodes.length;
            const newNode: AppNode = {
                id: getId(type),
                type,
                position: {
                    x: 60 + (index % 3) * 90,
                    y: 60 + Math.floor(index / 3) * 90,
                },
                data: nodeData,
            };
            return [...currentNodes, newNode];
        });

        if (nodeData?.label) setProteinData(nodeData.label, nodeData);
    };

    const addOnKeyboard = (event: React.KeyboardEvent, type: 'and' | 'or') => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            addNodeToCanvas(type);
        }
    };
    

    // Filters the protein list when user searches
    const filteredProteins = useMemo(() => {
        return Object.entries(proteins)
            .filter(([label]) => label.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(([label, data]) => ({ id: label, label, ...data }));
    }, [proteins, searchTerm]);

    // Handler to delete a protein and its associated node(s)
    const handleDeleteProtein = (label: string) => {
        // Remove protein from proteins object
        setProteinData(label, undefined);
        // Remove nodes with this protein label
        setNodes((prevNodes) => prevNodes.filter(node => !(node.data && typeof node.data === 'object' && 'label' in node.data && node.data.label === label)));
        // Remove all hill coefficients involving this protein
        setHillCoefficients((prev) => prev.filter(h => !h.id.startsWith(label + '-') && !h.id.endsWith('-' + label)));
    };

    return (
        <Flex direction="column">
            {/* LOGIC GATES */}
            <Text size="4" weight="bold">Logic Gates</Text>
            <Flex direction="column" gap="2" my="4">
                <Box
                    className='dndnode'
                    draggable
                    role="button"
                    tabIndex={0}
                    aria-label="Add AND node to canvas"
                    title="Tap to add or drag onto the canvas"
                    onClick={() => addNodeToCanvas('and')}
                    onKeyDown={(event) => addOnKeyboard(event, 'and')}
                    onDragStart={(e: React.DragEvent) => onDragStart(e, 'and')}
                >
                    <Flex align="center" gap="4">
                        <Ampersands size={20} className='gate-icon'/> <Text weight="medium" size="3">AND Node</Text>
                    </Flex>
                </Box>
                <Box
                    className='dndnode'
                    draggable
                    role="button"
                    tabIndex={0}
                    aria-label="Add OR node to canvas"
                    title="Tap to add or drag onto the canvas"
                    onClick={() => addNodeToCanvas('or')}
                    onKeyDown={(event) => addOnKeyboard(event, 'or')}
                    onDragStart={(e: React.DragEvent) => onDragStart(e, 'or')}
                >
                    <Flex align="center" gap="4">
                        <Tally2 size={20} className='gate-icon'/> <Text weight="medium" size="3">OR Node</Text>
                    </Flex>
                </Box>
                <Text size="1" color="gray">Tap to add a node, or drag it onto the canvas.</Text>
            </Flex>

            {/* PROTIEN NODES */}
            <Flex direction="row" justify="between" mt="5">
                <Text size="4" weight="bold">Proteins</Text>
                {/* Create new node button */}
                <Button variant='ghost'
                    onClick={() => setShowCreateProteinWindow(true)}
                >
                    <Plus /> <Text size="4" weight="bold">New</Text>
                </Button>
            </Flex>

            <Flex direction="column" gap="2" mt="4">
                <TextField.Root size="3" variant="surface" placeholder="Search proteins..."
                    onChange={(e) => setSearchTerm(e.target.value)}
                >
                    <TextField.Slot>
                        <Search size={20} />
                    </TextField.Slot>
                </TextField.Root>

                <ScrollArea
                    type="auto"
                    scrollbars="vertical"
                    style={{
                        maxHeight: 'calc(100vh - 450px)',
                        border: '1px solid var(--gray-a6)',
                        borderRadius: 'var(--radius-3)',
                        padding: '0.5rem',
                        width: 'auto'
                    }}
                >
                {filteredProteins.length === 0 ? (
                    <Box p="3" style={{ color: 'var(--gray-a9)', textAlign: 'center', fontSize: '13px' }}>
                        No proteins found. Try creating one.
                    </Box>
                ) : (
                    <Grid
                        columns={{ initial: "2", sm: "2" }}
                        gap="3"
                    >
                    {filteredProteins.map((protein) => (
                        <Box
                            key={protein.id}
                            draggable
                            onDragStart={(e: React.DragEvent) => {onDragStart(e, "custom", protein)}}
                            style={{
                                cursor: 'grab',
                                border: '1px solid var(--gray-a6)',
                                borderRadius: 'var(--radius-3)',
                                padding: '0.5rem',
                                backgroundColor: 'var(--color-surface)',
                                transition: 'background-color 0.2s ease',
                            }}
                            className="protein-grid-item"
                        >
                            <Flex direction="row" justify="between" align="center">
                                <Flex direction="column">
                                    <Text weight="medium" size="2">{protein.label}</Text>
                                    {/* <Text size="1" color="gray">{protein.label}</Text> */}
                                </Flex>

                                <Flex align="center" gap="1">
                                    <Tooltip content={`Add ${protein.label} to canvas`}>
                                        <IconButton
                                            variant="ghost"
                                            color="jade"
                                            aria-label={`Add ${protein.label} to canvas`}
                                            onClick={() => addNodeToCanvas('custom', protein)}
                                        >
                                            <Plus size={18} />
                                        </IconButton>
                                    </Tooltip>
                                    {/* Protein Card Options. Ellipsis button */}
                                    <DropdownMenu.Root>
                                        <DropdownMenu.Trigger>
                                            <IconButton
                                                variant='ghost'
                                                color='gray'
                                                aria-label={`Options for ${protein.label}`}
                                            >
                                                <Ellipsis size={20} />
                                            </IconButton>
                                        </DropdownMenu.Trigger>
                                        <DropdownMenu.Content>
                                            <DropdownMenu.Item onClick={() => {
                                                setEditingProtein && setEditingProtein(protein)
                                                setActiveTab('properties')
                                            }}>Edit</DropdownMenu.Item>
                                            <DropdownMenu.Item color="red" onClick={() => handleDeleteProtein(protein.label)}>Delete</DropdownMenu.Item>
                                        </DropdownMenu.Content>
                                    </DropdownMenu.Root>
                                </Flex>
                                
                            </Flex>
                        </Box>
                    ))}
                    </Grid>
                )}
                </ScrollArea>

            </Flex>

            <CreateProteinWindow open={showCreateProteinWindow} onOpenChange={setShowCreateProteinWindow} onCreate={handleCreateProtein}/>
        </Flex>
    );
};

export default Toolbox;
