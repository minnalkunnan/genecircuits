  import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    ReactNode
  } from 'react';
  import { FetchOutputDisplay } from '../types/FetchOutputReturnType';
  import WindowSettingsType from '../types/WindowSettingsType';
  
  // ---------- Internal Hook ----------
  function useWindowStateInternal() {
    const [showOutputWindow, setShowOutputWindow] = useState<boolean>(false);
    const [outputWindowSettings, setOutputWindowSettings] = useState<WindowSettingsType>({
      x: 0,
      y: 0,
      width: 300,
      height: 200
    });
  
    const [showHillCoeffMatrix, setShowHillCoeffMatrix] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'toolbox' | 'properties' | 'circuits'>('toolbox');
    const [outputData, setOutputData] = useState<FetchOutputDisplay | null>(null);
  
    const [circuitSettings, setCircuitSettings] = useState({
      projectName: "Untitled Project",
      simulationDuration: 20,
      numTimePoints: 10
    });
  
    const toggleOutputWindow = useCallback(() => {
      setShowOutputWindow(prev => !prev);
    }, []);
  
    const toggleHillCoeffMatrix = useCallback(() => {
      setShowHillCoeffMatrix(prev => !prev);
    }, []);
  
    const resetWindowPositions = useCallback(() => {
      setOutputWindowSettings({
        x: 0,
        y: 0,
        width: 300,
        height: 200
      });
    }, []);
  
    return {
      // Output window
      showOutputWindow,
      setShowOutputWindow,
      toggleOutputWindow,
      outputWindowSettings,
      setOutputWindowSettings,
  
      // Hill coefficient matrix
      showHillCoeffMatrix,
      setShowHillCoeffMatrix,
      toggleHillCoeffMatrix,
  
      // Tab state
      activeTab,
      setActiveTab,
  
      // Output data
      outputData,
      setOutputData,
  
      // Circuit settings
      circuitSettings,
      setCircuitSettings,
  
      // Utility functions
      resetWindowPositions
    };
  }
  
  export type WindowState = ReturnType<typeof useWindowStateInternal>;
  
  // ---------- Context + Provider ----------
  const WindowStateContext = createContext<WindowState | null>(null);
  
  export const WindowStateProvider = ({ children }: { children: ReactNode }) => {
    const state = useWindowStateInternal();
    return (
      <WindowStateContext.Provider value={state}>
        {children}
      </WindowStateContext.Provider>
    );
  };

  export const useWindowStateContext = (): WindowState => {
    const context = useContext(WindowStateContext);
    if (!context) {
      throw new Error('useWindowStateContext must be used within a WindowStateProvider');
    }
    return context;
  };
