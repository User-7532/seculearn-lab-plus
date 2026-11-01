// 演習用の本物の SQLite（sql.js）。SQLインジェクションのラボを開いたときだけ読み込む
let enginePromise = null;

export function loadSqlite() {
  if (!enginePromise) {
    enginePromise = Promise.all([import('sql.js'), import('sql.js/dist/sql-wasm.wasm?url')])
      .then(([mod, wasm]) => (mod.default || mod)({ locateFile: () => wasm.default }))
      .catch((e) => {
        enginePromise = null;
        throw e;
      });
  }
  return enginePromise;
}
