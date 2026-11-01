// 演習用の本物の SQLite（sql.js）。必要になったときだけ読み込む
import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

let enginePromise = null;

export function loadSqlite() {
  if (!enginePromise) {
    enginePromise = initSqlJs({ locateFile: () => wasmUrl }).catch((e) => {
      enginePromise = null;
      throw e;
    });
  }
  return enginePromise;
}
