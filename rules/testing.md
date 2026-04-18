# testing.md
<!-- 適用対象: プロジェクト全体の品質保証方針 -->

> 型チェック中心の品質保証（テストフレームワーク未導入）。将来導入時の方針も記載。

## 現状の品質ゲート

- テストフレームワーク未導入。CI（`.github/workflows/ci.yml`）は `cd app && npm run build`（tsc + vite build）のみ
- **PR マージ前にローカルで `npm run build` が通ることを確認**
- 型チェックがテスト代替。以下を徹底:
  - `any` 禁止
  - 型は `src/types/index.ts` に集約
  - `import type` を使用
  - GAS レスポンスは `GameData` 等で厳密に型付け

## テスト導入時の方針（将来）

- **スタック**: Vitest + @testing-library/react（Vite 統合が容易）
- **TDD フロー**: Red（テスト）→ Green（実装）→ Refactor
- **モック**: `src/api/gas.ts` はモック化。型は `src/types/index.ts` 準拠でズレを検出
- スプレッドシートへの直接アクセスはテスト対象外（GAS 側は手動テスト or 別途検討）

### 優先度

| 優先度 | 対象 | 理由 |
| --- | --- | --- |
| 高 | `src/api/gas.ts` | GAS 通信・エラーハンドリング |
| 高 | `src/constants/codes.ts` | 成績計算の基礎データ |
| 中 | `InputApp.tsx` | 状態遷移・データ変換 |
| 低 | UI コンポーネント | スナップショットの変更コスト高 |

### 命名規則

```typescript
describe('fetchGames', () => {
  it('試合一覧を正常に取得できる', async () => { ... })
  it('APIエラー時に例外をスローする', async () => { ... })
})
```
