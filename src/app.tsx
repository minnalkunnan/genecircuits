import { createRoot } from 'react-dom/client';
import "@radix-ui/themes/styles.css";
import './index.css';
import CircuitBuilderFlow from "./CircuitBuilderFlow";
import { ReactFlowProvider } from "@xyflow/react";
import { ToolboxProvider, ThemeProvider, useAppearance } from "./context";
import { Theme } from "@radix-ui/themes";
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

function ThemedShell({ children }: { children: React.ReactNode }) {
    const { appearance } = useAppearance();
    return (
        <Theme className="app-shell" appearance={appearance} accentColor='jade' radius='large' scaling='95%'>
            {children}
        </Theme>
    );
}

if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
        <ReactFlowProvider>
            <ToolboxProvider>
                <ThemeProvider>
                    <ThemedShell>
                        <ProvidersWrapper>
                            <CircuitBuilderFlow />
                        </ProvidersWrapper>
                    </ThemedShell>
                </ThemeProvider>
            </ToolboxProvider>
        </ReactFlowProvider>
    );
} else {
    console.error("Root element not found!");
}
