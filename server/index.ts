import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'
import type { ClientToServerEvents, ServerToClientEvents } from '../src/types/socket'
import * as rm from './roomManager'
import * as ge from './gameEngine'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const httpServer = createServer(app)

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../dist')
  app.use(express.static(dist))
  app.use((_, res) => res.sendFile(path.join(dist, 'index.html')))
}

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: process.env.CLIENT_URL ?? '*' },
})

function isError<T>(v: T | string): v is string {
  return typeof v === 'string'
}

io.on('connection', (socket) => {
  console.log('+ connected', socket.id)

  // ── лобби ────────────────────────────────────────────────────────────────

  socket.on('createRoom', (nickname, cb) => {
    const room = rm.createRoom(socket.id, nickname)
    socket.join(room.code)
    cb(room.code)
    io.to(room.code).emit('roomUpdated', room)
    console.log(`[${room.code}] created by "${nickname}"`)
  })

  socket.on('joinRoom', ({ code, nickname }, cb) => {
    const result = rm.joinRoom(socket.id, code, nickname)
    if (isError(result)) { cb(result); return }
    socket.join(code)
    cb()
    io.to(code).emit('roomUpdated', result)
    console.log(`[${code}] "${nickname}" joined`)
  })

  socket.on('kickPlayer', (targetId) => {
    const found = rm.findPlayerRoom(socket.id)
    if (!found) return
    const result = rm.kickPlayer(found.code, socket.id, targetId)
    if (isError(result)) { socket.emit('error', result); return }

    io.to(targetId).emit('playerDisconnected', targetId)
    io.sockets.sockets.get(targetId)?.leave(found.code)
    io.to(found.code).emit('roomUpdated', result)
  })

  socket.on('setReady', () => {
    const found = rm.findPlayerRoom(socket.id)
    if (!found) return
    const result = rm.toggleReady(found.code, socket.id)
    if (isError(result)) { socket.emit('error', result); return }
    io.to(found.code).emit('roomUpdated', result)
  })

  socket.on('startGame', () => {
    const found = rm.findPlayerRoom(socket.id)
    if (!found) return
    const result = rm.startGame(found.code, socket.id)
    if (isError(result)) { socket.emit('error', result); return }

    io.to(found.code).emit('gameStarted', result)
    console.log(`[${found.code}] переход в setup (${result.players.length} игроков)`)
  })

  // ── настройка персонажа ───────────────────────────────────────────────────

  socket.on('submitSetup', (setup) => {
    try {
      const found = rm.findPlayerRoom(socket.id)
      if (!found) return
      const result = rm.submitSetup(found.code, socket.id, setup)
      if (isError(result)) { socket.emit('error', result); return }

      console.log(`[${found.code}] submitSetup от ${socket.id}`)
      io.to(found.code).emit('roomUpdated', found.room)

      if (found.room.players.every((p) => p.isReady)) {
        console.log(`[${found.code}] все готовы — запускаем initializeGame`)
        ge.initializeGame(found.room)
        console.log(`[${found.code}] initializeGame ОК`)
        io.to(found.code).emit('roomUpdated', found.room)
      }
    } catch (err) {
      console.error('submitSetup crash:', err)
      socket.emit('error', 'Ошибка при запуске: ' + String(err))
    }
  })

  // ── игра ─────────────────────────────────────────────────────────────────

  socket.on('rollDice', () => {
    const found = rm.findPlayerRoom(socket.id)
    if (!found) return

    const result = ge.rollDice(found.room, socket.id)
    if (isError(result)) { socket.emit('error', result); return }

    // Извлекаем рыночное событие ДО отправки roomUpdated (pendingMarketEvent эфемерен)
    const marketEvent = found.room.pendingMarketEvent
    found.room.pendingMarketEvent = null

    io.to(found.code).emit('diceRolled', {
      playerId:  socket.id,
      value:     result.dice,
      cellType:  result.cellType as import('../src/types/game').CardType,
      cashDelta: result.cashDelta,
      monthEnd:  result.monthEnd,
    })
    io.to(found.code).emit('roomUpdated', found.room)

    // Рыночное событие рассылаем отдельно — клиенты показывают глобальный оверлей
    if (marketEvent) {
      io.to(found.code).emit('marketEventFired', marketEvent)
      console.log(`[${found.code}] рыночное событие: ${marketEvent.event.title}`)
    }
  })

  socket.on('makeDecision', (decision) => {
    const found = rm.findPlayerRoom(socket.id)
    if (!found) return

    const result = ge.applyCard(found.room, socket.id, decision)
    if (isError(result)) { socket.emit('error', result); return }

    io.to(found.code).emit('roomUpdated', found.room)

    if (found.room.phase === 'finished') {
      io.to(found.code).emit('gameFinished', socket.id)
      console.log(`[${found.code}] game finished! winner: ${socket.id}`)
    }
  })

  // ── продажа актива ────────────────────────────────────────────────────────

  socket.on('sellAsset', (assetId) => {
    const found = rm.findPlayerRoom(socket.id)
    if (!found) return

    const result = ge.sellAsset(found.room, socket.id, assetId)
    if (isError(result)) { socket.emit('error', result); return }

    io.to(found.code).emit('roomUpdated', found.room)
  })

  // ── кредиты ───────────────────────────────────────────────────────────────

  socket.on('takeLoan', (tier) => {
    const found = rm.findPlayerRoom(socket.id)
    if (!found) return

    const result = ge.takeLoan(found.room, socket.id, tier)
    if (isError(result)) { socket.emit('error', result); return }

    io.to(found.code).emit('roomUpdated', found.room)
    console.log(`[${found.code}] ${socket.id} взял кредит: ${tier}`)
  })

  socket.on('repayLoan', (loanId) => {
    const found = rm.findPlayerRoom(socket.id)
    if (!found) return

    const result = ge.repayLoan(found.room, socket.id, loanId)
    if (isError(result)) { socket.emit('error', result); return }

    io.to(found.code).emit('roomUpdated', found.room)
  })

  // ── реакции ───────────────────────────────────────────────────────────────

  socket.on('sendReaction', (emoji) => {
    const found = rm.findPlayerRoom(socket.id)
    if (!found) return

    const player = found.room.players.find((p) => p.id === socket.id)
    if (!player) return

    // Реакции эфемерные — не сохраняем в room, просто бродкастим
    io.to(found.code).emit('reactionBroadcast', {
      playerId: socket.id,
      nickname: player.nickname,
      emoji,
    })
  })

  // ── чат ───────────────────────────────────────────────────────────────────

  socket.on('sendChat', (message) => {
    const found = rm.findPlayerRoom(socket.id)
    if (!found) return

    const player = found.room.players.find((p) => p.id === socket.id)
    if (!player) return

    const trimmed = message.trim().slice(0, 150)
    if (!trimmed) return

    io.to(found.code).emit('chatMessage', {
      playerId:  socket.id,
      nickname:  player.nickname,
      message:   trimmed,
      timestamp: Date.now(),
    })
  })

  // ── торговля активами ─────────────────────────────────────────────────────

  socket.on('proposeTradeOffer', (data) => {
    const found = rm.findPlayerRoom(socket.id)
    if (!found) return

    const result = ge.proposeTradeOffer(found.room, socket.id, data)
    if (isError(result)) { socket.emit('error', result); return }

    io.to(found.code).emit('roomUpdated', found.room)
  })

  socket.on('respondToTrade', (accept) => {
    const found = rm.findPlayerRoom(socket.id)
    if (!found) return

    const result = ge.respondToTrade(found.room, socket.id, accept)
    if (isError(result)) { socket.emit('error', result); return }

    io.to(found.code).emit('roomUpdated', found.room)
  })

  // ── дисконнект ────────────────────────────────────────────────────────────

  socket.on('disconnect', () => {
    console.log('- disconnected', socket.id)
    const found = rm.removePlayer(socket.id)
    if (found) io.to(found.code).emit('roomUpdated', found.room)
  })
})

const PORT = Number(process.env.PORT ?? 3001)
httpServer.listen(PORT, () => console.log(`server on :${PORT}`))
