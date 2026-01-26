import type { CircuitDataType } from '../types/CircuitDataType';
import type { SimulationResponse } from '../types/SimulationResponse';

declare global {
  interface Window {
    electron: {
      /**
       * Sends circuit data to the backend to run a simulation.
       * @param circuitData - The circuit input data.
       * @returns A promise resolving to the simulation response.
       */
      runSimulation: (circuitData: CircuitDataType) => Promise<SimulationResponse>;

      /**
       * Registers a callback to be called when the backend is ready.
       * @param callback - A function that receives a boolean indicating backend readiness.
       */
      onBackendReady: (callback: (ready: boolean) => void) => void;

      /**
       * Returns the current backend running status.
       * @returns A promise resolving to a boolean indicating whether the backend is running.
       */
      getBackendStatus: () => Promise<boolean>;
    };
  }
}

export {}; // Required to treat this as a module
