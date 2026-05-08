# Mobile UX Adviser

Bu skill, StudyLounge mobil uygulamasında ekran tasarımı, kullanıcı deneyimi, akış düzeni ve mobil etkileşimleri geliştirirken kullanılır.

## Proje Bağlamı

StudyLounge, öğrencilerin yalnız ders çalışma hissini azaltan ve odaklanmayı artıran sosyal bir ders çalışma uygulamasıdır.

Temel fikir:
- Kullanıcı telefonunu masaya bıraktığında sensörler masada olduğunu algılar.
- Kullanıcının masada olma durumu çalışma odasındaki arkadaşlara küçük bir ışık / durum göstergesiyle iletilir.
- Kamera zorunlu değildir.
- Mahremiyet korunur.
- Kullanıcı kendini gözetleniyor gibi değil, arkadaşlarıyla aynı ortamdaymış gibi hissetmelidir.

## UX İlkeleri

Mobil arayüz önerirken şu ilkelere uy:

- Kullanıcıyı yormayan sade ekranlar tasarla.
- Odaklanma sırasında dikkat dağıtıcı animasyonlardan kaçın.
- Çalışma odası ekranı mümkün olduğunca sakin, net ve anlaşılır olmalı.
- Kullanıcı masadayken durum göstergeleri belirgin ama rahatsız etmeyecek şekilde olmalı.
- Kamera yerine sensör tabanlı varlık hissi vurgulanmalı.
- Öğrenci dostu, modern ve güven veren bir tasarım dili kullanılmalı.
- Gereksiz buton, modal ve bildirim kalabalığından kaçınılmalı.
- Tek elle kullanım ve küçük ekran uyumu dikkate alınmalı.
- iOS ve Android davranış farkları göz önünde bulundurulmalı.

## Marka ve Görsel Dil

StudyLounge marka kimliği:
- Odaklanma
- Mahremiyet
- Akademik dayanışma
- Sosyallik

Renk paleti:
- Ana renk: #1A237E Deep Indigo
- Yardımcı renk: #FFC107 Amber
- Nötr arka plan: beyaz veya açık gri tonları

Tipografi:
- Tercih edilen font: Montserrat
- Başlıklar net ve güçlü olmalı.
- Açıklama metinleri kısa ve okunabilir olmalı.

Genel görünüm:
- Modern
- Minimal
- Güvenilir
- Öğrenci dostu
- Hafif yuvarlatılmış kartlar
- Net ikonlar
- Yumuşak gölgeler

## Ana Ekranlar İçin UX Beklentileri

### Giriş / Kayıt Ekranı

- Kullanıcıya uygulamanın değer önerisi hızlıca anlatılmalı.
- “Kamera yok, sadece beraber çalışma hissi” mesajı net verilmeli.
- Kayıt süreci mümkün olduğunca kısa tutulmalı.

### Ana Sayfa

- Kullanıcının çalışma durumu, toplam odak süresi ve aktif odaları kolayca görünmeli.
- “Çalışmaya Başla” aksiyonu en belirgin buton olmalı.
- Günlük odak özeti sade bir kart içinde gösterilebilir.

### Çalışma Odası Ekranı

- En kritik ekran burasıdır.
- Kullanıcının ve arkadaşlarının masada olup olmadığı ışık / durum halkası ile gösterilmeli.
- Atmosfer sesi kontrolü sade olmalı.
- Sohbet varsa odak modunu bozmayacak şekilde konumlandırılmalı.
- Kullanıcı masadan ayrıldığında durum yumuşak bir geçişle güncellenmeli.
- Sensör verisi teknik olarak gösterilmemeli; kullanıcıya basit durum diliyle anlatılmalı.

Örnek durum metinleri:
- “Masadasın”
- “Arkadaşın da çalışıyor”
- “Kısa bir mola verdin”
- “Odaya geri dön”

### Global Lounge Ekranı

- Ders / konu bazlı odalar kolayca listelenmeli.
- Kullanıcılar güvenli ve kontrollü bir sohbet deneyimi yaşamalı.
- Kalabalık hissi yerine “aynı amaç için çalışan topluluk” hissi verilmelidir.

### Analitik / Özet Ekranı

- Günlük, haftalık ve aylık odaklanma verileri basit grafiklerle gösterilmeli.
- Kullanıcıyı suçlayıcı dil kullanılmamalı.
- Motivasyon verici geri bildirim tercih edilmeli.

Örnek:
- Kötü: “Bugün çok az çalıştın.”
- İyi: “Bugün kısa ama değerli bir odak oturumu yaptın.”

## Premium UX Kuralları

Premium özellikler gösterilirken:
- Kullanıcı baskı altında hissettirilmemeli.
- Free kullanıcı deneyimi gereksiz şekilde kötüleştirilmemeli.
- Premium faydaları açık, kısa ve gerçek değer odaklı anlatılmalı.

Premium vurguları:
- Çoklu grup odaları
- Global Study Lounges
- Detaylı analitik
- Profil rozetleri
- Reklamsız deneyim
- Sınırsız PDF / not paylaşımı

## Bildirim ve Uyarı Dili

Bildirimler kısa, nazik ve motive edici olmalı.

Örnek iyi bildirimler:
- “Ahmet masaya geçti. Sen de katılmak ister misin?”
- “10 dakikalık güzel bir odak başlangıcı yaptın.”
- “Odan sessizce seni bekliyor.”
- “Kısa mola bittiğinde kaldığın yerden devam edebilirsin.”

Kaçınılması gerekenler:
- Baskıcı bildirimler
- Suçlayıcı ifadeler
- Aşırı rekabetçi dil
- Sürekli dikkat dağıtan uyarılar

## Mobil Teknik Gerçekler

React Native Expo kullanılmaktadır.

Dikkat edilmesi gerekenler:
- Sensör izinleri kullanıcıya açık ve güven veren dille anlatılmalı.
- Pil tüketimi minimize edilmeli.
- Arka plan çalışma davranışı platformlara göre değişebilir.
- Offline / bağlantı kopması durumları için kullanıcıya net geri bildirim verilmeli.
- WebSocket bağlantı durumu arayüzde basitçe gösterilebilir.
- Küçük ekranlarda kartlar ve butonlar taşmamalı.
- SafeAreaView kullanılmalı.
- Klavye açıldığında input alanları kapanmamalı.

## Çıktı Formatı

Mobil UX önerisi verirken mümkünse şu formatı kullan:

1. Amaç
2. Kullanıcı akışı
3. Ekran yerleşimi
4. Bileşen önerileri
5. Mikro metinler
6. Riskler
7. İyileştirme önerileri

Kod önerisi verilecekse:
- React Native Expo uyumlu olmalı.
- Mevcut StudyLounge renkleri kullanılmalı.
- Gereksiz büyük kütüphane önermemeli.
- Sade, okunabilir ve sürdürülebilir yapı tercih edilmeli.