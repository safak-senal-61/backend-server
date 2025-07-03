# WebSocket Server Entegrasyon Kılavuzu

Bu proje, Socket.IO yerine gelişmiş WebSocket ve Server-Sent Events (SSE) teknolojilerini kullanan modern bir gerçek zamanlı iletişim sunucusudur.

## 🚀 Özellikler

### Temel WebSocket Özellikleri
- **Server-Sent Events (SSE)**: Gerçek zamanlı tek yönlü iletişim
- **Otomatik Yeniden Bağlanma**: Bağlantı kesildiğinde otomatik olarak yeniden bağlanır
- **Bağlantı Yönetimi**: Aktif bağlantıları izleme ve yönetme
- **Mesaj Yayını**: Tüm bağlı istemcilere mesaj gönderme

### Video Chat Özellikleri
- **WebRTC Entegrasyonu**: Peer-to-peer video görüşmeler
- **Oda Yönetimi**: Video chat odaları oluşturma ve yönetme
- **Sinyal Sunucusu**: WebRTC sinyalleme desteği
- **Çoklu Katılımcı**: Bir odada birden fazla katılımcı desteği

### Yönetici Özellikleri
- **Gerçek Zamanlı Dashboard**: Bağlantıları ve etkinlikleri izleme
- **Event Logging**: Detaylı sistem günlükleri
- **Sunucu Ayarları**: Dinamik sunucu konfigürasyonu
- **İstatistikler**: Canlı sunucu performans metrikleri

## 📁 Proje Yapısı

```
├── server/                 # Backend sunucu kodları
│   ├── index.ts           # Ana sunucu dosyası
│   ├── routes.ts          # API rotaları ve WebSocket logic
│   ├── storage.ts         # Veritabanı yönetimi
│   └── db.ts              # PostgreSQL bağlantısı
├── client/                # Frontend React uygulaması
│   ├── src/
│   │   ├── components/    # React bileşenleri
│   │   ├── pages/         # Sayfa bileşenleri
│   │   └── lib/           # Yardımcı kütüphaneler
├── shared/                # Ortak tip tanımları
│   └── schema.ts          # Drizzle ORM şemaları
└── integration_guide.md   # Bu dosya
```

## 🔧 Teknoloji Stack'i

### Backend
- **Node.js** + **Express.js**: Web sunucusu
- **TypeScript**: Tip güvenliği
- **PostgreSQL**: Veritabanı
- **Drizzle ORM**: Modern SQL toolkit
- **Server-Sent Events**: Gerçek zamanlı iletişim

### Frontend
- **React 18**: Modern UI kütüphanesi
- **TypeScript**: Tip güvenliği
- **TanStack Query**: Server state yönetimi
- **Tailwind CSS**: Styling
- **Radix UI**: Accessible UI bileşenleri

## 🚀 Hızlı Başlangıç

### 1. Gereksinimler
- Node.js 18+
- PostgreSQL veritabanı
- npm veya yarn

### 2. Kurulum
```bash
# Bağımlılıkları yükle
npm install

# Veritabanı yapısını oluştur
npm run db:push

# Geliştirme sunucusunu başlat
npm run dev
```

### 3. Çevre Değişkenleri
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/dbname
NODE_ENV=development
```

## 🔌 API Endpoint'leri

### WebSocket & SSE
- `GET /api/events` - SSE bağlantısı
- `POST /api/broadcast` - Mesaj yayını
- `GET /api/connections` - Aktif bağlantılar
- `DELETE /api/connections/:id` - Bağlantı kesme

### Video Chat
- `POST /api/video/rooms` - Video odası oluştur
- `GET /api/video/rooms` - Aktif odaları listele
- `POST /api/video/rooms/:id/join` - Odaya katıl
- `POST /api/video/rooms/:id/leave` - Odadan ayrıl
- `POST /api/webrtc/signal` - WebRTC sinyalleme

### Sistem Yönetimi
- `GET /api/stats` - Sunucu istatistikleri
- `GET /api/logs` - Event günlükleri
- `DELETE /api/logs` - Günlükleri temizle
- `GET /api/settings` - Sunucu ayarları
- `POST /api/settings` - Ayar güncelle

## 🎯 Mevcut Socket.IO'dan Geçiş

### Socket.IO Kodunu Değiştirme

**Eski Socket.IO kodu:**
```javascript
const io = require('socket.io')(server);

