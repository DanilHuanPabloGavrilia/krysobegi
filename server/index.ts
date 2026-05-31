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

// В продакшне отдаём собранный фронтенд
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

    // Переходим в фазу setup — initializeGame вызывается после сдачи всех настроек
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

      console.log(`[${found.code}] submitSetup от ${socket.id}, готовы: ${found.room.players.filter(p=>p.isReady).length}/${found.room.players.length}`)
      io.to(found.code).emit('roomUpdated', found.room)

      // Все игроки сдали настройки → инициализируем и запускаем игру
      if (found.room.players.every((p) => p.isReady)) {
        console.log(`[${found.code}] все готовы — запускаем initializeGame`)
        ge.initializeGame(found.room)
        console.log(`[${found.code}] initializeGame ОК, phase=${found.room.phase}`)
        io.to(found.code).emit('roomUpdated', found.room)
        console.log(`[${found.code}] игра началась!`)
      }
    } catch (err) {
      console.error('submitSetup crash:', err)
      socket.emit('error', 'Ошибка при запуске игры: ' + String(err))
    }
  })

  // ── игра ─────────────────────────────────────────────────────────────────

  socket.on('rollDice', () => {
    const found = rm.findPlayerRoom(socket.id)
    if (!found) return

    const result = ge.rollDice(found.room, socket.id)
    if (isError(result)) { socket.emit('error', result); return }

    io.to(found.code).emit('diceRolled', {
      playerId:  socket.id,
      value:     result.dice,
      cellType:  result.cellType as import('../src/types/game').CardType,
      cashDelta: result.cashDelta,
      monthEnd:  result.monthEnd,
    })
    io.to(found.code).emit('roomUpdated', found.room)
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

  // ── дисконнект ────────────────────────────────────────────────────────────

  socket.on('disconnect', () => {
    console.log('- disconnected', socket.id)
    const found = rm.removePlayer(socket.id)
    if (found) io.to(found.code).emit('roomUpdated', found.room)
  })
})

const PORT = Number(process.env.PORT ?? 3001)
httpServer.listen(PORT, () => console.log(`server on :${PORT}`))
