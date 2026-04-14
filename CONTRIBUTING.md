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
- `main` へのマージは `develop` からのみ（直接PRは禁止）
- CIが通っていること（型チェック・ビルド）

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

## ローカル開発環境セットアップ

```bash
git clone https://github.com/Kaito47424/rickys-score-app.git
cd rickys-score-app/app
npm install
cp .env.example .env.local
# .env.local に VITE_GAS_URL を設定
npm run dev
```
