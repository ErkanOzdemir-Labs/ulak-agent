"""Tests for _verify_console_scripts_installed (issue #52931)."""

from __future__ import annotations

import textwrap
from pathlib import Path
from unittest.mock import patch

import pytest
from ulak_cli import main_install_repair


@pytest.fixture
def temp_pyproject(tmp_path, monkeypatch):
    pyproject = tmp_path / "pyproject.toml"
    pyproject.write_text(
        textwrap.dedent(
            """\
        [project]
        name = "fake"
        version = "0.0.0"

        [project.scripts]
        ulak = "ulak_cli.main:main"
        ulak-agent = "run_agent:main"
        ulak-acp = "acp_adapter.entry:main"
    """
        )
    )
    import ulak_cli.main as main_mod

    monkeypatch.setattr(main_mod, "PROJECT_ROOT", tmp_path)
    return tmp_path


@pytest.fixture
def fake_scripts_dir(tmp_path):
    scripts = tmp_path / "venv" / "Scripts"
    scripts.mkdir(parents=True)
    return scripts


class TestVerifyConsoleScriptsInstalled:
    def test_no_action_when_all_shims_present(self, temp_pyproject, fake_scripts_dir):
        for name in ("ulak", "ulak-agent", "ulak-acp"):
            (fake_scripts_dir / f"{name}.exe").write_bytes(b"fake")

        with patch("ulak_cli.main_install_repair._is_windows", return_value=True), \
             patch("ulak_cli.main_install_repair._venv_scripts_dir", return_value=fake_scripts_dir), \
             patch("ulak_cli.main_install_repair._run_quarantined_install") as mock_install:
            from ulak_cli.main_install_repair import _verify_console_scripts_installed

            _verify_console_scripts_installed(["uv", "pip"], env={})

        mock_install.assert_not_called()




    def test_quarantine_shims_include_declared_console_scripts(
        self, temp_pyproject, fake_scripts_dir
    ):
        import ulak_cli.main as main_mod

        with patch("ulak_cli.main_install_repair._is_windows", return_value=True):
            names = {path.name for path in main_install_repair._ulak_exe_shims(fake_scripts_dir)}

        assert {"ulak.exe", "ulak-agent.exe", "ulak-acp.exe"} <= names
        assert "ulak-gateway.exe" in names
