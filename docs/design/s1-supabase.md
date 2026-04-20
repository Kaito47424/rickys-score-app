# S1: Supabase移行

## 概要
GASは残しつつ、データ保存先をSupabaseに変更する。
並行運用でリスクを最小化する。

## 移行方針
- スプシへの書き込みは残したままSupabaseにも同時書き込み
- 読み取りは当面スプシのままとし、安定後にSupabaseへ切り替え

## 移行ステップ
| 番号 | 内容 |
|---|---|
| S1-1 | Supabaseプロジェクト作成・テーブル設計 |
| S1-2 | 既存スプシデータをCSVエクスポートしてインポート |
| S1-3 | GAS `_writeInning` にSupabase書き込みを追加（並行運用） |
| S1-4 | GAS `_apiCreateGame` にSupabase書き込みを追加 |
| S1-5 | スプシとSupabaseの整合性チェック |

## 必要なテーブル設計
（着手時に確認・設計すること）
- games
- players
- bat_results
- pitch_results
- edit_log
