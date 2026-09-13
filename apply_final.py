import os

exclude_dirs = {'.git', 'node_modules', '.venv', 'venv', 'dist', 'build', 'coverage', 'out', '.next', '__pycache__'}

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        return False

    original_content = content
    
    # 1. Ulak Agent -> Ulak Agent
    content = content.replace("Ulak Agent", "Ulak Agent")
    content = content.replace("Ulak-Agent", "Ulak-Agent")
    
    # 2. ➶ (Yılan) -> ➶ (Ok)
    content = content.replace("➶", "➶")

    if content != original_content:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception:
            return False
    return False

def main():
    changed_count = 0
    base_dir = "."
    for root, dirs, files in os.walk(base_dir):
        # Exclude directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            if file.endswith(('.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pyc', '.exe', '.dll')):
                continue
            
            filepath = os.path.join(root, file)
            if process_file(filepath):
                print(f"Değiştirildi: {filepath}")
                changed_count += 1
                
    print(f"\nToplam {changed_count} dosyada 'Ulak Agent' ve '➶' başarıyla değiştirildi.")

if __name__ == "__main__":
    main()
