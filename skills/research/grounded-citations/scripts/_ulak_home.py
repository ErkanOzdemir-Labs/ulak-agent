"""Resolve ULAK_HOME for standalone skill scripts.

Skill scripts may run outside the Ulak process (system Python, nix env,
CI) where ``ulak_constants`` is not importable.  This module provides the
same ``get_ulak_home()`` contract without requiring it on ``sys.path``.

When ``ulak_constants`` IS available it is used directly so profile
resolution and any future enhancements are picked up automatically.
"""

from __future__ import annotations

import os
from pathlib import Path

try:
    from ulak_constants import get_ulak_home as get_ulak_home
except (ModuleNotFoundError, ImportError):

    def get_ulak_home() -> Path:
        """Return the Ulak home directory (default: ``~/.ulak``)."""
        val = os.environ.get("ULAK_HOME", "").strip()
        return Path(val) if val else Path.home() / ".ulak"
