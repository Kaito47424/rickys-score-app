// ============================================================
// Rickys 草野球 成績管理システム
// Google Apps Script (Google スプレッドシート用)
// ============================================================

// ==================== 定数 ====================

const SHEET = {
  PLAYER:        '選手マスタ',
  GAME:          '試合マスタ',
  POSITION:      'ポジションマスタ',
  STATS_CODE:    '成績コードマスタ',
  SCORE_SUMMARY: 'チーム成績一覧',
};

const SHEET_EXPORT = {
  BAT_RAW_PBP:        'BAT_RAW_PBP',
  BAT_RAW_GAME:       'BAT_RAW_GAME',
  BAT_STATS_YEARLY:   'BAT_STATS_YEARLY',
  BAT_STATS_CAREER:   'BAT_STATS_CAREER',
  PITCH_RAW_GAME:     'PITCH_RAW_GAME',
  PITCH_STATS_YEARLY: 'PITCH_STATS_YEARLY',
  PITCH_STATS_CAREER: 'PITCH_STATS_CAREER',
};

const INNINGS           = 11;
const ROUNDS_PER_INNING = 2;
const BATTING_ORDERS    = 9;
const ROWS_PER_ORDER    = 2;
const OPP_ER_PITCHERS   = 7;
const REGULAR_PA_RATE   = 2.0;

const BAT_AB_START = 5;
const OPP_AB_START = 2;

const BATTER_DATA_START   = 4;
const BATTER_DATA_END_ROW = 21;
const BAT_RUNS_COL_LETTER = 'Z';

const OPPONENT_DATA_START    = 3;
const OPP_ER_DATA_START_ROW  = 15;
const OPP_ER_DATA_END_ROW    = 21;
const OPP_ER_RUNS_COL_LETTER = 'N';

const GAME_TEAM_COL      = 4;
const GAME_INN_START_COL = 5;
const GAME_TOTAL_COL     = GAME_INN_START_COL + INNINGS; // 16 = P列
const GAME_RESULT_COL    = GAME_TOTAL_COL + 1;           // 17 = Q列
const GAME_NOTES_COL     = GAME_TOTAL_COL + 2;           // 18 = R列

const STAT_FLAGS = {
  打席: 'C', 打数: 'D', 安打: 'E', 二塁打: 'F', 三塁打: 'G', 本塁打: 'H',
  打点: 'I', 四球: 'J', 死球: 'K', 三振: 'L', 犠打: 'M', 犠飛: 'N',
  アウト数: 'O', フライフラグ: 'P',
};

const ERROR_CODES = [
  '失策(投)','失策(捕)','失策(一)','失策(二)','失策(三)',
  '失策(遊)','失策(左)','失策(中)','失策(右)',
];

const OPP_ER_COLS = {
  NAME:   1,  // A: 投手名
  IP:     2,  // B: 投球回（手動）
  SO:     3,  // C: 奪三振
  H:      6,  // F: 被安打
  HR:     7,  // G: 被本塁打
  BB:     10, // J: 四球
  HBP:    11, // K: 死球
  R:      14, // N: 失点（手動）
  ER:     15, // O: 自責点（手動）
  TOTAL:  15,
};

// ==================== カスタムメニュー ====================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('⚾ Rickys 管理')
    .addItem('① 初期セットアップ（マスタ作成）', 'setupMasters')
    .addSeparator()
    .addItem('② 新規試合を作成', 'createNewGame')
    .addSeparator()
    .addItem('③ プルダウンを一括更新', 'updateAllDropdowns')
    .addItem('④ 選手名を一括変更', 'renamePlayerEverywhere')
    .addItem('⑤ 投手集計セクションを一括更新', 'updateAllPitcherSections')
    .addSeparator()
    .addItem('⑥ 過去データの修復（7回→11回互換＆失策一括置換）', 'fixPastDataAndErrors')
    .addSeparator()
    .addItem('⑦ 成績コードマスタを更新', 'updateStatsCodeMaster')
    .addSeparator()
    .addSubMenu(
      ui.createMenu('⑧ データをエクスポート')
        .addItem('野手データをエクスポート（3シート）',   'exportBattersData')
        .addItem('投手データをエクスポート（3シート）', 'exportPitchersData')
        .addItem('全データをエクスポート（両方）',        'exportAllData')
    )
    .addToUi();
}

// ==================== 過去データ修復＆クレンジング ====================

function fixPastDataAndErrors() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const res = ui.alert(
    '過去データ修復＆クレンジング',
    '無効なプルダウンを解除し、旧エラーコード「失策(投)」等を「失策(遊)」に一括置換します。\n続行しますか？',
    ui.ButtonSet.YES_NO
  );
  if (res !== ui.Button.YES) return;

  let fixedValidations = 0;
  let fixedErrorsCount = 0;

  ss.getSheets().forEach(sheet => {
    const name = sheet.getName();

    if (name.startsWith('野手_')) {
      const abSlots = _getBatterAbSlots(sheet);
      const statsStartCol = BAT_AB_START + abSlots;
      const lastCol = sheet.getLastColumn();
      
      if (lastCol >= statsStartCol) {
        const range = sheet.getRange(BATTER_DATA_START, statsStartCol, BATTING_ORDERS * ROWS_PER_ORDER, lastCol - statsStartCol + 1);
        range.clearDataValidations();
        fixedValidations++;
      }

      const dataRange = sheet.getRange(BATTER_DATA_START, BAT_AB_START, BATTING_ORDERS * ROWS_PER_ORDER, abSlots);
      const values = dataRange.getValues();
      let changed = false;
      for(let r=0; r<values.length; r++) {
        for(let c=0; c<values[r].length; c++) {
          const val = String(values[r][c]).trim();
          if (val.startsWith('失策(') && val.endsWith(')')) {
            values[r][c] = '失策(遊)';
            changed = true;
            fixedErrorsCount++;
          }
        }
      }
      if (changed) dataRange.setValues(values);
    }

    if (name.startsWith('相手攻撃_')) {
      const abSlots = _getPitcherAbSlots(sheet);
      const ds = OPPONENT_DATA_START;
      
      for (let ab = 0; ab < abSlots; ab++) {
        const resultCol = OPP_AB_START + ab * 2;
        const dataRange = sheet.getRange(ds, resultCol, BATTING_ORDERS, 1);
        const values = dataRange.getValues();
        let changed = false;
        for(let r=0; r<values.length; r++) {
          const val = String(values[r][0]).trim();
          if (val.startsWith('失策(') && val.endsWith(')')) {
            values[r][0] = '失策(遊)';
            changed = true;
            fixedErrorsCount++;
          }
        }
        if (changed) dataRange.setValues(values);
      }
    }
  });

  ui.alert(
    '修復完了',
    `処理が完了しました。\n・プルダウンエラー解除: ${fixedValidations}シート\n・失策の「失策(遊)」への置換: ${fixedErrorsCount}箇所`,
    ui.ButtonSet.OK
  );
}

// ==================== ① 初期セットアップ ====================

function setupMasters() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.alert(
    '初期セットアップ',
    'マスタシートを作成します。\n同名のシートが存在する場合は上書きされます。続行しますか？',
    ui.ButtonSet.YES_NO
  );
  if (res !== ui.Button.YES) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  _setupPlayerMaster(ss);
  _setupGameMaster(ss);
  _setupPositionMaster(ss);
  _setupStatsCodeMaster(ss);
  _setupScoreSummarySheet(ss);

  ui.alert('セットアップ完了', '全マスタシートの作成が完了しました。\n選手マスタに選手を登録してから試合作成に進んでください。', ui.ButtonSet.OK);
}

// ==================== ⑦ 成績コードマスタ更新 ====================

function updateStatsCodeMaster() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.alert(
    '成績コードマスタを更新',
    '成績コードマスタを最新の定義で上書きします。\n手動で追加した行は消えます。続行しますか？',
    ui.ButtonSet.YES_NO
  );
  if (res !== ui.Button.YES) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  _setupStatsCodeMaster(ss);

  ui.alert('更新完了', '成績コードマスタを更新しました。', ui.ButtonSet.OK);
}

function _setupPlayerMaster(ss) {
  const sheet = _getOrCreateSheet(ss, SHEET.PLAYER);
  sheet.clearContents();
  sheet.clearFormats();

  _writeHeader(sheet, ['選手ID', '背番号', '選手名', '投打'], '#1565c0');

  for (let r = 2; r <= 100; r++) {
    sheet.getRange(r, 1).setFormula(`=IF(B${r}="","","P"&TEXT(ROW()-1,"000"))`);
  }

  const handednessRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['右投右打', '左投右打', '右投左打', '左投左打', '両打', '両投'], true)
    .setAllowInvalid(true).build();
  sheet.getRange('D2:D100').setDataValidation(handednessRule);

  [80, 60, 130, 80].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  sheet.setFrozenRows(1);
  sheet.getRange('A:A').setHorizontalAlignment('center');
}

