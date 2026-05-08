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
- **[Grace-Period]** Cihazı kısa süreliğine elinize aldığınızda odaktan düşmeyi engelleyen 10 saniyelik mola toleransı eklendi.
- **[WebSocket-Heartbeat]** Bağlantı kopmalarına karşı otomatik yeniden bağlanma ve orphan user temizliği eklendi.
- **[Score-Sync]** Uygulama aniden kapandığında veya lobi çıkışında kazanılan odak puanının veritabanına kalıcı olarak işlenmesi sağlandı.
- **[Offline-Handling]** İnternet koptuğunda mobilde şeffaf uyarı gösterilmesi eklendi.

---

## 🗺️ Geliştirme Yol Haritası (Yapılacaklar)

### 🟢 İlk Yapılması Gerekenler (Stabilizasyon ve Core)

- [ ] **Marka / UX Uyumu:** UI bileşenlerini marka paletiyle (Deep Indigo & Amber Gold) tek merkezden yönetmek.

### 🟡 Kullanıcı Deneyimi ve Sosyal Özellikler
- [ ] **Arkadaş Ekleme Sistemi (UI Entegrasyonu):** API'si hazır olan arkadaşlık sisteminin mobil arayüze bağlanması.
- [ ] **Bildirim Sistemi (Push Notifications):** Expo Push Token ile "Odan seni bekliyor", "Ahmet masaya geçti" bildirimlerini hayata geçirmek.
- [ ] **Analytics (Grafikler):** `analytics.tsx` sayfasını gerçek istatistiklere (Bar/Line chart) dönüştürmek.
- [ ] **Şifremi Unuttum Akışı:** E-posta doğrulama ve şifre sıfırlama sistemi.
- [ ] **"Birlikte Çalışmaya Çağır" (Nudge):** Arkadaşları odaya dürtme (çağırma) butonu.

### 🟣 Premium (PRO) Özellikler
- [ ] Sınırsız ve yüksek kaliteli Ambient/Atmosfer sesi kütüphanesi ve 2-3 sesi aynı anda oynatabilen **Ses Mikseri**.
- [ ] Odalara özel şifreli veya sadece Premium'lara açık **Elite Lounges**.
- [ ] Hangi saat aralıklarında daha verimli çalışıldığını gösteren detaylı **Sıcaklık Haritası (Heatmap)**.
- [ ] Mesajlaşmada gönderilebilen dosya/görsel boyutu limitinin artırılması.
- [ ] Profilde **Altın Rozet** ve liderlik tablosunda vurgulu görünüm.

---

**Proje Sahibi:** Enes İlbay
