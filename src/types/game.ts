export type RoleId = 'doctor' | 'it' | 'teacher'

export type CardType =
  | 'opportunity'
  | 'bad_event'
  | 'bonus'        // бывший payday: случайная премия 3–15 тыс. ₽
  | 'investment'   // инвестиционная карточка (рисуется с зелёных клеток)
  | 'market'
  | 'vacation'
  | 'tax'
  | 'luck'
  | 'start'

export type GamePhase = 'lobby' | 'setup' | 'playing' | 'finished'

export type TurnPhase = 'rolling' | 'card'

export type Season = 'winter' | 'spring' | 'summer' | 'autumn'

export type PlayerGoal =
  | 'car'
  | 'travel'
  | 'renovation'
  | 'financial_freedom'
  | 'apartment'
  | 'business'

export interface PlayerSetup {
  role: RoleId
  goal: PlayerGoal
  startCash: number
  hasKids: boolean
  hasCar: boolean
  hasMortgage: boolean
  rentExpense: number
}

export interface FinanceSheet {
  salary: number
  passiveIncome: number
  expenses: number
  cashFlow: number
  cash: number
}

export interface Asset {
  id: string
  name: string
  type: 'real_estate' | 'business' | 'stock' | 'deposit' | 'crypto'
  cost: number           // общая сумма вложений
  monthlyIncome: number  // текущий ежемесячный доход
  monthlyExpense: number
  ownedBy: string

  // ── Акции / крипта / вклад ──────────────────────────────────────────────
  stockId?: string           // ключ в GameRoom.marketPrices
  shares?: number            // количество акций
  costPerShare?: number      // цена покупки за одну акцию
  dividendPercent?: number   // % годовых дивиденда
  volatility?: 'none' | 'low' | 'medium' | 'high' | 'extreme'
  canSell?: boolean
  sellBackPercent?: number   // % от cost при продаже / закрытии

  // ── Малый бизнес ────────────────────────────────────────────────────────
  failRisk?: number          // % шанс провала каждый месяц (0–100)
  failPenalty?: number       // разовый штраф наличными при провале
  status?: 'active' | 'closing'
  closingTurnsLeft?: number  // месяцев до полного закрытия (убывает каждый лап)
  maxClosingTurns?: number   // исходное значение closingTurns из карточки
  seasonEffect?: Record<string, number>  // { winter: -0.4 } = −40% дохода зимой
  baseMonthlyIncome?: number // доход без сезонного модификатора
}

export interface Perk {
  id: string
  name: string
  description: string
  income?: number
  monthlyIncome?: number
  riskPercent: number
  penaltyAmount?: number
  penaltyType?: 'fine' | 'fire' | 'arrest' | 'reputation'
  cooldownTurns: number
  availableFromTurn: number
}

export interface Role {
  id: RoleId
  name: string
  emoji: string
  salary: number
  startExpenses: number
  startCash: number
  passivePerks: string[]
  activePerks: Perk[]
  riskLevel: 'low' | 'medium' | 'high' | 'very_high'
}

export interface Player {
  id: string
  nickname: string
  roleId: RoleId | null
  goal: PlayerGoal | null
  hasKids: boolean
  hasCar: boolean
  hasMortgage: boolean
  financeSheet: FinanceSheet
  assets: Asset[]
  position: number
  lapsCompleted: number
  isBot: boolean
  isReady: boolean
  isOnFastTrack: boolean
  activePerkCooldowns: Record<string, number>
  turnsMissed: number
  historyFlags: string[]
}

export interface Card {
  id: string
  type: CardType
  title: string
  description: string
  roleId?: RoleId | 'any'

  // ── Возможность — стандартная ────────────────────────────────────────────
  cost?: number
  downPayment?: number
  monthlyIncome?: number
  monthlyExpense?: number
  assetType?: Asset['type']
  cashBonus?: number
  salaryDelta?: number

  // ── Неприятность ─────────────────────────────────────────────────────────
  penaltyAmount?: number
  penaltyType?: 'cash' | 'percent_income' | 'skip_turns' | 'baby'
  skipTurns?: number
  requireNoKids?: boolean
  triggerIfFlag?: string
  penaltyMultiplierIfFlag?: number

  // ── Инвестиция ───────────────────────────────────────────────────────────
  subtype?: 'stock' | 'crypto' | 'deposit' | 'business'
  stockId?: string        // ключ в marketPrices
  costPerShare?: number   // цена за акцию
  minShares?: number      // минимальный пакет покупки
  dividendPercent?: number
  volatility?: 'none' | 'low' | 'medium' | 'high' | 'extreme'
  canSell?: boolean
  sellBackPercent?: number
  failRisk?: number
  failPenalty?: number
  closingTurns?: number   // месяцев на закрытие после провала
  seasonEffect?: Record<string, number>
}

export interface GameRoom {
  code: string
  hostId: string
  players: Player[]
  phase: GamePhase
  season: Season
  totalLaps: number
  monthNumber: number
  currentPlayerIndex: number
  turnPhase: TurnPhase
  turnNumber: number
  deck: Card[]
  discardPile: Card[]
  activeCard: Card | null
  macroEventQueue: string[]
  turnTimeoutSeconds: number
  createdAt: number
  marketPrices: Record<string, number>    // stockId → текущая цена за акцию
  lastRollNotifications: string[]          // уведомления последнего хода (видят все)
}

export interface GameState {
  room: GameRoom | null
  myPlayerId: string | null
  connected: boolean
}
