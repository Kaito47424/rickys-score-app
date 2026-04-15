# rickys-score-app

## プロジェクト概要

草野球チーム「Rickys」のスコア管理アプリ。Google スプレッドシート + GAS をバックエンドに、React (Vite) のフロントエンドで構成される。

- **入力アプリ** (`/`): 打席・投球結果の記録
- **閲覧アプリ** (`/view`): 個人成績・修正履歴の閲覧

詳細は `docs/` を参照。

## リポジトリ構成

| ディレクトリ | 内容 |
|---|---|
| `app/` | React フロントエンド（Vite + TypeScript） |
| `gas/` | Google Apps Script（GAS Web API） |
| `docs/` | 要件定義・アーキテクチャ等のドキュメント |

## 開発フロー

### フロントエンド

```bash
cd app
npm install
npm run dev
```

### GAS（コード反映・デプロイ）

GASの編集は `gas/` ディレクトリ内のファイルを変更し、clasp で反映する。
**手動でスクリプトエディタにコピペする必要はない。**

```bash
cd gas
npm run deploy   # コード反映 + 既存デプロイへの上書きまで一発
```

初回セットアップが必要な場合は `gas/README.md` の「clasp セットアップ」セクションを参照。
セットアップ手順の実行も Claude Code から行える（`clasp login` はブラウザ認証が必要なため `! clasp login` で実行する）。

## 要件・タスク管理

- 要件一覧: `docs/requirements.md`
- アーキテクチャ: `docs/architecture.md`
- データ構造: `docs/data-structure.md`
- コンポーネント依存関係: `docs/lineage.md`
