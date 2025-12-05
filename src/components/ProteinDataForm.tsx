import React, { Dispatch, SetStateAction, useEffect } from "react";
import { ProteinData, EdgeData } from "../types";
import {
    Flex,
    TextField,
    Text,
    SegmentedControl, 
    Slider,
    Callout,
} from "@radix-ui/themes"
import { CircleAlert } from "lucide-react";
import { useAlert } from "./Alerts/AlertProvider";

interface ProteinDataProps {
    mode: 'edit' | 'create'
    proteinData: ProteinData | null,
    setProteinData: Dispatch<SetStateAction<ProteinData>>;
    edges?: EdgeData[];
    onValidityChange?: (isValid: boolean) => void;
    onNegativeFieldsChange?: (negativeFields: string[]) => void;
}

const ProteinDataForm: React.FC<ProteinDataProps> = ({
    mode,
    proteinData,
    setProteinData,
    edges = [],
    onValidityChange,
    onNegativeFieldsChange,
}: ProteinDataProps) => {
    const { showAlert } = useAlert();

    // Check if circuit uses inhibitors (has edges with markerEnd: "repress")
    const circuitUsesInhibitors = edges.some(edge => {
        const markerEnd = (edge as any)?.markerEnd;
        return markerEnd === 'repress';
    });
    
    // Check if current initial concentration is less than 1
    const initialConcentration = typeof proteinData?.initialConcentration === 'number' 
        ? proteinData.initialConcentration 
        : undefined;
    const showInhibitorWarning = circuitUsesInhibitors && 
        initialConcentration !== undefined && 
        initialConcentration < 1;

    if (!proteinData) return null;

    const proteinDataProps: { key: keyof ProteinData; label: string; min: number; max: number; step: number }[] = [
        { key: 'initialConcentration', label: 'Initial Concentration', min: 0, max: 100, step: 1 },
        { key: 'lossRate', label: 'Loss Rate', min: 0, max: 5, step: 0.1 },
        { key: 'beta', label: 'Beta', min: 0, max: 10, step: 0.1 },
    ];

    const pulseFunctionDataProps: { key: keyof ProteinData['inputFunctionData']; label: string; min: number; max: number; step: number }[] = [
        { key: 'timeStart', label: 'Pulse Start Time', min: 0, max: 1000, step: 1 },
        { key: 'timeEnd', label: 'Pulse End Time', min: 0, max: 1000, step: 1 },
        { key: 'pulsePeriod', label: 'Pulse Period/Duration (tau)', min: 0, max: 10, step: 0.1 },
        { key: 'amplitude', label: 'Pulse Height', min: 0, max: 100, step: 1 },
        { key: 'dutyCycle', label: 'Duty Cycle', min: 0, max: 1, step: 0.01 },
    ];

    // Validate numeric fields for negative values
    const negativeFields: string[] = [];
    const checkNumber = (value: any, label: string) => {
        if (typeof value === 'number' && !isNaN(value) && value < 0) {
            negativeFields.push(label);
        }
    };

    // top-level counts
    checkNumber(proteinData.inputs, 'Inputs');
    checkNumber(proteinData.outputs, 'Outputs');

    // main numeric props
    proteinDataProps.forEach(({ key, label }) => checkNumber(proteinData[key], label));

    // input function specific values
    if (proteinData.inputFunctionType === 'steady-state') {
        checkNumber(proteinData.inputFunctionData?.steadyStateValue, 'Steady State Value');
    } else if (proteinData.inputFunctionType === 'pulse') {
        pulseFunctionDataProps.forEach(({ key, label }) => checkNumber(proteinData.inputFunctionData?.[key], label));
    }

    // Inform parent about validity (optional) and send negative fields list
    useEffect(() => {
        if (onNegativeFieldsChange) {
            onNegativeFieldsChange(negativeFields);
        }

        if (onValidityChange) {
            // additional required-field checks
            const requiredMissing: string[] = [];

            // label required
            if (!proteinData?.label || String(proteinData.label).trim() === "") {
                requiredMissing.push('label');
            }

            // numeric required fields
            ['initialConcentration', 'lossRate', 'beta', 'inputs', 'outputs'].forEach((field) => {
                const v = (proteinData as any)?.[field];
                if (v === undefined || v === null || Number.isNaN(Number(v))) {
                    requiredMissing.push(field);
                }
            });

            // input function type required
            if (!proteinData?.inputFunctionType || String(proteinData.inputFunctionType).trim() === '') {
                requiredMissing.push('inputFunctionType');
            } else if (proteinData.inputFunctionType === 'steady-state') {
                const v = proteinData.inputFunctionData?.steadyStateValue;
                if (v === undefined || v === null || Number.isNaN(Number(v))) requiredMissing.push('steadyStateValue');
            } else if (proteinData.inputFunctionType === 'pulse') {
                pulseFunctionDataProps.forEach(({ key }) => {
                    const v = proteinData.inputFunctionData?.[key];
                    if (v === undefined || v === null || Number.isNaN(Number(v))) {
                        requiredMissing.push(String(key));
                    }
                });
            }

            const isValid = negativeFields.length === 0 && requiredMissing.length === 0;
            onValidityChange(isValid);
        }
    }, [negativeFields, onValidityChange, onNegativeFieldsChange, proteinData]);

    const isFieldNegative = (label: string) => negativeFields.includes(label);

    // Display the input function type fields based on user selected type
    const renderInputFunctionTypeFields = () => {
        if (proteinData.inputFunctionType === "steady-state") {
            const numericValue = proteinData.inputFunctionData?.steadyStateValue ?? "";
    
            return (
                <Flex direction="column" gap="2" key={'steadyStateValue'}>
                    <Flex direction="row" justify="between" align="center">
                        <Text as="div" weight="bold">Steady State Value</Text>
                        <TextField.Root
                            type="number"
                            style={{ maxWidth: '100px', border: isFieldNegative('Steady State Value') ? '1px solid red' : undefined }}
                            value={numericValue}
                            onChange={(e) => {
                                const val = e.target.value;
                                setProteinData({
                                    ...proteinData,
                                    inputFunctionData: {
                                        ...proteinData.inputFunctionData,
                                        steadyStateValue: val === "" ? undefined : parseFloat(val)
                                    }
                                });
                            }}
                        />
                    </Flex>
                    <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[typeof numericValue === "number" ? numericValue : 0]}
                        onValueChange={(value) =>
                            setProteinData({
                                ...proteinData,
                                inputFunctionData: {
                                    ...proteinData.inputFunctionData,
                                    steadyStateValue: value[0]
                                }
                            })
                        }
                    />
                </Flex>
            );
        } else if (proteinData.inputFunctionType === "pulse") {
            return pulseFunctionDataProps.map(({ key, label, min, max, step }) => {
                const rawValue = proteinData.inputFunctionData?.[key];
                const numericValue = typeof rawValue === 'number' && !isNaN(rawValue) ? rawValue : "";
    
                return (
                    <Flex direction="column" gap="2" key={key}>
                        <Flex direction="row" justify="between" align="center">
                            <Text as="div" weight="bold">{label}</Text>
                            <TextField.Root
                                type="number"
                                style={{ maxWidth: '100px', border: isFieldNegative(label) ? '1px solid red' : undefined }}
                                value={numericValue}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setProteinData({
                                        ...proteinData,
                                        inputFunctionData: {
                                            ...proteinData.inputFunctionData,
                                            [key]: val === "" ? undefined : parseFloat(val)
                                        }
                                    });
                                }}
                            />
                        </Flex>
                        <Slider
                            min={min}
                            max={max}
                            step={step}
                            value={[typeof numericValue === "number" ? numericValue : 0]}
                            onValueChange={(value) =>
                                setProteinData({
                                    ...proteinData,
                                    inputFunctionData: {
                                        ...proteinData.inputFunctionData,
                                        [key]: value[0]
                                    }
                                })
                            }
                        />
                    </Flex>
                );
            });
        }
        return null;
    };
    


    return (
        <>
            {mode === "create" ?
                <>
                <Flex direction="column" gap="2">
                    <Text as="div" weight="bold">Protein Name</Text>
                    <TextField.Root
                        placeholder="e.g., GFP, LacI"
                        type="text"
                        value={proteinData.label ?? ""}
                        onChange={(e) =>
                            setProteinData({ ...proteinData, label: e.target.value })
                        }
                    />
                </Flex>
                </>
            :
                <Flex direction="column">
                    <Text weight="bold" size="4">Protein Properties</Text>
                    <Text as="div" weight="regular" color="gray">Editing: <Text weight="regular" color="gray" >{proteinData.label}</Text></Text>
                </Flex>
            }

             {/* Num inputs/outputs */}
            {/* Parent will render validation errors; this component only highlights invalid fields */}
             <Flex direction="row" gap="2">
                <Flex direction="column" gap="2">
                    <Text as="div" weight="bold">Inputs</Text>
                    <TextField.Root
                        type="number"
                        style={{ maxWidth: '100px', border: isFieldNegative('Inputs') ? '1px solid red' : undefined }}
                        value={
                            typeof proteinData.inputs === 'number' && !isNaN(proteinData.inputs)
                                ? proteinData.inputs
                                : ""
                        }
                        onChange={(e) => {
                            const val = e.target.value;
                            setProteinData({
                                ...proteinData,
                                inputs: val === "" ? undefined : parseInt(val)
                            });
                        }}
                    />
                </Flex>
                <Flex direction="column" gap="2">
                    <Text as="div" weight="bold">Outputs</Text>
                    <TextField.Root
                        type="number"
                        style={{ maxWidth: '100px', border: isFieldNegative('Outputs') ? '1px solid red' : undefined }}
                        value={
                            typeof proteinData.outputs === 'number' && !isNaN(proteinData.outputs)
                                ? proteinData.outputs
                                : ""
                        }
                        onChange={(e) => {
                            const val = e.target.value;
                            setProteinData({
                                ...proteinData,
                                outputs: val === "" ? undefined : parseInt(val)
                            });
                        }}
                    />
                </Flex>
            </Flex>

            {/* Dynamically generated sliders and fields */}
            {proteinDataProps.map(({ key, label, min, max, step }) => {
                const rawValue = proteinData[key];
                const numericValue = typeof rawValue === 'number' && !isNaN(rawValue) ? rawValue : "";
                const isInitialConcentration = key === 'initialConcentration';

                return (
                    <Flex direction="column" gap="2" key={key}>
                        <Flex direction="row" justify="between" align="center">
                            <Text as="div" weight="bold">{label}</Text>
                            <TextField.Root
                                type="number"
                                style={{ maxWidth: '100px', border: isFieldNegative(label) ? '1px solid red' : undefined }}
                                value={numericValue}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const numVal = val === "" ? undefined : parseFloat(val);
                                    
                                    // Show alert if setting initial concentration < 1 in circuit with inhibitors
                                    if (isInitialConcentration && circuitUsesInhibitors && 
                                        numVal !== undefined && numVal < 1) {
                                        showAlert("Warning: This circuit uses inhibitors. Initial concentrations less than 1 may cause unexpected outputs.");
                                    }
                                    
                                    setProteinData({
                                        ...proteinData,
                                        [key]: numVal
                                    });
                                }}
                            />
                        </Flex>
                        <Slider
                            min={min}
                            max={max}
                            step={step}
                            value={[typeof numericValue === "number" ? numericValue : 0]}
                            onValueChange={(value) => {
                                const newValue = value[0];
                                
                                // Show alert if setting initial concentration < 1 in circuit with inhibitors
                                if (isInitialConcentration && circuitUsesInhibitors && newValue < 1) {
                                    showAlert("Warning: This circuit uses inhibitors. Initial concentrations less than 1 may cause simulation issues.");
                                }
                                
                                setProteinData({
                                    ...proteinData,
                                    [key]: newValue
                                });
                            }}
                        />
                        {/* Show warning callout for initial concentration < 1 in circuits with inhibitors */}
                        {isInitialConcentration && showInhibitorWarning && (
                            <Callout.Root color="amber">
                                <Callout.Icon>
                                    <CircleAlert size={16} />
                                </Callout.Icon>
                                <Callout.Text>
                                    This circuit uses inhibitors. Initial concentrations less than 1 may cause unexpected outputs. Consider using a value of 1 or greater.
                                </Callout.Text>
                            </Callout.Root>
                        )}
                    </Flex>
                );
            })}

            {/* Input Function Type */}
            <Flex direction="column" gap="2">
                <Text as="div" weight="bold">Input Function Type</Text>
                <SegmentedControl.Root
                    value={proteinData.inputFunctionType}
                    onValueChange={(val) =>
                        setProteinData({
                            ...proteinData,
                            inputFunctionType: val as 'steady-state' | 'pulse'
                        })
                    }
                >
                    <SegmentedControl.Item value="steady-state">Steady State</SegmentedControl.Item>
                    <SegmentedControl.Item value="pulse">Pulse</SegmentedControl.Item>
                </SegmentedControl.Root>
            </Flex>

        {renderInputFunctionTypeFields()}
        </>
    )
}

export default ProteinDataForm;