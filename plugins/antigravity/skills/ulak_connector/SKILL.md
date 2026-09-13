---
name: ulak-connector
description: "ULAK Agent uzak sunucusuna WebSocket üzerinden bağlanarak Antigravity'ye verilen emirleri (subagent, deploy, kod değişiklikleri) dinleyen ve ileten arka plan servisi."
---

# ULAK Connector Yeteneği

Bu yetenek, yerel Antigravity kurulumunuz ile uzak sunucuda çalışan ULAK Telegram botu arasında kesintisiz, gerçek zamanlı bir WebSocket bağlantısı kurar. 

## Kullanım Amacı
- Uzak sunucudan gelen JSON formatındaki komutları Antigravity yetenek setine çevirmek.
- Alt-ajanlar (subagents) oluşturma taleplerini dinleyip yönetmek.
- İstenilen dizinde kod düzenleme veya script çalıştırma (izinli olduğu ölçüde) komutlarını işlemek.

## Kurulum & Çalıştırma
Sistem başlatıldığında `scripts/ws_client.py` arkaplan görevi olarak devreye girmelidir. Scriptin ayarları `ws_client.py` içindeki URL bölümünden değiştirilebilir.
