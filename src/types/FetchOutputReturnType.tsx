import {SimulationData} from "./SimulationResponse";

export interface FetchOutputCancelled {
    cancelled: true;
}

export interface FetchOutputError {
    type: "error";
    error: string;
    details?: string;
}

export interface FetchOutputImage {
    type: "image";
    data: string; // Base64 string
    rawData: SimulationData;
}

export interface FetchOutputData {
    type: "data";
    data: SimulationData;
}

export type FetchOutputDisplay = FetchOutputImage | FetchOutputData;
export type FetchOutputResult = FetchOutputCancelled | FetchOutputError | FetchOutputImage | FetchOutputData;
