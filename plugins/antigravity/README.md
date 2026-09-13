# ULAK Agent - Antigravity Eklentisi (Plugin)

Bu eklenti, uzak sunucuda (veya Telegram botu olarak) çalışan **ULAK Agent**'ın, yerel bilgisayarınızdaki **Antigravity** sistemine bağlanarak otonom kod düzenleme, deployment ve subagent oluşturma gibi görevleri yerine getirmesini sağlar.

## Kurulum (Marketplace veya Manuel)

Bu eklentiyi yerel Antigravity sisteminize kurmak için aşağıdaki adımları izleyin:

### 1. Dosyaları Kopyalayın
Bu klasörü (`antigravity`), sisteminizdeki Antigravity eklentiler dizinine kopyalayın.
Varsayılan yol genelde şudur: 
`C:\Users\<KullaniciAdiniz>\.gemini\config\plugins\ulak-agent\` (Windows için)

### 2. Gerekli Kütüphaneleri Yükleyin
WebSocket bağlantısı için Python'da `websockets` kütüphanesine ihtiyaç vardır. Terminalinizi açın ve eklenti dizininde aşağıdaki komutu çalıştırın:
```bash
pip install websockets
```

### 3. Sunucu URL'sini Ayarlayın
`skills/ulak_connector/scripts/ws_client.py` dosyasını bir metin editörüyle açın ve `ULAK_REMOTE_URL` değişkenini, uzak sunucunuzda çalışan ULAK Agent'ın adresine (örn: `wss://api.domain.com/ws`) göre güncelleyin.

## Çalışma Mantığı
Eklenti aktif edildiğinde, Antigravity arka planda uzak sunucudaki ULAK ile bir WebSocket bağlantısı kurar. 
Siz Telegram üzerinden bota komut gönderdiğinizde (örn: *"Şu projedeki header'ı güncelle ve Vercel'e deploy et"*), ULAK bu emri JSON paketi olarak Antigravity'ye iletir. Antigravity yetenekleri (skills) devreye girerek yerel bilgisayarınızda işlemleri yapar ve sonucu tekrar bota raporlar.
