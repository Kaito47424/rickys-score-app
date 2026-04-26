// ============================================================
// Rickys スマホ入力アプリ用 GAS Web API
// ============================================================
// デプロイ設定:
//   実行: 自分
//   アクセス: 全員（匿名）
// ============================================================

// ==================== エントリポイント ====================

function doGet(e) {
  const action = e.parameter.action || '';
  let result;

  try {
    switch (action) {
      case 'getGames':      result = _getGames();                            break;
      case 'getPlayers':    result = _getPlayers();                          break;
      case 'getBatStats':   result = _getBatStats(e.parameter.year);         break;
      case 'getPitchStats': result = _getPitchStats(e.parameter.year);       break;
      case 'getGameData':   result = _getGameData(e.parameter.gameId);       break;
      case 'getEditLog':    result = _getEditLog(e.parameter.gameId || null); break;
      default:
        result = { error: `Unknown action: ${action}` };
    }
  } catch (err) {
    result = { error: String(err) };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch {
    return ContentService.createTextOutput('{"error":"invalid json"}')
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    switch (data.type) {
      case 'createGame': _apiCreateGame(data); break;
      case 'inning':     _apiInning(data);     break;
      case 'logEdit':    _logEdit(data);        break;
      case 'saveMvp':    _saveMvp(data);        break;
      case 'deleteGame': _deleteGame(data);     break;
      default:
        return ContentService.createTextOutput(`{"error":"Unknown type: ${data.type}"}`)
          .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(`{"error":"${String(err)}"}`)
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput('{"status":"ok"}')
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== GET ハンドラ ====================

function _getGames() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const gameMaster = ss.getSheetByName('試合マスタ');
  if (!gameMaster) return [];

  // 全シート名をSetで保持（存在確認を O(1) に）
  const sheetNames = new Set(ss.getSheets().map(s => s.getName()));

  const data = gameMaster.getDataRange().getValues();
  const games = [];

  // 試合マスタは2行1ブロック（先攻/後攻）
  for (let i = 1; i + 1 < data.length; i += 2) {
    const row = data[i];
    const gameId  = String(row[0]).trim();
    if (!gameId || !/^G\d+$/.test(gameId)) continue;

    const dateRaw  = row[1];
    const gameDate = _formatDate(dateRaw);
    const topTeam  = String(row[3]).trim();   // D列: チーム名
    const botTeam  = String(data[i + 1][3]).trim();
    const opponent = topTeam === 'Rickys' ? botTeam : topTeam;

    const dateTag = _normalizeDate(String(dateRaw));

    // シート名の完全一致 or 部分一致で存在確認
    const batExact = `野手_${gameId}_${dateTag}_${opponent}`;
    const exists   = sheetNames.has(batExact) ||
      [...sheetNames].some(s => s.startsWith(`野手_${gameId}_`) && s.endsWith(`_${opponent}`));

    games.push({ gameId, gameDate, opponent, exists });
  }

  return games;
}

function _getPlayers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('選手マスタ');
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const players = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const playerId = String(row[0]).trim();
    const number   = String(row[1]).trim();
    const name     = String(row[2]).trim();
    if (!name) continue;
    players.push({ playerId, number, name });
  }
  return players;
}

function _getBatStats(year) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = year ? 'BAT_STATS_YEARLY' : 'BAT_STATS_CAREER';
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(h => String(h).trim());
  const yearIndex = headers.indexOf('年');
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    // 年度フィルタ
    if (year && yearIndex >= 0 && String(row[yearIndex]) !== year) continue;
    const obj = {};
    headers.forEach((h, j) => { obj[h] = row[j]; });
    rows.push(obj);
  }
  return rows;
}

function _getPitchStats(year) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = year ? 'PITCH_STATS_YEARLY' : 'PITCH_STATS_CAREER';
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(h => String(h).trim());
  const yearIndex = headers.indexOf('年');
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    // 年度フィルタ
    if (year && yearIndex >= 0 && String(row[yearIndex]) !== year) continue;
    const obj = {};
    headers.forEach((h, j) => { obj[h] = row[j]; });
    rows.push(obj);
  }
  return rows;
}

