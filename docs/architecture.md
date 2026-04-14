# アーキテクチャ設計書

## システム構成図

```
┌─────────────────────────────────────────────────┐
│                  スマホブラウザ                    │
│         (iOS Safari / Android Chrome)           │
└─────────────────┬───────────────────────────────┘
                  │ HTTPS
                  ▼
┌─────────────────────────────────────────────────┐
│              Vercel (CDN + Edge)                │
│         React + TypeScript + Tailwind           │
│         app/ ディレクトリをルートとしてデプロイ   │
│         main ブランチへのpushで自動デプロイ       │
└─────────────────┬───────────────────────────────┘
                  │ GET: fetch(GAS_URL?action=xxx)
                  │ POST: fetch(GAS_URL, {mode:'no-cors'})
                  ▼
┌─────────────────────────────────────────────────┐
│         Google Apps Script (Web App)            │
│         doGet / doPost でリクエストを処理        │
│         rickys-api.gs + main.gs                 │
└─────────────────┬───────────────────────────────┘
                  │ SpreadsheetApp API
                  ▼
┌─────────────────────────────────────────────────┐
│           Googleスプレッドシート                  │
│  試合マスタ / 選手マスタ / 野手_xxx / 相手攻撃_xxx │
│  BAT_STATS_CAREER / PITCH_STATS_CAREER 等       │
└─────────────────────────────────────────────────┘
```

## GAS API一覧

### GET エンドポイント

`GET {VITE_GAS_URL}?action={action}`

| action | 説明 | レスポンス |
|--------|------|-----------|
| `getGames` | 試合一覧取得 | `GameInfo[]` |
| `getPlayers` | 選手一覧取得 | `Player[]` |
| `getGameData` | 試合データ取得 | `GameData` |
| `getBatStats` | 野手成績取得（キャリア） | `BatStat[]` |
| `getPitchStats` | 投手成績取得（キャリア） | `PitchStat[]` |

#### getGames レスポンス
```json
[
  { "gameId": "G001", "gameDate": "2025-04-01", "opponent": "相手チーム", "exists": true }
]
```

#### getGameData レスポンス
```json
{
  "roster": [{ "order": 1, "name": "山田太郎", "position": "遊", "subName": "", "subFromInning": null }],
  "batterResults": { "1_1": { "1": { "code": "中安", "runCode": null } } },
  "pitcherResults": { "1_1": { "1": { "code": "K", "pitcher": "田中" } } },
  "rbiData": { "1": { "rbi": 1, "runs": 0, "sb": 0 } },
  "pitcherStats": [{ "name": "田中", "r": 2, "er": 1 }]
}
```

### POST エンドポイント

`POST {VITE_GAS_URL}` (mode: no-cors)

| type | 説明 | 必須フィールド |
|------|------|--------------|
| `createGame` | 試合作成 | `gameDate`, `opponent` |
| `inning` | イニングデータ書き込み | `gameId`, `gameDate`, `opponent`, `inning`, `round`, `roster`, `batterResults`, `pitcherResults`, `rbiData`, `pitcherStats` |

## 環境変数一覧

| 変数名 | 環境 | 説明 |
|--------|------|------|
| `VITE_GAS_URL` | Vercel / ローカル | GAS WebアプリのデプロイURL |
| `JIRA_BASE_URL` | ローカル（scripts用） | JiraのベースURL |
| `JIRA_EMAIL` | ローカル（scripts用） | JiraログインEmail |
| `JIRA_API_TOKEN` | ローカル（scripts用） | Jira APIトークン |
| `JIRA_PROJECT_KEY` | ローカル（scripts用） | JiraプロジェクトキーEXAMPLE: RICKYS |

## 技術スタック

| レイヤー | 技術 | バージョン |
|----------|------|-----------|
| UI | React | 18.x |
| 言語 | TypeScript | 5.x |
| スタイル | Tailwind CSS | 3.x |
| ビルドツール | Vite | 5.x |
| ホスティング | Vercel | - |
| バックエンド | Google Apps Script | - |
| データ | Googleスプレッドシート | - |
