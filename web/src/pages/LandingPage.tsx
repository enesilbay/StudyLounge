import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Book, Users, Focus, LogIn, ChevronRight } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-textDark font-montserrat flex flex-col overflow-hidden relative">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] -z-10" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <img src="/src/assets/images/logo.png" alt="StudyLounge Logo" className="h-10 object-contain drop-shadow-sm" />
          <h1 className="text-2xl font-black text-primary tracking-tight">StudyLounge</h1>
        </div>
        <button 
          onClick={() => navigate('/app/lobbies')}
          className="flex items-center gap-2 bg-white/50 backdrop-blur-md border border-border px-5 py-2.5 rounded-full font-bold text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
        >
          <LogIn className="w-4 h-4" />
          Giriş Yap
        </button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-lightAmber text-accent font-bold text-sm tracking-wider mb-6 shadow-sm border border-accent/20">
            YENİ NESİL ÇALIŞMA PLATFORMU
          </span>
          <h2 className="text-6xl md:text-7xl font-black text-textDark leading-tight mb-6">
            Ayrı Masalarda, <br/>
            <span className="text-primary">Aynı Lobide.</span>
          </h2>
          <p className="text-xl md:text-2xl text-textMuted mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
            Telefonunu ters çevir, odaklanmaya başla. Arkadaşlarınla beraber motive ol ve dikkat dağıtıcıları ortadan kaldır.
          </p>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/app/lobbies')}
            className="bg-primary text-white px-10 py-5 rounded-full text-lg font-bold shadow-[0_10px_30px_rgba(26,35,126,0.3)] hover:bg-secondary transition-colors flex items-center gap-3 mx-auto"
          >
            Hemen Odaklan
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mx-auto mt-24">
          <FeatureCard 
            icon={<Focus className="w-8 h-8 text-white" />}
            title="Sıfır Dikkat Dağınıklığı"
            desc="Sekme değiştirdiğin anda odak modun bozulur. Sadece işine konsantre ol."
            color="bg-primary"
            delay={0.2}
          />
          <FeatureCard 
            icon={<Users className="w-8 h-8 text-white" />}
            title="Beraber Çalış"
            desc="Sanal çalışma odalarında diğer öğrencilerle motive ol, düellolara katıl."
            color="bg-accent"
            delay={0.3}
          />
          <FeatureCard 
            icon={<Book className="w-8 h-8 text-white" />}
            title="Pomodoro & Analiz"
            desc="Çalışma sürelerini takip et, liderlik tablosunda yüksel ve ödüller kazan."
            color="bg-success"
            delay={0.4}
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color, delay }: { icon: React.ReactNode, title: string, desc: string, color: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className="bg-white/70 backdrop-blur-xl p-8 rounded-[24px] border border-white shadow-soft flex flex-col items-start"
    >
      <div className={`${color} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-md`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-textDark mb-3">{title}</h3>
      <p className="text-textMuted leading-relaxed font-medium">
        {desc}
      </p>
    </motion.div>
  );
}