function _setupGameMaster(ss) {
  const sheet = _getOrCreateSheet(ss, SHEET.GAME);
  sheet.clearContents();
  sheet.clearFormats();

  const headers = ['試合ID', '日付', '場所', 'チーム'];
  for (let i = 1; i <= INNINGS; i++) headers.push(`${i}回`);
  headers.push('計', '勝敗', '備考');
  _writeHeader(sheet, headers, '#1565c0');

  const dateTagExpr = `SUBSTITUTE(SUBSTITUTE(TEXT(B2,"YYYY/MM/DD"),"/",""),"-","")`;
  const batRef = `"'"&"野手_"&A2&"_"&${dateTagExpr}&"_"&D3&"'!${BAT_RUNS_COL_LETTER}${BATTER_DATA_START}:${BAT_RUNS_COL_LETTER}${BATTER_DATA_END_ROW}"`;
  const oppRef = `"'"&"相手攻撃_"&A2&"_"&${dateTagExpr}&"_"&D2&"'!${OPP_ER_RUNS_COL_LETTER}${OPP_ER_DATA_START_ROW}:${OPP_ER_RUNS_COL_LETTER}${OPP_ER_DATA_END_ROW}"`;
  const totalColL = _colLetter(GAME_TOTAL_COL);

  const cfRange = sheet.getRange(2, GAME_TOTAL_COL, 399, 1);

  const selfCfRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(
      `=AND(MOD(ROW(),2)=0,A2<>"",IFERROR(${totalColL}2<>SUM(INDIRECT(${batRef})),FALSE))`
    )
    .setBackground('#ef9a9a').setFontColor('#b71c1c').setBold(true)
    .setRanges([cfRange]).build();

  const oppCfRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(
      `=AND(MOD(ROW(),2)=1,A2<>"",IFERROR(${totalColL}2<>SUM(INDIRECT(${oppRef})),FALSE))`
    )
    .setBackground('#ef9a9a').setFontColor('#b71c1c').setBold(true)
    .setRanges([cfRange]).build();

  sheet.setConditionalFormatRules([selfCfRule, oppCfRule]);

  sheet.setColumnWidth(1, 65);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 120);
  for (let i = 0; i < INNINGS; i++) sheet.setColumnWidth(GAME_INN_START_COL + i, 48);
  sheet.setColumnWidth(GAME_TOTAL_COL,  55);
  sheet.setColumnWidth(GAME_RESULT_COL, 50);
  sheet.setColumnWidth(GAME_NOTES_COL, 180);

  sheet.setFrozenRows(1);
  sheet.getRange('A:A').setHorizontalAlignment('center');
}

function _setupPositionMaster(ss) {
  const sheet = _getOrCreateSheet(ss, SHEET.POSITION);
  sheet.clearContents();
  sheet.clearFormats();

  _writeHeader(sheet, ['略称', '守備位置名'], '#1565c0');

  const positions = [
    ['投', 'ピッチャー'], ['捕', 'キャッチャー'], ['一', 'ファースト'],
    ['二', 'セカンド'],   ['三', 'サード'],        ['遊', 'ショート'],
    ['左', 'レフト'],     ['中', 'センター'],       ['右', 'ライト'],
    ['指', '指名打者'],
  ];
  sheet.getRange(2, 1, positions.length, 2).setValues(positions);
  [60, 150].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  sheet.setFrozenRows(1);
}