function _getGameData(gameId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // 試合マスタから該当試合の情報を取得
  const gameMasterSheet = ss.getSheetByName('試合マスタ');
  if (!gameMasterSheet) return { error: 'game master not found' };
  const gameMasterData = gameMasterSheet.getDataRange().getValues();
  let date = null;
  let opponent = '';
  for (let i = 1; i + 1 < gameMasterData.length; i += 2) {
    const gid = String(gameMasterData[i][0]).trim();
    if (gid !== gameId) continue;
    date = gameMasterData[i][1];
    const topTeam  = String(gameMasterData[i][3]).trim();
    const botTeam  = String(gameMasterData[i + 1][3]).trim();
    opponent = topTeam === 'Rickys' ? botTeam : topTeam;
    break;
  }
  if (!date) return { error: 'game not found' };
  const dateTag = String(date instanceof Date
    ? Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyyMMdd')
    : date).replace(/[\/\-]/g, '');
  const batSheet = ss.getSheetByName(`野手_${gameId}_${dateTag}_${opponent}`);
  const pitSheet = ss.getSheetByName(`相手攻撃_${gameId}_${dateTag}_${opponent}`);
  if (!batSheet) return { error: 'sheet not found', gameId, dateTag, opponent };
  const batData = batSheet.getDataRange().getValues();
  const INNINGS = 11, ROUNDS = 2, AB_START = 5, DATA_START = 4, ROWS = 2;
  const STATS = AB_START + INNINGS * ROUNDS;
  const roster = [];
  for (let o = 1; o <= 9; o++) {
    const sr = DATA_START + (o-1)*ROWS - 1;
    const starter = batData[sr] || [];
    const sub = batData[sr+1] || [];
    roster.push({
      order: o,
      name: String(starter[2]||'').trim(),
      position: String(starter[3]||'').trim(),
      subName: String(sub[2]||'').trim(),
      subPosition: String(sub[3]||'').trim(),
    });
  }
  const batterResults = {};
  for (let i = 1; i <= INNINGS; i++) {
    for (let r = 1; r <= ROUNDS; r++) {
      const col = AB_START + (i-1)*ROUNDS + (r-1);
      const key = `${i}_${r}`;
      batterResults[key] = {};
      for (let o = 1; o <= 9; o++) {
        const row = DATA_START + (o-1)*ROWS - 1;
        const raw = String(batData[row]?.[col-1]||'').trim();
        // 純粋な数値は集計式の値なのでスキップ
        if (!raw || /^-?\d+(\.\d+)?$/.test(raw)) continue;
        if (raw.includes('/')) {
          const [code, runCode] = raw.split('/');
          batterResults[key][o] = { code: code.trim(), runCode: runCode.trim() || null };
        } else {
          batterResults[key][o] = { code: raw, runCode: null };
        }
      }
    }
  }
  const rbiData = {};
  for (let o = 1; o <= 9; o++) {
    const row = DATA_START + (o-1)*ROWS - 1;
    const r = batData[row] || [];
    rbiData[o] = {
      rbi:  Number(r[STATS+5]||0),
      runs: Number(r[STATS+6]||0),
      sb:   Number(r[STATS+7]||0),
    };
  }
  const pitcherResults = {};
  if (pitSheet) {
    const pitData = pitSheet.getDataRange().getValues();
    for (let i = 1; i <= INNINGS; i++) {
      for (let r = 1; r <= ROUNDS; r++) {
        const rc = 2 + (i-1)*ROUNDS*2 + (r-1)*2;
        const key = `${i}_${r}`;
        pitcherResults[key] = {};
        for (let o = 1; o <= 9; o++) {
          const row = 3 + o - 2;
          const code = String(pitData[row]?.[rc-1]||'').trim();
          const pitcher = String(pitData[row]?.[rc]||'').trim();
          if (code || pitcher) pitcherResults[key][o] = { code, pitcher };
        }
      }
    }
  }
  // 投手別集計（相手攻撃シートの15〜21行目: A列=投手名, N列=失点, O列=自責点）
  const pitcherStats = [];
  if (pitSheet) {
    const pitData = pitSheet.getDataRange().getValues();
    for (let i = 0; i < 7; i++) {
      const row = 14 + i; // 0-based: 15行目 = index14
      const name = String(pitData[row]?.[0] || '').trim();
      const r    = Number(pitData[row]?.[13] || 0);
      const er   = Number(pitData[row]?.[14] || 0);
      if (name || r || er) {
        pitcherStats.push({ name, r, er });
      }
    }
  }

  // スコアボード（試合マスタから取得）
  const scoreboard = { rickys: [], opponent: [], total: { rickys: 0, opponent: 0 } };
  const INN_START_COL = 4; // E列 (0-based: 4)
  const TOTAL_COL = 15; // P列 (0-based: 15)

  for (let i = 1; i + 1 < gameMasterData.length; i += 2) {
    const currentGameId = String(gameMasterData[i][0]).trim();
    if (currentGameId !== gameId) continue;

    const topTeam = String(gameMasterData[i][3]).trim();
    const botTeam = String(gameMasterData[i + 1][3]).trim();
    const isRickysTop = topTeam === 'Rickys';

    const topRow = gameMasterData[i];
    const botRow = gameMasterData[i + 1];

    for (let inn = 0; inn < INNINGS; inn++) {
      const topScore = Number(topRow[INN_START_COL + inn] || 0);
      const botScore = Number(botRow[INN_START_COL + inn] || 0);

      scoreboard.rickys.push(isRickysTop ? topScore : botScore);
      scoreboard.opponent.push(isRickysTop ? botScore : topScore);
    }

    scoreboard.total.rickys = Number(topRow[TOTAL_COL] || 0);
    scoreboard.total.opponent = Number(botRow[TOTAL_COL] || 0);
    break;
  }

  // 野手成績（打席結果から集計）
  const statsMap = _buildStatsMap(ss);
  const batStats = [];
  const ERROR_CODES = ['失策(投)','失策(捕)','失策(一)','失策(二)','失策(三)','失策(遊)','失策(左)','失策(中)','失策(右)'];
  
  roster.forEach(player => {
    const stats = {
      order: player.order,
      name: player.name,
      pa: 0, ab: 0, h: 0, d2: 0, d3: 0, hr: 0,
      rbi: 0, runs: 0, sb: 0, bb: 0, hbp: 0, so: 0, sac: 0, sf: 0
    };
    
    // 打席結果を集計
    for (const key in batterResults) {
      const result = batterResults[key][player.order];
      if (!result) continue;
      
      const code = result.code;
      const stat = statsMap[code];
      
      if (stat) {
        stats.pa += Number(stat.打席) || 0;
        stats.ab += Number(stat.打数) || 0;
        stats.h += Number(stat.安打) || 0;
        stats.d2 += Number(stat.二塁打) || 0;
        stats.d3 += Number(stat.三塁打) || 0;
        stats.hr += Number(stat.本塁打) || 0;
        stats.rbi += Number(stat.打点) || 0;
        stats.bb += Number(stat.四球) || 0;
        stats.hbp += Number(stat.死球) || 0;
        stats.so += Number(stat.三振) || 0;
        stats.sac += Number(stat.犠打) || 0;
        stats.sf += Number(stat.犠飛) || 0;
      }
    }
    
    // RBI・得点・盗塁はrbiDataから取得
    const rbiInfo = rbiData[player.order] || { rbi: 0, runs: 0, sb: 0 };
    stats.rbi = rbiInfo.rbi;
    stats.runs = rbiInfo.runs;
    stats.sb = rbiInfo.sb;
    
    // 打率・OPSを計算
    stats.avg = stats.ab > 0 ? stats.h / stats.ab : 0;
    const obp = stats.pa > 0 ? (stats.h + stats.bb + stats.hbp) / stats.pa : 0;
    const slg = stats.ab > 0 ? (stats.h + stats.d2 * 2 + stats.d3 * 3 + stats.hr * 4) / stats.ab : 0;
    stats.ops = obp + slg;
    
    batStats.push(stats);
  });

  // 投手成績（相手攻撃シートから取得）
  const pitchStats = [];
  if (pitSheet) {
    const pitData = pitSheet.getDataRange().getValues();
    const ER_DATA_START_ROW = 14;
    const ER_PITCHERS = 7;
    
    // 相手攻撃シートの投手集計セクション（15〜21行目）から取得
    for (let i = 0; i < ER_PITCHERS; i++) {
      const row = ER_DATA_START_ROW + i;
      const name = String(pitData[row]?.[0] || '').trim();
      if (!name) continue;
      
      const stats = {
        name,
        ip: Number(pitData[row]?.[1] || 0),      // B列: 投球回（手動）
        so: Number(pitData[row]?.[2] || 0),      // C列: 奪三振
        h: Number(pitData[row]?.[5] || 0),       // F列: 被安打
        hr: Number(pitData[row]?.[6] || 0),      // G列: 被本塁打
        bb: Number(pitData[row]?.[9] || 0),      // J列: 四球
        hbp: Number(pitData[row]?.[10] || 0),    // K列: 死球
        r: Number(pitData[row]?.[13] || 0),      // N列: 失点
        er: Number(pitData[row]?.[14] || 0),     // O列: 自責点
      };
      
      // 防御率を計算
      stats.era = stats.ip > 0 ? (stats.er * 9) / stats.ip : 0;
      
      pitchStats.push(stats);
    }
  }

  const mvp = _getMvp(gameId);
  return { opponent, gameDate: _formatDate(date), roster, batterResults, pitcherResults, rbiData, pitcherStats, scoreboard, batStats, pitchStats, mvp };
}

