import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { LogOut, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/40 bg-primary/10">
              <Terminal className="h-4 w-4 text-primary" />
            </span>
            <span className="font-heading text-[15px] font-semibold tracking-tight">
              NULL<span className="text-primary">LAB</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em]">
            <NavLink
              to="/"
              className={({ isActive }) =>
                cn(
                  'rounded-full px-3 py-1.5 transition-colors',
                  isActive || location.pathname === '/'
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              ラボ
            </NavLink>
            <NavLink
              to="/progress"
              className={({ isActive }) =>
                cn(
                  'rounded-full px-3 py-1.5 transition-colors',
                  isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              記録
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium leading-tight">{user?.full_name || '学習者'}</p>
              <p className="font-mono text-[10px] text-muted-foreground">{user?.email}</p>
            </div>
            <button
              onClick={() => logout()}
              title="ログアウト"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-border hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="mx-auto w-full max-w-6xl px-5 py-10">
        <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
          本アプリの演習環境はすべてブラウザ内の模擬システムです。実在する Web サイトやサーバーへの攻撃は行いません。
          実際の診断は、必ず許可を得た対象にのみ実施してください。
        </p>
      </footer>
    </div>
  );
}