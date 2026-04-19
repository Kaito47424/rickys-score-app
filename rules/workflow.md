# workflow.md
<!-- 適用対象: ブランチ作成・コミット・PR作成のたび（プロジェクト全体） -->

> 概要: Git ブランチ戦略・PR ルール・コミット規約・コンフリクト回避指針。
> 出典: `CONTRIBUTING.md` を Claude 作業用に要約。詳細・最新は元ファイル参照。

## ブランチ戦略

| ブランチ | 用途 |
|----------|------|
| `main` | 本番（直接push禁止・Vercelデプロイ対象） |
| `develop` | 統合ブランチ（PRの向き先） |
| `feature/xxx` | 機能開発（develop から切る） |
| `fix/xxx` | バグ修正（develop から切る） |
| `docs/xxx` | ドキュメント更新 |

開発の起点は常に `develop`:

```bash
git checkout develop && git pull origin develop
git checkout -b feature/2-7-url-separation
```

## ブランチ命名規則

`feature/{要件番号}-{概要}` 形式。要件番号は `docs/requirements.md` に従う。

```
feature/2-7-url-separation
feature/2-2-bat-pitch-stats-api
feature/2-2-2-11-pitch-stats   # 関連する複数要件をまとめる場合
```

> 複数要件を同一ブランチにまとめるのは、依存関係がある・変更範囲が重複する等の理由がある場合に限る。

## PRルール

- **必ず `develop` に向ける**（`main` への直接PRは禁止）
- レビュー1名以上必須
- CI（型チェック・ビルド: `.github/workflows/ci.yml`）が通っていること
- `main` へのマージは `develop` からのみ・**2人の合意のうえ**で実施

### PRタイトル形式

`{type}: [{要件番号}] {概要}`

```
feat: [2-7] URL分離（入力/閲覧）
feat: [2-2][2-11] getBatStats/getPitchStats API追加・投手成績-問題の修正
fix:  [2-11] 投手個人成績の登板数・防御率が-になる問題
```

## コミットメッセージ規則

| プレフィクス | 用途 |
|---|---|
| `feat:` | 新機能追加 |
| `fix:` | バグ修正 |
| `docs:` | ドキュメントのみの変更 |
| `refactor:` | リファクタリング（動作変更なし） |
| `chore:` | ビルド・設定ファイルの変更 |

例:
```
feat: 走塁結果入力モーダルを追加
fix: 既存試合データ読み込み時のイニングキー変換バグを修正
docs: 要件定義書にフェーズ3を追記
```

## コンフリクト回避（重要）

### 自分の担当ディレクトリ内で作業する

例: 打撃タブの改修は `app/src/components/Input/BatterTab/` 内で行う。

### 変更前にチーム共有が必要なファイル

以下は影響範囲が広く、無断変更でコンフリクトを起こしやすい:

- `app/src/api/gas.ts`（API追加・変更）
- `app/src/types/index.ts`（型定義変更）
- `app/src/constants/codes.ts`（成績コード追加）
- `gas/rickys-api.gs`（GAS API追加・変更）

### 特に注意

- `app/src/App.tsx` の変更は **ルーティング構造に影響** するため要注意
