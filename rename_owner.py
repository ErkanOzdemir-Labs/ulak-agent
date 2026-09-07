import os

target_dir = r"C:\Users\Acer\Desktop\Projeler\hermes-agent-main\ulak-agent-main"
ignore_dirs = {".git", ".venv", "node_modules", "__pycache__", "build", "dist", ".idea", ".vscode"}

def replace_in_text(content):
    # Protect domain links
    content = content.replace("github.com/ErkanOzdemir-Labs", "__NOUS_SITE_PLACEHOLDER__")
    
    # Replace profile names
    content = content.replace("NousResearch", "ErkanOzdemir-Labs")
    content = content.replace("nousresearch", "erkanozdemir-labs")
    content = content.replace("NOUSRESEARCH", "ERKANOZDEMIR-LABS")
    
    # Restore domain links
    content = content.replace("__NOUS_SITE_PLACEHOLDER__", "github.com/ErkanOzdemir-Labs")
    return content

count = 0
for root, dirs, files in os.walk(target_dir):
    dirs[:] = [d for d in dirs if d not in ignore_dirs]
    for file in files:
        if file in ["rename_owner.py", "rename_ulak.py"]:
            continue
            
        filepath = os.path.join(root, file)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = replace_in_text(content)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                count += 1
                print(f"Updated: {filepath}")
        except Exception:
            pass

print(f"\nDone. Updated {count} files.")
