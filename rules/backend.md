# backend.md
<!-- 適用対象: gas/*.gs, app/src/api/gas.ts -->

> GAS Web API の設計規約・スプレッドシート構造・clasp デプロイ手順。

## API 設計

- **GET**: `?action={name}` クエリで `doGet` ルーティング
- **POST**: `mode: 'no-cors'` + JSON ボディの `type` フィールドで `doPost` ルーティング
- **no-cors 制約**: POST レスポンスボディはフロントから読めない → 書き込みは **冪等に設計**
- 関数命名: プライベートは `_camelCase`（例: `_getGames`）、パブリックは `doGet` / `doPost` のみ

## API 追加・変更時の手順

1. `gas/rickys-api.gs` を変更する前にチームへ共有
2. `app/src/api/gas.ts` にクライアント関数を追加
3. `app/src/types/index.ts` に型を追加
4. `docs/architecture.md` の API 一覧を更新

## スプレッドシート構造

| シート名 | 用途 |
| --- | --- |
| `試合マスタ` | 試合一覧（2行1ブロック: 先攻/後攻） |
| `選手マスタ` | 選手ID・背番号・名前 |
| `野手_{gameId}_{date}_{opponent}` | 試合ごとの打撃記録 |
| `相手攻撃_{gameId}_{date}_{opponent}` | 試合ごとの投手記録 |
| `BAT_STATS_CAREER` | 通算打撃（`getBatStats` で取得） |
| `PITCH_STATS_CAREER` | 通算投手（`getPitchStats` で取得） |
| `EDIT_LOG` | 修正履歴（`logEdit` で書き込み） |

- **キー変換**: GAS は `"1_1"`、フロントは `"1-1"`。`replace('_', '-')` で変換する規則を壊さない
- **打席セル形式**: `打撃コード` or `打撃コード/走塁コード`（例: `中安` / `中安/盗塁失敗`）
- コード一覧は `src/constants/codes.ts` の `RESULT_CODES` 参照

## デプロイ

```bash
cd gas
npm run deploy   # コード反映 + 既存デプロイ上書き（URL不変）
npm run push     # 反映のみ
```

- **新しいデプロイは作らない**（URL が変わり Vercel の `VITE_GAS_URL` 更新が必要になる）
- 既存デプロイの「編集」から再デプロイすること
- 初回 clasp セットアップは `gas/README.md` 参照（`clasp login` はブラウザ認証のため `! clasp login` で実行）