// ==================== POST ハンドラ ====================

function _apiCreateGame(data) {
  // gas_script.js の createNewGame を呼び出す想定
  // 単体でも動くよう最小実装
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const { gameDate, opponent } = data;
  if (!gameDate || !opponent) throw new Error('gameDate / opponent が必要です');
  // gas_script.js 側の createNewGame() を呼ぶ
  // ※ GAS プロジェクト内に gas_script.js の関数が含まれていれば直接呼べる
  if (typeof createNewGame === 'function') {
    // createNewGame は UI依存のため、ここでは直接シート作成ロジックを呼ぶ
  }
  // シート作成は gas_script.js 側に委譲（同一プロジェクト内）
}

function _apiInning(data) {
  const { gameId, gameDate, opponent, inning, round, roster, batterResults, pitcherResults, rbiData } = data;
  if (!gameId || !gameDate || !opponent) throw new Error('必須パラメータが不足しています');

  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const dateTag  = _normalizeDate(String(gameDate));

  // 野手シート
  const batName = _findSheet(ss, `野手_${gameId}_${dateTag}_${opponent}`, gameId, opponent, '野手');
  if (batName) {
    const batSheet = ss.getSheetByName(batName);
    if (batSheet) _writeBatterInning(batSheet, inning, round, roster, batterResults, rbiData);
  }

  // 相手攻撃シート
  const oppName = _findSheet(ss, `相手攻撃_${gameId}_${dateTag}_${opponent}`, gameId, opponent, '相手攻撃');
  if (oppName) {
    const oppSheet = ss.getSheetByName(oppName);
    if (oppSheet) {
      _writePitcherInning(oppSheet, inning, round, roster, pitcherResults);
      _writePitcherStats(oppSheet, data.pitcherStats || []);
    }
  }
}

