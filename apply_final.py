import os
import shutil

source_img = r"C:\Users\Acer\.gemini\antigravity-ide\brain\ecc412fd-2f9b-4f2b-bb89-f0e99976602e\ulak_turkic_bw_edit_1788750637665.png"
base_dir = r"C:\Users\Acer\Desktop\Projeler\hermes-agent-main\ulak-agent-main\apps\desktop"

print("Yeni logo (Siyah-Beyaz, Çizgi Gözlü) kopyalanıyor...")
shutil.copy(source_img, os.path.join(base_dir, "assets", "icon.png"))
shutil.copy(source_img, os.path.join(base_dir, "public", "ulak-logo.png"))

try:
    from PIL import Image
    img = Image.open(source_img)
    img.save(os.path.join(base_dir, "assets", "icon.ico"), format="ICO", sizes=[(256, 256)])
    print("ICO dosyası başarıyla üretildi.")
except Exception as e:
    print("ICO hatası:", e)
