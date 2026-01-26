import CircuitDataType from "../types/CircuitDataType";
import SimulationResponse, { SimulationErrorResponse } from "../types/SimulationResponse";
import { FetchOutputResult } from "../types/FetchOutputReturnType";
import { runSimulation } from "../api/backendClient.web";

let isCancelled = false;

function isErrorResponse(response: SimulationResponse): response is SimulationErrorResponse {
  return response.success === false;
}

// Function called when user clicks the 'Run Simulation' button. This function makes the API POST
// request to the backend then receives and parses the response to display.
export const fetchOutput = async (circuitJson: CircuitDataType): Promise<FetchOutputResult> => {
  try {
    isCancelled = false;

    // Run simulation via backend client (HTTP in web; IPC fallback in Electron during transition)
    console.log("calling runSimulation with circuitJson", circuitJson);
    const response: SimulationResponse = await runSimulation(circuitJson);

    if (isCancelled) {
      return { cancelled: true };
    }

    // Handle error responses
    if (isErrorResponse(response)) {
      console.error("Simulation error:", response.error);
      return {
        type: "error",
        error: response.error,
        details: response.traceback,
      };
    }

    // Handle success with image
    if (response.image) {
      const imageUrl = `data:image/png;base64,${response.image}`;
      return {
        type: "image",
        data: imageUrl,
        rawData: response.data, // Also return raw data for potentially using in client-side charts
      };
    }

    // Return the data directly if no image
    return {
      type: "data",
      data: response.data,
    };
  } catch (error: unknown) {
    if (isCancelled) {
      return { cancelled: true };
    }

    console.error("Error in fetchOutput:", error);
    return {
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const abortFetch = () => {
  isCancelled = true;
};
