# 吹田ペットサロンナビ（AIO最適化・静的サイト）

吹田市・千里山エリアのペットサロン比較ポータル。AI検索（AI Overview）に「客観的な地域データ」として参照されることを狙った静的サイトです。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `salons-data.js` | 全店舗データ（**ここを編集すれば全ページに反映**） |
| `salons-render.js` | カード・比較表・JSON-LD の生成ロジック（Node/ブラウザ共有） |
| `index.html` | 吹田市全域版（テンプレート） |
| `senriyama.html` | 千里山・五月が丘・南千里版（テンプレート） |
| `build.cjs` | **公開用ビルド**：データをHTMLに静的埋め込み → `dist/` 出力 |
| `build-standalone.cjs` | ローカル配布用（file:// で動く単体HTML）を生成 |
| `vercel.json` / `package.json` | Vercel デプロイ設定 |

## ビルド（公開用）

```bash
node build.cjs
```

`dist/` に以下が生成されます。これが公開対象です。

- `index.html` / `senriyama.html` … **店舗カード・比較表・JSON-LD をHTMLに直接埋め込み済み**
  （JavaScriptを実行しないAI検索クローラーにも全データが見える＝AIO最適化の核心）
- `sitemap.xml` / `robots.txt` … クローラー向け（AI検索botを明示許可）

本番URLを変えるには環境変数で指定：

```bash
SITE_URL=https://あなたのドメイン node build.cjs
```

## Vercel で公開する手順

1. [vercel.com](https://vercel.com) にGitHub等でログイン（無料）
2. このフォルダを Vercel に取り込む。どちらでも可：
   - **CLIで**: `npm i -g vercel` → このフォルダで `vercel`（初回）→ `vercel --prod`
   - **GitHub連携で**: このフォルダをGitHubにpush → Vercelで「Import Project」
3. Vercelが `vercel.json` を読み、`node build.cjs` を実行して `dist/` を配信します
4. `xxx.vercel.app` の無料ドメインで即公開されます

### 独自ドメインを使う場合

1. Vercel の Project → Settings → Domains で独自ドメインを追加
2. ビルドの本番URLも合わせる：Vercelの Environment Variables に `SITE_URL=https://あなたのドメイン` を設定して再デプロイ
   （canonical / sitemap が独自ドメインになります）

## 公開後にやること（AIに拾われるために重要）

1. **Google Search Console** にサイトを登録し、`sitemap.xml` を送信 → インデックスを促す
2. 各店の **Googleマップ** や地域情報サイトから自然にリンクされると評価が上がる
3. データ（`salons-data.js`）を定期的に更新し、「生きているメディア」であることを示す

## データの直し方

`salons-data.js` の各店オブジェクトを編集 → `node build.cjs` で再ビルド。
営業時間や番地が「記載なし」の店は、Googleマップ等で確認して埋めると完成度が上がります。

## 出典

評価・口コミ件数の出典は EPARKペットライフ（petlife.asia）。
一部の店舗は公式サイト・トリムトリム・エキテン等の公開情報で補完（各店データの `source` に明記）。
