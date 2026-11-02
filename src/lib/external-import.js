import { base44 } from '@/api/base44Client';

export const IMPORT_MAX = 60000;
export const IMPORT_MIN = 40;

// ほかのAIとの会話を取り込み、知識カード・今日の復習・アシスタントの記憶に反映する
export async function importExternal(raw) {
  const text = String(raw || '').trim().slice(0, IMPORT_MAX);
  if (text.length < IMPORT_MIN) throw new Error('貼り付けた文章が短すぎます。対話をそのまま貼り付けてください。');
  const res = await base44.functions.invoke('importExternal', { text });
  const data = res.data || {};
  if (data.error) throw new Error(data.error);
  return { cards: data.cards || [], scheduled: data.scheduled || 0, memoryUpdated: !!data.memoryUpdated };
}

// 取り込んだ結果を、短い報告文にする
export function importReport(result) {
  const lines = ['取り込みました。'];
  lines.push(
    result.cards.length
      ? `・知識カード: ${result.cards.length}枚（「知識カード」で解けます）`
      : '・知識カード: セキュリティの話題がなかったので、作っていません'
  );
  if (result.scheduled) lines.push(`・今日の復習に${result.scheduled}枚追加しました`);
  if (result.memoryUpdated) lines.push('・会話の要点を覚えました。これからの返答に反映します');
  return lines.join('\n');
}
