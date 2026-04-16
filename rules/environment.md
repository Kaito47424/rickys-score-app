# environment.md
<!-- 適用対象: 起動・URL参照・環境変数を扱うとき（プロジェクト全体） -->

> 概要: 各環境のURL・ブランチ対応・ローカル起動・環境変数の最低限。
> 出典: `README.md` を Claude 作業用に要約。デプロイ手順詳細は元ファイル参照。

## 環境一覧

| 環境 | 入力 (`/`) | 閲覧 (`/view`) | ブランチ | 用途 |
|---|---|---|---|---|
| 本番 | https://score-app-indol.vercel.app/ | https://score-app-indol.vercel.app/view | `main` | メンバーが実利用 |
| STG | https://stg-rickys-score-app.vercel.app/ | https://stg-rickys-score-app.vercel.app/view | `develop` | 結合確認・レビュー |
| ローカル | http://localhost:5173/ | http://localhost:5173/view | `feature/*` | 個人開発 |
| PR Preview | Vercel 自動発行URL`/` | 自動発行URL`/view` | `feature/*` | PRレビュー時 |

## ローカル起動

```bash
cd app
npm install
npm run dev   # http://localhost:5173/
```

## 環境変数

`app/.env.example` をコピーして `app/.env.local` を作成し、GAS のデプロイURLを設定する。

```bash
cp app/.env.example app/.env.local
# VITE_GAS_URL に GAS WebアプリURLを設定
```

| 変数名 | 説明 |
|--------|------|
| `VITE_GAS_URL` | GAS WebアプリのデプロイURL |

## 動作確認フロー

```
feature push → PR Preview で確認
      ↓ develop にマージ
STG（stg-rickys-score-app.vercel.app）で結合確認
      ↓ 問題なければ main にマージ
本番（score-app-indol.vercel.app）に反映
```

| ステップ | 環境 | タイミング |
|---|---|---|
| 1 | ローカル localhost:5173 | 実装中・自分の担当機能を確認 |
| 2 | PR Preview（自動発行URL） | feature ブランチ push 後・PRレビュー時 |
| 3 | STG | develop マージ後・結合確認 |
| 4 | 本番 | main マージ後・最終確認 |

> Vercel ダッシュボード設定（Production Branch / STG Domain / 環境変数）と GAS 初回デプロイ手順は `README.md` の「デプロイ手順」セクション参照。