// ==================== 修正履歴 ====================

// EDIT_LOG シートのカラム定義
// A: timestamp / B: gameId / C: editType / D: inning / E: round / F: order / G: oldValue / H: newValue
const EDIT_LOG_SHEET = 'EDIT_LOG';
const EDIT_LOG_HEADERS = ['timestamp', 'gameId', 'editType', 'inning', 'round', 'order', 'oldValue', 'newValue'];

const MVP_LOG_SHEET = 'MVP_LOG';
const MVP_LOG_HEADERS = ['gameId', 'name', 'reason'];

function _logEdit(data) {
  const { gameId, editType, inning, round, order, oldValue, newValue } = data;
  if (!gameId || !editType) throw new Error('gameId / editType が必要です');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(EDIT_LOG_SHEET);

  // シートが存在しない場合は作成してヘッダを設定
  if (!sheet) {
    sheet = ss.insertSheet(EDIT_LOG_SHEET);
    sheet.getRange(1, 1, 1, EDIT_LOG_HEADERS.length).setValues([EDIT_LOG_HEADERS]);
  }

  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  sheet.appendRow([timestamp, gameId, editType, inning ?? '', round ?? '', order ?? '', oldValue ?? '', newValue ?? '']);
}

function _getEditLog(gameId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(EDIT_LOG_SHEET);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(h => String(h).trim());
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    const obj = {};
    headers.forEach((h, j) => { obj[h] = row[j] instanceof Date ? _formatDate(row[j]) : String(row[j]); });
    // gameId が指定されている場合はフィルタ
    if (gameId && obj.gameId !== gameId) continue;
    rows.push(obj);
  }
  // 新しい順に返す
  return rows.reverse();
}

