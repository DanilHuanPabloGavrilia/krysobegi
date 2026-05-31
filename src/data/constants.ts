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

// Каждые N месяцев — автоматическое глобальное рыночное событие
export const MARKET_EVENT_INTERVAL = 3

// ── Кредиты ───────────────────────────────────────────────────────────────────
export const LOAN_TIERS = {
  small:  { name: 'Мини-кредит',    amount: 100_000, monthlyPayment: 12_000, turns: 10 },
  medium: { name: 'Кредит',         amount: 300_000, monthlyPayment: 35_000, turns: 10 },
  large:  { name: 'Большой кредит', amount: 600_000, monthlyPayment: 75_000, turns: 10 },
} as const

// ── 53-клеточное поле ────────────────────────────────────────────────────────
//
//  Принципы нового поля (Cashflow-философия):
//  • Рынок должен ощущаться — 6 рыночных клеток (3 market + 3 market_news)
//  • market_news = глобальное событие, которое влияет на ВСЕХ (как в Cashflow)
//  • doodad = lifestyle-расходы, которые держат тебя в крысиных бегах
//  • Убраны raid-клетки: в Cashflow нет PvP-грабежа, есть рыночный риск
//
//  Состав: 1 start + 1 vacation + 1 tax + 1 luck
//         + 15 opportunity + 15 bad_event
//         + 8 bonus + 4 doodad
//         + 3 market + 3 market_news  = 53 ✓

export const BOARD: CardType[] = [
  'start',        // 0   ← угол: конец месяца, зарплата всем
  'opportunity',  // 1
  'bonus',        // 2
  'bad_event',    // 3
  'opportunity',  // 4
  'doodad',       // 5   ← lifestyle-трата
  'bad_event',    // 6
  'opportunity',  // 7
  'bonus',        // 8
  'bad_event',    // 9
  'market_news',  // 10  ← РЫНОЧНОЕ СОБЫТИЕ (глобально)
  'opportunity',  // 11
  'bad_event',    // 12
  'vacation',     // 13  ← угол: пропуск хода
  'opportunity',  // 14
  'bonus',        // 15
  'bad_event',    // 16
  'opportunity',  // 17
  'doodad',       // 18  ← lifestyle-трата
  'bad_event',    // 19
  'opportunity',  // 20
  'bonus',        // 21
  'bad_event',    // 22
  'market',       // 23  ← индивидуальный рыночный эффект
  'opportunity',  // 24
  'bad_event',    // 25
  'tax',          // 26  ← угол: налоговая
  'opportunity',  // 27
  'bonus',        // 28
  'bad_event',    // 29
  'opportunity',  // 30
  'doodad',       // 31  ← lifestyle-трата
  'bad_event',    // 32
  'opportunity',  // 33
  'bonus',        // 34
  'bad_event',    // 35
  'market_news',  // 36  ← РЫНОЧНОЕ СОБЫТИЕ (глобально)
  'opportunity',  // 37
  'bad_event',    // 38
  'luck',         // 39  ← угол: удача
  'opportunity',  // 40
  'bonus',        // 41
  'bad_event',    // 42
  'opportunity',  // 43
  'doodad',       // 44  ← lifestyle-трата
  'bad_event',    // 45
  'opportunity',  // 46
  'market_news',  // 47  ← РЫНОЧНОЕ СОБЫТИЕ (глобально)
  'bad_event',    // 48
  'market',       // 49  ← индивидуальный рыночный эффект
  'opportunity',  // 50
  'bad_event',    // 51
  'market',       // 52  ← индивидуальный рыночный эффект
]
