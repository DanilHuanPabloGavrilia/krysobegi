import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocketStore } from '../store/socketStore'
import LobbyScreen from './LobbyScreen'

type Mode = 'menu' | 'joining'

export default function PlayScreen() {
  const [mode, setMode] = useState<Mode>('menu')
  const [joinCode, setJoinCode] = useState('')
  const [nicknameInput, setNicknameInput] = useState('')
  const [nickname, setNickname] = useState(() => localStorage.getItem('nickname') ?? '')
  const navigate = useNavigate()

  const { connect, createRoom, joinRoom, room, gameStarted, error, clearError } = useSocketStore()

  useEffect(() => {
    if (gameStarted || room?.phase === 'setup') navigate('/setup')
  }, [gameStarted, room?.phase, navigate])

  const handleSetNickname = () => {
    const name = nicknameInput.trim()
    if (!name) return
    localStorage.setItem('nickname', name)
    setNickname(name)
  }

  const handleCreate = () => {
    connect()
    createRoom(nickname)
  }

  const handleJoin = () => {
    if (joinCode.trim().length < 4) return
    clearError()
    connect()
    joinRoom(joinCode.trim().toUpperCase(), nickname)
  }

  const handleChangeName = () => {
    localStorage.removeItem('nickname')
    setNickname('')
    setNicknameInput('')
    setMode('menu')
  }

  if (room && !gameStarted) return <LobbyScreen />

  // ── Нет никнейма — просим ввести ──────────────────────────────────────────
  if (!nickname) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 w-80">
          <div className="text-center">
            <div className="text-5xl mb-4">🐀</div>
            <h1 className="text-3xl font-bold">Крысиные бега</h1>
            <p className="text-gray-400 mt-2 text-sm">Введите имя, чтобы начать</p>
          </div>
          <input
            className="w-full bg-gray-700 rounded-xl px-5 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ваше имя"
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
            maxLength={20}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSetNickname()}
          />
          <button
            onClick={handleSetNickname}
            disabled={!nicknameInput.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold text-lg transition-colors"
          >
            Играть →
          </button>
        </div>
      </div>
    )
  }

  // ── Основное меню ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="flex justify-between items-center px-12 py-5 border-b border-gray-800">
        <span className="font-bold text-lg">🐀 Крысиные бега</span>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{nickname}</span>
          <button
            onClick={handleChangeName}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Сменить имя
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Привет, {nickname}!</h1>
          <p className="text-gray-400">Создай комнату или войди по коду друга.</p>
        </div>

        {mode === 'menu' && (
          <div className="flex gap-4">
            <button
              onClick={handleCreate}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-lg transition-colors"
            >
              Создать комнату
            </button>
            <button
              onClick={() => { clearError(); setMode('joining') }}
              className="px-8 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold text-lg transition-colors"
            >
              Войти по коду
            </button>
          </div>
        )}

        {mode === 'joining' && (
          <div className="flex flex-col items-center gap-4">
            <input
              className="bg-gray-700 rounded-xl px-6 py-4 text-center text-3xl tracking-[0.4em] w-52 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              placeholder="0000"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
              maxLength={4}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            <div className="flex gap-3">
              <button
                onClick={handleJoin}
                disabled={joinCode.length < 4}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
              >
                Войти
              </button>
              <button
                onClick={() => { setMode('menu'); setJoinCode(''); clearError() }}
                className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold transition-colors"
              >
                Назад
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>
        )}
      </main>
    </div>
  )
}
