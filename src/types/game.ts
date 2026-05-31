export type RoleId = 'doctor' | 'it' | 'teacher' | 'entrepreneur'

export type CardType =
  | 'opportunity'
  | 'bad_event'
  | 'bonus'
  | 'investment'
  | 'market'           // индивидуальный рыночный эффект для текущего игрока
  | 'market_news'      // 📰 глобальное рыночное событие — влияет на ВСЕХ
  | 'doodad'           // 🛒 lifestyle-расходы — держат в крысиных бегах
  | 'vacation'
  | 'tax'
  | 'luck'
  | 'start'

export type GamePhase = 'lobby' | 'setup' | 'playing' | 'finished'
export type TurnPhase = 'rolling' | 'card'
export type Season    = 'winter' | 'spring' | 'summer' | 'autumn'

export type PlayerGoal =
  | 'car' | 'travel' | 'renovation' | 'financial_freedom' | 'apartment' | 'business'

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

// ── Кредит ────────────────────────────────────────────────────────────────────

export interface Loan {
  id: string
  name: string
  amount: number
  monthlyPayment: number
  turnsLeft: number
}

// ── Торговля ──────────────────────────────────────────────────────────────────

export interface TradeOffer {
  id: string
  fromPlayerId: string
  fromNickname: string
  toPlayerId: string
  assetId: string
  assetName: string
  price: number
  expiresAt: number
}

// ── Рыночные события (глобальные) ─────────────────────────────────────────────

export interface MarketEffect {
  stockId: string
  priceMultiplier: number
}

export interface MarketEventCard {
  id: string
  title: string
  description: string
  emoji: string
  newsFlash: string
  effects: MarketEffect[]
}

export interface MarketEventImpact {
  playerId: string
  nickname: string
  incomeDelta: number   // изменение ежемесячного пассивного дохода ₽/мес
}

export interface MarketEventResult {
  event: MarketEventCard
  impacts: MarketEventImpact[]
}

// ── Актив ─────────────────────────────────────────────────────────────────────

export interface Asset {
  id: string
  name: string
  type: 'real_estate' | 'business' | 'stock' | 'deposit' | 'crypto'
  cost: number
  monthlyIncome: number
  monthlyExpense: number
  ownedBy: string

  stockId?: string
  shares?: number
  costPerShare?: number
  dividendPercent?: number
  volatility?: 'none' | 'low' | 'medium' | 'high' | 'extreme'
  canSell?: boolean
  sellBackPercent?: number

  failRisk?: number
  failPenalty?: number
  status?: 'active' | 'closing'
  closingTurnsLeft?: number
  maxClosingTurns?: number
  seasonEffect?: Record<string, number>
  baseMonthlyIncome?: number
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
  loans: Loan[]
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

  cost?: number
  downPayment?: number
  monthlyIncome?: number
  monthlyExpense?: number
  assetType?: Asset['type']
  cashBonus?: number
  salaryDelta?: number

  penaltyAmount?: number
  penaltyType?: 'cash' | 'percent_income' | 'skip_turns' | 'baby'
  skipTurns?: number
  requireNoKids?: boolean
  triggerIfFlag?: string
  penaltyMultiplierIfFlag?: number

  subtype?: 'stock' | 'crypto' | 'deposit' | 'business' | 'real_estate'
  stockId?: string
  costPerShare?: number
  minShares?: number
  dividendPercent?: number
  volatility?: 'none' | 'low' | 'medium' | 'high' | 'extreme'
  canSell?: boolean
  sellBackPercent?: number
  failRisk?: number
  failPenalty?: number
  closingTurns?: number
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
  marketPrices: Record<string, number>
  lastRollNotifications: string[]
  pendingTradeOffer: TradeOffer | null
  pendingMarketEvent: MarketEventResult | null   // очищается сервером до roomUpdated
}

export interface GameState {
  room: GameRoom | null
  myPlayerId: string | null
  connected: boolean
}
