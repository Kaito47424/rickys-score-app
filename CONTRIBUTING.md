# コントリビューションガイド

## ブランチ戦略

| ブランチ | 用途 |
|----------|------|
| `main` | 本番（直接push禁止・Vercelデプロイ対象） |
| `develop` | 統合ブランチ（PRの向き先） |
| `feature/xxx` | 機能開発（developからブランチ） |
| `fix/xxx` | バグ修正（developからブランチ） |
| `docs/xxx` | ドキュメント更新 |

```bash
# 開発の流れ
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
# ... 実装 ...
git push origin feature/your-feature-name
# → GitHub で develop に向けてPRを作成
```

## PRルール

- `develop` に向けてPRを作成
- レビュー1名以上必須
- `main` へのマージは `develop` からのみ（直接PRは禁止）・2人の合意のうえで実施
- CIが通っていること（型チェック・ビルド: `.github/workflows/ci.yml`）

### 要件番号とブランチ・PRの対応

ブランチ名とPRタイトルは `docs/requirements.md` の番号に合わせる。

```
# 単一要件
feature/2-7-url-separation
feature/2-2-bat-pitch-stats-api

# 関連する複数要件をまとめる場合（同一ブランチ・同一PRも可）
feature/2-2-2-11-pitch-stats
```

PRタイトル例:

```
feat: [2-7] URL分離（入力/閲覧）
feat: [2-2][2-11] getBatStats/getPitchStats API追加・投手成績-問題の修正
fix:  [2-11] 投手個人成績の登板数・防御率が-になる問題
```

> 複数要件を1つのブランチ・PRにまとめる場合は、要件同士の依存関係がある・変更範囲が重複するなど理由がある場合に限る。

## コミットメッセージ規則

```
feat:     新機能追加
fix:      バグ修正
docs:     ドキュメントのみの変更
refactor: リファクタリング（動作変更なし）
chore:    ビルド・設定ファイルの変更
```

例:
```
feat: 走塁結果入力モーダルを追加
fix: 既存試合データ読み込み時のイニングキー変換バグを修正
docs: 要件定義書にフェーズ3を追記
```

## コンフリクト回避指針

- コンポーネントは **自分の担当ディレクトリ内** で作業する
  - 例: 打撃タブの改修は `app/src/components/Input/BatterTab/` 内で行う
- 以下のファイルは **事前にチームに共有してから変更する**
  - `app/src/api/gas.ts`（API追加・変更）
  - `app/src/types/index.ts`（型定義変更）
  - `app/src/constants/codes.ts`（成績コード追加）
  - `gas/rickys-api.gs`（GAS API追加・変更）
- `app/src/App.tsx` の変更は影響範囲が広いため要注意

## 動作確認フロー

| ステップ | 環境 | URL | タイミング |
|----------|------|-----|-----------|
| 1 | ローカル | localhost:5173 | 実装中・自分の担当機能を確認 |
| 2 | PR Preview | 自動発行URL | featureブランチpush後・PRレビュー時 |
| 3 | STG | stg-rickys-score-app.vercel.app | developマージ後・結合確認 |
| 4 | 本番 | score-app-indol.vercel.app | mainマージ後・最終確認 |

```
feature push → PR Preview で確認
      ↓ developにマージ
STG（stg-rickys-score-app.vercel.app）で結合確認
      ↓ 問題なければ mainにマージ
本番（score-app-indol.vercel.app）に反映
```

## ローカル開発環境セットアップ

```bash
git clone https://github.com/Kaito47424/rickys-score-app.git
cd rickys-score-app/app
npm install
cp .env.example .env.local
# .env.local に VITE_GAS_URL を設定
npm run dev
```
