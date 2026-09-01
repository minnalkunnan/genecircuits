import { createRoot } from 'react-dom/client';
import './index.css';
import CircuitBuilderFlow from "./CircuitBuilderFlow";
import { ReactFlowProvider } from "@xyflow/react";
import { ToolboxProvider } from "./context";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import { CircuitProvider, SelectionStateProvider, WindowStateProvider, HillCoefficientProvider, useCircuitContext } from './hooks';
import React from 'react';
import { AlertProvider } from "./components/Alerts/AlertProvider";

const rootElement = document.getElementById('root');

function ProvidersWrapper({ children }: { children: React.ReactNode }) {
    return (
        <CircuitProvider>
            <AlertProvider>
                <SelectionStateProvider>
                    <WindowStateProvider>
                        <HillCoefficientProviderWrapper>
                            {children}
                        </HillCoefficientProviderWrapper>
                    </WindowStateProvider>
                </SelectionStateProvider>
            </AlertProvider>
        </CircuitProvider>
    );
}

function HillCoefficientProviderWrapper({ children }: { children: React.ReactNode }) {
    const { usedProteins } = useCircuitContext();
    return <HillCoefficientProvider usedProteins={usedProteins}>{children}</HillCoefficientProvider>;
}

if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
        <ReactFlowProvider>
            <ToolboxProvider>
                <Theme className="app-shell" appearance='light' accentColor='jade' radius='large' scaling='95%'>
                    <ProvidersWrapper>
                        <CircuitBuilderFlow />
                    </ProvidersWrapper>
                </Theme>
            </ToolboxProvider>
        </ReactFlowProvider>
    );
} else {
    console.error("Root element not found!");
}
