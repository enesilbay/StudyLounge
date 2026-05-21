import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, ArrowRight, CheckCircle2, KeyRound, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { api } from '../lib/api';
import { getApiErrorMessage } from '../lib/apiResponses';
import { BrandLockup, IconTile, Surface } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import logo from '../assets/images/logo.png';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export default function AuthPage() {
  const navigate = useNavigate();
  const { loginWithCredentials, registerWithCredentials, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/app/lobbies', { replace: true });
  }, [isAuthenticated, navigate]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setLocalError(null);
    setStatus(null);
    clearError();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    setStatus(null);

    if (mode === 'register' && (!fullName.trim() || !username.trim() || !email.trim() || !password)) return setLocalError('Lütfen tüm alanları doldurun.');
    if (mode === 'register' && !/^[a-zA-Z0-9_]+$/.test(username.trim())) return setLocalError('Kullanıcı adında sadece harf, rakam ve alt çizgi kullanın.');
    if ((mode === 'login' || mode === 'register') && (!email.trim() || !password)) return setLocalError('Lütfen e-posta ve şifre alanlarını doldurun.');

    try {
      if (mode === 'login') {
        await loginWithCredentials(email.trim(), password);
        navigate('/app/lobbies');
      } else if (mode === 'register') {
        await registerWithCredentials({ fullName: fullName.trim(), username: username.trim(), email: email.trim(), password });
        navigate('/app/lobbies');
      } else if (mode === 'forgot') {
        if (!email.trim()) return setLocalError('Lütfen e-posta adresinizi girin.');
        setLocalLoading(true);
        const response = await api.post('/auth/forgot-password', { email: email.trim() });
        setStatus(response.data?.message ?? 'Sıfırlama kodu gönderildi.');
        setMode('reset');
      } else {
        if (!email.trim() || !resetToken.trim() || !newPassword) return setLocalError('Lütfen e-posta, kod ve yeni şifre alanlarını doldurun.');
        setLocalLoading(true);
        const response = await api.post('/auth/reset-password', { email: email.trim(), token: resetToken.trim(), newPass: newPassword });
        setStatus(response.data?.message ?? 'Şifren güncellendi. Giriş yapabilirsin.');
        setMode('login');
        setPassword('');
        setResetToken('');
        setNewPassword('');
      }
    } catch (submitError) {
      setLocalError(getApiErrorMessage(submitError));
    } finally {
      setLocalLoading(false);
    }
  };

  const busy = isLoading || localLoading;
  const visibleError = localError ?? error;

  return (
    <div className="min-h-screen bg-background px-6 py-4 lg:px-10">
      <header className="mx-auto mb-4 flex max-w-[1600px] items-center justify-between">
        <BrandLockup large logoOnly />
        <button onClick={() => navigate('/')} className="min-h-11 rounded-xl border border-border bg-white px-5 text-base font-black text-textDark shadow-sm transition hover:bg-softIndigo">
          Ana sayfa
        </button>
      </header>

      <main className="mx-auto grid max-w-[1500px] grid-cols-1 items-center gap-12 lg:min-h-[calc(100vh-120px)] lg:grid-cols-[minmax(0,1fr)_540px]">
        <section className="hidden lg:block">
          <p className="text-sm font-black uppercase tracking-wide text-primary">StudyLounge hesabı</p>
          <h1 className="mt-3 max-w-3xl text-6xl font-black leading-tight text-textDark">Aynı hesapla web ve mobile devam et.</h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-textMuted">Lobi, profil, mağaza ve odak verileri aynı backend contractlarıyla tutulur. Giriş yaptıktan sonra web ve mobile aynı kullanıcı akışını paylaşır.</p>
          <Surface className="mt-7 grid max-w-2xl grid-cols-[92px_minmax(0,1fr)] gap-5 p-5">
            <img src={logo} alt="StudyLounge" className="h-24 w-24 object-contain" />
            <div className="min-w-0">
              <p className="text-2xl font-black text-textDark">Gerçek auth akışı</p>
              <p className="mt-1 text-base font-semibold leading-7 text-textMuted">JWT, kullanıcı verisi ve şifre sıfırlama mobile ile aynı endpointleri kullanır.</p>
            </div>
          </Surface>
          <div className="mt-5 grid max-w-2xl grid-cols-3 gap-4">
            {[LockKeyhole, UserRound, Mail].map((Icon, index) => (
              <Surface key={index} className="p-5">
                <IconTile icon={Icon} tone="primary" />
                <p className="mt-3 text-base font-black text-textDark">{['JWT', 'Profil', 'Reset'][index]}</p>
              </Surface>
            ))}
          </div>
        </section>

        <Surface className="p-6 shadow-md md:p-7">
          <div className="mb-6 text-center">
            <img src={logo} alt="StudyLounge" className="mx-auto h-20 w-20 object-contain" />
            <h2 className="mt-3 text-4xl font-black text-textDark">{titleForMode(mode)}</h2>
            <p className="mt-1 text-base font-semibold text-textMuted">{subtitleForMode(mode)}</p>
          </div>

          {(mode === 'login' || mode === 'register') ? (
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-border bg-background p-1">
              <button type="button" onClick={() => switchMode('login')} className={`min-h-11 rounded-lg text-base font-black ${mode === 'login' ? 'bg-white text-primary shadow-sm' : 'text-textMuted'}`}>Giriş Yap</button>
              <button type="button" onClick={() => switchMode('register')} className={`min-h-11 rounded-lg text-base font-black ${mode === 'register' ? 'bg-white text-primary shadow-sm' : 'text-textMuted'}`}>Kayıt Ol</button>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' ? (
              <>
                <Field label="Ad Soyad" icon={UserRound}><input value={fullName} onChange={(event) => setFullName(event.target.value)} className="min-h-12 flex-1 border-0 bg-transparent p-0 text-base font-bold outline-none" placeholder="Enes İlbay" required /></Field>
                <Field label="Kullanıcı adı" icon={UserRound}><input value={username} onChange={(event) => setUsername(event.target.value)} className="min-h-12 flex-1 border-0 bg-transparent p-0 text-base font-bold outline-none" placeholder="enes_123" pattern="[A-Za-z0-9_]+" maxLength={32} required /></Field>
              </>
            ) : null}
            <Field label="E-posta" icon={Mail}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-12 flex-1 border-0 bg-transparent p-0 text-base font-bold outline-none" placeholder="ogrenci@edu.tr" required /></Field>
            {(mode === 'login' || mode === 'register') ? <Field label="Şifre" icon={LockKeyhole}><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 flex-1 border-0 bg-transparent p-0 text-base font-bold outline-none" placeholder="Şifren" minLength={mode === 'register' ? 6 : 1} required /></Field> : null}
            {mode === 'reset' ? (
              <>
                <Field label="6 haneli kod" icon={KeyRound}><input value={resetToken} onChange={(event) => setResetToken(event.target.value)} className="min-h-12 flex-1 border-0 bg-transparent p-0 text-base font-bold outline-none" placeholder="123456" required /></Field>
                <Field label="Yeni şifre" icon={LockKeyhole}><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="min-h-12 flex-1 border-0 bg-transparent p-0 text-base font-bold outline-none" placeholder="Yeni şifren" minLength={6} required /></Field>
              </>
            ) : null}
            {mode === 'login' ? <button type="button" onClick={() => switchMode('forgot')} className="ml-auto block text-sm font-black text-accentDark">Şifremi Unuttum</button> : null}
            {visibleError ? <Message tone="danger" icon={AlertCircle}>{visibleError}</Message> : null}
            {status ? <Message tone="success" icon={CheckCircle2}>{status}</Message> : null}
            <button disabled={busy} className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-base font-black text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70">
              {busy ? 'Bağlanıyor...' : ctaForMode(mode)}
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>
          {(mode === 'forgot' || mode === 'reset') ? <button onClick={() => switchMode('login')} className="mt-4 w-full text-center text-sm font-black text-textMuted">Giriş ekranına dön</button> : null}
        </Surface>
      </main>
    </div>
  );
}

