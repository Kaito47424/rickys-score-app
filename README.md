# Rickys スコア入力アプリ

Rickys 草野球チームの試合成績をスマホからリアルタイムで記録するWebアプリです。

## システム構成

```
スマホブラウザ → Vercel (Reactアプリ) → GAS (WebApp) → Googleスプレッドシート
```

- **フロントエンド**: React 18 + TypeScript + Tailwind CSS（Vercelにデプロイ）
- **バックエンド**: Google Apps Script（WebアプリとしてデプロイしたWeb API）
- **データ**: Googleスプレッドシート（成績データの永続化）

## ローカル起動手順

```bash
cd app
npm install
npm run dev
```

## 環境変数

`app/.env.example` をコピーして `app/.env.local` を作成し、GASのURLを設定してください。

```bash
cp app/.env.example app/.env.local
# VITE_GAS_URL を実際のGAS WebアプリURLに書き換える
```

| 変数名 | 説明 |
|--------|------|
| `VITE_GAS_URL` | GAS WebアプリのデプロイURL |

## デプロイ手順

### GAS（バックエンド）

1. [Googleスプレッドシート](https://sheets.google.com) を開く
2. 「拡張機能」→「Apps Script」を開く
3. `gas/rickys-api.gs` の内容をコピーして貼り付け
4. `gas/main.gs` の内容を別ファイルとして追加
5. 「デプロイ」→「新しいデプロイ」→「ウェブアプリ」
   - 実行ユーザー: 自分
   - アクセス: 全員
6. デプロイURLを `app/.env.local` の `VITE_GAS_URL` に設定

### Vercel（フロントエンド）

1. GitHubにプッシュ
2. [Vercel](https://vercel.com) でリポジトリを連携
   - **Root Directory**: `app`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. 環境変数 `VITE_GAS_URL` を Vercel のプロジェクト設定に追加
4. `main` ブランチへのプッシュで自動デプロイ

### Vercel 再デプロイ（GAS URL更新時）

1. Vercel ダッシュボード → プロジェクト設定 → 環境変数
2. `VITE_GAS_URL` を新しいURLに更新
3. 「Redeploy」を実行
