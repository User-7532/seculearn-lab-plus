import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { LABS } from '@/lib/labs';
import LabCard from '@/components/LabCard';
import { ArrowRight, ShieldCheck, Sparkles, Target } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const load = async () => {
      try {
        const records = await base44.entities.LabProgress.filter({ created_by_id: user.id });
        if (active) setProgress(records);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const statusOf = (slug) => progress.find((p) => p.lab_slug === slug)?.status;
  const clearedCount = progress.filter((p) => p.status === 'cleared').length;
  const xp = progress.reduce((sum, p) => sum + (p.xp || 0), 0);
  const firstOpen = LABS.find((lab) => statusOf(lab.slug) !== 'cleared') || LABS[0];
  const pct = Math.round((clearedCount / LABS.length) * 100);

  return (
    <div>
      <section className="glow-grid border-b border-border/70">
        <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-14 sm:pt-20">
          <div className="grid items-end gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                beginner friendly · 4 labs
              </div>

              <h1 className="font-heading text-4xl font-semibold leading-[1.15] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                壊してみる。
                <br />
                <span className="text-primary">そこから</span>理解する。
              </h1>

              <p className="mt-6 max-w-xl text-[15px] leading-loose text-muted-foreground">
                実在のサイトを攻撃するのではなく、アプリの中に用意された小さな模擬システムを相手に、
                ペネトレーションテストの考え方と手順を手を動かしながら学びます。
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  to={`/lab/${firstOpen.slug}`}
                  className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
                >
                  次のラボをはじめる
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {loading ? '読み込み中…' : `達成 ${clearedCount} / ${LABS.length} ・ ${xp} XP`}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/70 p-5 font-mono text-[11.5px] leading-relaxed text-muted-foreground shadow-2xl shadow-black/40 backdrop-blur">
              <div className="mb-3 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
                <span className="h-2.5 w-2.5 rounded-full bg-accent/50" />
                <span className="ml-2 text-[10px] tracking-widest">lab-session</span>
              </div>
              <p><span className="text-primary">$</span> scope --target sandbox.local</p>
              <p className="text-muted-foreground/70"># 模擬環境のみを対象に実行</p>
              <p><span className="text-primary">$</span> recon --passive</p>
              <p>→ 4 sub-domains found</p>
              <p><span className="text-accent">!</span> input not sanitized: /search</p>
              <p><span className="text-accent">!</span> object reference: /receipt?id=</p>
              <p className="mt-3">
                <span className="text-primary">$</span> <span className="inline-block h-3.5 w-2 translate-y-0.5 animate-pulse bg-primary" />
              </p>
            </div>
          </div>

          <div className="mt-14 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Target, label: '手を動かす', text: '読むだけではなく、実際に手を動かしてフラグを探します。' },
              { icon: ShieldCheck, label: '安全な環境', text: 'すべてブラウザ内の模擬システム。実在のサービスには触れません。' },
              { icon: Sparkles, label: 'ヒント3段階', text: '詰まったら段階的なヒントを開けます。まずは自分の力で。' },
            ].map(({ icon: Icon, label, text }) => (
              <div key={label} className="rounded-xl border border-border bg-card/40 p-4">
                <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                  <Icon className="h-3.5 w-3.5" /> {label}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-semibold tracking-tight">演習ラボ</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">基礎から順番に。所要時間はおよその目安です。</p>
          </div>
          <div className="w-full max-w-[200px]">
            <div className="mb-1.5 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>PROGRESS</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {LABS.map((lab, i) => (
            <LabCard key={lab.slug} lab={lab} status={statusOf(lab.slug)} index={i} />
          ))}
        </div>

        <p className="mt-8 text-center font-mono text-[10px] tracking-wide text-muted-foreground">
          {user?.full_name ? `${user.full_name} としてログイン中` : 'ログイン中'} ・ 進捗は自動で保存されます
        </p>
      </section>
    </div>
  );
}