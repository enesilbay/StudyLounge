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
      <label htmlFor={inputId} className="mb-1.5 block pl-1 text-[13px] font-medium text-mb-ink">
        {label}
      </label>
      {/* Hap biçimli alan: kilit solda, göster/gizle sağda kendi bölmesinde. */}
      <span className="flex items-stretch overflow-hidden rounded-full border border-mb-field bg-mb-surface transition focus-within:border-mb-action focus-within:bg-mb-card">
        <span className="grid w-12 shrink-0 place-items-center border-r border-mb-line text-mb-body">
          <LockKeyhole className="h-4 w-4" />
        </span>
        <input
          id={inputId}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-12 min-w-0 flex-1 border-0 bg-transparent px-3.5 text-[15px] text-mb-ink outline-none placeholder:text-mb-body/70"
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
          className="grid w-12 shrink-0 place-items-center border-l border-mb-line text-mb-body transition hover:text-mb-ink"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
      {showRules ? (
        <ul id={rulesId} className="mt-2.5 space-y-1 pl-1 text-[13px]" aria-live="polite">
          {rules.map((rule) => (
            <li key={rule.id} className={`flex items-center gap-2 ${rule.met ? 'text-mb-action-ink' : 'text-mb-body'}`}>
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
