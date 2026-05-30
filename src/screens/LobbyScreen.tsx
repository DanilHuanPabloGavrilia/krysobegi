import { useState } from 'react'
import { useSocketStore } from '../store/socketStore'

export default function LobbyScreen() {
  const { room, myPlayerId, kickPlayer, setReady, startGame, leaveRoom } = useSocketStore()
  const [copied, setCopied] = useState(false)

  if (!room) return null

  const me = room.players.find((p) => p.id === myPlayerId)
  const isHost = room.hostId === myPlayerId
  const allReady = room.players.length >= 2 && room.players.every((p) => p.isReady)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(room.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center px-10 py-4 border-b border-gray-800">
        <span className="font-bold text-lg">🐀 Крысиные бега</span>
        <button
          onClick={leaveRoom}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Выйти из комнаты
        </button>
      </header>

      <main className="flex-1 flex gap-8 p-10 max-w-4xl mx-auto w-full">
        {/* Левая колонка: список игроков */}
        <div className="flex-1 flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-gray-300">
            Игроки&nbsp;
            <span className="text-gray-500 font-normal">
              {room.players.length} / 6
            </span>
          </h2>

          <ul className="flex flex-col gap-3">
            {room.players.map((player) => (
              <li
                key={player.id}
                className={`flex items-center justify-between px-5 py-4 rounded-xl border ${
                  player.id === myPlayerId
                    ? 'bg-gray-800 border-blue-700'
                    : 'bg-gray-800 border-gray-700'
                }`}
              >
                {/* Имя + метки */}
                <div className="flex items-center gap-3">
                  <span
                    className={`text-lg ${player.isReady ? 'text-green-400' : 'text-gray-600'}`}
                  >
                    {player.isReady ? '✓' : '○'}
                  </span>
                  <span className="font-medium">{player.nickname}</span>
                  <div className="flex gap-1.5">
                    {player.id === room.hostId && (
                      <span className="text-[11px] px-2 py-0.5 bg-yellow-900/50 text-yellow-400 rounded-full">
                        хост
                      </span>
                    )}
                    {player.id === myPlayerId && (
                      <span className="text-[11px] px-2 py-0.5 bg-blue-900/50 text-blue-400 rounded-full">
                        вы
                      </span>
                    )}
                  </div>
                </div>

                {/* Кнопка кик (только хосту, не на себя) */}
                {isHost && player.id !== myPlayerId && (
                  <button
                    onClick={() => kickPlayer(player.id)}
                    className="text-xs text-gray-500 hover:text-red-400 px-3 py-1 rounded-lg hover:bg-red-900/20 transition-colors"
                  >
                    Кик
                  </button>
                )}
              </li>
            ))}
          </ul>

          {room.players.length < 2 && (
            <p className="text-gray-600 text-sm">
              Поделись кодом — нужен хотя бы один соперник
            </p>
          )}
        </div>

        {/* Правая колонка: код + действия */}
        <div className="w-64 flex flex-col gap-4 shrink-0">
          {/* Код комнаты */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">
              Код комнаты
            </p>
            <p className="text-5xl font-bold tracking-[0.25em] mb-4">{room.code}</p>
            <button
              onClick={handleCopy}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                copied
                  ? 'bg-green-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {copied ? '✓ Скопировано' : 'Скопировать'}
            </button>
          </div>

          {/* Кнопка «Готов» */}
          <button
            onClick={setReady}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
              me?.isReady
                ? 'bg-green-700 hover:bg-green-800 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            {me?.isReady ? '✓ Готов' : 'Готов'}
          </button>

          {/* Кнопка «Начать игру» — только хосту */}
          {isHost && (
            <button
              onClick={startGame}
              disabled={!allReady}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                allReady
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
              }`}
            >
              {allReady ? 'Начать игру →' : 'Ждём готовности...'}
            </button>
          )}

          {!isHost && (
            <p className="text-gray-600 text-xs text-center">
              Хост запустит игру когда все будут готовы
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
