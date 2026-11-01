// 演習ラボのカリキュラム定義（すべてアプリ内で完結する模擬環境です）
export const LABS = [
  {
    slug: 'sql-injection',
    no: '01',
    title: 'SQLインジェクション',
    category: 'インジェクション',
    difficulty: '初級',
    minutes: 15,
    hook: '顧客検索フォームに“魔法の文字列”を入れると、データベースが全部しゃべり出す。',
    brief:
      '架空の社内顧客管理ツール「Acme CRM」の検索フォームを調査します。入力がそのままデータベースの命令に混ざっているとき、何が起きるのかを体験してください。',
    goal: '検索欄から全顧客レコードを引き出し、隠されたフラグを取得する。',
    hints: [
      '検索欄に入れた文字が、そのままSQLの WHERE 句に入っていると考えてみましょう。表示される「実行されたクエリ」をよく見てください。',
      '文字列を閉じる「\'」を入れると、SQLの構文が壊れます。エラーはヒントの塊です。',
      "OR で常に真になる条件を足し、うしろに残る文字は -- でコメントにして無効化します: ' OR 1=1 --",
    ],
    flag: 'FLAG{sql_1nj3ct10n_m4st3r}',
  },
  {
    slug: 'stored-xss',
    no: '02',
    title: 'クロスサイトスクリプティング',
    category: 'Webアプリ',
    difficulty: '初級',
    minutes: 15,
    hook: 'あなたの書き込みが、次に見た人のブラウザで“プログラム”として動き出す。',
    brief:
      '架空のゲストブック「NoteBox」にコメントを投稿します。入力がエスケープされていないとき、投稿内容はHTMLとして解釈されます。',
    goal: 'コメント欄にスクリプトを仕込み、保存型XSSの成立を確認してフラグを取得する。',
    hints: [
      'コメント欄は、入力された文字をHTMLとしてそのまま表示している可能性があります。',
      'HTMLのタグは < と > で囲みます。まずは <b>テスト</b> を投稿してみましょう。',
      'scriptタグで alert を呼ぶ古典的なペイロードを試してみましょう。<img> の onerror のような、タグの属性に書くやり方もあります。',
    ],
    flag: 'FLAG{xss_st0r3d_p4yl0ad}',
  },
  {
    slug: 'idor',
    no: '03',
    title: '認証バイパス / IDOR',
    category: 'アクセス制御',
    difficulty: '中級',
    minutes: 20,
    hook: 'URLの数字をひとつ変えるだけで、他人の領収書が開いてしまう。',
    brief:
      '架空の経費精算ツール「Expense Flow」に経理担当としてログインしています。URLのパラメータが本当に「あなたの」データを指しているか検証します。',
    goal: '自分のIDではない領収書データにアクセスし、フラグを取得する。',
    hints: [
      '表示されているURLの ?id= に注目してください。',
      'サーバーは「誰がアクセスしたか」ではなく「どのIDが指定されたか」だけを見ているかもしれません。',
      'id の値を 1〜5 の範囲で変えて、他人のデータが返るか確かめましょう。',
    ],
    flag: 'FLAG{1d0r_0bj3ct_r3f3r3nc3}',
  },
  {
    slug: 'path-traversal',
    no: '04',
    title: 'ディレクトリトラバーサル',
    category: 'サーバー',
    difficulty: '中級',
    minutes: 20,
    hook: '「../」を重ねるだけで、見せてはいけないファイルに手が届く。',
    brief:
      '架空のドキュメント共有サービス「DocVault」のファイル閲覧機能を調査します。入力されたファイル名が、そのままパスとして組み立てられていると何が起きるでしょうか。',
    goal: '公開ディレクトリの外にある設定ファイルを読み出し、フラグを取得する。',
    hints: [
      'ファイル名は公開フォルダの中から探しているはずです。',
      '「..」は一つ上のディレクトリを意味します。',
      '公開フォルダは /srv/www/public です。ルート（/）まで戻るには ../ をいくつ重ねればよいか数えて、/etc/app/secrets を目指しましょう。',
    ],
    flag: 'FLAG{p4th_tr4v3rs4l_esc4p3}',
  },
];

export const findLab = (slug) => LABS.find((lab) => lab.slug === slug);

export const difficultyClass = {
  初級: 'text-primary border-primary/40 bg-primary/10',
  中級: 'text-accent border-accent/40 bg-accent/10',
};