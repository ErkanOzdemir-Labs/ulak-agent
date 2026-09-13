import asyncio
import json
import logging

try:
    import websockets
except ImportError:
    print("websockets modülü eksik. Lütfen 'pip install websockets' komutunu çalıştırın.")
    exit(1)

# Uzak sunucudaki ULAK ajanının adresi
# Bu adres üretim ortamında (ör: wss://api.ulak.sunucu.com/ws) güncellenmelidir.
ULAK_REMOTE_URL = "ws://localhost:8000/ws"

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")

async def listen_to_ulak():
    """Uzak sunucudaki ULAK ile WebSocket üzerinden bağlantı kurar ve komutları dinler."""
    logging.info(f"ULAK sunucusuna bağlanılıyor: {ULAK_REMOTE_URL}")
    while True:
        try:
            async with websockets.connect(ULAK_REMOTE_URL) as websocket:
                logging.info("Bağlantı başarılı. Komutlar bekleniyor...")
                
                # Antigravity'nin aktif olduğunu uzak sunucuya bildir.
                await websocket.send(json.dumps({
                    "type": "status",
                    "payload": "antigravity_ready"
                }))

                async for message in websocket:
                    try:
                        command = json.loads(message)
                        logging.info(f"Yeni Komut Alındı: {command.get('type')}")
                        await process_command(command, websocket)
                    except json.JSONDecodeError:
                        logging.error("Gelen mesaj JSON formatında değil.")
        except Exception as e:
            logging.error(f"Bağlantı hatası: {e}. 5 saniye sonra tekrar deneniyor...")
            await asyncio.sleep(5)

async def process_command(command, websocket):
    """Gelen komut türüne göre ilgili Antigravity işlevini tetikler."""
    cmd_type = command.get("type")
    payload = command.get("payload", {})

    if cmd_type == "code_update":
        logging.info(f"Kod güncelleme görevi başlatılıyor. Proje: {payload.get('project_path')}")
        # Burada Antigravity'nin kod değiştirme, planlama yetenekleri tetiklenebilir
        
    elif cmd_type == "deploy":
        logging.info(f"Dağıtım (Deploy) görevi: {payload.get('platform')}")
        # Vercel, Github push vb komutların entegrasyon noktası
        
    elif cmd_type == "subagent_create":
        logging.info(f"Yeni alt-ajan (subagent) talep edildi. Rol: {payload.get('role')}")
        
    else:
        logging.warning(f"Bilinmeyen komut türü: {cmd_type}")

    # İşlem sonucu uzak sunucuya bildirilir
    await websocket.send(json.dumps({
        "type": "response",
        "status": "ack",
        "message": f"Komut ({cmd_type}) alındı ve işleniyor."
    }))

if __name__ == "__main__":
    try:
        asyncio.run(listen_to_ulak())
    except KeyboardInterrupt:
        logging.info("WebSocket dinleyicisi durduruldu.")
