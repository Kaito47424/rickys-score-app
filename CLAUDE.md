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

- 起動・環境変数・URL: `rules/environment.md`
- GAS 編集は **clasp で反映・手動コピペ禁止**（詳細 `rules/backend.md`、初回セットアップ `gas/README.md`）

## 要件・タスク管理

- 要件一覧: `docs/requirements.md`
- アーキテクチャ: `docs/architecture.md`
- データ構造: `docs/data-structure.md`
- コンポーネント依存関係: `docs/lineage.md`

## ルール（必読）

作業内容に応じて、**着手前に**以下のルールファイルを読み込み、内容に従って実装すること。

| ルール | ファイル | 適用タイミング |
| --- | --- | --- |
| Git/PR/コミット規約 | `./rules/workflow.md` | ブランチ作成・コミット・PR作成のたび |
| 環境・起動・URL | `./rules/environment.md` | 環境名・URL・起動方法・環境変数を扱うとき |
| 品質保証方針 | `./rules/testing.md` | コードを書いたとき（型・ビルド確認） |
| React/TS コーディング規約 | `./rules/frontend.md` | `app/src/` 配下を触るとき |
| GAS バックエンド規約 | `./rules/backend.md` | `gas/` または `app/src/api/gas.ts` を触るとき |

> CONTRIBUTING.md / README.md の内容は上記 rules/ に必要分を抽出済み。デプロイ手順詳細など重い情報は必要時に元ファイルを参照すること。
