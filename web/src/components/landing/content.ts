import { BatteryLow, Smartphone, UserX, type LucideIcon } from 'lucide-react';

/*
 * Açılış sayfasının metinleri. Görünümden bağımsızdır: Didasko ve Mobilo
 * sürümleri aynı içeriği kendi yerleşimleriyle gösterir. Gerçek olmayan bir
 * iddia (kullanıcı sayısı, puan, yorum) buraya yazılmaz (PRODUCT.md).
 */

export const navLinks = [
  { href: '#oda', label: 'Odada neler var' },
  { href: '#nasil', label: 'Nasıl çalışır' },
  { href: '#fiyat', label: 'Fiyat' },
  { href: '#sss', label: 'Sorular' },
];

export const hero = {
  tag: 'Birlikte çalışma odası',
  title: 'Ayrı masalarda, aynı lobide.',
  intro: 'StudyLounge, tek başına çalışan öğrencileri aynı sanal çalışma odasında buluşturur. Odaklanan herkesin lambası yanar; ortak sayaçla mola da birlikte gelir.',
  secondary: 'Nasıl çalıştığını gör',
  reassurance: 'Kamera açman gerekmez. Telefonda ve bilgisayarda aynı hesapla çalışır.',
};

export const problemSection = {
  title: 'Evde tek başına çalışmak zor',
  intro: 'Vize haftası da olsa, aylardır süren bir sınav hazırlığı da olsa sorun aynı: masada yalnızsın.',
};

export const problems: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: Smartphone,
    title: 'Dikkat dağılıyor',
    text: 'Telefon elinin altında, bir sekme daha açık. Kimse görmeyince "beş dakika ara" bir saate uzuyor.',
  },
  {
    icon: BatteryLow,
    title: 'Motivasyon eriyor',
    text: 'Aylara yayılan bir hazırlıkta her gün aynı saatte masaya oturmak, tek başına giderek zorlaşıyor.',
  },
  {
    icon: UserX,
    title: 'Yanında kimse yok',
    text: 'Kütüphanede yer yok, arkadaşların başka şehirde. Takıldığın soruyu soracak kimse yok.',
  },
];

/** Görünümün çizeceği şekil; her sürüm bunu kendi görseline eşler. */
export type FigureKey = 'timer' | 'board' | 'camera' | 'rooms' | 'phone' | 'break';

export type Benefit = { title: string; text: string; detail?: string; figure?: FigureKey };

export const benefitSection = {
  title: 'Odada neler var',
  intro: 'Bir çalışma odası, birlikte çalışmayı kolaylaştıran şeylerle gelir. Hepsi odaya girdiğin anda hazır.',
};

/** Her satırda bir geniş (çizimli) ve bir dar (yalnızca metin) özellik; sıra satır satır değişir. */
export const benefitRows: Array<[Benefit, Benefit]> = [
  [
    {
      title: 'Ortak sayaç',
      text: 'Odak ve mola sırayla gelir; katılan herkesin sayacı aynıdır. Duraklatan ya da bitiren kim olursa olsun odadaki herkes görür.',
      detail: 'Kendi sayacınla da çalışabilirsin; ortak sayaca katılmak isteğe bağlı.',
      figure: 'timer',
    },
    {
      title: 'Kamera zorunlu değil',
      text: 'Normal odalarda kamera hiç açılmaz. Odak, telefonun masada durmasıyla ya da tarayıcı sekmesinin açık kalmasıyla ölçülür.',
    },
  ],
  [
    {
      title: 'Dersler ve analitik',
      text: "Her oturum hangi derse ait olduğuyla kaydedilir. Analitik'te hangi derse ne kadar çalıştığını görürsün; üst üste çalıştığın günler serini büyütür.",
    },
    {
      title: 'Ortak tahta',
      text: 'Ders notunu PDF olarak yükle, odadaki herkes aynı sayfayı görsün. Kalemle çiz, fosforlu kalemle işaretle, lazerle bir yeri göster.',
      detail: 'Tablet kalemiyle bastırdıkça çizgi kalınlaşır; avuç içi dokunuşu çizim yapmaz.',
      figure: 'board',
    },
  ],
  [
    {
      title: 'İstersen kamera',
      text: 'Kameralı odalarda en fazla altı kişi görüntülü çalışır, takıldığı soruyu ekranını paylaşarak gösterir. Kamera ve mikrofon sen açana kadar kapalı kalır.',
      detail: 'Görüntü ve ses kaydedilmez.',
      figure: 'camera',
    },
    {
      title: 'Haftalık lig',
      text: 'Sıralama her pazartesi sıfırlanır. Arkadaşlarınla ya da herkesle yarışırsın; ilk üçe giren puan ödülü alır.',
    },
  ],
];

