# データ構造定義書

## スプレッドシート シート一覧

| シート名 | 用途 |
|----------|------|
| `試合マスタ` | 試合一覧（2行1ブロック：先攻/後攻） |
| `選手マスタ` | 選手ID・背番号・名前 |
| `ポジションマスタ` | ポジション一覧 |
| `成績コードマスタ` | 打席結果コード定義・統計フラグ |
| `野手_{gameId}_{date}_{opponent}` | 試合ごとの打撃記録 |
| `相手攻撃_{gameId}_{date}_{opponent}` | 試合ごとの投手記録 |
| `BAT_RAW_PBP` | 打席単位の打撃生データ（エクスポート） |
| `BAT_RAW_GAME` | 試合単位の打撃集計（エクスポート） |
| `BAT_STATS_YEARLY` | 年度別打撃成績（エクスポート） |
| `BAT_STATS_CAREER` | 通算打撃成績（エクスポート） |
| `PITCH_RAW_GAME` | 試合単位の投手集計（エクスポート） |
| `PITCH_STATS_YEARLY` | 年度別投手成績（エクスポート） |
| `PITCH_STATS_CAREER` | 通算投手成績（エクスポート） |

## 野手シート 列定義

| 列 | 内容 | 備考 |
|----|------|------|
| A | 打順 | 1〜9 |
| B | 出場区分 | 先発 / 交代 |
| C | 選手名 | |
| D | ポジション | |
| E〜 | 打席結果 | (inning-1)*2+(round-1) のオフセット。セル値: `打撃コード` or `打撃コード/走塁コード` |
| Z+ | 集計列 | 打席・打数・安打・打点・得点・盗塁など |

## 相手攻撃シート 列定義

| 列 | 内容 | 備考 |
|----|------|------|
| A | 相手打順 | 1〜9 |
| B〜 | 結果コード / 投手名 | 2列1セットで各打席スロット |
| N | 失点 | 投手別集計セクション（15〜21行目） |
| O | 自責点 | 投手別集計セクション |

## 成績コード一覧

| カテゴリ | コード例 | 打席 | 打数 | アウト数 |
|----------|----------|------|------|---------|
| 安打 | 中安/左安/右安など | 1 | 1 | 0 |
| 長打 | 左二/中本など | 1 | 1 | 0 |
| 三振 | K / Kw | 1 | 1 | 1 |
| ゴロ | 遊ゴロ/三ゴロなど | 1 | 1 | 1 |
| フライ | 左飛/中飛など | 1 | 1 | 1 |
| ライナー | 左直/遊直など | 1 | 1 | 1 |
| 四死球 | 四球/死球 | 1 | 0 | 0 |
| 犠打 | 犠打 | 1 | 0 | 1 |
| 犠飛 | 犠飛 | 1 | 0 | 1 |
| 失策 | 失策(遊)など | 1 | 1 | 0 |
| 特殊 | 併殺打 | 1 | 1 | 2 |

### 走塁コード（runCode）

セル値に `/` で連結して保存される。打席カウントには影響しない。

| コード | 説明 | アウト数への影響 |
|--------|------|----------------|
| 盗塁失敗 | 盗塁アウト | +1 |
| 走塁死 | 走塁中アウト | +1 |
| 牽制死 | 牽制でアウト | +1 |

## TypeScript 型定義

```typescript
// app/src/types/index.ts

type GameInfo = {
  gameId: string
  gameDate: string
  opponent: string
  exists: boolean
}

type RosterEntry = {
  order: number
  name: string
  position: string
  subName: string
  subFromInning: number | null
}

type BatterEntry = { code: string; runCode: string | null }
type BatterResults = Record<string, BatterEntry>           // key: order番号
type PitcherResults = Record<string, { code: string; pitcher: string }>
type RbiMap = Record<string, { rbi: number; runs: number; sb: number }>

type InningState = {
  batterResults: BatterResults
  pitcherResults: PitcherResults
  rbiData: RbiMap
}

type AllInningData = Record<string, InningState>          // key: "inning-round" e.g. "1-1"
type PitcherRunStat = { name: string; r: number; er: number }

type GameData = {
  roster: RosterEntry[]
  batterResults: Record<string, Record<string, BatterEntry | string>>  // GASキーは "inning_round"
  pitcherResults: Record<string, Record<string, { code: string; pitcher: string }>>
  rbiData: Record<string, { rbi: number; runs: number; sb: number }>
  pitcherStats?: PitcherRunStat[]
}
```

## GASキー変換

GASは `"1_1"` 形式（アンダースコア）でキーを返す。フロントエンドは `"1-1"` 形式（ハイフン）を使用。

```typescript
const feKey = gasKey.replace('_', '-')  // "1_1" → "1-1"
```
