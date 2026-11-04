import { base44 } from '@/api/base44Client';

export const needsRefine = (c) => c?.kind === 'written' && c.refined !== true;

// 指定した記述問題の聞き方（観点・数の指定）を見直し、直したカードを返す
export async function refineCards(cards) {
  const ids = (cards || []).filter(needsRefine).map((c) => c.id);
  const out = [];
  for (let i = 0; i < ids.length; i += 12) {
    try {
      const res = await base44.functions.invoke('refineWritten', { ids: ids.slice(i, i + 12) });
      out.push(...(res.data?.cards || []));
    } catch {
      // 直せなかったものは元の問いのまま出す
    }
  }
  return out;
}

let running = false;

// 前に作った記述問題を、画面を開いている間に少しずつ見直す
export async function refineOldCardsInBackground(rounds = 4) {
  if (running) return;
  running = true;
  try {
    for (let i = 0; i < rounds; i += 1) {
      const res = await base44.functions.invoke('refineWritten', {});
      if (res.data?.error || !(res.data?.remaining > 0)) break;
    }
  } catch {
    // 見直しは次に開いたときに続ける
  } finally {
    running = false;
  }
}