export const stepSection = {
  title: 'Üç adımda çalışma odası',
  intro: 'Kurulum yok, takvim ayarlamak yok. Odaya girersin, odaklanırsın; gerisi herkes için aynı anda işler.',
};

export const steps: Array<{ title: string; text: string; figure: FigureKey }> = [
  {
    title: 'Bir odaya gir',
    text: 'Konusuna göre açılmış odalardan birine katıl ya da arkadaşının kurduğu şifreli odaya gir. Kimin çalıştığını, kimin molada olduğunu hemen görürsün.',
    figure: 'rooms',
  },
  {
    title: 'Lambanı yak',
    text: 'Telefon uygulamasını açıp telefonu masaya bırakman yeterli; telefon masada durdukça süren işler. Bilgisayarda "Odaklan"a basarsın, sekmeden uzun süre ayrılırsan odak durur.',
    figure: 'phone',
  },
  {
    title: 'Birlikte mola ver',
    text: 'Biri ortak sayacı başlatınca katılan herkes aynı anda odaklanır, aynı anda mola verir. Sohbet molaya kalır; zil çalınca herkes masasına döner.',
    figure: 'break',
  },
];

export const pricingSection = {
  title: 'Ücretsiz başla',
  intro: 'Birlikte çalışmak için gereken her şey ücretsiz. Kendi odanı kurmak ve kameralı odalar için Premium var.',
  footnote: 'Premium dönemlik alınır, otomatik yenilenmez. Süre bitince hesabın ücretsiz plana döner; verilerin yerinde kalır.',
};

export const plans = {
  free: {
    name: 'Ücretsiz',
    description: 'Odalara katıl, birlikte çalış, ilerlemeni takip et.',
    price: '₺0',
    features: ['Odalara ve şifreli odalara katılma', 'Ortak sayaç ve ortak PDF tahtası', 'Oda sohbeti, özel mesaj ve arkadaşlar', 'Dersler ve istatistikler', 'Seri, rozetler ve haftalık lig'],
  },
  premium: {
    name: 'Premium',
    description: 'Kendi odanı kur, kameralı çalış, Elite odalara gir.',
    price: '₺49',
    period: '/ ay',
    note: 'ya da yıllık ₺499 (aylığa göre yılda ₺89 daha az)',
    action: "Premium'a geç",
    features: ['Ücretsiz plandaki her şey', 'Kendi odanı kurma, istersen şifreli', 'Kameralı oda açma (en fazla 6 kişi)', 'Elite odalar: odak süren iki kat sayılır', 'Ortam seslerini odadakilerle eşleme'],
  },
};

export const faqSection = { title: 'Sık sorulanlar' };

export const faqs = [
  {
    q: 'Ücretsiz mi?',
    a: 'Evet. Hesap açmak, odalara katılmak, ortak sayaç, ortak tahta, sohbet, istatistikler ve haftalık lig ücretsizdir.',
  },
  {
    q: 'Premium neler ekliyor?',
    a: 'Kendi odanı kurabilir, kameralı oda açabilir ve yalnızca Premium üyelerin girdiği, odak süresinin iki kat sayıldığı Elite odalara girebilirsin. Ortam seslerini de odadakilerle eşleyebilirsin.',
  },
  {
    q: 'Kamera açmam gerekiyor mu?',
    a: 'Hayır. Kamera yalnızca kameralı odalarda ve sen açarsan çalışır. Normal odalarda odak, telefonun masada durmasıyla ya da tarayıcı sekmesinin açık kalmasıyla ölçülür.',
  },
  {
    q: 'Telefonum yanımda değilse?',
    a: 'Bilgisayardan da çalışabilirsin. Odağı "Odaklan" düğmesi başlatır; sekmeden bir dakikadan uzun ayrılırsan odak duraklatılır. Aynı hesap telefonda ve bilgisayarda çalışır.',
  },
  {
    q: 'Verilerime ne oluyor?',
    a: "Kameralı odalarda görüntü ve ses kaydedilmez. Hesabını Ayarlar'dan istediğin an silebilirsin; oturum geçmişin, derslerin, görevlerin ve özel mesajların da silinir.",
  },
  {
    q: 'Arkadaşlarımla nasıl aynı odaya girerim?',
    a: 'Arkadaşını kullanıcı adıyla ekle, sonra aynı odaya katılın. Yalnızca sizin olacak bir oda istiyorsanız şifreli oda kurulabilir.',
  },
];

export const closing = {
  title: 'Bu akşam bir masa boş.',
  text: 'Hesap açmak bir dakika sürer. E-postanı doğrularsın, ilk odana girersin.',
};

export const footer = {
  author: 'Enes İlbay',
  credit: 'tarafından geliştirildi',
};