function _deleteGame(data) {
  const { gameId } = data;
  if (!gameId) throw new Error('gameId が必要です');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 試合マスタから該当2行を削除（後ろから削除してズレを防ぐ）
  const masterSheet = ss.getSheetByName('試合マスタ');
  if (masterSheet) {
    const masterData = masterSheet.getDataRange().getValues();
    for (let i = masterData.length - 2; i >= 1; i -= 2) {
      if (String(masterData[i][0]).trim() === gameId) {
        masterSheet.deleteRows(i + 1, 2);
        break;
      }
    }
  }

  // 野手・相手攻撃シートを削除（gameId前方一致で検索）
  const allSheets = ss.getSheets().map(s => s.getName());
  const batName = allSheets.find(s => s.startsWith(`野手_${gameId}_`));
  const oppName = allSheets.find(s => s.startsWith(`相手攻撃_${gameId}_`));

  if (batName) { const s = ss.getSheetByName(batName); if (s) ss.deleteSheet(s); }
  if (oppName) { const s = ss.getSheetByName(oppName); if (s) ss.deleteSheet(s); }

  // EDIT_LOG から該当 gameId の行を削除
  const editLogSheet = ss.getSheetByName(EDIT_LOG_SHEET);
  if (editLogSheet) {
    const rows = editLogSheet.getDataRange().getValues();
    for (let i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][1]) === gameId) editLogSheet.deleteRow(i + 1);
    }
  }

  // MVP_LOG から該当 gameId の行を削除
  const mvpSheet = ss.getSheetByName(MVP_LOG_SHEET);
  if (mvpSheet) {
    const rows = mvpSheet.getDataRange().getValues();
    for (let i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][0]) === gameId) mvpSheet.deleteRow(i + 1);
    }
  }
}

function _saveMvp(data) {
  const { gameId, name, reason } = data;
  if (!gameId || !name) throw new Error('gameId / name が必要です');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(MVP_LOG_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(MVP_LOG_SHEET);
    sheet.getRange(1, 1, 1, MVP_LOG_HEADERS.length).setValues([MVP_LOG_HEADERS]);
  }

  // 既存レコードを上書き（同 gameId の行を探して更新、なければ追記）
  const data_ = sheet.getDataRange().getValues();
  for (let i = 1; i < data_.length; i++) {
    if (String(data_[i][0]) === String(gameId)) {
      sheet.getRange(i + 1, 1, 1, 3).setValues([[gameId, name, reason ?? '']]);
      return;
    }
  }
  sheet.appendRow([gameId, name, reason ?? '']);
}

function _getMvp(gameId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MVP_LOG_SHEET);
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(gameId)) {
      return { name: String(data[i][1]), reason: String(data[i][2]) };
    }
  }
  return null;
}

// ==================== 書き込みヘルパー ====================

