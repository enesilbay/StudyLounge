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

Şu ana kadar uygulamanın iskeletini ve çekirdek fonksiyonlarını başarıyla tamamladık:

- **[Backend]** NestJS ve PostgreSQL altyapısı kuruldu, veritabanı bağlantısı sağlandı.
- **[Security]** `bcrypt` ile güvenli kayıt ve şifreli giriş (login) sistemi entegre edildi.
- **[Sensor]** Accelerometer (ivmeölçer) verileriyle telefonun masadaki duruşunu algılayan algoritma yazıldı.
- **[Real-time]** Socket.io kullanılarak sensör verileri ve puanların anlık senkronizasyonu sağlandı.
- **[Lobbies]** Lobi seçim ekranı tasarlandı ve "Odalara Katılma" (Room join) mantığı eklendi.
- **[Audio]** Lobiye giriş yapıldığında ve odaklanma başladığında çalan Atmosfer Sesleri (`expo-av`) eklendi.
- **[UI/UX]** Proje renk paletine (Deep Indigo & Amber Gold) uygun profesyonel ikonlu arayüz tasarlandı.

---

## Yapılacaklar

- [ ] **Lobi Kurma Özelliği:** Kullanıcıların kendi özel çalışma odalarını oluşturabilmesi.
- [ ] **Global Chat:** Lobi içindeyken diğer kullanıcılarla iletişim kurulabilecek anlık mesajlaşma sistemi.
- [ ] **Dashboard & Analitik:** Haftalık ve aylık odaklanma grafiklerinin kullanıcıya sunulması.
- [ ] **Premium Üyelik Sistemi:** Ödeme entegrasyonu ve Premium rozetlerin tanımlanması.
- [ ] **Beni Hatırla (Auth Persistence):** Uygulama her açıldığında tekrar giriş yapma zorunluluğunun kaldırılması.
- [ ] **Liderlik Tablosu:** En çok odaklanan kullanıcıların sıralandığı "Günün En Çalışkanları" listesi.
- [ ] **Bildirim Sistemi:** Arkadaşın masaya oturduğunda veya çalışma süren dolduğunda gelecek bildirimler.

---

**Proje Sahibi:** Enes İlbay
