import { CircuitTemplate } from "../../types";

export const feedForwardLoop: CircuitTemplate =
{
    id: 'feedforward-loop',
    name: 'Feed-Forward Loop',
    description: 'A coherent feed-forward loop circuit',
    nodes: [
        {
            id: "0",
            type: "custom",
            position: {
                x: 116.5,
                y: 217.5
            },
            data: {
                label: "Input",
                initialConcentration: 1,
                lossRate: 0.1,
                beta: 1,
                inputs: 0,
                outputs: 2,
                inputFunctionType: "pulse",
                inputFunctionData: {
                    steadyStateValue: 0,
                    timeStart: 1,
                    timeEnd: 3,
                    pulsePeriod: 10,
                    amplitude: 1,
                    dutyCycle: 0.5
                }
            },
            measured: {
                width: 49,
                height: 35
            },
            selected: true,
            dragging: false
        },
        {
            id: "1",
            type: "custom",
            position: {
                x: 214,
                y: 194
            },
            data: {
                label: "Intermediate",
                initialConcentration: 1,
                lossRate: 0.2,
                beta: 1,
                inputs: 1,
                outputs: 1,
                inputFunctionType: "steady-state",
                inputFunctionData: {
                    steadyStateValue: 0,
                    timeStart: 0,
                    timeEnd: 1,
                    pulsePeriod: 1,
                    amplitude: 1,
                    dutyCycle: 0.5
                }
            },
            measured: {
                width: 102,
                height: 35
            },
            selected: false,
            dragging: false
        },
        {
            id: "g2",
            type: "and",
            position: {
                x: 347,
                y: 202.5
            },
            data: null,
            measured: {
                width: 80,
                height: 72
            },
            selected: false,
            dragging: false
        },
        {
            id: "2",
            type: "custom",
            position: {
                x: 473,
                y: 217.5
            },
            data: {
                label: "Output",
                initialConcentration: 1,
                lossRate: 0.3,
                beta: 1,
                inputs: 1,
                outputs: 0,
                inputFunctionType: "steady-state",
                inputFunctionData: {
                    steadyStateValue: 0,
                    timeStart: 0,
                    timeEnd: 1,
                    pulsePeriod: 1,
                    amplitude: 1,
                    dutyCycle: 0.5
                }
            },
            measured: {
                width: 62,
                height: 35
            },
            selected: false,
            dragging: false
        }
    ],
    edges: [
        {
            source: "g2",
            sourceHandle: "output-1",
            target: "2",
            targetHandle: "input-0",
            id: "edge-g2-2",
            type: "default",
            markerEnd: "promote"
        },
        {
            source: "0",
            sourceHandle: "output-0",
            target: "1",
            targetHandle: "input-0",
            id: "edge-0-1",
            type: "default",
            markerEnd: "promote"
        },
        {
            source: "0",
            sourceHandle: "output-1",
            target: "g2",
            targetHandle: "input-1",
            id: "edge-0-g2",
            type: "default",
            markerEnd: "promote"
        },
        {
            source: "1",
            sourceHandle: "output-0",
            target: "g2",
            targetHandle: "input-2",
            id: "edge-1-g2",
            type: "default",
            markerEnd: "promote"
        }
    ],
    proteins: {
        Input: {
            label: "Input",
            initialConcentration: 1,
            lossRate: 0.1,
            beta: 1,
            inputs: 0,
            outputs: 2,
            inputFunctionType: "pulse",
            inputFunctionData: {
                steadyStateValue: 0,
                timeStart: 1,
                timeEnd: 3,
                pulsePeriod: 10,
                amplitude: 1,
                dutyCycle: 0.5
            }
        },
        Intermediate: {
            label: "Intermediate",
            initialConcentration: 1,
            lossRate: 0.2,
            beta: 1,
            inputs: 1,
            outputs: 1,
            inputFunctionType: "steady-state",
            inputFunctionData: {
                steadyStateValue: 0,
                timeStart: 0,
                timeEnd: 1,
                pulsePeriod: 1,
                amplitude: 1,
                dutyCycle: 0.5
            }
        },
        Output: {
            label: "Output",
            initialConcentration: 1,
            lossRate: 0.3,
            beta: 1,
            inputs: 1,
            outputs: 0,
            inputFunctionType: "steady-state",
            inputFunctionData: {
                steadyStateValue: 0,
                timeStart: 0,
                timeEnd: 1,
                pulsePeriod: 1,
                amplitude: 1,
                dutyCycle: 0.5
            }
        }
    },
    hillCoefficients: [
        {
            id: "Input-Input",
            value: 1
        },
        {
            id: "Input-Intermediate",
            value: 1
        },
        {
            id: "Intermediate-Input",
            value: 1
        },
        {
            id: "Intermediate-Intermediate",
            value: 1
        },
        {
            id: "Input-Output",
            value: 1
        },
        {
            id: "Intermediate-Output",
            value: 1
        },
        {
            id: "Output-Input",
            value: 1
        },
        {
            id: "Output-Intermediate",
            value: 1
        },
        {
            id: "Output-Output",
            value: 1
        }
    ]
};

export default feedForwardLoop;