import type { CardType } from '../types/game'

export const BOARD_SIZE = 53
export const MAX_PLAYERS = 6
export const TURN_TIMEOUT_SECONDS = 60

// Расходы по умолчанию
export const BASE_LIVING_EXPENSE  = 20_000   // базовые расходы на жизнь
export const KIDS_EXPENSE         = 15_000   // дети
export const CAR_EXPENSE          =  8_000   // автомобиль
export const MORTGAGE_EXPENSE     = 25_000   // ипотека
export const DEFAULT_RENT_EXPENSE = 20_000   // аренда (если нет ипотеки)

// Сезонные расходы (разово при смене сезона)
export const WINTER_EXPENSE       =  5_000   // всем: отопление/одежда
export const SUMMER_KIDS_EXPENSE  = 10_000   // детям: летний лагерь

// Каждые 3 полных круга (суммарно всех игроков) — смена сезона
export const LAPS_PER_SEASON = 3

// ── 53-клеточное поле ────────────────────────────────────────────────────────
// 4 угла: 0=Старт, 13=Отпуск, 26=Налоговая, 39=Удача
// 12 клеток Зарплата (каждые ~4), 16 Возможностей, 16 Неприятностей, 5 Рынок
export const BOARD: CardType[] = [
  'start',       // 0   ← угол
  'opportunity', // 1
  'bonus',      // 2
  'bad_event',   // 3
  'opportunity', // 4
  'bonus',      // 5
  'bad_event',   // 6
  'opportunity', // 7
  'bonus',      // 8
  'bad_event',   // 9
  'market',      // 10
  'opportunity', // 11
  'bad_event',   // 12
  'vacation',    // 13  ← угол
  'opportunity', // 14
  'bonus',      // 15
  'bad_event',   // 16
  'opportunity', // 17
  'bonus',      // 18
  'bad_event',   // 19
  'opportunity', // 20
  'bonus',      // 21
  'bad_event',   // 22
  'market',      // 23
  'opportunity', // 24
  'bad_event',   // 25
  'tax',         // 26  ← угол
  'opportunity', // 27
  'bonus',      // 28
  'bad_event',   // 29
  'opportunity', // 30
  'bonus',      // 31
  'bad_event',   // 32
  'opportunity', // 33
  'bonus',      // 34
  'bad_event',   // 35
  'market',      // 36
  'opportunity', // 37
  'bad_event',   // 38
  'luck',        // 39  ← угол
  'opportunity', // 40
  'bonus',      // 41
  'bad_event',   // 42
  'opportunity', // 43
  'bonus',      // 44
  'bad_event',   // 45
  'opportunity', // 46
  'bonus',      // 47
  'bad_event',   // 48
  'market',      // 49
  'opportunity', // 50
  'bad_event',   // 51
  'market',      // 52
]
// Итого: 1 start + 1 vacation + 1 tax + 1 luck
//      + 12 payday + 16 opportunity + 16 bad_event + 5 market = 53 ✓
