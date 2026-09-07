import os
import sys
import time

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        # Ignore binary files or files with unknown encoding
        return False

    new_content = content
    new_content = new_content.replace('ULAK', 'ULAK')
    new_content = new_content.replace('Ulak', 'Ulak')
    new_content = new_content.replace('ulak', 'ulak')
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def get_new_name(name):
    new_name = name
    new_name = new_name.replace('ULAK', 'ULAK')
    new_name = new_name.replace('Ulak', 'Ulak')
    new_name = new_name.replace('ulak', 'ulak')
    return new_name

def process_directory(root_dir):
    exclude_dirs = {'.git', 'node_modules', '.venv', '__pycache__', 'uv.lock', 'package-lock.json'}
    
    dirs_to_rename = []
    files_to_rename = []

    # Phase 1: Text replacement and collection
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Exclude directories
        dirnames[:] = [d for d in dirnames if d not in exclude_dirs]
        
        for filename in filenames:
            if filename in exclude_dirs:
                continue
            filepath = os.path.join(dirpath, filename)
            
            # Replace text
            if replace_in_file(filepath):
                print(f"Updated content in: {filepath}")
                
            new_filename = get_new_name(filename)
            if new_filename != filename:
                files_to_rename.append((filepath, os.path.join(dirpath, new_filename)))
                
        for dirname in dirnames:
            new_dirname = get_new_name(dirname)
            if new_dirname != dirname:
                dirs_to_rename.append((os.path.join(dirpath, dirname), os.path.join(dirpath, new_dirname)))

    # Phase 2: Rename files
    for old_path, new_path in files_to_rename:
        try:
            os.rename(old_path, new_path)
            print(f"Renamed file: {old_path} -> {new_path}")
        except Exception as e:
            print(f"Failed to rename file {old_path}: {e}")

    # Phase 3: Rename directories (deepest first to avoid path invalidation)
    dirs_to_rename.sort(key=lambda x: len(x[0]), reverse=True)
    for old_path, new_path in dirs_to_rename:
        try:
            os.rename(old_path, new_path)
            print(f"Renamed directory: {old_path} -> {new_path}")
        except Exception as e:
            # Sometime windows locks it briefly, retry once
            time.sleep(0.5)
            try:
                os.rename(old_path, new_path)
                print(f"Renamed directory (retry): {old_path} -> {new_path}")
            except Exception as e2:
                print(f"Failed to rename directory {old_path}: {e2}")

if __name__ == '__main__':
    target_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    print(f"Starting rename process in: {target_dir}")
    process_directory(target_dir)
    print("Done.")
