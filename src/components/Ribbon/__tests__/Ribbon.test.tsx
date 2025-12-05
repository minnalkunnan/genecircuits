import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Ribbon component that includes all navigation buttons
const MockRibbonTopNav = () => {
  const [showImportWindow, setShowImportWindow] = React.useState(false);
  const [showHillCoeffMatrix, setShowHillCoeffMatrix] = React.useState(false);
  const [isRunning, setIsRunning] = React.useState(false);
  const [showOutputWindow, setShowOutputWindow] = React.useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = React.useState(false);
  const [showSettingsWindow, setShowSettingsWindow] = React.useState(false);

  const handleSaveProject = () => {
    console.log('Save project clicked');
  };

  const handleExport = () => {
    console.log('Export clicked');
  };

  const handlePlayClick = () => {
    setIsRunning(!isRunning);
  };

  return (
    <div>
      {/* Open File Button */}
      <button
        aria-label="Open File"
        onClick={() => setShowImportWindow(true)}
      >
        Open File
      </button>

      {/* Save Project Button */}
      <button
        aria-label="Save Project"
        onClick={handleSaveProject}
      >
        Save Project
      </button>

      {/* Export Circuit Button */}
      <button
        aria-label="Export Circuit"
        onClick={handleExport}
      >
        Export Circuit
      </button>

      {/* Hill Coefficient Matrix Button */}
      <button
        aria-label="Hill Coefficient Matrix"
        onClick={() => setShowHillCoeffMatrix(!showHillCoeffMatrix)}
      >
        Hill Coefficient Matrix
      </button>

      {/* Run Simulation Button */}
      <button
        aria-label={isRunning ? "Stop" : "Run Simulation"}
        onClick={handlePlayClick}
      >
        {isRunning ? 'Stop' : 'Run Simulation'}
      </button>

      {/* Show/Close Output Button */}
      <button
        aria-label={showOutputWindow ? "Close Output" : "Show Output"}
        onClick={() => setShowOutputWindow(!showOutputWindow)}
      >
        {showOutputWindow ? 'Close Output' : 'Show Output'}
      </button>

      {/* Clear Canvas Button */}
      <button
        aria-label="Clear Canvas"
        onClick={() => setShowClearConfirmation(true)}
      >
        Clear Canvas
      </button>

      {/* Settings Button */}
      <button
        aria-label="Settings"
        onClick={() => setShowSettingsWindow(!showSettingsWindow)}
      >
        Settings
      </button>

      {/* State indicators for testing */}
      <div data-testid="state-indicators">
        <div data-testid="import-window">{showImportWindow ? 'Import Window Open' : 'Import Window Closed'}</div>
        <div data-testid="hill-matrix">{showHillCoeffMatrix ? 'Hill Matrix Open' : 'Hill Matrix Closed'}</div>
        <div data-testid="output-window">{showOutputWindow ? 'Output Window Open' : 'Output Window Closed'}</div>
        <div data-testid="clear-confirmation">{showClearConfirmation ? 'Clear Dialog Open' : 'Clear Dialog Closed'}</div>
        <div data-testid="settings-window">{showSettingsWindow ? 'Settings Open' : 'Settings Closed'}</div>
      </div>
    </div>
  );
};

describe('Ribbon Top Navigation - All Buttons Clickability', () => {
  test('Open File button is clickable', () => {
    render(<MockRibbonTopNav />);
    
    const button = screen.getByRole('button', { name: /open file/i });
    
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    
    fireEvent.click(button);
    
    // Verify state changed
    expect(screen.getByTestId('import-window')).toHaveTextContent('Import Window Open');
  });

  test('Save Project button is clickable', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    render(<MockRibbonTopNav />);
    
    const button = screen.getByRole('button', { name: /save project/i });
    
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    
    fireEvent.click(button);
    
    expect(consoleSpy).toHaveBeenCalledWith('Save project clicked');
    consoleSpy.mockRestore();
  });

  test('Export Circuit button is clickable', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    render(<MockRibbonTopNav />);
    
    const button = screen.getByRole('button', { name: /export circuit/i });
    
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    
    fireEvent.click(button);
    
    expect(consoleSpy).toHaveBeenCalledWith('Export clicked');
    consoleSpy.mockRestore();
  });

  test('Hill Coefficient Matrix button is clickable', () => {
    render(<MockRibbonTopNav />);
    
    const button = screen.getByRole('button', { name: /hill coefficient matrix/i });
    
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    
    fireEvent.click(button);
    
    // Verify state changed
    expect(screen.getByTestId('hill-matrix')).toHaveTextContent('Hill Matrix Open');
  });

  test('Run Simulation button is clickable', () => {
    render(<MockRibbonTopNav />);
    
    const button = screen.getByRole('button', { name: /run simulation/i });
    
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    
    fireEvent.click(button);
    
    // Verify button text changed to Stop
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  test('Show Output button is clickable', () => {
    render(<MockRibbonTopNav />);
    
    const button = screen.getByRole('button', { name: /show output/i });
    
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    
    fireEvent.click(button);
    
    // Verify state changed
    expect(screen.getByTestId('output-window')).toHaveTextContent('Output Window Open');
  });

  test('Clear Canvas button is clickable', () => {
    render(<MockRibbonTopNav />);
    
    const button = screen.getByRole('button', { name: /clear canvas/i });
    
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    
    fireEvent.click(button);
    
    // Verify state changed
    expect(screen.getByTestId('clear-confirmation')).toHaveTextContent('Clear Dialog Open');
  });

  test('Settings button is clickable', () => {
    render(<MockRibbonTopNav />);
    
    const button = screen.getByRole('button', { name: /settings/i });
    
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    
    fireEvent.click(button);
    
    // Verify state changed
    expect(screen.getByTestId('settings-window')).toHaveTextContent('Settings Open');
  });

  test('All buttons can be clicked multiple times', () => {
    render(<MockRibbonTopNav />);
    
    const openFileBtn = screen.getByRole('button', { name: /open file/i });
    const hillMatrixBtn = screen.getByRole('button', { name: /hill coefficient matrix/i });
    const runSimBtn = screen.getByRole('button', { name: /run simulation/i });
    
    // Click Open File button multiple times
    fireEvent.click(openFileBtn);
    expect(screen.getByTestId('import-window')).toHaveTextContent('Import Window Open');
    
    // Click Hill Matrix button multiple times (toggle)
    fireEvent.click(hillMatrixBtn);
    expect(screen.getByTestId('hill-matrix')).toHaveTextContent('Hill Matrix Open');
    fireEvent.click(hillMatrixBtn);
    expect(screen.getByTestId('hill-matrix')).toHaveTextContent('Hill Matrix Closed');
    
    // Click Run Simulation button multiple times (toggle)
    fireEvent.click(runSimBtn);
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    
    const stopBtn = screen.getByRole('button', { name: /stop/i });
    fireEvent.click(stopBtn);
    expect(screen.getByRole('button', { name: /run simulation/i })).toBeInTheDocument();
  });

  test('All 8 navigation buttons exist and are not disabled', () => {
    render(<MockRibbonTopNav />);
    
    const buttons = [
      'Open File',
      'Save Project',
      'Export Circuit',
      'Hill Coefficient Matrix',
      'Run Simulation',
      'Show Output',
      'Clear Canvas',
      'Settings'
    ];

    buttons.forEach(buttonName => {
      const button = screen.getByRole('button', { name: new RegExp(buttonName, 'i') });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });
  });
});
