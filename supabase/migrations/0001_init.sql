-- S1-1: GAS/スプシ → Supabase 並行書き込み移行用スキーマ
-- 現行スプレッドシートのグリッド構造に近い形でミラーする（正規化しすぎない）。
-- GASの service role key からのみ書き込む。フロントは直接Supabaseを叩かないため
-- 全テーブル RLS 有効化 + deny-all（明示的なポリシーを追加しない限り誰も読み書きできない）。

create table players (
  player_id text primary key,        -- 'P001' 等、選手マスタのID
  number text,
  name text not null
);

create table games (
  game_id text primary key,          -- 'G001' 等
  game_date date not null,
  opponent text not null,
  deleted_at timestamptz             -- 論理削除。GASの列F誤書き込みバグ(main.gs)は踏襲しない
);

create table roster_entries (
  game_id text not null references games(game_id) on delete cascade,
  batting_order smallint not null,
  name text not null,
  position text,
  sub_name text,
  sub_position text,
  sub_from_inning smallint,          -- 現行GASでは未保存の値。新規に永続化する
  primary key (game_id, batting_order)
);

create table bat_results (           -- 野手シートの打席セル1つ=1行
  game_id text not null references games(game_id) on delete cascade,
  batting_order smallint not null,
  inning smallint not null,
  round smallint not null,
  code text,
  run_code text,
  primary key (game_id, batting_order, inning, round)
);

create table batter_manual_stats (   -- 打点・得点・盗塁（コードから導出不可・手入力値）
  game_id text not null references games(game_id) on delete cascade,
  batting_order smallint not null,
  rbi smallint not null default 0,
  runs smallint not null default 0,
  sb smallint not null default 0,
  primary key (game_id, batting_order)
);

create table pitch_results (         -- 相手攻撃シートの打席セル1つ=1行
  game_id text not null references games(game_id) on delete cascade,
  opponent_order smallint not null,
  inning smallint not null,
  round smallint not null,
  code text,
  pitcher_name text,
  primary key (game_id, opponent_order, inning, round)
);

create table pitcher_appearances (   -- 投手別集計セクション（GASの7行制限は踏襲しない）
  game_id text not null references games(game_id) on delete cascade,
  pitcher_name text not null,
  ip text,                           -- GAS由来の"1.2"形式文字列をそのままミラー
  r smallint,
  er smallint,
  primary key (game_id, pitcher_name)
);

create table mvp (
  game_id text primary key references games(game_id) on delete cascade,
  name text not null,
  reason text
);

create table edit_log (
  id bigint generated always as identity primary key,
  logged_at timestamptz not null default now(),
  game_id text not null,
  edit_type text not null,
  inning text,
  round text,
  batting_order text,
  old_value text,
  new_value text
);

alter table players enable row level security;
alter table games enable row level security;
alter table roster_entries enable row level security;
alter table bat_results enable row level security;
alter table batter_manual_stats enable row level security;
alter table pitch_results enable row level security;
alter table pitcher_appearances enable row level security;
alter table mvp enable row level security;
alter table edit_log enable row level security;