function _writeBatterInning(sheet, inning, round, roster, batterResults, rbiData) {
  // abSlot = (inning-1)*2 + (round-1)  → E列からのオフセット
  const AB_START = 5;  // E列
  const colOffset = (inning - 1) * 2 + (round - 1);
  const col = AB_START + colOffset;

  const BATTER_DATA_START = 4;
  const ROWS_PER_ORDER    = 2;

  roster.forEach(r => {
    const rowTop = BATTER_DATA_START + (r.order - 1) * ROWS_PER_ORDER;

    // 選手名・ポジション（先発）
    sheet.getRange(rowTop,     1).setValue(r.order);
    sheet.getRange(rowTop,     2).setValue('先発');
    sheet.getRange(rowTop,     3).setValue(r.name);
    sheet.getRange(rowTop,     4).setValue(r.position);

    // 交代
    if (r.subName) {
      sheet.getRange(rowTop + 1, 2).setValue('交代');
      sheet.getRange(rowTop + 1, 3).setValue(r.subName);
      sheet.getRange(rowTop + 1, 4).setValue(r.subPosition);
    }

    // 打席結果（打撃コード + 走塁コードを "/" で結合）
    const entry = batterResults[String(r.order)];
    const hitCode  = typeof entry === 'string' ? entry : (entry?.code || '');
    const runCode  = typeof entry === 'object'  ? (entry?.runCode || '') : '';
    const cellValue = runCode ? `${hitCode}/${runCode}` : hitCode;
    if (cellValue) sheet.getRange(rowTop, col).setValue(cellValue);

    // 打点・得点・盗塁（集計列はスプシ数式側で集計しているため個別列に書く）
    const rbi = rbiData[String(r.order)] || { rbi: 0, runs: 0, sb: 0 };
    // RBI/得点/盗塁は集計列（S列〜）に加算ではなく専用列があればそこへ
    // ※ スプシの設計に合わせて必要なら調整
  });
}

function _writePitcherInning(sheet, inning, round, roster, pitcherResults) {
  const OPP_AB_START = 2;  // B列
  const colOffset = (inning - 1) * 2 + (round - 1);
  const col = OPP_AB_START + colOffset;

  const DATA_START   = 3;
  const BATTING_ORDERS = 9;

  for (let order = 1; order <= BATTING_ORDERS; order++) {
    const row = DATA_START + order - 1;
    const pr  = pitcherResults[String(order)] || { code: '', pitcher: '' };
    if (pr.code)    sheet.getRange(row, col).setValue(pr.code);
    if (pr.pitcher) sheet.getRange(row, col + 1).setValue(pr.pitcher);
  }
}

function _writePitcherStats(sheet, pitcherStats) {
  const OPP_ER_DATA_START_ROW = 15;
  const OPP_ER_COLS_NAME = 1;  // A列
  const OPP_ER_COLS_R    = 14; // N列
  const OPP_ER_COLS_ER   = 15; // O列

  pitcherStats.forEach((ps, i) => {
    if (i >= 7) return;
    if (!ps.name) return;
    const row = OPP_ER_DATA_START_ROW + i;
    sheet.getRange(row, OPP_ER_COLS_NAME).setValue(ps.name);
    sheet.getRange(row, OPP_ER_COLS_R).setValue(ps.r);
    sheet.getRange(row, OPP_ER_COLS_ER).setValue(ps.er);
  });
}

// ==================== ユーティリティ ====================

// _buildStatsMap, _buildPlayerMap は main.gs で定義済み（GAS共有スコープで参照可能）

function _normalizeDate(dateStr) {
  const m = String(dateStr).match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) return m[1] + m[2].padStart(2, '0') + m[3].padStart(2, '0');
  // Date オブジェクトの場合
  if (dateStr instanceof Date) {
    const d = dateStr;
    return String(d.getFullYear()) +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
  }
  return String(dateStr).replace(/[\/\-]/g, '');
}

function _formatDate(val) {
  if (val instanceof Date) {
    return val.getFullYear() + '-' +
      String(val.getMonth() + 1).padStart(2, '0') + '-' +
      String(val.getDate()).padStart(2, '0');
  }
  return String(val).trim();
}

function _findSheet(ss, exactName, gameId, opponent, prefix) {
  const sheets = ss.getSheets().map(s => s.getName());
  if (sheets.includes(exactName)) return exactName;
  // 部分一致フォールバック
  const found = sheets.find(s =>
    s.startsWith(`${prefix}_${gameId}_`) && s.endsWith(`_${opponent}`)
  );
  return found || null;
}
