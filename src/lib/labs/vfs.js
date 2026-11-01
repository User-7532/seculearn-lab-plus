// ディレクトリトラバーサル演習用の、にせのファイルシステム（Linux のパスの規則で動く）
export const BASE_DIR = '/srv/www/public';
export const SECRET_PATH = '/etc/app/secrets';

export const FILES = {
  '/srv/www/public/welcome.txt': 'DocVault へようこそ。公開フォルダのファイルのみ表示できます。',
  '/srv/www/public/guide.md': '# 使い方\nファイル名を入力すると内容が表示されます。',
  '/srv/www/app/config.yml': 'storage_root: /srv/www/public\nsecrets_file: /etc/app/secrets\nlog_level: info',
  '/etc/hostname': 'docvault-web-01',
  '/etc/passwd':
    'root:x:0:0:root:/root:/bin/bash\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\ndocvault:x:1001:1001::/srv/www:/bin/sh',
  [SECRET_PATH]:
    '# /etc/app/secrets\ndb_host=10.0.4.12\ndb_user=vault_app\ndb_password=REDACTED\nflag=FLAG{p4th_tr4v3rs4l_esc4p3}',
};

// 「.」と「..」を解決して、絶対パスにする。ルートより上には行けない（Linux と同じ）
export function normalizePath(path) {
  const out = [];
  path.split('/').forEach((part) => {
    if (!part || part === '.') return;
    if (part === '..') out.pop();
    else out.push(part);
  });
  return `/${out.join('/')}`;
}

const isDirectory = (path) => {
  const prefix = path === '/' ? '/' : `${path}/`;
  return Object.keys(FILES).some((f) => f.startsWith(prefix));
};

// サーバーの処理: クエリ文字列をデコードし、公開フォルダのパスに「そのまま」つなげて読む（これが脆弱性）
export function readRequested(input) {
  let decoded;
  try {
    decoded = decodeURIComponent(input);
  } catch {
    return { status: 400, joined: '', resolved: '', message: '400 Bad Request: URLのエンコードが不正です。' };
  }
  const joined = `${BASE_DIR}/${decoded}`;
  const resolved = normalizePath(joined);
  if (Object.prototype.hasOwnProperty.call(FILES, resolved)) {
    return { status: 200, joined, resolved, content: FILES[resolved] };
  }
  if (isDirectory(resolved)) {
    return { status: 500, joined, resolved, message: `500 Internal Server Error: EISDIR: illegal operation on a directory, read '${resolved}'` };
  }
  return { status: 404, joined, resolved, message: `404 Not Found: ENOENT: no such file or directory, open '${resolved}'` };
}
