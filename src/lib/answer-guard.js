// 答えを出す前の画面に、答えそのものが見えてしまわないようにするための小さな道具

const normalize = (s) =>
  String(s || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s・･\-‐_()（）「」]/g, '');

// 見出しやラベルが、カードの答えを含んでいる（または答えに含まれている）か
export function revealsAnswer(label, card) {
  const l = normalize(label);
  if (l.length < 2 || !card) return false;
  return String(card.answer || '')
    .normalize('NFKC')
    .split(/[、,，/／]/)
    .map(normalize)
    .filter((a) => a.length >= 2)
    .some((a) => l.includes(a) || a.includes(l));
}

// 答えを伏せた問題文の書き出し（一覧などに出す用）
export function questionPreview(card, max = 48) {
  const text = String(card?.text || '')
    .replace(/___/g, '＿＿＿')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
