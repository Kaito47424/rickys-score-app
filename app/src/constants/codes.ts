export const RESULT_CODES: Record<string, string[]> = {
  '安打':   ['投安','捕安','一安','二安','三安','遊安','左安','中安','右安','左中間安','右中間安'],
  '長打':   ['左二','中二','右二','左中間二','右中間二','左三','中三','右三','左中間三','右中間三','左本','中本','右本','左中間本','右中間本'],
  '三振':   ['K','Kw'],
  'ゴロ':   ['投ゴロ','捕ゴロ','一ゴロ','二ゴロ','三ゴロ','遊ゴロ'],
  'フライ':  ['投飛','捕飛','一飛','二飛','三飛','遊飛','左飛','中飛','右飛'],
  'ライナー': ['投直','捕直','一直','二直','三直','遊直','左直','中直','右直'],
  '四死球':  ['四球','死球','犠打','犠飛','妨害','走妨'],
  '失策':   ['失策(投)','失策(捕)','失策(一)','失策(二)','失策(三)','失策(遊)','失策(左)','失策(中)','失策(右)'],
  'その他':  ['併殺打'],
}

export const RUN_CODES = ['盗塁失敗', '走塁死', '牽制死'] as const

// 成績コードマスタのアウト数定義と対応（相手攻撃タブのアウトカウント表示用）
export function outsForCode(code: string): number {
  if (code === '併殺打') return 2
  if (code === '犠打' || code === '犠飛') return 1
  if (RESULT_CODES['三振'].includes(code)) return 1
  if (RESULT_CODES['ゴロ'].includes(code)) return 1
  if (RESULT_CODES['フライ'].includes(code)) return 1
  if (RESULT_CODES['ライナー'].includes(code)) return 1
  return 0
}

// 野手タブのアウトカウント表示用（打撃結果に加え、走塁での出塁死も加算する）
export function outsForBatterEntry(entry: { code: string; runCode: string | null }): number {
  const runOut = entry.runCode && (RUN_CODES as readonly string[]).includes(entry.runCode) ? 1 : 0
  return outsForCode(entry.code) + runOut
}

export const POSITIONS = ['投','捕','一','二','三','遊','左','中','右','指',''] as const

export const DEFAULT_ROSTER_NAMES = [
  '中村海斗','兼田鳴海','丸山智樹','高木琉偉','',
  '坂部巧','仙田祐一','浦上 日花里','松戸義雄',
]
