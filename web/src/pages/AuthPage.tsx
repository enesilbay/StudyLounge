import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { AtSign, KeyRound, Mail, MailCheck, UserRound } from 'lucide-react';
import { api } from '../lib/api';
import { getApiErrorMessage } from '../lib/apiResponses';
import { isPasswordValid } from '../lib/passwordRules';
import { BrandLockup, Button, LampMark, Notice, ThemeToggle } from '../components/ui';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { PasswordField } from '../components/auth/PasswordField';
import { useAuthStore } from '../store/authStore';

type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

/** Aynı adrese art arda kod istenmesin diye "Kodu tekrar gönder" bu kadar bekletilir. */
const RESEND_COOLDOWN_SECONDS = 60;

export default function AuthPage() {
  const navigate = useNavigate();
  const { loginWithCredentials, loginWithGoogle, registerWithCredentials, verifyEmail, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  // Açılış sayfasındaki "Ücretsiz hesap aç" doğrudan kayıt formunu açar (/auth?mod=kayit).
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(() => (searchParams.get('mod') === 'kayit' ? 'register' : 'login'));
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  /** Giriş formunda e-posta ya da kullanıcı adı. */
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'success' | 'danger'>('success');
  const [localLoading, setLocalLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // E-posta gittiyse yeşil bilgi ve bekleme süresi; gitmediyse kırmızı uyarı (hemen tekrar denenebilir).
  const showMailStatus = (message: string, mailSent: boolean) => {
    setStatus(message);
    setStatusTone(mailSent ? 'success' : 'danger');
    setCooldown(mailSent ? RESEND_COOLDOWN_SECONDS : 0);
  };

  useEffect(() => {
    if (isAuthenticated) navigate('/app/lobbies', { replace: true });
  }, [isAuthenticated, navigate]);

  const switchMode = (nextMode: AuthMode) => {
    // Girişte yazılan e-posta, kayıt ve şifre sıfırlama formuna taşınır.
    if (nextMode !== 'login' && !email && identifier.includes('@')) setEmail(identifier.trim());
    setMode(nextMode);
    setLocalError(null);
    setStatus(null);
    clearError();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    setStatus(null);

    if (mode === 'login' && (!identifier.trim() || !password)) return setLocalError('E-posta ya da kullanıcı adınla şifreni gir.');
    if (mode === 'register' && (!fullName.trim() || !username.trim() || !email.trim() || !password)) return setLocalError('Tüm alanları doldur.');
    if (mode === 'register' && !/^[a-zA-Z0-9_]+$/.test(username.trim())) return setLocalError('Kullanıcı adında sadece harf, rakam ve alt çizgi kullanabilirsin.');
    if (mode === 'register' && !isPasswordValid(password)) return setLocalError('Şifren aşağıdaki kuralların hepsine uymalı.');

    try {
      if (mode === 'login') {
        const result = await loginWithCredentials(identifier.trim(), password);
        if (result.requiresVerification) {
          // Kullanıcı adıyla girildiyse doğrulama için hesabın e-postası backend'den gelir.
          setEmail(result.email ?? (identifier.includes('@') ? identifier.trim() : ''));
          setMode('verify');
          showMailStatus(result.message ?? 'Hesabın henüz doğrulanmadı. E-postana yeni bir kod gönderdik.', result.mailSent !== false);
          return;
        }
        navigate('/app/lobbies');
      } else if (mode === 'register') {
        const result = await registerWithCredentials({ fullName: fullName.trim(), username: username.trim(), email: email.trim(), password });
        setMode('verify');
        showMailStatus(
          result.mailSent ? `${email.trim()} adresine 6 haneli bir doğrulama kodu gönderdik.` : result.message ?? 'Doğrulama e-postası gönderilemedi.',
          result.mailSent,
        );
      } else if (mode === 'verify') {
        if (!/^\d{6}$/.test(verifyCode.trim())) return setLocalError('Kod 6 rakamdan oluşur.');
        await verifyEmail(email.trim(), verifyCode.trim());
        navigate('/app/lobbies');
      } else if (mode === 'forgot') {
        if (!email.trim()) return setLocalError('E-posta adresini gir.');
        setLocalLoading(true);
        const response = await api.post('/auth/forgot-password', { email: email.trim() });
        showMailStatus(response.data?.message ?? 'Sıfırlama kodu gönderildi.', true);
        setMode('reset');
      } else {
        if (!email.trim() || !resetToken.trim() || !newPassword) return setLocalError('E-posta, kod ve yeni şifre alanlarını doldur.');
        if (!isPasswordValid(newPassword)) return setLocalError('Yeni şifren aşağıdaki kuralların hepsine uymalı.');
        setLocalLoading(true);
        const response = await api.post('/auth/reset-password', { email: email.trim(), token: resetToken.trim(), newPass: newPassword });
        setStatus(response.data?.message ?? 'Şifren güncellendi. Giriş yapabilirsin.');
        setStatusTone('success');
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

  // Doğrulama ekranında doğrulama kodunu, şifre sıfırlamada sıfırlama kodunu yeniden ister.
  const resendCode = async () => {
    if (cooldown > 0 || !email.trim()) return;
    setLocalError(null);
    setStatus(null);
    setLocalLoading(true);
    try {
      const endpoint = mode === 'reset' ? '/auth/forgot-password' : '/auth/resend-verification';
      const response = await api.post(endpoint, { email: email.trim() });
      showMailStatus(response.data?.message ?? 'Yeni kod gönderildi.', true);
    } catch (resendError) {
      setLocalError(getApiErrorMessage(resendError));
    } finally {
      setLocalLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setLocalError(null);
    setStatus(null);
    try {
      await loginWithGoogle(credential);
      navigate('/app/lobbies');
    } catch {
      // Hata mesajı store'daki `error` ile gösterilir.
    }
  };

  const busy = isLoading || localLoading;
  const visibleError = localError ?? error;
  const inputCls = 'min-h-11 min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-textDark outline-none';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <Link to="/" aria-label="Ana sayfa">
          <BrandLockup />
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-5 pb-16 md:px-8 lg:grid-cols-[1fr_440px]">
        <section className="hidden lg:block">
          <LampMark className="h-16 w-16" />
          <h1 className="mt-6 max-w-lg text-5xl leading-[1.1]">Masan seni bekliyor.</h1>
          <p className="mt-5 max-w-md text-lg leading-8 text-textMuted">
            Telefonda ve web’de aynı hesabı kullanırsın. Odak süren, serin ve puanların iki tarafta da seninle gelir.
          </p>
        </section>

        <section className="sl-panel p-6 md:p-8">
          {mode === 'verify' ? <MailCheck className="mb-3 h-8 w-8 text-primary" /> : null}
          <h2 className="text-3xl">{titleForMode(mode)}</h2>
          <p className="mt-1 text-base text-textMuted">{subtitleForMode(mode)}</p>

          {mode === 'login' || mode === 'register' ? (
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-sunken p-1" role="tablist">
              {(['login', 'register'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={mode === item}
                  onClick={() => switchMode(item)}
                  className={`min-h-10 rounded-md text-[15px] font-semibold transition ${mode === item ? 'bg-surface text-textDark shadow-sm' : 'text-textMuted hover:text-textDark'}`}
                >
                  {item === 'login' ? 'Giriş yap' : 'Kayıt ol'}
                </button>
              ))}
            </div>
          ) : null}

          {/* Her alanın sabit bir name/autocomplete çifti var: Chrome kayıtta kullanıcı adını
              "username" olarak saklar, girişte de aynı alana doldurur. Giriş alanı hem e-postayı
              hem kullanıcı adını kabul ettiği için hangisi doldurulursa doldurulsun giriş çalışır. */}
          <form key={mode} onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'login' ? (
              <Field label="E-posta veya kullanıcı adı" icon={AtSign}>
                <input
                  name="username"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className={inputCls}
                  placeholder="ornek@gmail.com"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={120}
                  required
                />
              </Field>
            ) : null}
            {mode === 'register' ? (
              <>
                <Field label="Ad soyad" icon={UserRound}>
                  <input name="name" value={fullName} onChange={(event) => setFullName(event.target.value)} className={inputCls} placeholder="Adın ve soyadın" autoComplete="name" required />
                </Field>
                <Field label="Kullanıcı adı" icon={UserRound}>
                  <input
                    name="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className={inputCls}
                    placeholder="harf, rakam ve _"
                    pattern="[A-Za-z0-9_]+"
                    maxLength={32}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                  />
                </Field>
              </>
            ) : null}
            {mode === 'register' || mode === 'forgot' || mode === 'reset' ? (
              <Field label="E-posta" icon={Mail}>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputCls}
                  placeholder="ornek@gmail.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
              </Field>
            ) : null}
            {mode === 'login' || mode === 'register' ? (
              <PasswordField
                label="Şifre"
                name={mode === 'register' ? 'new-password' : 'password'}
                value={password}
                onChange={setPassword}
                placeholder={mode === 'register' ? 'Yeni bir şifre belirle' : 'Şifren'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                showRules={mode === 'register'}
              />
            ) : null}
            {mode === 'verify' ? (
              <Field label="Doğrulama kodu" icon={KeyRound}>
                <input
                  value={verifyCode}
                  onChange={(event) => setVerifyCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${inputCls} font-mono text-xl tracking-[0.3em]`}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  required
                />
              </Field>
            ) : null}
            {mode === 'reset' ? (
              <>
                <Field label="E-postana gelen 6 haneli kod" icon={KeyRound}>
                  <input name="one-time-code" value={resetToken} onChange={(event) => setResetToken(event.target.value)} className={inputCls} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" required />
                </Field>
                <PasswordField label="Yeni şifre" name="new-password" value={newPassword} onChange={setNewPassword} placeholder="Yeni bir şifre belirle" autoComplete="new-password" showRules />
              </>
            ) : null}
            {mode === 'login' ? (
              <button type="button" onClick={() => switchMode('forgot')} className="ml-auto block text-sm font-semibold text-accentDark hover:underline">
                Şifremi unuttum
              </button>
            ) : null}
            {visibleError ? <Notice tone="danger">{visibleError}</Notice> : null}
            {status ? <Notice tone={statusTone}>{status}</Notice> : null}
            <Button type="submit" size="lg" loading={busy} className="w-full">
              {ctaForMode(mode)}
            </Button>
          </form>
          {mode === 'login' || mode === 'register' ? (
            <GoogleSignInButton onCredential={(credential) => void handleGoogleCredential(credential)} onError={setLocalError} />
          ) : null}
          {mode === 'verify' || mode === 'reset' ? (
            <button
              type="button"
              onClick={() => void resendCode()}
              disabled={busy || cooldown > 0}
              className="mt-4 w-full text-center text-sm font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-textMuted disabled:no-underline"
            >
              {cooldown > 0 ? `Kodu tekrar gönder (${cooldown} sn)` : 'Kodu tekrar gönder'}
            </button>
          ) : null}
          {mode === 'forgot' || mode === 'reset' || mode === 'verify' ? (
            <button onClick={() => switchMode('login')} className="mt-4 w-full text-center text-sm font-semibold text-textMuted hover:text-textDark">
              Girişe dön
            </button>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function titleForMode(mode: AuthMode) {
  if (mode === 'register') return 'Hesap aç';
  if (mode === 'verify') return 'E-postanı doğrula';
  if (mode === 'forgot') return 'Şifreni mi unuttun?';
  if (mode === 'reset') return 'Yeni şifre belirle';
  return 'Tekrar hoş geldin';
}

function subtitleForMode(mode: AuthMode) {
  if (mode === 'register') return 'Ücretsiz, bir dakikadan kısa sürer.';
  if (mode === 'verify') return 'Gelen kutuna gönderdiğimiz 6 haneli kodu gir. Göremiyorsan spam klasörüne bak.';
  if (mode === 'forgot') return 'E-postana 6 haneli bir sıfırlama kodu göndereceğiz.';
  if (mode === 'reset') return 'Kodu ve yeni şifreni gir.';
  return 'Kaldığın masadan devam et.';
}

function ctaForMode(mode: AuthMode) {
  if (mode === 'register') return 'Hesap aç';
  if (mode === 'verify') return 'Doğrula ve giriş yap';
  if (mode === 'forgot') return 'Kodu gönder';
  if (mode === 'reset') return 'Şifreyi güncelle';
  return 'Giriş yap';
}

function Field({ label, icon: Icon, children }: { label: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-textDark">{label}</span>
      <span className="flex items-center gap-3 rounded-lg border border-border bg-sunken px-3.5 transition focus-within:border-accent">
        <Icon className="h-4 w-4 shrink-0 text-textMuted" />
        {children}
      </span>
    </label>
  );
}
