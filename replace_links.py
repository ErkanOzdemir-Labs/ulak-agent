import os
import re

ROOT_DIR = r"C:\Users\Acer\Desktop\Projeler\hermes-agent-main\ulak-agent-main"
EXCLUDE_DIRS = {".git", "node_modules", "dist", "build", ".venv", "release"}
EXCLUDE_EXTS = {".png", ".jpg", ".jpeg", ".ico", ".icns", ".exe", ".dmg", ".lock", ".pyc", ".pack", ".idx"}

REPLACEMENTS = [
    # Özel kurulum scripti linki
    (r"https?://hermes-agent\.nousresearch\.com/install\.sh", "https://raw.githubusercontent.com/ErkanOzdemir-Labs/ulak-agent/main/setup-ulak.sh"),
    # Dökümantasyon ve genel web sitesi linkleri
    (r"https?://hermes-agent\.nousresearch\.com", "https://erkanozdemir-labs.github.io/ulak-agent"),
    (r"https?://nousresearch\.com", "https://github.com/ErkanOzdemir-Labs"),
    (r"https?://nousresearch\.dev", "https://github.com/ErkanOzdemir-Labs"),
    # E-posta adresleri (varsa)
    (r"@nousresearch\.com", "@github.com/ErkanOzdemir-Labs"),
    (r"nousresearch\.com", "github.com/ErkanOzdemir-Labs")
]

replaced_files_count = 0

print("Linkler GitHub profilinize uyarlanıyor...")

for root, dirs, files in os.walk(ROOT_DIR):
    dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
    
    for file in files:
        if any(file.endswith(ext) for ext in EXCLUDE_EXTS):
            continue
            
        file_path = os.path.join(root, file)
        
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                
            new_content = content
            for old_patt, new_str in REPLACEMENTS:
                new_content = re.sub(old_patt, new_str, new_content, flags=re.IGNORECASE)
                
            if new_content != content:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Güncellendi: {file_path}")
                replaced_files_count += 1
                
        except (UnicodeDecodeError, PermissionError):
            pass

print(f"\nİşlem tamam! Toplam {replaced_files_count} dosyada linkler güncellendi.")
