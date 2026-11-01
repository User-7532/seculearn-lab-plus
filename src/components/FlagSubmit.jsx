import { useState } from 'react';
import { Check, Flag, Loader2 } from 'lucide-react';

export default function FlagSubmit({ cleared, onAttempt }) {
  const [value, setValue] = useState('');
  const [state, setState] = useState('idle');
  const [message, setMessage] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!value.trim() || state === 'checking') return;
    setState('checking');
    setMessage('');
    const ok = await onAttempt(value.trim());
    if (ok) {
      setState('ok');
      setMessage('正解です。このラボはクリアしました。');
    } else {
      setState('wrong');
      setMessage('このフラグは違います。演習環境をもう一度観察してみましょう。');
    }
  };

  if (cleared || state === 'ok') {
    return (
      <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
          <Check className="h-3.5 w-3.5" /> cleared
        </div>
        <p className="mt-2 text-xs leading-relaxed text-foreground/85">
          このラボはクリア済みです。フラグの提出内容が記録に残ります。
        </p>
        <p className="mt-2 break-all font-mono text-[11px] text-primary">{value || 'FLAG{...}'}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
        <Flag className="h-3.5 w-3.5" /> flag submit
      </div>
      <form onSubmit={submit} className="space-y-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (state === 'wrong') setState('idle');
          }}
          placeholder="FLAG{...}"
          className="h-9 w-full rounded-lg border border-input bg-background px-3 font-mono text-[11px] outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={state === 'checking'}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-60"
        >
          {state === 'checking' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          提出する
        </button>
      </form>
      {message && (
        <p
          className={
            state === 'wrong'
              ? 'mt-2 text-[11px] leading-relaxed text-destructive'
              : 'mt-2 text-[11px] leading-relaxed text-primary'
          }
        >
          {message}
        </p>
      )}
    </div>
  );
}