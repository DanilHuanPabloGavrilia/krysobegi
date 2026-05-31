import type { GameRoom, Card, CardType, PlayerSetup } from './game'

export interface ClientToServerEvents {
  createRoom: (nickname: string, cb: (code: string) => void) => void
  joinRoom: (data: { code: string; nickname: string }, cb: (error?: string) => void) => void
  kickPlayer: (playerId: string) => void
  setReady: () => void
  startGame: () => void
  submitSetup: (setup: PlayerSetup) => void
  rollDice: () => void
  makeDecision: (decision: 'accept' | 'decline') => void

  // Продажа актива
  sellAsset: (assetId: string) => void

  // Кредиты
  takeLoan: (tier: 'small' | 'medium' | 'large') => void
  repayLoan: (loanId: string) => void

  // Реакции и чат
  sendReaction: (emoji: string) => void
  sendChat: (message: string) => void

  // Торговля активами
  proposeTradeOffer: (data: { assetId: string; targetPlayerId: string; price: number }) => void
  respondToTrade: (accept: boolean) => void
}

export interface ServerToClientEvents {
  roomUpdated: (room: GameRoom) => void
  gameStarted: (room: GameRoom) => void
  diceRolled: (data: {
    playerId: string
    value: number
    cellType: CardType
    cashDelta?: number
    monthEnd?: boolean
  }) => void
  cardDrawn: (card: Card) => void
  gameFinished: (winnerId: string) => void
  playerDisconnected: (playerId: string) => void
  error: (message: string) => void

  // Реакции (эфемерные, не в GameRoom)
  reactionBroadcast: (data: { playerId: string; nickname: string; emoji: string }) => void

  // Чат (эфемерный, не в GameRoom)
  chatMessage: (data: {
    playerId: string
    nickname: string
    message: string
    timestamp: number
  }) => void
}
