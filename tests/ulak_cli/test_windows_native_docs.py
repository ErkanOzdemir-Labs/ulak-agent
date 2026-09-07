from pathlib import Path


def test_windows_native_install_path_docs_match_installer() -> None:
    doc = Path("website/docs/user-guide/windows-native.md").read_text()
    install = Path("scripts/install.ps1").read_text()

    # The launchers live in the managed binary dir OUTSIDE the git checkout
    # (ULAK_HOME\bin, next to the managed uv) — NOT the whole venv\Scripts
    # (which would shadow the user's python, #83797) and NOT a dir inside
    # the checkout (which `ulak update`'s autostash swept off disk).
    assert "%LOCALAPPDATA%\\ulak\\bin" in doc
    assert (
        "Get-Command ulak        # should print "
        "C:\\Users\\<you>\\AppData\\Local\\ulak\\bin\\ulak.exe"
    ) in doc
    # Installer exposes $UlakHome\bin, and must copy the launchers into it.
    assert '$ulakBin = "$UlakHome\\bin"' in install
    assert "ulak.exe" in install and "ulak-acp.exe" in install
    # Guard against regressions to either legacy layout.
    assert '$ulakBin = "$InstallDir\\venv\\Scripts"' not in install
    assert '$ulakBin = "$InstallDir\\bin"' not in install