function _setupStatsCodeMaster(ss) {
  const sheet = _getOrCreateSheet(ss, SHEET.STATS_CODE);
  sheet.clearContents();
  sheet.clearFormats();

  const headers = ['コード', '名称', '打席', '打数', '安打', '二塁打', '三塁打', '本塁打',
                   '打点', '四球', '死球', '三振', '犠打', '犠飛', 'アウト数', 'フライフラグ'];
  _writeHeader(sheet, headers, '#1565c0');

  const H = label => [label, '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  const codes = [
    H('--- 【安打系】 ---'),
    ['投安',  'ピッチャー安打',                 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ['捕安',  'キャッチャー安打',               1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ['一安',  'ファースト安打',                 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ['二安',  'セカンド安打',                   1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ['三安',  'サード安打',                     1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ['遊安',  'ショート安打',                   1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ['左安',  'レフト安打',                     1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    ['中安',  'センター安打',                   1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    ['右安',  'ライト安打',                     1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    ['左中間安', 'レフト-センター間安打',        1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    ['右中間安', 'ライト-センター間安打',        1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    ['左二',     'レフト二塁打',                1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    ['中二',     'センター二塁打',              1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    ['右二',     'ライト二塁打',                1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    ['左中間二', 'レフト-センター間二塁打',     1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    ['右中間二', 'ライト-センター間二塁打',     1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    ['左三',     'レフト三塁打',                1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    ['中三',     'センター三塁打',              1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    ['右三',     'ライト三塁打',                1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    ['左中間三', 'レフト-センター間三塁打',     1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    ['右中間三', 'ライト-センター間三塁打',     1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    ['左本',     'レフト本塁打',                1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1],
    ['中本',     'センター本塁打',              1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1],
    ['右本',     'ライト本塁打',                1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1],
    ['左中間本', 'レフト-センター間本塁打',     1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1],
    ['右中間本', 'ライト-センター間本塁打',     1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1],
    H('--- 【三振・ゴロ】 ---'),
    ['K',        '空振り三振',                  1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0],
    ['Kw',       '見逃し三振',                  1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0],
    ['投ゴロ',   'ピッチャーゴロ',              1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    ['捕ゴロ',   'キャッチャーゴロ',            1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    ['一ゴロ',   'ファーストゴロ',              1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    ['二ゴロ',   'セカンドゴロ',                1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    ['三ゴロ',   'サードゴロ',                  1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    ['遊ゴロ',   'ショートゴロ',                1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    H('--- 【フライ・ライナー】 ---'),
    ['投飛',     'ピッチャーフライ',            1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ['捕飛',     'キャッチャーフライ',          1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ['一飛',     'ファーストフライ',            1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ['二飛',     'セカンドフライ',              1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ['三飛',     'サードフライ',                1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ['遊飛',     'ショートフライ',              1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ['左飛',     'レフトフライ',                1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ['中飛',     'センターフライ',              1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ['右飛',     'ライトフライ',                1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ['投直',     'ピッチャーライナー',          1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ['捕直',     'キャッチャーライナー',        1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ['一直',     'ファーストライナー',          1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ['二直',     'セカンドライナー',            1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ['三直',     'サードライナー',              1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ['遊直',     'ショートライナー',            1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ['左直',     'レフトライナー',              1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ['中直',     'センターライナー',            1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ['右直',     'ライトライナー',              1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    H('--- 【四死球・その他】 ---'),
    ['四球',     '四球（BB）',                  1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    ['死球',     '死球（HBP）',                 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    ['犠打',     '犠牲バント（SAC）',           1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0],
    ['犠飛',     '犠牲フライ（SF）',            1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
    ['妨害',     '守備妨害出塁',                1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ['走妨',     '走塁妨害',                    1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    H('--- 【失策】 ---'),
    ['失策(投)', 'ピッチャーエラー',            1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ['失策(捕)', 'キャッチャーエラー',          1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ['失策(一)', 'ファーストエラー',            1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ['失策(二)', 'セカンドエラー',              1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ['失策(三)', 'サードエラー',                1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ['失策(遊)', 'ショートエラー',              1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ['失策(左)', 'レフトエラー',                1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ['失策(中)', 'センターエラー',              1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ['失策(右)', 'ライトエラー',                1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    H('--- 【特殊打席】 ---'),
    ['併殺打',   '併殺打（ゲッツー）',          1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0],
  ];

  sheet.getRange(2, 1, codes.length, codes[0].length).setValues(codes);

  for (let i = 0; i < codes.length; i++) {
    if (String(codes[i][0]).startsWith('---')) {
      sheet.getRange(i + 2, 1, 1, codes[0].length)
        .setBackground('#e8eaf6').setFontColor('#3949ab').setFontWeight('bold');
    }
  }

  [80, 160].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  for (let c = 3; c <= 16; c++) sheet.setColumnWidth(c, 55);
  sheet.setFrozenRows(1);
}

function _setupScoreSummarySheet(_ss) {}

// ==================== ② 新規試合作成 ====================

function createNewGame() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const gameMaster = ss.getSheetByName(SHEET.GAME);
  if (!gameMaster) {
    ui.alert('エラー', '試合マスタが見つかりません。先に「初期セットアップ」を実行してください。', ui.ButtonSet.OK);
    return;
  }

  const { gameId, topRow } = _getNextGameBlock(gameMaster);
  const bottomRow = topRow + 1;

  const usedIds = new Set();
  ss.getSheets().forEach(s => {
    const m = s.getName().match(/^(野手|相手攻撃)_(G\d+)_/);
    if (m) usedIds.add(m[2]);
  });
  if (usedIds.has(gameId)) {
    ui.alert('エラー', `試合 "${gameId}" のシートが既に存在します。\n試合マスタの内容を確認してください。`, ui.ButtonSet.OK);
    return;
  }

  const dateRes = ui.prompt(`新規試合 ${gameId} を作成`, '試合日を入力してください（例: 2026/05/03）:', ui.ButtonSet.OK_CANCEL);
  if (dateRes.getSelectedButton() !== ui.Button.OK) return;
  const gameDate = dateRes.getResponseText().trim();
  if (!gameDate) { ui.alert('エラー', '日付は必須です。', ui.ButtonSet.OK); return; }

  const oppRes = ui.prompt(`新規試合 ${gameId} を作成`, '対戦相手チーム名を入力してください:', ui.ButtonSet.OK_CANCEL);
  if (oppRes.getSelectedButton() !== ui.Button.OK) return;
  const opponent = oppRes.getResponseText().trim();
  if (!opponent) { ui.alert('エラー', '対戦相手は必須です。', ui.ButtonSet.OK); return; }

  const innStartL = _colLetter(GAME_INN_START_COL);
  const innEndL   = _colLetter(GAME_INN_START_COL + INNINGS - 1);
  const totalL    = _colLetter(GAME_TOTAL_COL);

  gameMaster.getRange(topRow, 1).setValue(gameId);
  gameMaster.getRange(topRow, 2).setValue(gameDate);
  gameMaster.getRange(topRow,    GAME_TEAM_COL).setValue('Rickys');
  gameMaster.getRange(bottomRow, GAME_TEAM_COL).setValue(opponent);
  gameMaster.getRange(topRow,    GAME_TOTAL_COL).setFormula(`=SUM(${innStartL}${topRow}:${innEndL}${topRow})`);
  gameMaster.getRange(bottomRow, GAME_TOTAL_COL).setFormula(`=SUM(${innStartL}${bottomRow}:${innEndL}${bottomRow})`);

  const teamL = _colLetter(GAME_TEAM_COL);
  gameMaster.getRange(topRow, GAME_RESULT_COL).setFormula(
    `=IF(COUNTA(${innStartL}${topRow}:${innEndL}${bottomRow})=0,"",` +
    `IF(SUMIF(${teamL}${topRow}:${teamL}${bottomRow},"Rickys",${totalL}${topRow}:${totalL}${bottomRow})` +
    `>SUMIFS(${totalL}${topRow}:${totalL}${bottomRow},${teamL}${topRow}:${teamL}${bottomRow},"<>Rickys"),"〇",` +
    `IF(SUMIF(${teamL}${topRow}:${teamL}${bottomRow},"Rickys",${totalL}${topRow}:${totalL}${bottomRow})` +
    `<SUMIFS(${totalL}${topRow}:${totalL}${bottomRow},${teamL}${topRow}:${teamL}${bottomRow},"<>Rickys"),"●","△")))`
  );

  SpreadsheetApp.flush();

  [1, 2, 3, GAME_RESULT_COL, GAME_NOTES_COL].forEach(col => {
    gameMaster.getRange(topRow, col, 2, 1).merge();
  });

  gameMaster.getRange(topRow,    GAME_TEAM_COL).setBackground('#e3f2fd').setFontWeight('bold');
  gameMaster.getRange(bottomRow, GAME_TEAM_COL).setBackground('#fce4ec');
  gameMaster.getRange(topRow,    GAME_INN_START_COL, 1, INNINGS).setBackground('#fffde7');
  gameMaster.getRange(bottomRow, GAME_INN_START_COL, 1, INNINGS).setBackground('#fff3e0');
  gameMaster.getRange(topRow,    GAME_TOTAL_COL).setBackground('#e8f5e9').setFontWeight('bold');
  gameMaster.getRange(bottomRow, GAME_TOTAL_COL).setBackground('#e8f5e9').setFontWeight('bold');
  gameMaster.getRange(topRow,    GAME_RESULT_COL).setHorizontalAlignment('center');

  gameMaster.getRange(bottomRow, 1, 1, GAME_NOTES_COL)
    .setBorder(null, null, true, null, null, null, '#9e9e9e', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  const dateTag         = gameDate.replace(/[\/\-]/g, '');
  const batterSheetName = `野手_${gameId}_${dateTag}_${opponent}`;
  const oppSheetName    = `相手攻撃_${gameId}_${dateTag}_${opponent}`;

  _createBatterSheet(ss, gameId, gameDate, opponent, batterSheetName);
  _createOpponentBatSheet(ss, gameId, gameDate, opponent, oppSheetName);

  ui.alert(
    '作成完了',
    `試合 ${gameId}（${gameDate} vs ${opponent}）のシートを作成しました。\n\n` +
    `・${batterSheetName}（野手）\n・${oppSheetName}（相手攻撃/投手記録）\n\n` +
    `※ スコアは「試合マスタ」の各イニング列に手入力してください。`,
    ui.ButtonSet.OK
  );
}

// ==================== ③ プルダウン一括更新 ====================

function updateAllDropdowns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const res = ui.alert(
    'プルダウン一括更新',
    '全ての野手シート・相手攻撃シートの成績プルダウンを最新のマスタで更新します。\n続行しますか？',
    ui.ButtonSet.YES_NO
  );
  if (res !== ui.Button.YES) return;

  const statsCodes = _getStatsCodes(ss);
  if (statsCodes.length === 0) {
    ui.alert('エラー', '成績コードマスタが空です。先に初期セットアップを実行してください。', ui.ButtonSet.OK);
    return;
  }

  const statsRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(statsCodes, true)
    .setAllowInvalid(true).build();

  const playerMasterSheet = ss.getSheetByName(SHEET.PLAYER);
  const pitcherRule = playerMasterSheet
    ? SpreadsheetApp.newDataValidation()
        .requireValueInRange(playerMasterSheet.getRange('C2:C100'), true)
        .setAllowInvalid(true).build()
    : null;

  const totalRows = BATTING_ORDERS * ROWS_PER_ORDER;

  let batCount = 0;
  let oppCount = 0;

  ss.getSheets().forEach(sheet => {
    const name = sheet.getName();

    if (name.startsWith('野手_')) {
      const abSlots = _getBatterAbSlots(sheet);
      sheet.getRange(BATTER_DATA_START, BAT_AB_START, totalRows, abSlots)
        .setDataValidations(
          Array.from({ length: totalRows }, () => Array(abSlots).fill(statsRule))
        );
      batCount++;
    }

    if (name.startsWith('相手攻撃_')) {
      const ds = OPPONENT_DATA_START;
      const abSlots = _getPitcherAbSlots(sheet);
      for (let ab = 0; ab < abSlots; ab++) {
        const resultCol  = OPP_AB_START + ab * 2;
        const pitcherCol = resultCol + 1;
        sheet.getRange(ds, resultCol, BATTING_ORDERS, 1)
          .setDataValidations(Array.from({ length: BATTING_ORDERS }, () => [statsRule]));
        if (pitcherRule) {
          sheet.getRange(ds, pitcherCol, BATTING_ORDERS, 1)
            .setDataValidations(Array.from({ length: BATTING_ORDERS }, () => [pitcherRule]));
        }
      }
      oppCount++;
    }
  });

  ui.alert(
    '更新完了',
    `プルダウンを更新しました。\n・野手シート: ${batCount}件\n・相手攻撃シート: ${oppCount}件`,
    ui.ButtonSet.OK
  );
}

// ==================== ④ 選手名一括変更 ====================

function renamePlayerEverywhere() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const beforeRes = ui.prompt(
    '選手名一括変更 (1/2)',
    '変更前の選手名を入力してください（完全一致）:',
    ui.ButtonSet.OK_CANCEL
  );
  if (beforeRes.getSelectedButton() !== ui.Button.OK) return;
  const oldName = beforeRes.getResponseText().trim();
  if (!oldName) { ui.alert('エラー', '変更前の名前は必須です。', ui.ButtonSet.OK); return; }

  const afterRes = ui.prompt(
    '選手名一括変更 (2/2)',
    `「${oldName}」を変更後の名前に変更します。\n変更後の選手名を入力してください:`,
    ui.ButtonSet.OK_CANCEL
  );
  if (afterRes.getSelectedButton() !== ui.Button.OK) return;
  const newName = afterRes.getResponseText().trim();
  if (!newName) { ui.alert('エラー', '変更後の名前は必須です。', ui.ButtonSet.OK); return; }
  if (oldName === newName) { ui.alert('エラー', '変更前と変更後の名前が同じです。', ui.ButtonSet.OK); return; }

  const confirm = ui.alert(
    '確認',
    `「${oldName}」→「${newName}」に全シートで一括変更します。\nこの操作は元に戻せません。続行しますか？`,
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  let totalCount = 0;
  const changedSheets = [];

  ss.getSheets().forEach(sheet => {
    const name = sheet.getName();
    let sheetCount = 0;

    if (name === SHEET.PLAYER) {
      const data = sheet.getRange('C2:C100').getValues();
      data.forEach((row, i) => {
        if (String(row[0]).trim() === oldName) {
          sheet.getRange(i + 2, 3).setValue(newName);
          sheetCount++;
        }
      });
    }

    if (name.startsWith('野手_')) {
      const totalRows = BATTING_ORDERS * ROWS_PER_ORDER;
      const data = sheet.getRange(BATTER_DATA_START, 3, totalRows, 1).getValues();
      data.forEach((row, i) => {
        if (String(row[0]).trim() === oldName) {
          sheet.getRange(BATTER_DATA_START + i, 3).setValue(newName);
          sheetCount++;
        }
      });
    }

    if (name.startsWith('相手攻撃_')) {
      const abSlots = _getPitcherAbSlots(sheet);
      const ds = OPPONENT_DATA_START;

      for (let ab = 0; ab < abSlots; ab++) {
        const pitcherCol = OPP_AB_START + ab * 2 + 1;
        const data = sheet.getRange(ds, pitcherCol, BATTING_ORDERS, 1).getValues();
        data.forEach((row, i) => {
          if (String(row[0]).trim() === oldName) {
            sheet.getRange(ds + i, pitcherCol).setValue(newName);
            sheetCount++;
          }
        });
      }

      const erData = sheet.getRange(OPP_ER_DATA_START_ROW, OPP_ER_COLS.NAME, OPP_ER_PITCHERS, 1).getValues();
      erData.forEach((row, i) => {
        if (String(row[0]).trim() === oldName) {
          sheet.getRange(OPP_ER_DATA_START_ROW + i, OPP_ER_COLS.NAME).setValue(newName);
          sheetCount++;
        }
      });
    }

    if (sheetCount > 0) {
      changedSheets.push(`・${name}（${sheetCount}箇所）`);
      totalCount += sheetCount;
    }
  });

  if (totalCount === 0) {
    ui.alert('結果', `「${oldName}」は見つかりませんでした。`, ui.ButtonSet.OK);
  } else {
    ui.alert(
      '変更完了',
      `「${oldName}」→「${newName}」に変更しました。\n合計: ${totalCount}箇所\n\n` +
      changedSheets.join('\n'),
      ui.ButtonSet.OK
    );
  }
}

// ==================== ⑤ 投手集計セクション一括更新 ====================

function updateAllPitcherSections() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const res = ui.alert(
    '投手集計セクション一括更新',
    '全ての相手攻撃シートの投手集計セクションを最新レイアウトに更新します。\n続行しますか？',
    ui.ButtonSet.YES_NO
  );
  if (res !== ui.Button.YES) return;

  let count = 0;

  ss.getSheets().forEach(sheet => {
    if (!sheet.getName().startsWith('相手攻撃_')) return;
    _rebuildPitcherSection(ss, sheet);
    count++;
  });

  ui.alert('更新完了', `投手集計セクションを更新しました。\n・相手攻撃シート: ${count}件`, ui.ButtonSet.OK);
}

function _rebuildPitcherSection(ss, sheet) {
  const sm           = SHEET.STATS_CODE;
  const abSlots      = _getPitcherAbSlots(sheet);
  const ds           = OPPONENT_DATA_START;
  const de           = ds + BATTING_ORDERS - 1;

  const ER_LABEL_ROW  = de + 2; // 13
  const ER_HEADER_ROW = de + 3; // 14
  const ER_DATA_START = de + 4; // 15
  const SECTION_COLS  = OPP_ER_COLS.TOTAL; // 15列（A〜O）

  const playerMasterSheet = ss.getSheetByName(SHEET.PLAYER);
  const pitcherRule = playerMasterSheet
    ? SpreadsheetApp.newDataValidation()
        .requireValueInRange(playerMasterSheet.getRange('C2:C100'), true)
        .setAllowInvalid(true).build()
    : null;

  sheet.getRange(ER_LABEL_ROW, 1, 1, SECTION_COLS)
    .setBackground('#880e4f').setFontColor('#ffffff');
  sheet.getRange(ER_LABEL_ROW, OPP_ER_COLS.NAME)
    .setValue('◆ 投手別 集計（自動）')
    .setFontWeight('bold').setFontSize(11);

  sheet.getRange(ER_HEADER_ROW, 1, 1, SECTION_COLS)
    .clearContent()
    .setBackground('#880e4f').setFontColor('#ffffff')
    .setFontWeight('bold').setHorizontalAlignment('center');

  const headerMap = {
    [OPP_ER_COLS.NAME]: '投手名',
    [OPP_ER_COLS.IP]:   '投球回',
    [OPP_ER_COLS.SO]:   '奪三振',
    [OPP_ER_COLS.H]:    '被安打',
    [OPP_ER_COLS.HR]:   '被本塁打',
    [OPP_ER_COLS.BB]:   '四球',
    [OPP_ER_COLS.HBP]:  '死球',
    [OPP_ER_COLS.R]:    '失点',
    [OPP_ER_COLS.ER]:   '自責点',
  };
  Object.entries(headerMap).forEach(([col, label]) => {
    sheet.getRange(ER_HEADER_ROW, Number(col)).setValue(label);
  });

  for (let i = 0; i < OPP_ER_PITCHERS; i++) {
    const row = ER_DATA_START + i;
    const bg  = i % 2 === 0 ? '#fce4ec' : '#fff8f8';

    sheet.getRange(row, 1, 1, SECTION_COLS).setBackground(bg);

    if (pitcherRule) sheet.getRange(row, OPP_ER_COLS.NAME).setDataValidation(pitcherRule);

    // 投球回は手動入力にするため数式を削除
    sheet.getRange(row, OPP_ER_COLS.IP)
      .setValue('')
      .setNote('投球回は手動で入力してください（例: 1, 1.1, 1.2, 2）');

    const termSets = {
      [OPP_ER_COLS.SO]:  { idx: 12, label: 'so' },
      [OPP_ER_COLS.H]:   { idx: 5,  label: 'h' },
      [OPP_ER_COLS.HR]:  { idx: 8,  label: 'hr' },
      [OPP_ER_COLS.BB]:  { idx: 10, label: 'bb' },
      [OPP_ER_COLS.HBP]: { idx: 11, label: 'hbp' },
    };

    const terms = {};
    Object.entries(termSets).forEach(([col, { idx }]) => {
      terms[col] = [];
    });

    for (let ab = 0; ab < abSlots; ab++) {
      const rcol = _colLetter(OPP_AB_START + ab * 2);
      const pcol = _colLetter(OPP_AB_START + ab * 2 + 1);
      const nameRef = `A${row}`;

      Object.entries(termSets).forEach(([col, { idx }]) => {
        terms[col].push(
          `SUMPRODUCT((${pcol}$${ds}:${pcol}$${de}=${nameRef})*IFERROR(VLOOKUP(${rcol}$${ds}:${rcol}$${de},'${sm}'!$A:$O,${idx},FALSE),0))`
        );
      });
    }

    [OPP_ER_COLS.SO, OPP_ER_COLS.H, OPP_ER_COLS.HR, OPP_ER_COLS.BB, OPP_ER_COLS.HBP].forEach(col => {
      sheet.getRange(row, col).setFormula(
        `=IF(A${row}="","",${terms[col].join('+')})`
      );
    });

    sheet.getRange(row, OPP_ER_COLS.R).setNote('失点は手動で入力してください');
    sheet.getRange(row, OPP_ER_COLS.ER).setNote('自責点は手動で入力してください');
  }
}

// ==================== 野手スコアシート ====================

function _createBatterSheet(ss, gameId, gameDate, opponent, sheetName) {
  const sheet      = ss.insertSheet(sheetName);
  const statsCodes = _getStatsCodes(ss);

  const totalAbSlots = INNINGS * ROUNDS_PER_INNING;
  const STATS_START  = BAT_AB_START + totalAbSlots;
  const statHeaders  = ['打席', '打数', '安打', '二塁打', '三塁打', '本塁打', '打点', '得点', '盗塁', '四球', '死球', '三振', '犠打', '犠飛'];
  const totalCols    = STATS_START - 1 + statHeaders.length;

  sheet.getRange(1, 1, 1, totalCols).setBackground('#e3f2fd');
  sheet.getRange(1, 1)
    .setValue(`野手成績  ${gameId}  ${gameDate}  vs ${opponent}`)
    .setFontSize(13).setFontWeight('bold');
  sheet.getRange(1, 1).setNote(`gameId:${gameId}`);

  const row2 = ['打順', '出場種別', '選手名', 'ポジション'];
  for (let inn = 0; inn < INNINGS; inn++) {
    for (let rnd = 0; rnd < ROUNDS_PER_INNING; rnd++) {
      row2.push(rnd === 0 ? `${inn + 1}回` : `${inn + 1}回(二巡)`);
    }
  }
  row2.push('集計', ...Array(statHeaders.length - 1).fill(''));
  sheet.getRange(2, 1, 1, row2.length).setValues([row2]);
  sheet.getRange(2, STATS_START, 1, statHeaders.length).merge();
  sheet.getRange(2, 1, 1, totalCols)
    .setBackground('#283593').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
  for (let c = 1; c <= 4; c++) sheet.getRange(2, c, 2, 1).merge();

  const row3 = ['', '', '', ''];
  for (let ab = 0; ab < totalAbSlots; ab++) row3.push('結果');
  row3.push(...statHeaders);
  sheet.getRange(3, 1, 1, row3.length).setValues([row3]);
  sheet.getRange(3, 1, 1, totalCols)
    .setBackground('#3949ab').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');

  const playerMasterSheet = ss.getSheetByName(SHEET.PLAYER);
  const playerRule = playerMasterSheet
    ? SpreadsheetApp.newDataValidation()
        .requireValueInRange(playerMasterSheet.getRange('C2:C100'), true)
        .setAllowInvalid(true).build()
    : null;
  const appearanceRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['先発', '代打', '代走', '途中守備'], true).setAllowInvalid(false).build();
  const positionRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['投', '捕', '一', '二', '三', '遊', '左', '中', '右', '指'], true).setAllowInvalid(true).build();
  const statsRule = statsCodes.length > 0
    ? SpreadsheetApp.newDataValidation()
        .requireValueInList(statsCodes, true).setAllowInvalid(true).build()
    : null;

  const totalRows = BATTING_ORDERS * ROWS_PER_ORDER;

  sheet.getRange(BATTER_DATA_START, 1, totalRows, 1).setValues(
    Array.from({ length: totalRows }, (_, i) =>
      [i % ROWS_PER_ORDER === 0 ? Math.floor(i / ROWS_PER_ORDER) + 1 : '']
    )
  );

  sheet.getRange(BATTER_DATA_START, 2, totalRows, 1)
    .setValues(Array.from({ length: totalRows }, (_, i) => [i % ROWS_PER_ORDER === 0 ? '先発' : '']))
    .setDataValidations(Array.from({ length: totalRows }, () => [appearanceRule]));

  if (playerRule) {
    sheet.getRange(BATTER_DATA_START, 3, totalRows, 1)
      .setDataValidations(Array.from({ length: totalRows }, () => [playerRule]));
  }

  sheet.getRange(BATTER_DATA_START, 4, totalRows, 1)
    .setDataValidations(Array.from({ length: totalRows }, () => [positionRule]));

  if (statsRule) {
    sheet.getRange(BATTER_DATA_START, BAT_AB_START, totalRows, totalAbSlots)
      .setDataValidations(Array.from({ length: totalRows }, () => Array(totalAbSlots).fill(statsRule)));
  }

  const sm  = SHEET.STATS_CODE;
  const abL = _colLetter(BAT_AB_START);
  const abR = _colLetter(BAT_AB_START + totalAbSlots - 1);

  sheet.getRange(BATTER_DATA_START, STATS_START, totalRows, 6).setFormulas(
    Array.from({ length: totalRows }, (_, i) => {
      const r  = BATTER_DATA_START + i;
      const ir = `${abL}${r}:${abR}${r}`;
      return ['C', 'D', 'E', 'F', 'G', 'H'].map(
        flag => `=SUMPRODUCT(COUNTIF(${ir},'${sm}'!$A$2:$A$100)*('${sm}'!$${flag}$2:$${flag}$100=1))`
      );
    })
  );

  sheet.getRange(BATTER_DATA_START, STATS_START + 6, totalRows, 1).setValue(0).setNote('打点は手動で入力してください');
  sheet.getRange(BATTER_DATA_START, STATS_START + 7, totalRows, 1).setValue(0).setNote('得点は手動で入力してください');
  sheet.getRange(BATTER_DATA_START, STATS_START + 8, totalRows, 1).setValue(0).setNote('盗塁は手動で入力してください');

  sheet.getRange(BATTER_DATA_START, STATS_START + 9, totalRows, 5).setFormulas(
    Array.from({ length: totalRows }, (_, i) => {
      const r  = BATTER_DATA_START + i;
      const ir = `${abL}${r}:${abR}${r}`;
      return ['J', 'K', 'L', 'M', 'N'].map(
        flag => `=SUMPRODUCT(COUNTIF(${ir},'${sm}'!$A$2:$A$100)*('${sm}'!$${flag}$2:$${flag}$100=1))`
      );
    })
  );

  sheet.getRange(BATTER_DATA_START, 1, totalRows, totalCols).setBackgrounds(
    Array.from({ length: totalRows }, (_, i) =>
      Array(totalCols).fill(i % ROWS_PER_ORDER === 0 ? '#e8eaf6' : '#fafafa')
    )
  );
  sheet.getRange(BATTER_DATA_START, BAT_AB_START, totalRows, totalAbSlots)
    .setBackgrounds(Array.from({ length: totalRows }, (_, i) =>
      Array(totalAbSlots).fill(i % ROWS_PER_ORDER === 0 ? '#fff9c4' : '#fffde7')
    ));
  sheet.getRange(BATTER_DATA_START, STATS_START, totalRows, statHeaders.length)
    .setBackgrounds(Array.from({ length: totalRows }, () => Array(statHeaders.length).fill('#e8f5e9')));

  sheet.getRange(BATTER_DATA_START, 1, totalRows, 1)
    .setFontStyles(Array.from({ length: totalRows }, (_, i) => [i % ROWS_PER_ORDER !== 0 ? 'italic' : 'normal']))
    .setFontColors(Array.from({ length: totalRows }, (_, i) => [i % ROWS_PER_ORDER !== 0 ? '#888888' : '#000000']))
    .setFontWeights(Array.from({ length: totalRows }, (_, i) => [i % ROWS_PER_ORDER === 0 ? 'bold' : 'normal']));
  sheet.getRange(BATTER_DATA_START, 2, totalRows, 1)
    .setFontStyles(Array.from({ length: totalRows }, (_, i) => [i % ROWS_PER_ORDER !== 0 ? 'italic' : 'normal']));

  for (let order = 1; order <= BATTING_ORDERS; order++) {
    const lastRow = BATTER_DATA_START + order * ROWS_PER_ORDER - 1;
    sheet.getRange(lastRow, 1, 1, totalCols)
      .setBorder(null, null, true, null, null, null, '#9e9e9e', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  }

  sheet.setConditionalFormatRules(
    _buildAtBatConditionalFormatRules(sheet, BATTER_DATA_START, totalRows, BAT_AB_START, totalAbSlots)
  );

  sheet.setColumnWidth(1, 45);
  sheet.setColumnWidth(2, 85);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 55);
  for (let ab = 0; ab < totalAbSlots; ab++) sheet.setColumnWidth(BAT_AB_START + ab, 65);
  for (let i = 0; i < statHeaders.length; i++) sheet.setColumnWidth(STATS_START + i, 50);

  for (let inn = 0; inn < INNINGS; inn++) {
    sheet.hideColumns(BAT_AB_START + inn * ROUNDS_PER_INNING + 1, 1);
  }

  sheet.setFrozenRows(3);
  sheet.setFrozenColumns(3);
}

// ==================== 相手攻撃シート ====================

function _createOpponentBatSheet(ss, gameId, gameDate, opponent, sheetName) {
  const sheet      = ss.insertSheet(sheetName);
  const statsCodes = _getStatsCodes(ss);

  const totalAbSlots = INNINGS * ROUNDS_PER_INNING;
  const totalAbCols  = totalAbSlots * 2;
  const totalCols    = OPP_AB_START - 1 + totalAbCols;

  const ds = OPPONENT_DATA_START;
  const de = ds + BATTING_ORDERS - 1;

  const row1 = ['打順'];
  for (let inn = 0; inn < INNINGS; inn++) {
    for (let rnd = 0; rnd < ROUNDS_PER_INNING; rnd++) {
      row1.push(rnd === 0 ? `${inn + 1}回` : `${inn + 1}回(二巡)`, '');
    }
  }
  sheet.getRange(1, 1, 1, row1.length).setValues([row1]);
  for (let ab = 0; ab < totalAbSlots; ab++) {
    sheet.getRange(1, OPP_AB_START + ab * 2, 1, 2).merge();
  }
  sheet.getRange(1, 1, 1, totalCols)
    .setBackground('#bf360c').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(1, 1, 2, 1).merge();
  sheet.getRange(1, 1).setNote(`gameId:${gameId}\n${gameDate} vs ${opponent}`);

  const row2 = [''];
  for (let ab = 0; ab < totalAbSlots; ab++) row2.push('結果', '登板投手');
  sheet.getRange(2, 1, 1, row2.length).setValues([row2]);
  sheet.getRange(2, 1, 1, totalCols)
    .setBackground('#d84315').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');

  const playerMasterSheet = ss.getSheetByName(SHEET.PLAYER);
  const pitcherRule = playerMasterSheet
    ? SpreadsheetApp.newDataValidation()
        .requireValueInRange(playerMasterSheet.getRange('C2:C100'), true)
        .setAllowInvalid(true).build()
    : null;
  const statsRule = statsCodes.length > 0
    ? SpreadsheetApp.newDataValidation()
        .requireValueInList(statsCodes, true).setAllowInvalid(true).build()
    : null;

  sheet.getRange(ds, 1, BATTING_ORDERS, 1).setValues(
    Array.from({ length: BATTING_ORDERS }, (_, i) => [i + 1])
  );
  sheet.getRange(ds, 1, BATTING_ORDERS, 1)
    .setFontWeights(Array.from({ length: BATTING_ORDERS }, () => ['bold']))
    .setBackgrounds(Array.from({ length: BATTING_ORDERS }, (_, i) =>
      [i % 2 === 0 ? '#fff3e0' : '#fffde7']
    ));

  for (let ab = 0; ab < totalAbSlots; ab++) {
    const resultCol  = OPP_AB_START + ab * 2;
    const pitcherCol = resultCol + 1;

    if (statsRule) {
      sheet.getRange(ds, resultCol, BATTING_ORDERS, 1)
        .setDataValidations(Array.from({ length: BATTING_ORDERS }, () => [statsRule]));
    }
    sheet.getRange(ds, resultCol, BATTING_ORDERS, 1)
      .setBackgrounds(Array.from({ length: BATTING_ORDERS }, (_, i) =>
        [i % 2 === 0 ? '#fff9c4' : '#fffde7']
      ));

    if (pitcherRule) {
      sheet.getRange(ds, pitcherCol, BATTING_ORDERS, 1)
        .setDataValidations(Array.from({ length: BATTING_ORDERS }, () => [pitcherRule]));
    }
    sheet.getRange(ds, pitcherCol, BATTING_ORDERS, 1)
      .setBackgrounds(Array.from({ length: BATTING_ORDERS }, (_, i) =>
        [i % 2 === 0 ? '#e3f2fd' : '#f5f5f5']
      ));
  }

  for (let order = 0; order < BATTING_ORDERS; order++) {
    sheet.getRange(ds + order, 1, 1, totalCols)
      .setBorder(null, null, true, null, null, null, '#d0d0d0', SpreadsheetApp.BorderStyle.SOLID);
  }

  sheet.setConditionalFormatRules(
    _buildAtBatConditionalFormatRules(sheet, ds, BATTING_ORDERS, OPP_AB_START, totalAbCols)
  );

  _rebuildPitcherSection(ss, sheet);

  sheet.setColumnWidth(1, 45);
  for (let ab = 0; ab < totalAbSlots; ab++) {
    sheet.setColumnWidth(OPP_AB_START + ab * 2,     65);
    sheet.setColumnWidth(OPP_AB_START + ab * 2 + 1, 90);
  }

  for (let inn = 0; inn < INNINGS; inn++) {
    sheet.hideColumns(OPP_AB_START + (inn * ROUNDS_PER_INNING + 1) * 2, 2);
  }

  sheet.setFrozenRows(2);
  sheet.setFrozenColumns(1);
}

// ==================== ⑦ データをエクスポート ====================

function exportBattersData() {
  const c = _exportBatters();
  SpreadsheetApp.getUi().alert('エクスポート完了',
    `野手データを出力しました。\n・BAT_RAW_PBP: ${c.pbp}件\n・BAT_RAW_GAME: ${c.rawGame}件\n・BAT_STATS_YEARLY: ${c.yearly}件\n・BAT_STATS_CAREER: ${c.career}件`,
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function exportPitchersData() {
  const c = _exportPitchers();
  SpreadsheetApp.getUi().alert('エクスポート完了',
    `投手データを出力しました。\n・PITCH_RAW_GAME: ${c.rawGame}件\n・PITCH_STATS_YEARLY: ${c.yearly}件\n・PITCH_STATS_CAREER: ${c.career}件`,
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function exportAllData() {
  const bat   = _exportBatters();
  const pitch = _exportPitchers();
  SpreadsheetApp.getUi().alert('エクスポート完了',
    `全データをエクスポートしました。\n` +
    `[野手] BAT_RAW_PBP: ${bat.pbp}件 / BAT_RAW_GAME: ${bat.rawGame}件 / YEARLY: ${bat.yearly}件 / CAREER: ${bat.career}件\n` +
    `[投手] PITCH_RAW_GAME: ${pitch.rawGame}件 / YEARLY: ${pitch.yearly}件 / CAREER: ${pitch.career}件`,
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function _exportBatters() {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const gameMap   = _buildGameMap(ss);
  const statsMap  = _buildStatsMap(ss);
  const playerMap = _buildPlayerMap(ss);

  const pbpRows   = [];
  const gameStats = [];

  ss.getSheets().forEach(sheet => {
    if (!sheet.getName().startsWith('野手_')) return;

    const gameId   = _getGameIdFromSheet(sheet);
    const gameInfo = gameId ? (gameMap[gameId] || {}) : {};
    const date     = gameInfo.date     || '';
    const opponent = gameInfo.opponent || '';
    const year     = _extractYear(date);
    const data     = sheet.getDataRange().getValues();

    const abSlots     = _getBatterAbSlots(sheet);
    const statsStart0 = (BAT_AB_START - 1) + abSlots; // si相当の0-based index

    const batStart0 = BATTER_DATA_START - 1;
    const batEnd0   = batStart0 + BATTING_ORDERS * ROWS_PER_ORDER;

    for (let r = batStart0; r < batEnd0 && r < data.length; r++) {
      const row        = data[r];
      const playerName = String(row[2] || '').trim();
      if (!playerName) continue;

      const battingOrder   = row[0];
      const appearanceType = row[1];
      const position       = row[3];
      const playerId       = playerMap[playerName] || '未登録';

      const pa   = Number(row[statsStart0])      || 0;
      const ab   = Number(row[statsStart0 + 1])  || 0;
      const h    = Number(row[statsStart0 + 2])  || 0;
      const d2   = Number(row[statsStart0 + 3])  || 0;
      const d3   = Number(row[statsStart0 + 4])  || 0;
      const hr   = Number(row[statsStart0 + 5])  || 0;
      const rbi  = Number(row[statsStart0 + 6])  || 0;
      const runs = Number(row[statsStart0 + 7])  || 0;
      const sb   = Number(row[statsStart0 + 8])  || 0;
      const bb   = Number(row[statsStart0 + 9])  || 0;
      const hbp  = Number(row[statsStart0 + 10]) || 0;
      const so   = Number(row[statsStart0 + 11]) || 0;
      const sac  = Number(row[statsStart0 + 12]) || 0;
      const sf   = Number(row[statsStart0 + 13]) || 0;

      if (pa === 0 && ab === 0) continue;

      let flyCount    = 0;
      let flyOutCount = 0;
      let errorCount  = 0;
      let errorOnBase = 0;

      for (let c = BAT_AB_START - 1; c < BAT_AB_START - 1 + abSlots; c++) {
        const raw = String(row[c] || '').trim();
        if (!raw) continue;
        const code = raw.split('/')[0].trim(); // 打撃コードのみ（走塁コードを除外）
        const stat = statsMap[code];
        if (stat && Number(stat.フライフラグ) === 1) {
          flyCount++;
          if (Number(stat.アウト数) >= 1) flyOutCount++;
        }
        if (ERROR_CODES.includes(code)) {
          errorCount++;
          errorOnBase++;
        }
      }

      gameStats.push({
        gameId, date, year, opponent, playerId, playerName,
        battingOrder, appearanceType, position,
        pa, ab, h, d2, d3, hr, rbi, runs, sb, bb, hbp, so, sac, sf,
        flyCount, flyOutCount, errorCount, errorOnBase,
      });
    }

    let runners = [0, 0, 0];
    let outs    = 0;

    for (let ab = 0; ab < abSlots; ab++) {
      for (let order = 1; order <= BATTING_ORDERS; order++) {
        let code = null, runCode = null, pName = null;
        for (let r = batStart0; r < batEnd0 && r < data.length; r++) {
          const rrow = data[r];
          if (Number(rrow[0]) !== order) continue;
          const raw = String(rrow[BAT_AB_START - 1 + ab] || '').trim();
          if (raw) {
            const parts = raw.split('/');
            code = parts[0].trim();
            runCode = parts[1] ? parts[1].trim() : null;
            pName = String(rrow[2] || '').trim();
            break;
          }
        }
        if (!code || !pName) continue;

        const leadoffFlag = (outs === 0 && runners[0] + runners[1] + runners[2] === 0) ? 1 : 0;
        const runnerFlag  = (runners[0] + runners[1] + runners[2] > 0) ? 1 : 0;
        const spFlag      = (runners[1] || runners[2]) ? 1 : 0;
        const isError     = ERROR_CODES.includes(code) ? 1 : 0;

        const pid     = playerMap[pName] || '未登録';
        const pbpStat = statsMap[code]   || {};
        const pbpId   = `${gameId}_${pid}_${ab}`;

        pbpRows.push([
          gameId, date, year, opponent, pid, pName, order,
          _innLabel(ab), code, pbpId,
          Number(pbpStat.打数)        || 0,
          Number(pbpStat.安打)        || 0,
          Number(pbpStat.三振)        || 0,
          Number(pbpStat.フライフラグ) || 0,
          isError,
          leadoffFlag, runnerFlag, spFlag,
        ]);

        [runners, outs] = _applyAbState(runners, outs, code, runCode);
        if (outs >= 3) { runners = [0, 0, 0]; outs = 0; }
      }
    }
  });

  const yearlyMap = {};
  const careerMap = {};

  function _blankBatAgg(playerId, playerName) {
    return {
      playerId, playerName, games: 0,
      pa: 0, ab: 0, h: 0, d2: 0, d3: 0, hr: 0, rbi: 0, runs: 0, sb: 0,
      bb: 0, hbp: 0, so: 0, sac: 0, sf: 0, flyCount: 0, errorCount: 0, errorOnBase: 0,
    };
  }

  gameStats.forEach(g => {
    const yk = `${g.year}_${g.playerId}`;
    if (!yearlyMap[yk]) yearlyMap[yk] = { year: g.year, ..._blankBatAgg(g.playerId, g.playerName) };
    const ya = yearlyMap[yk];
    ya.games++;
    ya.pa += g.pa; ya.ab += g.ab; ya.h += g.h;
    ya.d2 += g.d2; ya.d3 += g.d3; ya.hr += g.hr;
    ya.rbi += g.rbi; ya.runs += g.runs; ya.sb += g.sb;
    ya.bb += g.bb; ya.hbp += g.hbp; ya.so += g.so;
    ya.sac += g.sac; ya.sf += g.sf;
    ya.flyCount += g.flyCount;
    ya.errorCount += g.errorCount;
    ya.errorOnBase += g.errorOnBase;

    if (!careerMap[g.playerId]) careerMap[g.playerId] = _blankBatAgg(g.playerId, g.playerName);
    const ca = careerMap[g.playerId];
    ca.games++;
    ca.pa += g.pa; ca.ab += g.ab; ca.h += g.h;
    ca.d2 += g.d2; ca.d3 += g.d3; ca.hr += g.hr;
    ca.rbi += g.rbi; ca.runs += g.runs; ca.sb += g.sb;
    ca.bb += g.bb; ca.hbp += g.hbp; ca.so += g.so;
    ca.sac += g.sac; ca.sf += g.sf;
    ca.flyCount += g.flyCount;
    ca.errorCount += g.errorCount;
    ca.errorOnBase += g.errorOnBase;
  });

  function _calcBatRates(a) {
    const avg    = a.ab > 0 ? _round3(a.h / a.ab) : 0;
    const obpDen = a.ab + a.bb + a.hbp + a.sf;
    const obp    = obpDen > 0 ? _round3((a.h + a.bb + a.hbp) / obpDen) : 0;
    const single = a.h - a.d2 - a.d3 - a.hr;
    const slg    = a.ab > 0 ? _round3((single + a.d2 * 2 + a.d3 * 3 + a.hr * 4) / a.ab) : 0;
    const ops    = _round3(obp + slg);
    const fbDen  = a.ab - a.so;
    const fbPct  = fbDen > 0 ? _round3(a.flyCount / fbDen) : 0;
    return { avg, obp, slg, ops, fbPct };
  }

  const batCountingHeaders = [
    '打席', '打数', '安打', '二塁打', '三塁打', '本塁打',
    '打点', '得点', '盗塁', '四球', '死球', '三振', '犠打', '犠飛', '失策', '失策出塁',
  ];
  const batRateHeaders = ['打率', '出塁率(OBP)', '長打率(SLG)', 'OPS', 'フライ率(FB%)'];

  function _batCountingCols(a) {
    return [
      a.pa, a.ab, a.h, a.d2, a.d3, a.hr,
      a.rbi, a.runs, a.sb, a.bb, a.hbp, a.so, a.sac, a.sf,
      a.errorCount, a.errorOnBase,
    ];
  }

  const yearlyRows = Object.values(yearlyMap).map(a => {
    const r = _calcBatRates(a);
    return [a.year, a.playerId, a.playerName, a.games,
            ..._batCountingCols(a), r.avg, r.obp, r.slg, r.ops, r.fbPct];
  });

  const careerRows = Object.values(careerMap).map(a => {
    const r = _calcBatRates(a);
    return [a.playerId, a.playerName, a.games,
            ..._batCountingCols(a), r.avg, r.obp, r.slg, r.ops, r.fbPct];
  });

  const rawGameRows = gameStats.map(g => [
    g.gameId, g.date, g.year, g.opponent, g.playerId, g.playerName,
    g.battingOrder, g.appearanceType, g.position,
    g.pa, g.ab, g.h, g.d2, g.d3, g.hr, g.rbi, g.runs, g.sb,
    g.bb, g.hbp, g.so, g.sac, g.sf, g.flyOutCount, g.errorCount, g.errorOnBase,
  ]);

  _writeExportSheet(ss, SHEET_EXPORT.BAT_RAW_PBP,
    ['試合ID', '日付', '年', '対戦相手', '選手ID', '選手名', '打順', 'イニング', '打席結果',
     '打席ID', '打数フラグ', '安打フラグ', '三振フラグ', 'フライフラグ', '失策フラグ',
     '先頭打者', '走者あり', '得点圏'],
    pbpRows, '#1565c0');

  _writeExportSheet(ss, SHEET_EXPORT.BAT_RAW_GAME,
    ['試合ID', '日付', '年', '対戦相手', '選手ID', '選手名', '打順', '出場種別', 'ポジション',
     '打席', '打数', '安打', '二塁打', '三塁打', '本塁打',
     '打点', '得点', '盗塁', '四球', '死球', '三振', '犠打', '犠飛',
     'フライアウト', '失策', '失策出塁'],
    rawGameRows, '#1565c0');

  _writeExportSheet(ss, SHEET_EXPORT.BAT_STATS_YEARLY,
    ['年', '選手ID', '選手名', '試合数', ...batCountingHeaders, ...batRateHeaders],
    yearlyRows, '#1565c0');

  _writeExportSheet(ss, SHEET_EXPORT.BAT_STATS_CAREER,
    ['選手ID', '選手名', '試合数', ...batCountingHeaders, ...batRateHeaders],
    careerRows, '#1565c0');

  return { pbp: pbpRows.length, rawGame: rawGameRows.length, yearly: yearlyRows.length, career: careerRows.length };
}

function _exportPitchers() {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const gameMap   = _buildGameMap(ss);
  const statsMap  = _buildStatsMap(ss);
  const playerMap = _buildPlayerMap(ss);

  const rawGameRows     = [];
  const pitcherGameList = [];

  ss.getSheets().forEach(sheet => {
    if (!sheet.getName().startsWith('相手攻撃_')) return;

    const gameId   = _getGameIdFromSheet(sheet);
    const gameInfo = gameId ? (gameMap[gameId] || {}) : {};
    const date     = gameInfo.date     || '';
    const opponent = gameInfo.opponent || '';
    const year     = _extractYear(date);
    const data     = sheet.getDataRange().getValues();

    const abSlots    = _getPitcherAbSlots(sheet);
    const dataStart0 = OPPONENT_DATA_START - 1;
    const dataEnd0   = dataStart0 + BATTING_ORDERS;

    // 投手ごとの集計（四死球、奪三振などはここから取得）
    const pitcherStats = {};
    for (let r = dataStart0; r < dataEnd0 && r < data.length; r++) {
      const row = data[r];
      for (let ab = 0; ab < abSlots; ab++) {
        const resultIdx  = (OPP_AB_START - 1) + ab * 2;
        const pitcherIdx = resultIdx + 1;
        const code    = String(row[resultIdx]  || '').trim();
        const pitcher = String(row[pitcherIdx] || '').trim();
        if (!pitcher) continue;
        if (!pitcherStats[pitcher]) {
          pitcherStats[pitcher] = { h: 0, hr: 0, so: 0, bb: 0, hbp: 0 };
        }
        if (!code) continue;
        const stat = statsMap[code];
        if (!stat) continue;
        pitcherStats[pitcher].h    += Number(stat.安打)     || 0;
        pitcherStats[pitcher].hr   += Number(stat.本塁打)   || 0;
        pitcherStats[pitcher].so   += Number(stat.三振)     || 0;
        pitcherStats[pitcher].bb   += Number(stat.四球)     || 0;
        pitcherStats[pitcher].hbp  += Number(stat.死球)     || 0;
      }
    }

    // 投手別集計セクション（手入力の投球回・失点・自責点）から取得
    const erStart0 = OPP_ER_DATA_START_ROW - 1;
    const erMap    = {};
    for (let i = 0; i < OPP_ER_PITCHERS; i++) {
      const idx = erStart0 + i;
      if (idx >= data.length) break;
      const erRow = data[idx];
      const pName = String(erRow[OPP_ER_COLS.NAME - 1] || '').trim();
      if (!pName) continue;

      // 手入力の投球回（例: 1.2）を読み取ってアウト数に変換
      const ipRaw = String(erRow[OPP_ER_COLS.IP - 1] || '').trim();
      let manualOuts = 0;
      if (ipRaw !== '') {
        const parts = ipRaw.split('.');
        const full = parseInt(parts[0], 10) || 0;
        const rem = parts.length > 1 ? parseInt(parts[1], 10) : 0;
        manualOuts = (full * 3) + rem;
      }

      erMap[pName] = {
        ipStr: ipRaw || '0',
        outs:  manualOuts,
        r:  Number(erRow[OPP_ER_COLS.R  - 1]) || 0,
        er: Number(erRow[OPP_ER_COLS.ER - 1]) || 0,
      };
    }

    const pitcherOrder = [];
    for (let r = dataStart0; r < dataEnd0 && r < data.length; r++) {
      for (let ab = 0; ab < abSlots; ab++) {
        const p = String(data[r][(OPP_AB_START - 1) + ab * 2 + 1] || '').trim();
        if (p && !pitcherOrder.includes(p)) pitcherOrder.push(p);
      }
    }
    Object.keys(erMap).forEach(p => { if (!pitcherOrder.includes(p)) pitcherOrder.push(p); });

    pitcherOrder.forEach((pitcherName, idx) => {
      const s  = pitcherStats[pitcherName] || { h: 0, hr: 0, so: 0, bb: 0, hbp: 0 };
      const er = erMap[pitcherName]        || { ipStr: '0', outs: 0, r: 0, er: 0 };
      const playerId = playerMap[pitcherName] || '未登録';

      rawGameRows.push([gameId, date, year, opponent, playerId, pitcherName, idx + 1,
                        er.ipStr, s.h, s.hr, s.so, s.bb, s.hbp, er.r, er.er]);

      pitcherGameList.push({
        gameId, date, year, opponent, playerId, pitcherName,
        outs: er.outs, h: s.h, hr: s.hr, so: s.so, // outsは手入力値(er.outs)を利用
        bb: s.bb, hbp: s.hbp, r: er.r, er: er.er,
      });
    });
  });

  const yearlyMap = {};
  const careerMap = {};

  function _blankPitchAgg(playerId, playerName) {
    return { playerId, playerName, games: 0,
             outs: 0, h: 0, hr: 0, so: 0, bb: 0, hbp: 0, r: 0, er: 0 };
  }

  pitcherGameList.forEach(g => {
    const yk = `${g.year}_${g.playerId}`;
    if (!yearlyMap[yk]) yearlyMap[yk] = { year: g.year, ..._blankPitchAgg(g.playerId, g.pitcherName) };
    const ya = yearlyMap[yk];
    ya.games++; ya.outs += g.outs; ya.h += g.h; ya.hr += g.hr; ya.so += g.so;
    ya.bb += g.bb; ya.hbp += g.hbp; ya.r += g.r; ya.er += g.er;

    if (!careerMap[g.playerId]) careerMap[g.playerId] = _blankPitchAgg(g.playerId, g.pitcherName);
    const ca = careerMap[g.playerId];
    ca.games++; ca.outs += g.outs; ca.h += g.h; ca.hr += g.hr; ca.so += g.so;
    ca.bb += g.bb; ca.hbp += g.hbp; ca.r += g.r; ca.er += g.er;
  });

  function _calcPitchRates(a) {
    const ipStr     = `${Math.floor(a.outs / 3)}.${a.outs % 3}`;
    const ipDecimal = a.outs > 0 ? Math.floor(a.outs / 3) + (a.outs % 3) / 3 : 0;
    const era       = ipDecimal > 0 ? _round2(a.er / ipDecimal * 9) : 0;
    const k9        = ipDecimal > 0 ? _round2(a.so / ipDecimal * 9) : 0;
    return { ipStr, era, k9 };
  }

  const pitchCountingHeaders = ['被安打', '被本塁打', '奪三振', '四球', '死球', '失点', '自責点'];
  const pitchRateHeaders     = ['防御率(ERA)', '奪三振率(K/9)'];

  function _pitchCountingCols(a) {
    return [a.h, a.hr, a.so, a.bb, a.hbp, a.r, a.er];
  }

  const yearlyRows = Object.values(yearlyMap).map(a => {
    const r = _calcPitchRates(a);
    return [a.year, a.playerId, a.playerName, a.games, r.ipStr,
            ..._pitchCountingCols(a), r.era, r.k9];
  });

  const careerRows = Object.values(careerMap).map(a => {
    const r = _calcPitchRates(a);
    return [a.playerId, a.playerName, a.games, r.ipStr,
            ..._pitchCountingCols(a), r.era, r.k9];
  });

  _writeExportSheet(ss, SHEET_EXPORT.PITCH_RAW_GAME,
    ['試合ID', '日付', '年', '対戦相手', '選手ID', '選手名', '登板順',
     '投球回', ...pitchCountingHeaders],
    rawGameRows, '#880e4f');

  _writeExportSheet(ss, SHEET_EXPORT.PITCH_STATS_YEARLY,
    ['年', '選手ID', '選手名', '登板試合数', '投球回', ...pitchCountingHeaders, ...pitchRateHeaders],
    yearlyRows, '#880e4f');

  _writeExportSheet(ss, SHEET_EXPORT.PITCH_STATS_CAREER,
    ['選手ID', '選手名', '登板試合数', '投球回', ...pitchCountingHeaders, ...pitchRateHeaders],
    careerRows, '#880e4f');

  return { rawGame: rawGameRows.length, yearly: yearlyRows.length, career: careerRows.length };
}

// ==================== ユーティリティ ====================

function _getBatterAbSlots(sheet) {
  const lastCol = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(3, 1, 1, lastCol).getValues()[0];
  const idx = headers.indexOf('打席');
  if (idx > -1) {
    return idx - (BAT_AB_START - 1);
  }
  return INNINGS * ROUNDS_PER_INNING;
}

function _getPitcherAbSlots(sheet) {
  const lastCol = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  let lastPitcherIdx = -1;
  for (let i = headers.length - 1; i >= 0; i--) {
    if (headers[i] === '登板投手') {
      lastPitcherIdx = i;
      break;
    }
  }
  if (lastPitcherIdx > -1) {
    return (lastPitcherIdx - (OPP_AB_START - 1) + 1) / 2;
  }
  return INNINGS * ROUNDS_PER_INNING;
}

function _buildAtBatConditionalFormatRules(sheet, startRow, numRows, startCol, numCols) {
  const sm  = SHEET.STATS_CODE;
  const tl  = `${_colLetter(startCol)}${startRow}`;
  const rng = sheet.getRange(startRow, startCol, numRows, numCols);
  const ref = `INDIRECT("'${sm}'!$A$2:$O$100")`;

  return [
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=IFERROR(VLOOKUP(${tl},${ref},5,FALSE),0)=1`)
      .setBackground('#ffcdd2').setRanges([rng]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(
        `=IFERROR(VLOOKUP(${tl},${ref},13,FALSE),0)+IFERROR(VLOOKUP(${tl},${ref},14,FALSE),0)>0`
      )
      .setBackground('#fff9c4').setRanges([rng]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=IFERROR(VLOOKUP(${tl},${ref},15,FALSE),0)>0`)
      .setBackground('#eeeeee').setRanges([rng]).build(),
  ];
}

function _getOrCreateSheet(ss, sheetName) {
  return ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
}

function _writeExportSheet(ss, sheetName, headers, rows, headerBg) {
  const sheet = _getOrCreateSheet(ss, sheetName);
  sheet.clearContents();
  sheet.clearFormats();
  _writeHeader(sheet, headers, headerBg);
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1);
}

function _applyAbState(runners, outs, result, runCode) {
  const res = String(result).trim();
  let [r1, r2, r3] = runners;
  let nr;

  const isOut = [
    'K','Kw','遊ゴロ','三ゴロ','一ゴロ','二ゴロ','投ゴロ','捕ゴロ',
    '中飛','左飛','右飛','捕飛','遊飛','三飛','一飛','二飛','投飛',
    '遊直','三直','中直','左直','右直','一直','二直','投直','捕直','犠飛',
  ].includes(res);
  const isSac    = res === '犠打';
  const isWalk   = ['四球','死球','妨害','走妨'].includes(res);
  const isSingle = [
    '中安','遊安','左安','右安','一安','二安','三安','捕安','投安',
    '左中間安','右中間安', ...ERROR_CODES,
  ].includes(res);
  const isDouble = ['中二','左二','右二','左中間二','右中間二'].includes(res);
  const isTriple = ['中三','左三','右三','左中間三','右中間三'].includes(res);
  const isHR     = ['中本','左本','右本','左中間本','右中間本'].includes(res);
  const isDP     = res === '併殺打';

  if (isHR) {
    nr = [0, 0, 0];
  } else if (isDP) {
    // 併殺打: 打者アウト + 先行走者1人アウト = 2アウト
    outs = Math.min(3, outs + 2);
    nr = [0, r2, r3];
  } else if (isOut) {
    outs++;
    nr = [r1, r2, r3];
  } else if (isSac) {
    outs++;
    nr = [0, r1, r2];
  } else if (isWalk) {
    if      (r1 && r2 && r3) nr = [1, 1, 1];
    else if (r1 && r2)       nr = [1, 1, 1];
    else if (r1)             nr = [1, 1, r3];
    else                     nr = [1, r2, r3];
  } else if (isSingle) {
    nr = [1, r1, r2];
  } else if (isDouble) {
    nr = [0, 1, r1];
  } else if (isTriple) {
    nr = [0, 0, 1];
  } else {
    outs++;
    nr = [r1, r2, r3];
  }

  // 走塁アウト（盗塁失敗・走塁死・牽制死）: 打席結果とは別にアウト+1
  if (runCode && ['盗塁失敗', '走塁死', '牽制死'].includes(String(runCode).trim())) {
    outs = Math.min(3, outs + 1);
    if (outs >= 3) nr = [0, 0, 0];
  }

  if (outs >= 3) { nr = [0, 0, 0]; outs = 3; }
  return [nr, outs];
}

function _innLabel(abIdx) {
  const inn = Math.floor(abIdx / ROUNDS_PER_INNING);
  const rnd = abIdx % ROUNDS_PER_INNING;
  return rnd === 0 ? `${inn + 1}回` : `${inn + 1}回(二巡)`;
}

function _extractYear(dateVal) {
  if (dateVal instanceof Date) return dateVal.getFullYear();
  const m = String(dateVal).match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
}

function _round3(n) { return Math.round(n * 1000) / 1000; }
function _round2(n) { return Math.round(n * 100) / 100; }

function _writeHeader(sheet, headers, bgColor, row) {
  const r     = row || 1;
  const range = sheet.getRange(r, 1, 1, headers.length);
  range.setValues([headers]);
  range.setBackground(bgColor)
       .setFontColor('#ffffff')
       .setFontWeight('bold')
       .setHorizontalAlignment('center');
}

function _getStatsCodes(ss) {
  const sheet = ss.getSheetByName(SHEET.STATS_CODE);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  return data.slice(1)
    .map(r => r[0])
    .filter(v => v !== '' && !String(v).startsWith('---'));
}

function _buildGameMap(ss) {
  const sheet = ss.getSheetByName(SHEET.GAME);
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const map  = {};
  for (let i = 1; i + 1 < data.length; i += 2) {
    const gameId = String(data[i][0]).trim();
    if (!gameId) continue;
    const date     = data[i][1];
    const topTeam  = String(data[i][GAME_TEAM_COL - 1]).trim();
    const botTeam  = String(data[i + 1][GAME_TEAM_COL - 1]).trim();
    const opponent = topTeam === 'Rickys' ? botTeam : topTeam;
    map[gameId] = { date, opponent };
  }
  return map;
}

function _buildStatsMap(ss) {
  const sheet = ss.getSheetByName(SHEET.STATS_CODE);
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const map  = {};
  for (let i = 1; i < data.length; i++) {
    const code = data[i][0];
    if (!code) continue;
    map[String(code)] = {
      打席: data[i][2], 打数: data[i][3], 安打: data[i][4],
      二塁打: data[i][5], 三塁打: data[i][6], 本塁打: data[i][7],
      打点: data[i][8], 四球: data[i][9], 死球: data[i][10],
      三振: data[i][11], 犠打: data[i][12], 犠飛: data[i][13],
      アウト数: data[i][14], フライフラグ: data[i][15],
    };
  }
  return map;
}

function _buildPlayerMap(ss) {
  const sheet = ss.getSheetByName(SHEET.PLAYER);
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const map  = {};
  for (let i = 1; i < data.length; i++) {
    const name = data[i][2];
    const id   = data[i][0];
    if (name) map[String(name)] = id;
  }
  return map;
}

function _getNextGameBlock(gameMaster) {
  const data   = gameMaster.getDataRange().getValues();
  let   maxNum = 0;
  for (let i = 1; i < data.length; i++) {
    const cell = String(data[i][0]).trim();
    if (/^G\d+$/.test(cell)) {
      const num = parseInt(cell.slice(1), 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const gameId = 'G' + String(maxNum + 1).padStart(3, '0');
  const topRow = gameMaster.getLastRow() + 1;
  return { gameId, topRow };
}

function _getGameIdFromSheet(sheet) {
  const note = sheet.getRange(1, 1).getNote();
  if (!note || !note.startsWith('gameId:')) return null;
  return note.split('\n')[0].replace('gameId:', '').trim();
}

function _colLetter(colNum) {
  let letter = '';
  while (colNum > 0) {
    const mod = (colNum - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    colNum = Math.floor((colNum - 1) / 26);
  }
  return letter;
}