# S1: Supabase移行

## 最終ゴール（アーキテクチャ）
GASを完全に廃止し、以下の構成にする。

```
ブラウザ → Vercel（React + Serverless Functions） → Supabase(Postgres)
```

そこへ至るまでのリスクを抑えるため、**GASを残したまま段階的に移行する**。
S1-1〜S1-5（並行書き込み）はその第一段階であり、最終形ではない。

## 移行方針（全体）
1. **並行書き込み**（S1-1〜S1-5・完了）: スプシへの書き込みは残したまま、GASからSupabaseにも同時書き込み。読み取りは当面スプシのまま
2. **安定運用の確認**（S1-6）: 実際のスコアリング運用でミラーが崩れないことを一定期間かけて確認
3. **読み取りロジックの移植**（S1-7）: 個人成績・各試合・年度別集計（打率・OBP/SLG・走者あり/なし打率・POP・K%・MVP集計等）をSupabase向けに実装
4. **APIのVercel移植**（S1-8）: `gas/rickys-api.gs`のdoGet/doPostが担う全機能をVercel Serverless Functions(`app/api/*`)へ移植し、フロントの参照先を切り替える
5. **GAS廃止・完全カットオーバー**（S1-9）: GAS Webアプリデプロイを停止し、Vercel+Supabaseのみの構成にする

## 移行ステップ
| 番号 | 内容 | 状態 |
|---|---|---|
| S1-1 | Supabaseプロジェクト作成・テーブル設計 | ✅ 完了 |
| S1-2 | 既存スプシデータをSupabaseへインポート | ✅ 完了 |
| S1-3 | GAS書き込みパス(`_apiInning`等)にSupabase書き込みを追加（並行運用） | ✅ 完了 |
| S1-4 | GAS `createNewGame()`（実際の試合作成経路）にSupabase書き込みを追加 | ✅ 完了 |
| S1-5 | スプシとSupabaseの整合性チェック | ✅ 完了 |
| S1-6 | 並行運用の安定確認（実試合でのミラー動作を観察・検証スクリプトで定期チェック） | 💡 アイデア |
| S1-7 | 読み取り集計ロジック（打率・OBP/SLG・走者あり/なし打率・POP・K%・MVP集計等）をSupabase向けに実装 | 💡 アイデア |
| S1-8 | GAS API(doGet/doPost)をVercel Serverless Functionsへ全面移植・フロント参照先切替 | 💡 アイデア |
| S1-9 | GAS Webアプリの廃止・完全カットオーバー | 💡 アイデア |

## テーブル設計（S1-1で確定済み）
- players
- games
- roster_entries
- bat_results
- batter_manual_stats
- pitch_results
- pitcher_appearances
- mvp
- edit_log
