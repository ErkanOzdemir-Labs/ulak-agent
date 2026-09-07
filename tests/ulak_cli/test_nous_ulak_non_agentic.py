"""Tests for the Nous-Ulak-3/4 non-agentic warning detector.

Prior to this check, the warning fired on any model whose name contained
``"ulak"`` anywhere (case-insensitive). That false-positived on unrelated
local Modelfiles such as ``ulak-brain:qwen3-14b-ctx16k`` — a tool-capable
Qwen3 wrapper that happens to live under the "ulak" tag namespace.

``is_nous_ulak_non_agentic`` should only match the actual Nous Research
Ulak-3 / Ulak-4 chat family.
"""

from __future__ import annotations

import pytest

from ulak_cli.model_switch import (
    _ULAK_MODEL_WARNING,
    _check_ulak_model_warning,
    is_nous_ulak_non_agentic,
)


@pytest.mark.parametrize(
    "model_name",
    [
        "ErkanOzdemir-Labs/Ulak-3-Llama-3.1-70B",
        "ErkanOzdemir-Labs/Ulak-3-Llama-3.1-405B",
        "ulak-3",
        "Ulak-3",
        "ulak-4",
        "ulak-4-405b",
        "ulak_4_70b",
        "openrouter/ulak3:70b",
        "openrouter/erkanozdemir-labs/ulak-4-405b",
        "ErkanOzdemir-Labs/Ulak3",
        "ulak-3.1",
    ],
)
def test_matches_real_nous_ulak_chat_models(model_name: str) -> None:
    assert is_nous_ulak_non_agentic(model_name), (
        f"expected {model_name!r} to be flagged as Nous Ulak 3/4"
    )
    assert _check_ulak_model_warning(model_name) == _ULAK_MODEL_WARNING


