export type GameInfo = {
  gameId: string
  gameDate: string
  opponent: string
  exists: boolean
}

export type Player = {
  playerId: string
  number: string
  name: string
}

export type RosterEntry = {
  order: number
  name: string
  position: string
  subName: string
  subFromInning: number | null
}

export type BatterEntry = { code: string; runCode: string | null }
export type BatterResults = Record<string, BatterEntry>
export type PitcherResults = Record<string, { code: string; pitcher: string }>
export type RbiMap = Record<string, { rbi: number; runs: number; sb: number }>

export type InningState = {
  batterResults: BatterResults
  pitcherResults: PitcherResults
  rbiData: RbiMap
}

export type AllInningData = Record<string, InningState>
export type Page = 'gameSelect' | 'orderEdit' | 'inputMain'
export type ModalTarget = { order: number; tab: 'batter' | 'pitcher' } | null

export type BatStat = Record<string, string | number>
export type PitchStat = Record<string, string | number>

export type PitcherRunStat = { name: string; r: number; er: number }

export type GameData = {
  roster: RosterEntry[]
  batterResults: Record<string, Record<string, BatterEntry | string>>
  pitcherResults: Record<string, Record<string, { code: string; pitcher: string }>>
  rbiData: Record<string, { rbi: number; runs: number; sb: number }>
  pitcherStats?: PitcherRunStat[]
}
