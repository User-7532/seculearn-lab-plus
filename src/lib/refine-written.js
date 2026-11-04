import { base44 } from '@/api/base44Client';

let running = false;

// 前に作った記述問題の聞き方（観点・数の指定）を、画面を開いている間に少しずつ見直す
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
