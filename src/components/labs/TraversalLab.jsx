import { useState } from 'react';
import LabShell from './LabShell';
import { FileText, ShieldAlert } from 'lucide-react';

const FILES = {
  'welcome.txt': 'DocVault へようこそ。公開フォルダのファイルのみ表示できます。',
  'guide.md': '# 使い方\nファイル名を入力すると内容が表示されます。',
};

export default function TraversalLab() {
  const [name, setName] = useState('');
  const [result, setResult] = useState(null);

  const open = (e) => {
    e.preventDefault();
    const raw = name.trim();
    const path = `/srv/www/public/${raw}`;
    const escaped = raw.includes('..') && /secret|etc/i.test(raw);

    if (escaped) {
      setResult({ state: 'escaped', path });
      return;
    }
    if (FILES[raw]) {
      setResult({ state: 'ok', path, content: FILES[raw] });
      return;
    }
    setResult({ state: 'missing', path });
  };

  return (
    <LabShell title="DocVault" host="docvault.sandbox.local/view?file=">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h4 className="font-heading text-base font-semibold">ファイルビューア</h4>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          公開ファイル: <span className="font-mono">welcome.txt</span> /{' '}
          <span className="font-mono">guide.md</span>
        </p>
      </div>

      <form onSubmit={open} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="welcome.txt"
          className="h-9 flex-1 rounded-lg border border-input bg-background px-3 font-mono text-xs outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          開く
        </button>
      </form>

      {result && (
        <div className="mt-5 space-y-3">
          <div className="rounded-lg border border-border bg-background/70 p-3">
            <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              解決されたパス
            </p>
            <code className="block break-all font-mono text-[11px] text-accent">{result.path}</code>
          </div>

          {result.state === 'escaped' && (
            <>
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="text-xs font-semibold text-destructive">公開ディレクトリの外に到達しました</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-foreground/80">
                    入力をパスとして結合しているため、上位ディレクトリの機密ファイルが読み出せます。
                  </p>
                </div>
              </div>
              <pre className="overflow-x-auto rounded-lg border border-border bg-background/80 p-3 font-mono text-[11px] leading-relaxed text-foreground/85">
{`# /etc/app/secrets
db_host=10.0.4.12
db_user=vault_app
db_password=REDACTED
flag=FLAG{p4th_tr4v3rs4l_esc4p3}`}
              </pre>
            </>
          )}

          {result.state === 'ok' && (
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-background/80 p-3 font-mono text-[11px] leading-relaxed text-foreground/85">
              {result.content}
            </pre>
          )}

          {result.state === 'missing' && (
            <p className="font-mono text-[11px] text-muted-foreground">404: ファイルが見つかりません。</p>
          )}
        </div>
      )}
    </LabShell>
  );
}