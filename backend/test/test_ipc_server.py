import io
import sys
import os
import json
import base64
import threading

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import numpy as np
import pytest

import types

# mock imports
fake_parser = types.ModuleType('parser')
fake_parser.parse_circuit = lambda data: None
sys.modules['parser'] = fake_parser
fake_simulate = types.ModuleType('simulate')
fake_simulate.run_simulation = lambda t, protein_array: None
sys.modules['simulate'] = fake_simulate

import ipc_server


class MockProtein:
    def __init__(self, name):
        self._name = name

    def getName(self):
        return self._name


def test_no_circuit_returns_message_when_none(monkeypatch):
    # parse_circuit returns None -> handler should return the friendly message
    monkeypatch.setattr(ipc_server, 'parse_circuit', lambda data: None)

    result = ipc_server.run_simulation_handler({})

    assert isinstance(result, dict)
    assert result == {"success": "No circuit provided"}


def test_no_circuit_returns_message_when_empty(monkeypatch):
    monkeypatch.setattr(ipc_server, 'parse_circuit', lambda data: [])

    result = ipc_server.run_simulation_handler({})

    assert isinstance(result, dict)
    assert result == {"success": "No circuit provided"}


def test_simulation_success_returns_image_and_data(monkeypatch):
    # Prepare fake proteins
    proteins = [MockProtein('A'), MockProtein('B')]

    # Make parse_circuit return our proteins
    monkeypatch.setattr(ipc_server, 'parse_circuit', lambda data: proteins)

    # Prepare t and concentrations expected by the handler
    def fake_run_simulation(t, protein_array):
        # Return an array shaped (len(t), len(protein_array))
        a = np.linspace(0, 1, len(t))
        b = np.linspace(1, 0, len(t))
        return np.vstack([a, b]).T

    monkeypatch.setattr(ipc_server, 'run_simulation', fake_run_simulation)

    data = {
        "circuitSettings": {
            "simulationDuration": 10,
            "numTimePoints": 5
        }
    }

    result = ipc_server.run_simulation_handler(data)

    # Basic shape and keys
    assert result.get('success') is True
    assert 'image' in result and isinstance(result['image'], str) and len(result['image']) > 0
    assert 'data' in result

    # Validate protein names
    assert result['data']['proteinNames'] == ['A', 'B']

    # timePoints should be downsampled: original n = numTimePoints*10; downsample by [::10] -> numTimePoints entries
    assert len(result['data']['timePoints']) == data['circuitSettings']['numTimePoints']

    # concentrations shape
    concentrations = result['data']['concentrations']
    assert len(concentrations) == data['circuitSettings']['numTimePoints']
    assert all(len(row) == 2 for row in concentrations)

    # Validate image is a PNG by decoding the base64 and checking the PNG header
    img_bytes = base64.b64decode(result['image'])
    assert img_bytes.startswith(b'\x89PNG\r\n\x1a\n')


def test_simulation_returns_error_when_no_results(monkeypatch):
    proteins = [MockProtein('A')]
    monkeypatch.setattr(ipc_server, 'parse_circuit', lambda data: proteins)
    monkeypatch.setattr(ipc_server, 'run_simulation', lambda t, p: None)

    result = ipc_server.run_simulation_handler({})

    assert isinstance(result, dict)
    assert result.get('error') == 'Simulation failed to produce results'


def test_exception_is_caught_and_returned(monkeypatch):
    def bad_parse(data):
        raise RuntimeError('boom')

    monkeypatch.setattr(ipc_server, 'parse_circuit', bad_parse)

    result = ipc_server.run_simulation_handler({})

    assert result.get('success') is False
    assert 'traceback' in result and isinstance(result['traceback'], str)
    assert 'RuntimeError' in result['traceback'] or 'boom' in result.get('error', '')

class MockStdio:
    """Wraps BytesIO to mimic sys.stdin/sys.stdout with .buffer access."""
    def __init__(self, initial_bytes=b""):
        self.buffer = io.BytesIO(initial_bytes)

    def write(self, data):
        if isinstance(data, str):
            self.buffer.write(data.encode())
        else:
            self.buffer.write(data)

    def read(self, n=-1):
        return self.buffer.read(n)

    def flush(self):
        pass

