import type { GameRoom, Player, PlayerSetup } from '../src/types/game'
import { ROLES } from '../src/data/roles'
import {
  BASE_LIVING_EXPENSE,
  KIDS_EXPENSE,
  CAR_EXPENSE,
  MORTGAGE_EXPENSE,
} from '../src/data/constants'

const rooms = new Map<string, GameRoom>()

// ─── helpers ──────────────────────────────────────────────────────────────────

function generateCode(): string {
  let code: string
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString()
  } while (rooms.has(code))
  return code
}

function makePlayer(socketId: string, nickname: string): Player {
  return {
    id: socketId,
    nickname,
    roleId: null,
    goal: null,
    hasKids: false,
    hasCar: false,
    hasMortgage: false,
    financeSheet: { salary: 0, passiveIncome: 0, expenses: 0, cashFlow: 0, cash: 0 },
    assets: [],
    loans: [],
    position: 0,
    lapsCompleted: 0,
    isBot: false,
    isReady: false,
    isOnFastTrack: false,
    activePerkCooldowns: {},
    turnsMissed: 0,
    historyFlags: [],
  }
}

// ─── public API ───────────────────────────────────────────────────────────────

export type RoomResult = GameRoom | string

export function createRoom(socketId: string, nickname: string): GameRoom {
  const code = generateCode()
  const room: GameRoom = {
    code,
    hostId: socketId,
    players: [makePlayer(socketId, nickname)],
    phase: 'lobby',
    season: 'spring',
    totalLaps: 0,
    monthNumber: 0,
    currentPlayerIndex: 0,
    turnPhase: 'rolling',
    turnNumber: 0,
    deck: [],
    discardPile: [],
    activeCard: null,
    macroEventQueue: [],
    turnTimeoutSeconds: 60,
    createdAt: Date.now(),
    marketPrices: {},
    lastRollNotifications: [],
    pendingTradeOffer: null,
    pendingMarketEvent: null,
  }
  rooms.set(code, room)
  return room
}

export function joinRoom(socketId: string, code: string, nickname: string): RoomResult {
  const room = rooms.get(code)
  if (!room)                    return 'Комната не найдена'
  if (room.phase !== 'lobby')   return 'Игра уже началась'
  if (room.players.length >= 6) return 'Комната заполнена'

  room.players.push(makePlayer(socketId, nickname))
  return room
}

export function kickPlayer(code: string, hostId: string, targetId: string): RoomResult {
  const room = rooms.get(code)
  if (!room)                  return 'Комната не найдена'
  if (room.hostId !== hostId) return 'Только хост может кикать игроков'

  const idx = room.players.findIndex((p) => p.id === targetId)
  if (idx === -1) return 'Игрок не найден'

  room.players.splice(idx, 1)
  return room
}

export function toggleReady(code: string, socketId: string): RoomResult {
  const room = rooms.get(code)
  if (!room) return 'Комната не найдена'

  const player = room.players.find((p) => p.id === socketId)
  if (!player) return 'Игрок не найден'

  player.isReady = !player.isReady
  return room
}

export function startGame(code: string, hostId: string): RoomResult {
  const room = rooms.get(code)
  if (!room)                                  return 'Комната не найдена'
  if (room.phase !== 'lobby')                 return 'Игра уже началась'
  if (room.hostId !== hostId)                 return 'Только хост может начать игру'
  if (room.players.length < 2)               return 'Нужно минимум 2 игрока'
  if (!room.players.every((p) => p.isReady)) return 'Не все игроки готовы'

  room.phase = 'setup'
  // Сбрасываем isReady — игроки будут отмечаться повторно при сдаче настроек
  room.players.forEach((p) => { p.isReady = false })
  return room
}

/**
 * Игрок сдаёт настройку персонажа.
 * Рассчитывает стартовый FinanceSheet на основе выборов игрока.
 */
export function submitSetup(code: string, socketId: string, setup: PlayerSetup): RoomResult {
  const room = rooms.get(code)
  if (!room)                   return 'Комната не найдена'
  if (room.phase !== 'setup')  return 'Настройка недоступна'

  const player = room.players.find((p) => p.id === socketId)
  if (!player) return 'Игрок не найден'

  const role = ROLES.find((r) => r.id === setup.role)
  if (!role) return 'Роль не найдена'

  // Расходы: база + ипотека/аренда + дети + машина
  const mortgageOrRent = setup.hasMortgage ? MORTGAGE_EXPENSE : setup.rentExpense
  const totalExpenses =
    BASE_LIVING_EXPENSE + mortgageOrRent +
    (setup.hasKids ? KIDS_EXPENSE : 0) +
    (setup.hasCar  ? CAR_EXPENSE  : 0)

  player.roleId      = setup.role
  player.goal        = setup.goal
  player.hasKids     = setup.hasKids
  player.hasCar      = setup.hasCar
  player.hasMortgage = setup.hasMortgage
  player.financeSheet = {
    salary:        role.salary,
    passiveIncome: 0,
    expenses:      totalExpenses,
    cashFlow:      role.salary - totalExpenses,
    cash:          Math.min(Math.max(setup.startCash, 0), 2_000_000),
  }
  player.isReady = true

  return room
}

export function removePlayer(socketId: string): { room: GameRoom; code: string } | null {
  for (const [code, room] of rooms) {
    const idx = room.players.findIndex((p) => p.id === socketId)
    if (idx === -1) continue

    room.players.splice(idx, 1)

    if (room.players.length === 0) {
      rooms.delete(code)
      return null
    }

    if (room.hostId === socketId) room.hostId = room.players[0].id
    return { room, code }
  }
  return null
}

export function findPlayerRoom(socketId: string): { room: GameRoom; code: string } | null {
  for (const [code, room] of rooms) {
    if (room.players.some((p) => p.id === socketId)) return { room, code }
  }
  return null
}
