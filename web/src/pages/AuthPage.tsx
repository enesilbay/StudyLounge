import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { AtSign, KeyRound, Loader2, Mail, MailCheck, UserRound } from 'lucide-react';
import { api } from '../lib/api';
import { getApiErrorMessage } from '../lib/apiResponses';
import { isPasswordValid } from '../lib/passwordRules';
import { Notice, ThemeToggle } from '../components/ui';
import { LogoMark } from '../components/brand/Logo';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { PasswordField } from '../components/auth/PasswordField';
import { useAuthStore } from '../store/authStore';
import type { AvatarGroup } from '../store/authStore';
import { characterAvatarPath } from '../lib/avatars';

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
  const [avatarGroup, setAvatarGroup] = useState<AvatarGroup | null>(null);
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
        const result = await registerWithCredentials({ fullName: fullName.trim(), username: username.trim(), email: email.trim(), password, ...(avatarGroup ? { avatarGroup } : {}) });
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
  const inputCls = 'min-h-12 min-w-0 flex-1 border-0 bg-transparent px-3.5 text-[15px] text-mb-ink outline-none placeholder:text-mb-body/70';
  // Sekmeler: giriş, kayıt, şifre sıfırlama (kod girme adımı da sıfırlama sekmesinde sayılır).
  const activeTab = mode === 'reset' ? 'forgot' : mode;

  return (
    <div className="sl-yeni relative flex min-h-screen flex-col overflow-hidden bg-mb-surface text-mb-ink">
      {/* Zemin: yavaşça kayan iki yumuşak ışık (yeşil ve lamba) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full opacity-70 blur-3xl motion-safe:animate-[sl-suzul_18s_ease-in-out_infinite]"
          style={{ background: 'radial-gradient(closest-side, var(--color-mb-tint), transparent)' }}
        />
        <div
          className="absolute -bottom-48 right-[-10rem] h-[40rem] w-[40rem] rounded-full opacity-60 blur-3xl motion-safe:animate-[sl-suzul_22s_ease-in-out_infinite_reverse]"
          style={{ background: 'radial-gradient(closest-side, color-mix(in srgb, var(--color-mb-lamp) 45%, transparent), transparent)' }}
        />
      </div>

      <header className="relative mx-auto flex w-full max-w-[75rem] items-center justify-between px-5 py-5 md:px-8">
        <Link to="/" aria-label="Ana sayfa" className="flex items-center gap-2.5">
          <LogoMark className="h-9 w-9 text-mb-action" />
          <span className="font-mb-display text-xl font-medium tracking-[-0.03em]">StudyLounge</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative mx-auto flex w-full max-w-[75rem] flex-1 items-center px-4 pb-10 md:px-8">
        {/* Dış çerçeve yalnızca tablet ve üstünde; telefonda form tek başına durur. */}
        <div className="grid w-full items-center gap-8 md:rounded-[32px] md:border md:border-mb-line/70 md:bg-mb-bg/60 md:p-6 md:shadow-mb-raised md:backdrop-blur-sm lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-10 lg:p-10">
          {/* ── Form kartı ── */}
          <div>
          <img src={AUTH_SCENE} alt="" aria-hidden="true" draggable={false} className="mx-auto -mb-2 w-44 select-none motion-safe:animate-[sl-yuz_7s_ease-in-out_infinite] sm:w-52 lg:hidden" />
          <section className="overflow-hidden rounded-[24px] border border-mb-line bg-mb-card shadow-mb-card">
            {mode !== 'verify' ? (
              <div role="tablist" aria-label="Hesap" className="grid grid-cols-3 border-b border-mb-line bg-mb-surface">
                {([
                  ['login', 'Giriş yap'],
                  ['register', 'Kayıt ol'],
                  ['forgot', 'Şifremi unuttum'],
                ] as const).map(([item, label]) => (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === item}
                    onClick={() => switchMode(item)}
                    className={`min-h-12 border-r border-mb-line px-2 text-[13px] font-medium transition last:border-r-0 sm:text-sm ${
                      activeTab === item ? 'bg-mb-card text-mb-ink' : 'text-mb-body hover:text-mb-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="p-5 sm:p-7">
              {/* Başlık: iki yanında ince çizgi */}
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-mb-line" aria-hidden="true" />
                {mode === 'verify' ? <MailCheck className="h-5 w-5 text-mb-action" aria-hidden="true" /> : null}
                <h1 className="font-mb-display text-[1.625rem] font-normal tracking-[-0.03em] text-mb-ink">{titleForMode(mode)}</h1>
                <span className="h-px flex-1 bg-mb-line" aria-hidden="true" />
              </div>
              {subtitleForMode(mode) ? <p className="mt-2 text-center text-sm leading-relaxed text-mb-body">{subtitleForMode(mode)}</p> : null}

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
                    <Field label="Kullanıcı adı" icon={AtSign}>
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
                    <AvatarGroupChoice value={avatarGroup} onChange={setAvatarGroup} />
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
                {visibleError ? <Notice tone="danger">{visibleError}</Notice> : null}
                {status ? <Notice tone={statusTone}>{status}</Notice> : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="relative mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-mb-action to-mb-action-2 px-6 text-[15px] font-medium text-mb-on-action shadow-mb-press transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  {ctaForMode(mode)}
                </button>
              </form>
              {mode === 'login' || mode === 'register' ? (
                <GoogleSignInButton onCredential={(credential) => void handleGoogleCredential(credential)} onError={setLocalError} />
              ) : null}
              {mode === 'verify' || mode === 'reset' ? (
                <button
                  type="button"
                  onClick={() => void resendCode()}
                  disabled={busy || cooldown > 0}
                  className="mt-4 w-full text-center text-sm font-medium text-mb-action hover:underline disabled:cursor-not-allowed disabled:text-mb-body disabled:no-underline"
                >
                  {cooldown > 0 ? `Kodu tekrar gönder (${cooldown} sn)` : 'Kodu tekrar gönder'}
                </button>
              ) : null}
              {mode === 'verify' ? (
                <button type="button" onClick={() => switchMode('login')} className="mt-3 w-full text-center text-sm font-medium text-mb-body hover:text-mb-ink">
                  Girişe dön
                </button>
              ) : null}
            </div>
          </section>
          </div>

          {/* ── Karşılama ve sahne (geniş ekran) ── */}
          <section aria-hidden="true" className="relative hidden min-h-[34rem] flex-col items-center justify-center text-center lg:flex">
            <LogoMark className="h-16 w-16 text-mb-action" />
            <p className="mt-5 max-w-md font-mb-display text-[2.25rem] font-light leading-[1.15] tracking-[-0.04em] text-mb-ink">
              Ayrı masalarda, <span className="text-mb-action">aynı lobide.</span>
            </p>
            <div className="relative mt-6 w-full max-w-[34rem]">
              <div
                className="absolute inset-x-6 bottom-4 top-10 rounded-full opacity-80 blur-3xl"
                style={{ background: 'radial-gradient(closest-side, color-mix(in srgb, var(--color-mb-action-2) 35%, transparent), transparent)' }}
              />
              <img src={AUTH_SCENE} alt="" draggable={false} className="relative mx-auto w-full select-none motion-safe:animate-[sl-yuz_7s_ease-in-out_infinite]" />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

/** Sağdaki sahne: ayrı masalarda, ortak sayaçla çalışan iki öğrenci. */
const AUTH_SCENE = '/landing/3b/giris-sahne.webp';

function titleForMode(mode: AuthMode) {
  if (mode === 'register') return 'Kayıt ol';
  if (mode === 'verify') return 'E-postanı doğrula';
  if (mode === 'forgot') return 'Şifre sıfırla';
  if (mode === 'reset') return 'Yeni şifre';
  return 'Giriş yap';
}

function subtitleForMode(mode: AuthMode) {
  if (mode === 'verify') return 'Gelen kutuna gönderdiğimiz 6 haneli kodu gir. Göremiyorsan spam klasörüne bak.';
  if (mode === 'forgot') return 'E-postana 6 haneli bir sıfırlama kodu göndereceğiz.';
  if (mode === 'reset') return 'Kodu ve yeni şifreni gir.';
  return null;
}

function ctaForMode(mode: AuthMode) {
  if (mode === 'register') return 'Hesap aç';
  if (mode === 'verify') return 'Doğrula ve giriş yap';
  if (mode === 'forgot') return 'Kodu gönder';
  if (mode === 'reset') return 'Şifreyi güncelle';
  return 'Giriş yap';
}

/** Hap biçimli alan: ikon solda kendi bölmesinde (referanstaki gibi). */
/** İsteğe bağlı başlangıç avatarı: seçilen gruptan rastgele bir karakter atanır; tekrar tıklayınca seçim kalkar. */
function AvatarGroupChoice({ value, onChange }: { value: AvatarGroup | null; onChange: (next: AvatarGroup | null) => void }) {
  const options: [AvatarGroup, string, number][] = [
    ['female', 'Kadın', 2],
    ['male', 'Erkek', 1],
  ];
  return (
    <fieldset>
      <legend className="mb-1.5 block pl-1 text-[13px] font-medium text-mb-ink">
        Avatarın <span className="font-normal text-mb-body">(isteğe bağlı)</span>
      </legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map(([group, label, character]) => {
          const selected = value === group;
          return (
            <button
              key={group}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : group)}
              className={`flex min-h-12 items-center gap-2.5 rounded-full border px-2 text-[15px] transition ${
                selected ? 'border-mb-action bg-mb-tint font-medium text-mb-ink' : 'border-mb-field bg-mb-surface text-mb-body hover:border-mb-action/50'
              }`}
            >
              <img src={characterAvatarPath(character)} alt="" className="h-8 w-8 rounded-full object-cover" />
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 pl-1 text-xs text-mb-body">Bu gruptan rastgele bir karakter alırsın; profilinden değiştirebilirsin. Seçimin kaydedilmez.</p>
    </fieldset>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block pl-1 text-[13px] font-medium text-mb-ink">{label}</span>
      <span className="flex items-stretch overflow-hidden rounded-full border border-mb-field bg-mb-surface transition focus-within:border-mb-action focus-within:bg-mb-card">
        <span className="grid w-12 shrink-0 place-items-center border-r border-mb-line text-mb-body">
          <Icon className="h-4 w-4" />
        </span>
        {children}
      </span>
    </label>
  );
}
