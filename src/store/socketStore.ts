import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '../types/socket'
import type { GameRoom, CardType, PlayerSetup } from '../types/game'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export interface DiceResult {
  playerId: string
  value: number
  cellType: CardType
  cashDelta?: number
  monthEnd?: boolean
}

export interface ReactionEvent {
  id: string
  playerId: string
  nickname: string
  emoji: string
  timestamp: number
}

export interface ChatMessage {
  id: string
  playerId: string
  nickname: string
  message: string
  timestamp: number
}

interface SocketStore {
  socket: AppSocket | null
  room: GameRoom | null
  myPlayerId: string | null
  error: string | null
  gameStarted: boolean
  winnerId: string | null
  diceResult: DiceResult | null

  // Эфемерные события (не в GameRoom)
  reactions: ReactionEvent[]
  chatMessages: ChatMessage[]

  connect: () => void
  createRoom: (nickname: string) => void
  joinRoom: (code: string, nickname: string) => void
  kickPlayer: (targetId: string) => void
  setReady: () => void
  startGame: () => void
  submitSetup: (setup: PlayerSetup) => void
  rollDice: () => void
  makeDecision: (decision: 'accept' | 'decline') => void
  leaveRoom: () => void
  clearError: () => void

  // Новые действия
  sellAsset: (assetId: string) => void
  takeLoan: (tier: 'small' | 'medium' | 'large') => void
  repayLoan: (loanId: string) => void
  sendReaction: (emoji: string) => void
  sendChat: (message: string) => void
  proposeTradeOffer: (data: { assetId: string; targetPlayerId: string; price: number }) => void
  respondToTrade: (accept: boolean) => void
}

const SERVER_URL = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? undefined

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket: null,
  room: null,
  myPlayerId: null,
  error: null,
  gameStarted: false,
  winnerId: null,
  diceResult: null,
  reactions: [],
  chatMessages: [],

  connect: () => {
    if (get().socket) return
    const socket: AppSocket = io(SERVER_URL)

    socket.on('connect', () => set({ myPlayerId: socket.id ?? null }))

    socket.on('roomUpdated', (room) => set({ room }))

    socket.on('gameStarted', (room) => set({ room, gameStarted: true }))

    socket.on('diceRolled', (data) => {
      set({ diceResult: data })
      setTimeout(() => set({ diceResult: null }), 3500)
    })

    socket.on('gameFinished', (winnerId) => set({ winnerId }))

    socket.on('playerDisconnected', (playerId) => {
      if (playerId === get().myPlayerId) {
        set({ room: null, error: 'Вас выкинул хост' })
      }
    })

    socket.on('error', (msg) => set({ error: msg }))
    socket.on('disconnect', () => set({ myPlayerId: null }))

    // ── Реакции ───────────────────────────────────────────────────────────
    socket.on('reactionBroadcast', (data) => {
      const reaction: ReactionEvent = {
        id: `${data.playerId}_${Date.now()}`,
        playerId: data.playerId,
        nickname: data.nickname,
        emoji: data.emoji,
        timestamp: Date.now(),
      }
      set((s) => ({ reactions: [...s.reactions, reaction] }))
      // Автоматически убираем реакцию через 2.5 секунды
      setTimeout(() => {
        set((s) => ({ reactions: s.reactions.filter((r) => r.id !== reaction.id) }))
      }, 2500)
    })

    // ── Чат ───────────────────────────────────────────────────────────────
    socket.on('chatMessage', (data) => {
      const msg: ChatMessage = {
        id: `${data.playerId}_${data.timestamp}`,
        playerId: data.playerId,
        nickname: data.nickname,
        message: data.message,
        timestamp: data.timestamp,
      }
      set((s) => ({
        chatMessages: [...s.chatMessages.slice(-49), msg],   // хранить последние 50
      }))
    })

    set({ socket })
  },

  createRoom: (nickname) => {
    const { socket } = get()
    if (!socket) return
    const emit = () => socket.emit('createRoom', nickname, (code) => console.log('room:', code))
    socket.connected ? emit() : socket.once('connect', emit)
  },

  joinRoom: (code, nickname) => {
    const { socket } = get()
    if (!socket) return
    const emit = () =>
      socket.emit('joinRoom', { code, nickname }, (err) => { if (err) set({ error: err }) })
    socket.connected ? emit() : socket.once('connect', emit)
  },

  kickPlayer: (targetId) => get().socket?.emit('kickPlayer', targetId),
  setReady:   () => get().socket?.emit('setReady'),
  startGame:  () => get().socket?.emit('startGame'),
  submitSetup: (setup) => get().socket?.emit('submitSetup', setup),
  rollDice:    () => get().socket?.emit('rollDice'),
  makeDecision: (decision) => get().socket?.emit('makeDecision', decision),

  leaveRoom: () => {
    get().socket?.disconnect()
    set({
      socket: null, room: null, myPlayerId: null,
      gameStarted: false, winnerId: null, diceResult: null,
      error: null, reactions: [], chatMessages: [],
    })
  },

  clearError: () => set({ error: null }),

  // ── Новые действия ────────────────────────────────────────────────────────

  sellAsset: (assetId) => get().socket?.emit('sellAsset', assetId),

  takeLoan: (tier) => get().socket?.emit('takeLoan', tier),

  repayLoan: (loanId) => get().socket?.emit('repayLoan', loanId),

  sendReaction: (emoji) => get().socket?.emit('sendReaction', emoji),

  sendChat: (message) => get().socket?.emit('sendChat', message),

  proposeTradeOffer: (data) => get().socket?.emit('proposeTradeOffer', data),

  respondToTrade: (accept) => get().socket?.emit('respondToTrade', accept),
}))
