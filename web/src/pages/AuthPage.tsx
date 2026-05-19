import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, LogIn, UserPlus } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function AuthPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Connect to backend API. For now, mock login.
    const mockToken = 'mock-jwt-token-123';
    const mockUser = {
      id: 1,
      fullName: isLoginMode ? 'Demo User' : fullName,
      email: email,
      score: 1450,
      isPremium: true,
    };
    
    login(mockUser, mockToken);
    navigate('/app/lobbies');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] -z-10" />

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-8 rounded-[24px] shadow-soft border border-border">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-softIndigo rounded-full flex items-center justify-center mb-4 shadow-sm">
            <Book className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-black text-textDark">StudyLounge</h2>
          <p className="text-textMuted font-medium mt-1">
            {isLoginMode ? 'Çalışma odasına giriş yap' : 'Öğrenci topluluğuna katıl'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginMode && (
            <div>
              <label className="block text-sm font-bold text-textDark mb-1.5">Ad Soyad</label>
              <input 
                type="text" 
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                placeholder="Örn: Enes Yıldırım"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-bold text-textDark mb-1.5">E-posta</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              placeholder="ogrenci@edu.tr"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-textDark mb-1.5">Şifre</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-secondary transition-colors flex items-center justify-center gap-2 mt-6"
          >
            {isLoginMode ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            {isLoginMode ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-textMuted text-sm font-medium">
            {isLoginMode ? "Hesabın yok mu? " : "Zaten hesabın var mı? "}
            <button 
              type="button"
              onClick={() => setIsLoginMode(!isLoginMode)}
              className="text-primary font-bold hover:underline"
            >
              {isLoginMode ? 'Hemen Kaydol' : 'Giriş Yap'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
