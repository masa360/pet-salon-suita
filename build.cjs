/*
 * 公開用ビルドスクリプト（AIO最適化版）
 *
 *   node build.cjs
 *
 * やること：
 *  1. salons-data.js を読み込む
 *  2. 各ページの「店舗カード」「比較表」「JSON-LD」をサーバーサイドで生成し、HTMLに直接埋め込む
 *     → JavaScript を実行しない AI 検索クローラー（GPTBot 等）にも全データが見える
 *  3. canonical を本番URLに置換、sitemap.xml / robots.txt を生成
 *  4. dist/ に公開用ファイル一式を出力（Vercel はこの dist/ をそのまま配信）
 *
 * 本番URLは環境変数 SITE_URL で指定（未指定時は下記 DEFAULT_SITE_URL）。
 *   例: SITE_URL=https://suita-pet.vercel.app node build.cjs
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const DIST = path.join(DIR, 'dist');
const SITE_URL = (process.env.SITE_URL || 'https://pet-salon-suita.vercel.app').replace(/\/$/, '');

const SALONS_DATA = require('./salons-data.js');
const R = require('./salons-render.js');

// 各ページの設定（表示する店舗の絞り込みとメタ情報）
const PAGES = [
  {
    file: 'index.html',
    out: 'index.html',
    canonicalPath: '/',
    areaLabel: '大阪府吹田市',
    filter: s => s.no !== 44, // アリバ豊中（豊中市・千里山特集専用）は除外
    listName: '吹田市のペットサロン・トリミングサロン一覧（全店の比較）',
    listDesc: '大阪府吹田市の千里山・江坂・緑地公園・南千里・万博公園エリアのペットサロン・トリミングサロンを、口コミ評価・営業時間・対応犬種・サービス内容で比較した一覧。評価・口コミ件数の出典はEPARKペットライフ。'
  },
  {
    file: 'senriyama.html',
    out: 'senriyama.html',
    canonicalPath: '/senriyama.html',
    areaLabel: '大阪府吹田市 千里山エリア',
    names: [
      'ねこ専門店 にゃん子ん家 緑地公園店','ワンルーク大阪吹田佐井寺店','Dog Salon Cotton','DOG SALON N・id',
      'ペットサロン CHOPPER','Dog salon coeur','Tomar（トマール）','Foot Step','PETSHOP COOKIE 桃山台店',
      'Pet Salon Luana','ドッグケアハウス','どっぐさろん 竹奈呂','ウエストハウス','くすのき動物病院',
      '千里桃山台動物病院','バオペットクリニック','アイン動物病院南千里病院','アリバ豊中動物病院(トリミング)'
    ],
    listName: '千里山駅周辺のペットサロン・トリミングサロン一覧',
    listDesc: '阪急千里山駅・関大前・南千里・緑地公園・五月が丘エリアのペットサロン・トリミングサロンを口コミ評価・営業時間・対応動物・サービス内容で比較した一覧。評価・口コミ件数の出典はEPARKペットライフ。'
  }
];

function selectSalons(page) {
  if (page.names) {
    const byName = Object.fromEntries(SALONS_DATA.map(s => [s.name, s]));
    return page.names.map((n, i) => Object.assign({}, byName[n], { no: i + 1 })).filter(s => s && s.name);
  }
  return SALONS_DATA.filter(page.filter).map(s => Object.assign({}, s));
}

function buildPage(page) {
  let html = fs.readFileSync(path.join(DIR, page.file), 'utf8');
  const salons = selectSalons(page);
  const ranked = R.rankSalons(salons.slice());

  // 表示順：編集部おすすめ順（_rank）でカード・表を生成
  const ordered = ranked.slice();

  // 1) 店舗カードを card-grid に埋め込み
  const cardsHtml = ordered.map(s => R.cardHtml(s)).join('\n');
  html = html.replace(
    /<div class="grid" id="card-grid">[\s\S]*?<\/div>/,
    '<div class="grid" id="card-grid" data-prerendered="1">' + cardsHtml + '</div>'
  );

  // 2) 比較表を compare-tbody に埋め込み
  const rowsHtml = ordered.map(s => R.compareRowHtml(s)).join('\n');
  html = html.replace(
    /<tbody id="compare-tbody">[\s\S]*?<\/tbody>/,
    '<tbody id="compare-tbody" data-prerendered="1">' + rowsHtml + '</tbody>'
  );

  // 3) ItemList JSON-LD を <head> に静的注入（JS版と二重になるが、JS版は実行時に重複除去）
  const ld = R.itemListLd(ranked, salons.length, page.listName, page.listDesc, page.areaLabel);
  const ldTag = '<script type="application/ld+json" data-build="itemlist">' + JSON.stringify(ld) + '</script>';
  html = html.replace('</head>', ldTag + '\n</head>');

  // 4) salons-render.js をブラウザ用に読み込ませる（JS版の動的フィルタが共有関数を使う）
  if (!html.includes('salons-render.js')) {
    html = html.replace('<script src="salons-data.js"></script>',
      '<script src="salons-data.js"></script>\n<script src="salons-render.js"></script>');
  }

  // 5) canonical を本番URLに
  html = html.replace(/<link rel="canonical" href="[^"]*">/,
    '<link rel="canonical" href="' + SITE_URL + page.canonicalPath + '">');

  // 6) 件数の総数を実数に（total-count はJSでも上書きするが静的にも入れておく）
  html = html.replace(/<strong id="total-count">\d+<\/strong>/,
    '<strong id="total-count">' + salons.length + '</strong>');

  fs.writeFileSync(path.join(DIST, page.out), html, 'utf8');
  console.log('[ok] dist/' + page.out + ' (' + salons.length + '店 / ' + Math.round(html.length / 1024) + ' KB)');
  return { path: page.canonicalPath };
}

function main() {
  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST);

  // 依存ファイルをコピー
  ['salons-data.js', 'salons-render.js'].forEach(f => {
    fs.copyFileSync(path.join(DIR, f), path.join(DIST, f));
  });

  const built = PAGES.map(buildPage);

  // sitemap.xml
  const today = new Date().toISOString().slice(0, 10);
  const urls = built.map(b => '  <url><loc>' + SITE_URL + b.path + '</loc><lastmod>' + today + '</lastmod><changefreq>weekly</changefreq></url>').join('\n');
  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n';
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap, 'utf8');
  console.log('[ok] dist/sitemap.xml');

  // robots.txt（AI検索クローラーを明示的に許可）
  const robots = [
    'User-agent: *',
    'Allow: /',
    '',
    '# AI検索クローラーを明示的に許可',
    'User-agent: GPTBot', 'Allow: /',
    'User-agent: OAI-SearchBot', 'Allow: /',
    'User-agent: PerplexityBot', 'Allow: /',
    'User-agent: Google-Extended', 'Allow: /',
    'User-agent: ClaudeBot', 'Allow: /',
    '',
    'Sitemap: ' + SITE_URL + '/sitemap.xml',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(DIST, 'robots.txt'), robots, 'utf8');
  console.log('[ok] dist/robots.txt');

  console.log('\n本番URL: ' + SITE_URL);
  console.log('公開: dist/ をVercelにデプロイ（vercel --prod）');
}

main();
