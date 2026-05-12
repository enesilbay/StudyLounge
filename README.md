# 📚 StudyLounge

> **"Ayrı Masalarda, Aynı Lobide."**

StudyLounge, ders çalışırken yaşanan yalnızlık ve odaklanma sorununu çözen, sensör tabanlı sosyal bir ders çalışma uygulamasıdır.

## Ürün Vizyonu

Öğrencilerin yalnız başlarına çalışırken hissettikleri yalnızlığı, sanki bir "lobi"de arkadaşlarıyla berabermiş gibi hissettirerek kırmayı amaçlar. Telefonun masaya bırakılmasıyla aktifleşen sensörler, çalışma odasındaki diğer kişilere eşzamanlı bir "varlık" hissi iletir.

## Marka Kimliği

- **Ana Renk (Deep Indigo):** `#1A237E`
- **Vurgu Rengi (Amber Gold):** `#FFC107`
- **Tipografi:** Montserrat

---

## 🚀 Öne Çıkan Özellikler

- **🛰️ Sensör Destekli Varlık Takibi:** Cihazın ivmeölçer ve jiroskop verilerini kullanarak masada olup olmadığınızı anlık iletir.
- **🔊 Atmosfer Sesleri:** Yağmur, kütüphane, doğa ve gürültü seçenekleriyle odaklanma ortamı sağlar.
- **🏢 Global Study Lounges:** Aynı dersi çalışan yabancılarla buluşma ve akademik yardımlaşma ağı.
- **📊 Verimlilik Analitiği:** Günlük özetler, haftalık/aylık grafikler ve odaklanma puanları.
- **💬 Konu Bazlı Global Chat:** Sınav dönemlerinde aynı konu üzerine çalışanlarla güvenli iletişim.

---

## Tamamlananlar

- **[Backend]** NestJS ve PostgreSQL altyapısı kuruldu, veritabanı bağlantısı sağlandı.
- **[Security]** `bcrypt` ile güvenli kayıt ve şifreli giriş (login) sistemi entegre edildi.
- **[Sensor]** Accelerometer (ivmeölçer) verileriyle telefonun masadaki duruşunu algılayan algoritma yazıldı.
- **[Real-time]** Socket.io kullanılarak sensör verileri ve puanların anlık senkronizasyonu sağlandı.
- **[Lobby-System]** Dinamik lobi oluşturma ve listeleme API'ları entegre edildi.
- **[Global-Chat]** Lobi bazlı izole mesajlaşma sistemi (Socket.io) tamamlandı.
- **[Audio]** Lobiye giriş yapıldığında ve odaklanma başladığında çalan Atmosfer Sesleri (`expo-av`) eklendi.
- **[UI/UX]** Proje renk paletine (Deep Indigo & Amber Gold) uygun profesyonel ikonlu arayüz tasarlandı.
- **[Liderlik-Tablosu]** En çok odaklanan kullanıcıların sıralandığı "Günün En Çalışkanları" listesi.
- **[Beni-Hatırla]** Uygulama her açıldığında tekrar giriş yapma zorunluluğunun kaldırılması.
- **[Dashboard&Analitik]** Haftalık ve aylık odaklanma grafiklerinin kullanıcıya sunulması.
- **[User-Profile]** Sadece harf, rakam ve alt çizgiden oluşan benzersiz (unique) username (kullanıcı adı) sistemi ve güvenli doğrulama (Regex) entegre edildi.
- **[Social-Backend]** Friendship veritabanı altyapısı kuruldu; arkadaşlık isteği gönderme, gelen istekleri yanıtlama (kabul/red) ve arkadaş listeleme API'leri yazıldı.
- **[Grace-Period]** Cihazı kısa süreliğine elinize aldığınızda odaktan düşmeyi engelleyen 3 saniyelik mola toleransı eklendi.
- **[WebSocket-Heartbeat]** Bağlantı kopmalarına karşı otomatik yeniden bağlanma ve orphan user temizliği eklendi.
- **[Score-Sync]** Uygulama aniden kapandığında veya lobi çıkışında kazanılan odak puanının veritabanına kalıcı olarak işlenmesi sağlandı.
- **[Offline-Handling]** İnternet koptuğunda mobilde şeffaf uyarı gösterilmesi eklendi.
- **[Brand-Theme]** Uygulama renkleri Deep Indigo (#1A237E) ve Amber Gold (#FFC107) üzerine optimize edilerek tek merkezden yönetilebilir hale getirildi.
- **[Social-UI]** Arkadaşlık sisteminin (istek gönderme, yanıtlama, listeleme) mobil arayüz entegrasyonu tamamlandı.
- **[Push-Notifications]** Expo Push Token altyapısı kuruldu; arkadaşlar masaya geçtiğinde otomatik bildirim gönderimi entegre edildi.
- **[Nudge]** Arkadaşları odaya dürtme (çağırma) butonu eklendi; WebSocket ile anlık + Push bildirimi ile çevrimdışı bildirim desteği.
- **[Şifre-Sıfırlama]** Nodemailer ve Gmail SMTP entegrasyonu ile 6 haneli kod bazlı güvenli şifre sıfırlama sistemi tamamlandı.
- [x] **[Analytics]** `analytics.tsx` sayfası üzerinden gerçek API verileriyle haftalık odaklanma istatistiklerinin (Bar/Line chart) çizilmesi sağlandı.
- [x] **[Elite-Lounges]** Sadece Premium kullanıcılara açık (isPremiumOnly) Elite çalışma odaları (taç ikonlu ve altın renk vurgulu) oluşturma ve yetki kontrolü eklendi.
- [x] **[Sound-Mixer]** Elite Odalar (Premium) için aynı anda birden fazla atmosfer sesinin seviyesinin ayarlanıp birlikte dinlenebildiği Ses Mikseri özelliği eklendi.
- [x] **[Gamification]** Odak puanlarına dayalı Rütbe Sistemi (Çaylak'tan Efsane'ye) kuruldu; profil ekranına gelişim çubuğu ve liderlik tablosuna rütbe rozetleri eklendi.
- [x] **[Theme-Unification]** Tüm sayfalar (explore, analytics, leaderboard, premium, profile, sensor) tek tip lobi temasına dönüştürüldü; koyu sensor teması kaldırılıp açık/clean tema ile değiştirildi.
---

## 🗺️ Geliştirme Yol Haritası (Yapılacaklar)

### 🟢 İlk Yapılması Gerekenler (Stabilizasyon ve Core)
(Bu aşama tamamlandı)

### 🟡 Kullanıcı Deneyimi ve Sosyal Özellikler
(Bu aşamadaki hedefler tamamlandı)

### 🟣 Premium (PRO) Özellikler
- [x] Sınırsız ve yüksek kaliteli Ambient/Atmosfer sesi kütüphanesi ve 2-3 sesi aynı anda oynatabilen **Ses Mikseri**. (TAMAMLANDI - Elite Odalara Eklendi)
- [x] Profilde **Altın Rozet** ve liderlik tablosunda vurgulu görünüm. (TAMAMLANDI - Rütbe ve Rozet sistemi eklendi)
- [ ] Hangi saat aralıklarında daha verimli çalışıldığını gösteren detaylı **Sıcaklık Haritası (Heatmap)**.

---

**Proje Sahibi:** Enes İlbay

## Test Stabilizasyonu

- [x] Backend unit/e2e testleri, lint/build kontrolleri, mobile typecheck, Expo Doctor ve web build/lint kontrolleri calisir hale getirildi.
