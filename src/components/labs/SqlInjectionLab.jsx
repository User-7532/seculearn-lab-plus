import { useState } from 'react';
import LabShell from './LabShell';
import { Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const CUSTOMERS = [
  { id: 1, name: '佐藤 健', email: 'ken.sato@acme.co.jp', plan: 'Pro' },
  { id: 2, name: '鈴木 美咲', email: 'misaki@acme.co.jp', plan: 'Basic' },
  { id: 3, name: '高橋 涼', email: 'ryo.t@acme.co.jp', plan: 'Pro' },
  { id: 4, name: '田中 由紀', email: 'yuki.t@acme.co.jp', plan: 'Basic' },
  { id: 5, name: '伊藤 大輔', email: 'd.ito@acme.co.jp', plan: 'Pro' },
];

const RESTRICTED = {
  id: 99,
  name: '[RESTRICTED] internal_admin',
  email: 'root@acme.internal',
  plan: 'ADMIN',
};

const INJECTION = /('\s*or\s*'?\d'?\s*=\s*'?\d)|(\bor\s+1\s*=\s*1)|('\s*or\s*')|(--)/i;

export default function SqlInjectionLab() {
  const [query, setQuery] = useState('');
  const [last, setLast] = useState({ sql: '', rows: [], state: 'idle', input: '' });

  const run = (e) => {
    e.preventDefault();
    const sql = `SELECT * FROM customers WHERE name = '${query}'`;
    const quotes = (query.match(/'/g) || []).length;

    if (INJECTION.test(query)) {
      setLast({ sql, rows: [...CUSTOMERS, RESTRICTED], state: 'injected', input: query });
      return;
    }
    if (quotes % 2 === 1) {
      setLast({ sql, rows: [], state: 'error', input: query });
      return;
    }
    const rows = CUSTOMERS.filter((c) => c.name.includes(query.trim()));
    setLast({ sql, rows, state: rows.length ? 'ok' : 'empty', input: query });
  };

  return (
    <LabShell title="Acme CRM" host="crm.acme-sandbox.local/customers">
      <div className="mb-4">
        <h4 className="font-heading text-base font-semibold">顧客検索</h4>
        <p className="mt-1 text-xs text-muted-foreground">顧客名の一部を入力してください。</p>
      </div>

      <form onSubmit={run} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例: 佐藤"
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 font-mono text-xs outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="submit"
          className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          検索
        </button>
      </form>

      {last.state !== 'idle' && (
        <div className="mt-5 space-y-3">
          <div className="rounded-lg border border-border bg-background/70 p-3">
            <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              実行されたクエリ
            </p>
            <code className="block break-all font-mono text-[11px] text-accent">{last.sql}</code>
          </div>

          {last.state === 'error' && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 font-mono text-[11px] text-destructive">
              SQLITE_ERROR: unrecognized token: "&apos;" — クエリの構文が壊れました。
            </div>
          )}

          {last.state === 'injected' && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="text-xs font-semibold text-destructive">認証条件をバイパスしました</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-foreground/80">
                  WHERE 句が常に真になったため、制限付きレコードを含む全件が返却されています。
                </p>
              </div>
            </div>
          )}

          {last.state === 'empty' && (
            <p className="font-mono text-[11px] text-muted-foreground">0 件のレコードが見つかりました。</p>
          )}

          {last.rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-secondary/50 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">id</th>
                    <th className="px-3 py-2">name</th>
                    <th className="px-3 py-2">email</th>
                    <th className="px-3 py-2">plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {last.rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'transition-colors',
                        row.plan === 'ADMIN' ? 'bg-destructive/5' : 'hover:bg-secondary/30'
                      )}
                    >
                      <td className="px-3 py-2 font-mono text-muted-foreground">{row.id}</td>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{row.email}</td>
                      <td className="px-3 py-2">
                        {row.plan === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 rounded border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 font-mono text-[9px] text-destructive">
                            <ShieldCheck className="h-2.5 w-2.5" /> RESTRICTED
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-muted-foreground">{row.plan}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {last.state === 'injected' && (
                <div className="border-t border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-[11px] text-destructive">
                  FLAG&#123;sql_1nj3ct10n_m4st3r&#125;
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </LabShell>
  );
}