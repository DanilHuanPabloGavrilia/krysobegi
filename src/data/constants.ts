import type { CardType } from '../types/game'

export const BOARD_SIZE = 53
export const MAX_PLAYERS = 6
export const TURN_TIMEOUT_SECONDS = 60

// Расходы по умолчанию
export const BASE_LIVING_EXPENSE  = 20_000
export const KIDS_EXPENSE         = 15_000
export const CAR_EXPENSE          =  8_000
export const MORTGAGE_EXPENSE     = 25_000
export const DEFAULT_RENT_EXPENSE = 20_000

// Сезонные расходы (разово при смене сезона)
export const WINTER_EXPENSE       =  5_000
export const SUMMER_KIDS_EXPENSE  = 10_000

// Каждые 3 полных круга (суммарно всех игроков) — смена сезона
export const LAPS_PER_SEASON = 3

// ── Кредиты ───────────────────────────────────────────────────────────────────
export const LOAN_TIERS = {
  small:  { name: 'Мини-кредит',    amount: 100_000, monthlyPayment: 12_000, turns: 10 },
  medium: { name: 'Кредит',         amount: 300_000, monthlyPayment: 35_000, turns: 10 },
  large:  { name: 'Большой кредит', amount: 600_000, monthlyPayment: 75_000, turns: 10 },
} as const

// ── 53-клеточное поле ────────────────────────────────────────────────────────
// Клетки 10 и 36 заменены на 🗡️ raid — разбойничьи клетки
export const BOARD: CardType[] = [
  'start',       // 0   ← угол
  'opportunity', // 1
  'bonus',       // 2
  'bad_event',   // 3
  'opportunity', // 4
  'bonus',       // 5
  'bad_event',   // 6
  'opportunity', // 7
  'bonus',       // 8
  'bad_event',   // 9
  'raid',        // 10  ← разбойник!
  'opportunity', // 11
  'bad_event',   // 12
  'vacation',    // 13  ← угол
  'opportunity', // 14
  'bonus',       // 15
  'bad_event',   // 16
  'opportunity', // 17
  'bonus',       // 18
  'bad_event',   // 19
  'opportunity', // 20
  'bonus',       // 21
  'bad_event',   // 22
  'market',      // 23
  'opportunity', // 24
  'bad_event',   // 25
  'tax',         // 26  ← угол
  'opportunity', // 27
  'bonus',       // 28
  'bad_event',   // 29
  'opportunity', // 30
  'bonus',       // 31
  'bad_event',   // 32
  'opportunity', // 33
  'bonus',       // 34
  'bad_event',   // 35
  'raid',        // 36  ← разбойник!
  'opportunity', // 37
  'bad_event',   // 38
  'luck',        // 39  ← угол
  'opportunity', // 40
  'bonus',       // 41
  'bad_event',   // 42
  'opportunity', // 43
  'bonus',       // 44
  'bad_event',   // 45
  'opportunity', // 46
  'bonus',       // 47
  'bad_event',   // 48
  'market',      // 49
  'opportunity', // 50
  'bad_event',   // 51
  'market',      // 52
]
