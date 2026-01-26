import { createRoot } from 'react-dom/client';
import './index.css';
import CircuitBuilderFlow from "./CircuitBuilderFlow";
import { ReactFlowProvider } from "@xyflow/react";
import { ToolboxProvider } from "./context";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import { CircuitProvider, SelectionStateProvider, WindowStateProvider, HillCoefficientProvider, useCircuitContext } from './hooks';
import React, { useEffect, useState } from 'react';
import { AlertProvider } from "./components/Alerts/AlertProvider";
import LoadingScreen from './LoadingScreen';
import { getBackendReady } from "./api/backendClient.web";

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

function AppContent() {
    const [backendReady, setBackendReady] = useState<boolean | null>(null);

    useEffect(() => {
        let cancelled = false;
        let intervalId: number | undefined;

        async function start() {
            const ready = await getBackendReady();
            if (cancelled) return;

            if (ready) {
                setBackendReady(true);
                return;
            }

            // Poll until ready (web-safe). Electron still works because getBackendReady()
            // falls back to IPC getBackendStatus().
            intervalId = window.setInterval(async () => {
                const r = await getBackendReady();
                if (cancelled) return;
                if (r) {
                    setBackendReady(true);
                    if (intervalId !== undefined) window.clearInterval(intervalId);
                    intervalId = undefined;
                }
            }, 300);
        }

        void start();

        return () => {
            cancelled = true;
            if (intervalId !== undefined) window.clearInterval(intervalId);
        };
    }, []);

    if (backendReady === null) return <LoadingScreen />;
    if (!backendReady) return <div>Error starting backend server</div>;

    return <CircuitBuilderFlow />;
}

if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
        <ReactFlowProvider>
            <ToolboxProvider>
                <Theme appearance='light' accentColor='jade' radius='large' scaling='95%'>
                    <ProvidersWrapper>
                        {/* <CircuitBuilderFlow /> */}
                        {/* <ThemePanel /> */}
                        <AppContent />
                    </ProvidersWrapper>
                </Theme>
            </ToolboxProvider>
        </ReactFlowProvider>
    );
} else {
    console.error("Root element not found!");
}
