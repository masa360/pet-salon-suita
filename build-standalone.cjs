/*
 * 配布用ビルドスクリプト
 * 外部参照 <script src="salons-data.js"></script> を、データ本体を埋め込んだ
 * インライン <script> に置換し、単体で（file:// でダブルクリックでも）動く
 * *-standalone.html を生成します。
 *
 * 使い方:  node build-standalone.cjs
 */
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const dataPath = path.join(dir, 'salons-data.js');
const dataJs = fs.readFileSync(dataPath, 'utf8');

const pages = ['index.html', 'senriyama.html'];

pages.forEach(page => {
  const src = path.join(dir, page);
  let html = fs.readFileSync(src, 'utf8');

  // <script src="salons-data.js"></script> をインライン化
  const before = html;
  html = html.replace(
    /<script\s+src=["']salons-data\.js["']>\s*<\/script>/i,
    '<script>\n/* === salons-data.js inlined for standalone distribution === */\n' + dataJs + '\n</script>'
  );

  if (html === before) {
    console.warn('[skip] ' + page + ' : salons-data.js の参照が見つかりませんでした');
    return;
  }

  // standalone同士で相互リンクが繋がるよう、内部リンクを *-standalone.html に張り替え
  ['index', 'senriyama'].forEach(base => {
    html = html.replace(
      new RegExp('href="' + base + '\\.html"', 'g'),
      'href="' + base + '-standalone.html"'
    );
  });

  const outName = page.replace(/\.html$/, '-standalone.html');
  fs.writeFileSync(path.join(dir, outName), html, 'utf8');
  console.log('[ok] ' + outName + ' を生成しました（' + Math.round(html.length / 1024) + ' KB）');
});

console.log('\n配布時は *-standalone.html を使えば、file:// でダブルクリックしても動作します。');
