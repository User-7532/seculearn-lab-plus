import { useState } from 'react';
import LabShell from './LabShell';
import { ShieldAlert, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

const MY_ID = 4;

const RECEIPTS = {
  1: { owner: '田中 由紀', amount: '¥42,000', memo: '客先訪問の交通費（10月分）', restricted: false },
  2: { owner: '鈴木 美咲', amount: '¥8,400', memo: 'オンライン勉強会の参加費', restricted: false },
  3: {
    owner: '取締役 山本',
    amount: '¥1,250,000',
    memo: '役員会議事録の保管場所: FLAG{1d0r_0bj3ct_r3f3r3nc3}',
    restricted: true,
  },
  4: { owner: '佐藤 健（あなた）', amount: '¥6,200', memo: '書籍購入費', restricted: false },
  5: { owner: '伊藤 大輔', amount: '¥19,800', memo: '出張宿泊費', restricted: false },
};

export default function IdorLab() {
  const [id, setId] = useState(String(MY_ID));
  const [opened, setOpened] = useState(String(MY_ID));

  const record = RECEIPTS[opened];

  const open = (e) => {
    e.preventDefault();
    setOpened(id.trim());
  };

  return (
    <LabShell
      title="Expense Flow"
      urlBar={
        <form onSubmit={open} className="flex w-full items-center gap-2">
          <span className="shrink-0 text-muted-foreground">http://expense.sandbox.local/receipt?id=</span>
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="w-16 rounded border border-input bg-background px-2 py-1 font-mono text-[11px] text-foreground outline-none focus:border-primary/60"
          />
          <button
            type="submit"
            className="shrink-0 rounded border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary"
          >
            移動
          </button>
        </form>
      }
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          <h4 className="font-heading text-base font-semibold">領収書詳細</h4>
        </div>
        <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          login: sato@expense.local
        </span>
      </div>

      {!record ? (
        <div className="rounded-lg border border-border bg-background/60 p-4 font-mono text-[11px] text-muted-foreground">
          404: 指定された ID の領収書は存在しません。
        </div>
      ) : (
        <div className="space-y-3">
          {String(opened) !== String(MY_ID) && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="text-xs font-semibold text-destructive">アクセス制御の欠陥</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-foreground/80">
                  本来は参照できない他人の領収書が、ID を変えるだけで取得できてしまいました。
                  サーバーは「誰が」ではなく「どの ID か」だけを見ています。
                </p>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-border">
            <dl className="divide-y divide-border/70 text-[11px]">
              {[
                ['請求者', record.owner],
                ['金額', record.amount],
                ['備考', record.memo],
              ].map(([label, val]) => (
                <div key={label} className="flex gap-4 px-3 py-2.5">
                  <dt className="w-16 shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {label}
                  </dt>
                  <dd
                    className={cn(
                      'break-all',
                      record.restricted && label === '備考'
                        ? 'font-mono font-bold text-primary'
                        : 'text-foreground/85'
                    )}
                  >
                    {val}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </LabShell>
  );
}