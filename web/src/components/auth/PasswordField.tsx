import { useId, useState } from 'react';
import { Check, Circle, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { checkPassword } from '../../lib/passwordRules';

/**
 * Şifre alanı: göster/gizle düğmesi ve (yeni şifrede) yazarken güncellenen kural listesi.
 * `name` ve `autoComplete`, Chrome'un şifre yöneticisinin alanları doğru eşlemesi içindir.
 */
export function PasswordField({
  label,
  value,
  onChange,
  name,
  autoComplete,
  placeholder,
  showRules = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  name: string;
  autoComplete: 'current-password' | 'new-password';
  placeholder?: string;
  showRules?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  const rulesId = useId();
  const rules = checkPassword(value);

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-textDark">
        {label}
      </label>
      <span className="flex items-center gap-3 rounded-lg border border-border bg-sunken pl-3.5 transition focus-within:border-accent">
        <LockKeyhole className="h-4 w-4 shrink-0 text-textMuted" />
        <input
          id={inputId}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-textDark outline-none"
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby={showRules ? rulesId : undefined}
          required
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
          aria-pressed={visible}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-r-lg text-textMuted transition hover:text-textDark"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
      {showRules ? (
        <ul id={rulesId} className="mt-2 space-y-1 text-sm" aria-live="polite">
          {rules.map((rule) => (
            <li key={rule.id} className={`flex items-center gap-2 ${rule.met ? 'text-success' : 'text-textMuted'}`}>
              {rule.met ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5" aria-hidden="true" />}
              {rule.label}
              <span className="sr-only">{rule.met ? ' (tamam)' : ' (eksik)'}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
