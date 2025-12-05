import json
import sys
import io
import base64
import traceback
import os
import numpy as np
import matplotlib
import matplotlib.pyplot as plt
from backend.parser import parse_circuit
from backend.simulate import run_simulation

# Use non-interactive backend for matplotlib
matplotlib.use('Agg')

def run_simulation_handler(data):
    """Process simulation request and return results"""
    try:
        # Parse data into protein objects
        protein_array = parse_circuit(data)
        if protein_array is None or len(protein_array) == 0:
            # Weirdly, return success here because we just want to display a message that no circuit was passed back
            return {"success": "No circuit provided"}

        # Define simulation parameters
        duration = data.get("circuitSettings", {}).get("simulationDuration", 20)
        n = data.get("circuitSettings", {}).get("numTimePoints", 1000) * 10  # Higher resolution for smoothness
        t = np.linspace(0, duration, n)

        # Run the simulation
        final_concentrations = run_simulation(t, protein_array)
        if final_concentrations is None or (isinstance(final_concentrations, np.ndarray) and final_concentrations.size == 0):
            return {"error": "Simulation failed to produce results"}

        # Plot results using matplotlib
        plt.figure(figsize=(10, 6))
        for i, protein in enumerate(protein_array):
            plt.plot(t, final_concentrations[:, i], label=protein.getName())

        plt.xlabel("Time")
        plt.ylabel("Concentration")
        plt.title(f"Simulation Results ({duration}s)")
        plt.legend()
        plt.grid(True, alpha=0.3)

        # Save plot to in-memory buffer as PNG
        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=100)
        buf.seek(0)
        
        # Convert to base64 for sending over IPC
        image_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()
        
        # Also return the raw data for possible client-side plotting
        protein_names = [p.getName() for p in protein_array]
        time_points = t.tolist()[::10]  # Downsample for transfer
        concentration_data = final_concentrations[::10].tolist()  # Downsample for transfer
        
        return {
            "success": True,
            "image": image_base64,
            "data": {
                "proteinNames": protein_names,
                "timePoints": time_points,
                "concentrations": concentration_data
            }
        }
        
    except Exception as e:
        # Catch all exceptions and return error
        error_traceback = traceback.format_exc()
        return {
            "success": False,
            "error": str(e),
            "traceback": error_traceback
        }

def main():
    """Main IPC loop that reads from stdin and writes to stdout"""
    # Log to a file for debugging
    log_file = os.path.join(os.path.dirname(__file__), "ipc_server_log.txt")
    with open(log_file, "w") as f:
        f.write("IPC Server started\n")
    
    # Main processing loop
    while True:
        try:
            # Read message length (4 bytes)
            length_bytes = sys.stdin.buffer.read(4)
            if not length_bytes:
                break  # End of stream
                
            # Convert bytes to integer
            message_length = int.from_bytes(length_bytes, byteorder='little')
            
            # Read the JSON message
            message_bytes = sys.stdin.buffer.read(message_length)
            message_str = message_bytes.decode('utf-8')
            message = json.loads(message_str)
            
            # Log received message for debugging
            with open(log_file, "a") as f:
                f.write(f"Received command: {message.get('command')}\n")
            
            # Process message based on command
            command = message.get("command")
            request_id = message.get("requestId")  # Get the request ID
            result = None

            if command == "run_simulation":
                result = run_simulation_handler(message.get("data", {}))
            elif command == "ping":
                result = {"status": "pong"}
            else:
                result = {"error": f"Unknown command: {command}"}

            # Add the request ID to the result
            result["requestId"] = request_id
            
            # Send result back
            result_json = json.dumps(result)
            result_bytes = result_json.encode('utf-8')
            length = len(result_bytes)
            
            # Write length as 4 bytes, then the message
            sys.stdout.buffer.write(length.to_bytes(4, byteorder='little'))
            sys.stdout.buffer.write(result_bytes)
            sys.stdout.buffer.flush()
            
        except Exception as e:
            # Log error
            with open(log_file, "a") as f:
                f.write(f"Error in IPC server: {str(e)}\n")
                f.write(traceback.format_exc() + "\n")
            
            # Try to send error back to client
            try:
                error_result = {
                    "success": False,
                    "error": str(e),
                    "traceback": traceback.format_exc()
                }
                error_json = json.dumps(error_result)
                error_bytes = error_json.encode('utf-8')
                length = len(error_bytes)
                
                sys.stdout.buffer.write(length.to_bytes(4, byteorder='little'))
                sys.stdout.buffer.write(error_bytes)
                sys.stdout.buffer.flush()
            except:
                # If everything fails, just exit
                sys.exit(1)

if __name__ == "__main__":
    main()