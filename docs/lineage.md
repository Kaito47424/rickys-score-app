flowchart LR
  subgraph INPUT_APP["入力アプリ（/）"]
    subgraph INPUT_WORK["作業内容"]
      W1["試合を選ぶ"]
      W_create["新規試合を作成する"]
      W_lineup["スタメンを作成する"]
      W3["打席を記録する"]
      W4["投球を記録する"]
      W7["修正履歴を見る"]
    end
    GameSelect["GameSelect"]
    GameCreate["GameCreate"]
    OrderEdit["OrderEdit"]
    BatterTab["Input/BatterTab"]
    PitcherTab["Input/PitcherTab"]
    EditLogPage["EditLog"]
  end

  subgraph VIEW_APP["閲覧アプリ（/view）"]
    subgraph VIEW_WORK["作業内容"]
      W2["スタメンを確認する"]
      W5["個人成績を見る"]
      W6["試合サマリを見る"]
    end
    OrderView["OrderView"]
    Stats["Stats"]
    GameSummary["GameSummary"]
  end

  subgraph GAS["GAS関数"]
    fnGetGames["_getGames"]
    fnGetPlayers["_getPlayers"]
    fnGetGameData["_getGameData"]
    fnApiCreateGame["_apiCreateGame"]
    fnWriteInning["_writeInning"]
    fnLogEdit["_logEdit"]
    fnGetBatStats["_getBatStats"]
    fnGetPitchStats["_getPitchStats"]
    fnGetEditLog["_getEditLog"]
  end

  subgraph SS["スプレッドシート"]
    GameMaster["試合マスタ"]
    PlayerMaster["選手マスタ"]
    BatterSheet["野手_gameId"]
    OpponentSheet["相手攻撃_gameId"]
    BatStats["BAT_STATS_CAREER"]
    PitchStats["PITCH_STATS_CAREER"]
    EditLog["EDIT_LOG"]
  end

  W1       --> GameSelect
  W_create --> GameCreate
  W_lineup --> OrderEdit
  W3       --> BatterTab
  W4       --> PitcherTab
  W7       --> EditLogPage
  W2       --> OrderView
  W5       --> Stats
  W6       --> GameSummary

  GameSelect  --> fnGetGames
  GameCreate  -.-> fnApiCreateGame
  OrderEdit   --> fnGetPlayers
  OrderEdit   --> fnGetGameData
  BatterTab   -.-> fnWriteInning
  BatterTab   -.-> fnLogEdit
  PitcherTab  -.-> fnWriteInning
  PitcherTab  -.-> fnLogEdit
  EditLogPage --> fnGetEditLog
  OrderView   --> fnGetPlayers
  OrderView   --> fnGetGameData
  Stats       --> fnGetBatStats
  Stats       --> fnGetPitchStats
  GameSummary --> fnGetGameData

  fnGetGames      --> GameMaster
  fnGetPlayers    --> PlayerMaster
  fnApiCreateGame -.-> GameMaster
  fnApiCreateGame -.-> BatterSheet
  fnApiCreateGame -.-> OpponentSheet
  fnGetGameData   --> BatterSheet
  fnGetGameData   --> OpponentSheet
  fnGetBatStats   --> BatStats
  fnGetPitchStats --> PitchStats
  fnGetEditLog    --> EditLog
  fnWriteInning   -.-> BatterSheet
  fnWriteInning   -.-> OpponentSheet
  fnLogEdit       -.-> EditLog

  classDef inputWork  fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
  classDef viewWork   fill:#ede9fe,stroke:#7c3aed,color:#2e1065
  classDef inputComp  fill:#bfdbfe,stroke:#2563eb,color:#1e3a5f
  classDef viewComp   fill:#ddd6fe,stroke:#6d28d9,color:#2e1065
  classDef readFn     fill:#d1fae5,stroke:#10b981,color:#064e3b
  classDef writeFn    fill:#fecaca,stroke:#ef4444,color:#7f1d1d
  classDef createFn   fill:#e9d5ff,stroke:#a855f7,color:#3b0764
  classDef readSheet  fill:#fef9c3,stroke:#eab308,color:#713f12
  classDef writeSheet fill:#fed7aa,stroke:#f97316,color:#7c2d12

  class W1,W_create,W_lineup,W3,W4,W7 inputWork
  class W2,W5,W6 viewWork
  class GameSelect,GameCreate,OrderEdit,BatterTab,PitcherTab,EditLogPage inputComp
  class OrderView,Stats,GameSummary viewComp
  class fnGetGames,fnGetPlayers,fnGetGameData,fnGetBatStats,fnGetPitchStats,fnGetEditLog readFn
  class fnWriteInning,fnLogEdit writeFn
  class fnApiCreateGame createFn
  class GameMaster,PlayerMaster,BatStats,PitchStats readSheet
  class BatterSheet,OpponentSheet,EditLog writeSheet
