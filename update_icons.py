import os
import shutil

source_img = r"C:\Users\Acer\.gemini\antigravity-ide\brain\ecc412fd-2f9b-4f2b-bb89-f0e99976602e\ulak_icon_v2_1788747052003.png"
dest_dir = r"C:\Users\Acer\Desktop\Projeler\hermes-agent-main\ulak-agent-main\apps\desktop\assets"

print("Logolar güncelleniyor...")

# 1. Ana PNG kopyala
png_path = os.path.join(dest_dir, "icon.png")
shutil.copy(source_img, png_path)
print(f"Başarılı: {png_path} değiştirildi.")

# 2. Pillow (PIL) yüklüyse ICO üretmeye çalış
try:
    from PIL import Image
    img = Image.open(source_img)
    ico_path = os.path.join(dest_dir, "icon.ico")
    img.save(ico_path, format="ICO", sizes=[(256, 256)])
    print(f"Başarılı: {ico_path} üretildi ve değiştirildi.")
except ImportError:
    print("Bilgi: Pillow (PIL) kütüphanesi yüklü değil, icon.ico manuel olarak dönüştürülmeli.")
except Exception as e:
    print(f"Hata: ICO dönüştürme başarısız oldu - {str(e)}")

print("\nİkon güncelleme işlemi tamamlandı.")