io.on('connection', (socket) => {
  socket.emit('welcome', 'Hoşgeldin!');
  
  socket.on('message', (data) => {
    io.emit('broadcast', data);
  });
});
```

**Yeni SSE tabanlı kod:**
```javascript
// Server tarafı (routes.ts'de mevcut)
app.get('/api/events', (req, res) => {
  const client = { id: nanoid(), response: res };
  sseClients.set(client.id, client);
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
});

app.post('/api/broadcast', (req, res) => {
  const message = req.body;
  sseClients.forEach(client => {
    client.response.write(`data: ${JSON.stringify(message)}\n\n`);
  });
});
```

**İstemci tarafı:**
```javascript
// SSE Client (lib/sse.ts'de mevcut)
const eventSource = new EventSource('/api/events');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Mesaj alındı:', data);
};

// Mesaj gönderme
fetch('/api/broadcast', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Merhaba!' })
});
```

## 🎮 Kullanım Örnekleri

### 1. Basit Mesaj Yayını
```javascript
// Tüm bağlı istemcilere mesaj gönder
await fetch('/api/broadcast', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'notification',
    message: 'Yeni güncelleme mevcut!'
  })
});
```

### 2. Video Odası Oluşturma
```javascript
const room = await fetch('/api/video/rooms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roomId: 'meeting-123',
    name: 'Takım Toplantısı',
    hostId: userId,
    maxParticipants: 10
  })
});
```

### 3. Sunucu Ayarı Güncelleme
```javascript
await fetch('/api/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: 'max_connections',
    value: '1000',
    description: 'Maksimum eşzamanlı bağlantı sayısı'
  })
});
```

## 🔍 Önemli Özellikler

### Otomatik Yeniden Bağlanma
SSE istemcisi bağlantı kesildiğinde otomatik olarak yeniden bağlanır:
- Exponential backoff stratejisi
- Maksimum 5 deneme
- Bağlantı durumu takibi

### Video Chat WebRTC
- STUN server desteği (Google STUN)
- ICE candidate değişimi
- Peer-to-peer bağlantı
- Çoklu katılımcı desteği

### Gerçek Zamanlı Dashboard
- Aktif bağlantı sayısı
- Mesaj istatistikleri
- Event günlükleri
- Sunucu uptime

## 📊 Veritabanı Şeması

### Ana Tablolar
- `users` - Kullanıcı bilgileri
- `connections` - Aktif SSE bağlantıları
- `messages` - Mesaj geçmişi
- `event_logs` - Sistem günlükleri
- `video_rooms` - Video chat odaları
- `video_participants` - Oda katılımcıları
- `server_settings` - Sunucu konfigürasyonu

## 🛠️ Geliştirme Notları

### TypeScript Entegrasyonu
Tüm proje TypeScript ile yazılmıştır ve güçlü tip güvenliği sağlar.

### Error Handling
Kapsamlı hata yönetimi ve loglama sistemi mevcuttur.

### Performance
- PostgreSQL connection pooling
- Efficient SSE connection management
- Optimized React rendering

## 🔗 Faydalı Linkler

- [Server-Sent Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [TanStack Query](https://tanstack.com/query/latest)

## 🤝 Katkıda Bulunma

Bu proje aktif geliştirme aşamasındadır. Özellik istekleri ve hata raporları için lütfen GitHub issues kullanın.

---

**Not**: Bu WebSocket sunucusu Socket.IO'ya tam uyumlu bir alternatif olarak tasarlanmıştır ve modern web standartlarını kullanarak daha iyi performans ve daha az bağımlılık sağlar.