def test_main_loop_command_ping(monkeypatch):
    message = {"command": "ping", "requestId": 123}
    message_bytes = json.dumps(message).encode("utf-8")
    message_length = len(message_bytes).to_bytes(4, byteorder="little")

    fake_stdin = MockStdio(message_length + message_bytes)
    fake_stdout = MockStdio()

    monkeypatch.setattr(sys, "stdin", fake_stdin)
    monkeypatch.setattr(sys, "stdout", fake_stdout)

    thread = threading.Thread(target=ipc_server.main)
    thread.start()
    thread.join(timeout=2)  # wait for the thread to finish

    fake_stdout.buffer.seek(0)
    length_bytes = fake_stdout.buffer.read(4)
    assert length_bytes, "No data written to stdout"

    response_length = int.from_bytes(length_bytes, "little")
    response_bytes = fake_stdout.buffer.read(response_length)
    response = json.loads(response_bytes.decode("utf-8"))
    assert response, "No response received"
    
def test_main_loop_command_run_simulation(monkeypatch):
    # Prepare fake proteins
    proteins = [MockProtein('A'), MockProtein('B')]

    # Make parse_circuit return our proteins
    monkeypatch.setattr(ipc_server, 'parse_circuit', lambda data: proteins)

    # Prepare t and concentrations expected by the handler
    def fake_run_simulation(t, protein_array):
        # Return an array shaped (len(t), len(protein_array))
        a = np.linspace(0, 1, len(t))
        b = np.linspace(1, 0, len(t))
        return np.vstack([a, b]).T

    monkeypatch.setattr(ipc_server, 'run_simulation', fake_run_simulation)
    
    message = {"command": "run_simulation", "requestId": 123, "data": {
        "circuitSettings": {
            "simulationDuration": 10,
            "numTimePoints": 5
        }
    }}
    message_bytes = json.dumps(message).encode("utf-8")
    message_length = len(message_bytes).to_bytes(4, byteorder="little")

    fake_stdin = MockStdio(message_length + message_bytes)
    fake_stdout = MockStdio()

    monkeypatch.setattr(sys, "stdin", fake_stdin)
    monkeypatch.setattr(sys, "stdout", fake_stdout)

    thread = threading.Thread(target=ipc_server.main)
    thread.start()
    thread.join(timeout=2)  # wait for the thread to finish

    fake_stdout.buffer.seek(0)
    length_bytes = fake_stdout.buffer.read(4)
    assert length_bytes, "No data written to stdout"

    response_length = int.from_bytes(length_bytes, "little")
    response_bytes = fake_stdout.buffer.read(response_length)
    response = json.loads(response_bytes.decode("utf-8"))
    assert response.get("data", None)
    
def test_main_loop_command_error(monkeypatch):
    message = {"command": "hello"}
    message_bytes = json.dumps(message).encode("utf-8")
    message_length = len(message_bytes).to_bytes(4, byteorder="little")

    fake_stdin = MockStdio(message_length + message_bytes)
    fake_stdout = MockStdio()

    monkeypatch.setattr(sys, "stdin", fake_stdin)
    monkeypatch.setattr(sys, "stdout", fake_stdout)

    thread = threading.Thread(target=ipc_server.main)
    thread.start()
    thread.join(timeout=2)  # wait for the thread to finish

    fake_stdout.buffer.seek(0)
    length_bytes = fake_stdout.buffer.read(4)
    assert length_bytes, "No data written to stdout"

    response_length = int.from_bytes(length_bytes, "little")
    response_bytes = fake_stdout.buffer.read(response_length)
    response = json.loads(response_bytes.decode("utf-8"))
    assert response.get("error", "") == "Unknown command: hello"
    
def test_main_loop_exception(monkeypatch):
    bad_input = (5).to_bytes(4, 'little') + b"abcde"
    fake_stdin = MockStdio(bad_input)
    fake_stdout = MockStdio()

    monkeypatch.setattr(sys, "stdin", fake_stdin)
    monkeypatch.setattr(sys, "stdout", fake_stdout)

    thread = threading.Thread(target=ipc_server.main)
    thread.start()
    thread.join(timeout=2)

    fake_stdout.buffer.seek(0)
    length_bytes = fake_stdout.buffer.read(4)
    assert length_bytes, "No data written to stdout"
    error_length = int.from_bytes(length_bytes, "little")
    error_json = fake_stdout.buffer.read(error_length).decode("utf-8")
    error_response = json.loads(error_json)

    assert not error_response.get("success", True)
    assert "JSONDecodeError" in error_response.get("traceback", "")
    
class BrokenStdout:
    @property
    def buffer(self):
        raise IOError("cannot write")
    
def test_main_loop_sys_exit(monkeypatch):
    bad_input = (5).to_bytes(4, 'little') + b"abcde"
    fake_stdin = MockStdio(bad_input)
    fake_stdout = BrokenStdout()

    monkeypatch.setattr(sys, "stdin", fake_stdin)
    monkeypatch.setattr(sys, "stdout", fake_stdout)

    # enables pytest to catch SystemExit
    with pytest.raises(SystemExit) as e:
        ipc_server.main()

    assert e.value.code == 1  # check that it exited with code 1