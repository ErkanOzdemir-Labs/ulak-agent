"""Resolve ULAK_HOME for standalone skill scripts.

Skill scripts may run outside the Ulak process (e.g. system Python,
nix env, CI) where ``ulak_constants`` is not importable.  This module
provides the same ``get_ulak_home()`` and ``display_ulak_home()``
contracts as ``ulak_constants`` without requiring it on ``sys.path``.

When ``ulak_constants`` IS available it is used directly so that any
future enhancements (profile resolution, Docker detection, etc.) are
picked up automatically.  The fallback path replicates the core logic
from ``ulak_constants.py`` using only the stdlib.

All scripts under ``google-workspace/scripts/`` should import from here
instead of duplicating the ``ULAK_HOME = Path(os.getenv(...))`` pattern.
"""

from __future__ import annotations

import os
from pathlib import Path

try:
    from ulak_constants import display_ulak_home as display_ulak_home
    from ulak_constants import get_ulak_home as get_ulak_home
except (ModuleNotFoundError, ImportError):

    def get_ulak_home() -> Path:
        """Return the Ulak home directory (default: ~/.ulak).

        Mirrors ``ulak_constants.get_ulak_home()``."""
        val = os.environ.get("ULAK_HOME", "").strip()
        return Path(val) if val else Path.home() / ".ulak"

    def display_ulak_home() -> str:
        """Return a user-friendly ``~/``-shortened display string.

        Mirrors ``ulak_constants.display_ulak_home()``."""
        home = get_ulak_home()
        try:
            return "~/" + home.relative_to(Path.home()).as_posix()
        except ValueError:
            return str(home)
