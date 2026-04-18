# frontend.md
<!-- 適用対象: app/src/ 配下 -->

> React + TypeScript + Tailwind CSS のコーディング規約。`app/src/` を触る前に必読。

## コンポーネント

- 1ディレクトリ1機能（例: `components/Input/BatterTab/`）。エントリは `index.tsx`
- 名前・ファイル名は PascalCase。肥大化したら機能単位で子コンポーネントに分割
- ページ遷移ロジックは `App.tsx` / `InputApp.tsx` に集約（個別コンポーネントに持ち込まない）

## 状態管理

- グローバル状態ライブラリ **なし**（`useState` + props のみ）
- ページ遷移は `InputApp.tsx` の `Page` union（`'gameSelect' | 'orderEdit' | 'inputMain' | 'editLog'`）
- **イニングキー変換**: フロント `"1-1"`（ハイフン）、GAS `"1_1"`（アンダースコア）。`replace('_', '-')` で変換
- フォーム状態はコンポーネントローカル、送信後は親へコールバック

## TypeScript

- `any` 禁止（不明型は `unknown` + 型ガード）
- 共有型は `src/types/index.ts` に集約
- 型専用 import は `import type`
- `as` キャストは最小限、使う場合は理由をコメント

## スタイリング

- **Tailwind CSS のみ**（インラインスタイル・CSS Modules 禁止）
- スマホファースト（基本スタイルはスマホ向け）
- クラス順: レイアウト → サイズ → 色 → その他
- 条件付きクラスは三項演算子か `clsx`（テンプレートリテラル結合 NG）

## ルーティング

- `/` = 入力アプリ（`InputApp.tsx`）、`/view/*` = 閲覧アプリ（`ViewLayout/index.tsx`）
- **`App.tsx` の変更はチーム共有必須**（ルーティング構造の影響範囲が広い）

## API 呼び出し

- GAS アクセスは必ず `src/api/gas.ts` 経由（コンポーネントから直接 fetch 禁止）
- エラーは throw で上位伝播、catch はローディング解除用のみ
- POST は `mode: 'no-cors'` のためレスポンスボディは読めない → 確認は別 GET で
