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

interface SocketStore {
  socket: AppSocket | null
  room: GameRoom | null
  myPlayerId: string | null
  error: string | null
  gameStarted: boolean
  winnerId: string | null
  diceResult: DiceResult | null

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

  connect: () => {
    if (get().socket) return
    const socket: AppSocket = io(SERVER_URL)

    socket.on('connect', () => set({ myPlayerId: socket.id ?? null }))

    socket.on('roomUpdated', (room) => set({ room }))

    socket.on('gameStarted', (room) => set({ room, gameStarted: true }))

    socket.on('diceRolled', (data) => {
      set({ diceResult: data })
      // Автоматически убираем результат кубика через 3 сек
      setTimeout(() => set({ diceResult: null }), 3000)
    })

    socket.on('gameFinished', (winnerId) => set({ winnerId }))

    socket.on('playerDisconnected', (playerId) => {
      if (playerId === get().myPlayerId) {
        set({ room: null, error: 'Вас выкинул хост' })
      }
    })

    socket.on('error', (msg) => set({ error: msg }))
    socket.on('disconnect', () => set({ myPlayerId: null }))

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

  setReady: () => get().socket?.emit('setReady'),

  startGame: () => get().socket?.emit('startGame'),

  submitSetup: (setup) => get().socket?.emit('submitSetup', setup),

  rollDice: () => get().socket?.emit('rollDice'),

  makeDecision: (decision) => get().socket?.emit('makeDecision', decision),

  leaveRoom: () => {
    get().socket?.disconnect()
    set({ socket: null, room: null, myPlayerId: null, gameStarted: false, winnerId: null, diceResult: null, error: null })
  },

  clearError: () => set({ error: null }),
}))