function titleForMode(mode: AuthMode) {
  if (mode === 'register') return 'Hesap oluştur';
  if (mode === 'forgot') return 'Şifremi unuttum';
  if (mode === 'reset') return 'Şifreyi sıfırla';
  return 'Tekrar hoş geldin';
}

function subtitleForMode(mode: AuthMode) {
  if (mode === 'register') return 'Yeni odak yolculuğunu başlat.';
  if (mode === 'forgot') return 'E-posta adresine sıfırlama kodu gönder.';
  if (mode === 'reset') return 'Kodunu gir ve yeni şifreni belirle.';
  return 'Çalışma odalarına devam et.';
}

function ctaForMode(mode: AuthMode) {
  if (mode === 'register') return 'Hesap Oluştur';
  if (mode === 'forgot') return 'Kod Gönder';
  if (mode === 'reset') return 'Şifreyi Güncelle';
  return 'Giriş Yap';
}

function Field({ label, icon: Icon, children }: { label: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-textDark">{label}</span>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4">
        <Icon className="h-4 w-4 shrink-0 text-textMuted" />
        {children}
      </div>
    </label>
  );
}

function Message({ tone, icon: Icon, children }: { tone: 'danger' | 'success'; icon: LucideIcon; children: ReactNode }) {
  const classes = tone === 'danger' ? 'border-danger/25 bg-softDanger text-danger' : 'border-success/25 bg-softSuccess text-success';
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${classes}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="text-sm font-bold leading-6 text-textDark">{children}</p>
    </div>
  );
}
