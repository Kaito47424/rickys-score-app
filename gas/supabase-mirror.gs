// ============================================================
// S1: Supabase 並行書き込みミラー
// ============================================================
// GAS/スプシを正としたまま、書き込みのたびにSupabaseへも同時書き込みする。
// 失敗してもスプシへの書き込みには一切影響させない（例外を投げない・呼び出し元は
// 戻り値を無視してよい）。
//
// 初回セットアップ: スクリプトプロパティに以下を設定すること
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
// （ファイル→プロジェクトのプロパティ→スクリプトのプロパティ、または
//   PropertiesService.getScriptProperties().setProperties({...}) を一度実行）
// 未設定の場合はミラーが無効化されるだけで、スプシ側の動作には影響しない。
// ============================================================

function _supabaseConfig() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('SUPABASE_URL');
  const key = props.getProperty('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return { url, key };
}

function _supabaseRequest(method, table, body, query, prefer) {
  const cfg = _supabaseConfig();
  if (!cfg) return;
  try {
    const qs = query ? `?${query}` : '';
    const res = UrlFetchApp.fetch(`${cfg.url}/rest/v1/${table}${qs}`, {
      method,
      contentType: 'application/json',
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        Prefer: prefer,
      },
      payload: JSON.stringify(body),
      muteHttpExceptions: true,
    });
    const code = res.getResponseCode();
    if (code >= 300) {
      Logger.log(`[Supabaseミラー失敗] ${method} ${table} (${code}): ${res.getContentText()}`);
    }
  } catch (err) {
    Logger.log(`[Supabaseミラー例外] ${method} ${table}: ${err}`);
  }
}

// 主キー/一意制約に対してupsert（既存があれば上書き、なければ追加）
function _supabaseUpsert(table, rows, onConflict) {
  if (!rows || rows.length === 0) return;
  _supabaseRequest('POST', table, rows, `on_conflict=${onConflict}`, 'resolution=merge-duplicates,return=minimal');
}

// 新規追加のみ（edit_log等、自然キーを持たないテーブル用）
function _supabaseInsert(table, rows) {
  if (!rows || rows.length === 0) return;
  _supabaseRequest('POST', table, rows, null, 'return=minimal');
}

// 既存行の部分更新（試合削除フラグ等）
function _supabaseUpdate(table, filterCol, filterVal, patch) {
  _supabaseRequest('PATCH', table, patch, `${filterCol}=eq.${encodeURIComponent(filterVal)}`, 'return=minimal');
}
