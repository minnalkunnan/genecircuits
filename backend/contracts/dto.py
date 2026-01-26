from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, TypedDict, Union


# ----- Request -----

class CircuitSettings(TypedDict, total=False):
    simulationDuration: float
    numTimePoints: int


class SimulationRequest(TypedDict, total=False):
    # The backend only consumes circuitSettings currently, but the request is the whole circuit JSON.
    circuitSettings: CircuitSettings

    # Allow other circuit fields without locking them yet (nodes/edges/proteins/etc.)
    # We keep this permissive to avoid inventing the full CircuitDataType shape in Python.
    # (OpenAPI will likewise allow additionalProperties.)
    # NOTE: TypedDict doesn't support additionalProperties; we just keep total=False.
    # Any extra keys are fine at runtime.
    # e.g. nodes, edges, proteins, hillCoefficients, etc.
    # (intentionally omitted)


# ----- Response -----

class SimulationDataPayload(TypedDict):
    proteinNames: List[str]
    timePoints: List[float]
    concentrations: List[List[float]]


class SimulationSuccessResponse(TypedDict):
    success: Literal[True]
    image: str
    data: SimulationDataPayload
    requestId: str


class SimulationErrorResponse(TypedDict):
    success: Literal[False]
    error: str
    traceback: str
    requestId: str


class SimulationNoCircuitResponse(TypedDict):
    # Exact current behavior: success is a string, not a boolean.
    success: Literal["No circuit provided"]
    requestId: str


SimulationResponse = Union[
    SimulationSuccessResponse,
    SimulationErrorResponse,
    SimulationNoCircuitResponse,
]
