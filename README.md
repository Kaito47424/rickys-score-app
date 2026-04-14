# Rickys スコア入力アプリ

Rickys 草野球チームの試合成績をスマホからリアルタイムで記録するWebアプリです。

## システム構成

```
スマホブラウザ → Vercel (Reactアプリ) → GAS (WebApp) → Googleスプレッドシート
```

- **フロントエンド**: React 18 + TypeScript + Tailwind CSS（Vercelにデプロイ）
- **バックエンド**: Google Apps Script（WebアプリとしてデプロイしたWeb API）
- **データ**: Googleスプレッドシート（成績データの永続化）

## 開発手順

### ブランチ構成

| ブランチ | 役割 |
|----------|------|
| `main` | 本番環境（Vercel自動デプロイ） |
| `develop` | 統合ブランチ。作業の取り込み先 |
| `feature/xxx` | 機能開発ブランチ |

### 開発フロー

```
feature/xxx → develop → main（リリース時）
```

1. `develop` から feature ブランチを切る

```bash
git checkout develop
git pull origin develop
git checkout -b feature/2-7-url-separation
```

2. 実装・コミット

```bash
git add <files>
git commit -m "feat: URL分離の実装"
```

3. `develop` にマージ

```bash
git checkout develop
git merge feature/2-7-url-separation
git push origin develop
```

4. リリース時に `main` にマージ

```bash
git checkout main
git merge develop
git push origin main  # Vercel自動デプロイが走る
```

### ブランチ命名規則

```
feature/{要件番号}-{概要}

例:
  feature/2-7-url-separation
  feature/2-2-bat-pitch-stats-api
  feature/2-3-edit-log
```

### コンフリクト防止のルール

- `App.tsx` / Router 周りを触る場合は事前にチームに共有する
- **2-7（URL分離）は最初に単独でマージすること**（ルーティング構造を先に確定させる）
- 詳細は `docs/onboarding.md` を参照

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
