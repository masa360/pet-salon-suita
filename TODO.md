# 公開後やることリスト

吹田ペットサロンナビ（AIO最適化・静的サイト）の公開〜運用タスク。

## 1. 公開（最優先）

- [ ] Vercelにデプロイ
  ```bash
  npm i -g vercel
  vercel          # 初回設定
  vercel --prod   # 本番公開
  ```

## 2. インデックス促進（公開直後）

- [ ] Google Search Console にサイトを登録
- [ ] `sitemap.xml` を Search Console に送信
  - URL: `https://あなたのドメイン/sitemap.xml`

## 3. データ補完

- [ ] 住所が未確認の6店をGoogleマップで番地確認・補完（`salons-data.js`）
  - Pit Star
  - ビビコロ
  - Honey Poo
  - Makkam
  - Felicita
  - まこも

## 4. 信頼性強化（任意）

- [ ] 独自ドメイン取得を検討（年1000〜2000円程度）
  - Vercel の Project → Settings → Domains で追加
  - `SITE_URL` 環境変数を独自ドメインに変更して再ビルド（canonical/sitemapが追従）
- [ ] 地域コミュニティサイト・ブログへの被リンク獲得を検討
  - 千里山・五月が丘エリアの地域情報サイトからの自然なリンクがAIO評価を後押し

## 5. 運用（継続）

- [ ] `salons-data.js` を定期的に更新（新店追加・情報更新）
  - 「生きているメディア」であることがAI検索の評価シグナルになる
  - 更新後は `node build.cjs` で再ビルド
