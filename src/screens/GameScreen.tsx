import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocketStore } from '../store/socketStore'
import EventOverlay from '../components/EventOverlay'
import GameBoard, { BOARD_PX } from '../components/GameBoard'
import type { Player } from '../types/game'

// ── утилиты ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽'

function progress(player: Player): number {
  const { passiveIncome, expenses } = player.financeSheet
  if (expenses <= 0) return 100
  return Math.min(100, Math.floor((passiveIncome / expenses) * 100))
}

const CELL_LABELS: Record<string, string> = {
  bonus:       '🎁 Премия',
  start:       '🏁 Старт — конец месяца',
  vacation:    '🏖 Отпуск — пропуск хода',
  tax:         '🏛 Налоговая',
  luck:        '🍀 Удача',
  market:      '📈 Рынок',
  opportunity: '⭐ Возможность',
  bad_event:   '⚡ Неприятность',
}

// ── под-компоненты ────────────────────────────────────────────────────────────

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">{label}</span>
      <span className={`text-base font-bold ${accent ? 'text-green-400' : 'text-white'}`}>{value}</span>
    </div>
  )
}

function FinancePanel({ player }: { player: Player }) {
  const { financeSheet: fs, assets } = player
  const baseExpenses = fs.expenses - assets.reduce((s, a) => s + a.monthlyExpense, 0)

  return (
    <div className="shrink-0 border-r border-gray-800 p-3 overflow-y-auto flex flex-col gap-4" style={{ width: 200 }}>
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Финансовый лист</h3>

      {/* Доходы */}
      <div>
        <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5">Доходы</p>
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Зарплата</span>
            <span>{fmt(fs.salary)}</span>
          </div>
          {assets.filter(a => a.monthlyIncome > 0).map(a => (
            <div key={a.id} className="flex justify-between text-green-400/80">
              <span className="truncate max-w-[100px]">+ {a.name}</span>
              <span>{fmt(a.monthlyIncome)}</span>
            </div>
          ))}
          <div className="flex justify-between font-semibold border-t border-gray-800 pt-1 mt-0.5">
            <span className="text-gray-300">Итого</span>
            <span className="text-white">{fmt(fs.salary + fs.passiveIncome)}</span>
          </div>
        </div>
      </div>

      {/* Расходы */}
      <div>
        <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5">Расходы</p>
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Базовые</span>
            <span>{fmt(baseExpenses)}</span>
          </div>
          {assets.filter(a => a.monthlyExpense > 0).map(a => (
            <div key={a.id} className="flex justify-between text-red-400/80">
              <span className="truncate max-w-[100px]">+ {a.name}</span>
              <span>{fmt(a.monthlyExpense)}</span>
            </div>
          ))}
          <div className="flex justify-between font-semibold border-t border-gray-800 pt-1 mt-0.5">
            <span className="text-gray-300">Итого</span>
            <span className="text-white">{fmt(fs.expenses)}</span>
          </div>
        </div>
      </div>

      {/* Cash Flow */}
      <div className="bg-gray-800 rounded-lg p-3 text-center">
        <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Cash Flow / мес</p>
        <p className={`text-lg font-bold ${fs.cashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {fs.cashFlow >= 0 ? '+' : ''}{fmt(fs.cashFlow)}
        </p>
      </div>

      {/* Активы */}
      {assets.length > 0 && (
        <div>
          <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5">Активы ({assets.length})</p>
          <div className="flex flex-col gap-1.5">
            {assets.map(a => (
              <div key={a.id} className="text-[10px] bg-gray-800 rounded-md px-2 py-1.5">
                <p className="text-white font-medium truncate">{a.name}</p>
                <p className="text-gray-500">{fmt(a.monthlyIncome)}/мес</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PlayersPanel({
  players,
  currentIndex,
  myPlayerId,
}: {
  players: Player[]
  currentIndex: number
  myPlayerId: string | null
}) {
  return (
    <div className="shrink-0 border-l border-gray-800 p-4 flex flex-col gap-3 overflow-y-auto" style={{ width: 220 }}>
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Игроки</h3>
      {players.map((p, i) => {
        const pct       = progress(p)
        const isCurrent = i === currentIndex
        const isMe      = p.id === myPlayerId

        return (
          <div
            key={p.id}
            className={`rounded-xl p-2.5 flex flex-col gap-1.5 border ${
              isCurrent ? 'border-blue-700 bg-blue-900/10' : 'border-gray-800 bg-gray-800/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{p.roleId === 'doctor' ? '🩺' : p.roleId === 'it' ? '💻' : '📚'}</span>
                <span className="text-xs font-medium truncate max-w-[90px]">{p.nickname}</span>
              </div>
              <div className="flex gap-1">
                {isCurrent && <span className="text-[9px] px-1 py-0.5 bg-blue-700 rounded text-white">ход</span>}
                {isMe && <span className="text-[9px] px-1 py-0.5 bg-gray-700 rounded text-gray-300">вы</span>}
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pct >= 100 ? 'bg-yellow-400' : pct >= 60 ? 'bg-green-500' : pct >= 30 ? 'bg-blue-500' : 'bg-gray-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-gray-500">
                <span>{fmt(p.financeSheet.passiveIncome)}/мес</span>
                <span>{pct}%</span>
              </div>
            </div>

            <div className="text-[10px] text-gray-500">
              Наличные: <span className="text-gray-300">{fmt(p.financeSheet.cash)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── главный экран ─────────────────────────────────────────────────────────────

export default function GameScreen() {
  const navigate = useNavigate()
  const { room, myPlayerId, diceResult, rollDice, leaveRoom, winnerId } = useSocketStore()

  // ── масштаб игрового поля под доступную площадь ───────────────────────────
  const boardContainerRef = useRef<HTMLDivElement>(null)
  const [boardScale, setBoardScale] = useState(1)

  useEffect(() => {
    const el = boardContainerRef.current
    if (!el) return
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      const s = Math.min(width / BOARD_PX, height / BOARD_PX, 1)
      setBoardScale(Math.max(s, 0.3))
    }
    const ro = new ResizeObserver(update)
    ro.observe(el)
    update()
    return () => ro.disconnect()
  }, [])

  // ── задержка оверлея карточки — токен должен долететь до клетки ──────────
  const [overlayVisible, setOverlayVisible] = useState(false)
  useEffect(() => {
    if (room?.activeCard) {
      const t = setTimeout(() => setOverlayVisible(true), 650)
      return () => clearTimeout(t)
    }
    setOverlayVisible(false)
  }, [room?.activeCard?.id])

  // ── тост «конец месяца» — показывается всем игрокам ──────────────────────
  const prevMonthRef = useRef(0)
  const [monthToast, setMonthToast] = useState<string | null>(null)
  useEffect(() => {
    const cur = room?.monthNumber ?? 0
    if (cur > prevMonthRef.current && prevMonthRef.current > 0) {
      setMonthToast(`💰 Месяц ${cur} — зарплата начислена всем!`)
      const t = setTimeout(() => setMonthToast(null), 3500)
      return () => clearTimeout(t)
    }
    prevMonthRef.current = cur
  }, [room?.monthNumber])

  // ── навигация ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!room)                       navigate('/play')
    else if (room.phase === 'setup') navigate('/setup')
  }, [room, navigate])

  if (!room) return null

  const myPlayer     = room.players.find((p) => p.id === myPlayerId)
  const currentPlayer = room.players[room.currentPlayerIndex]
  const isMyTurn     = currentPlayer?.id === myPlayerId

  const handleLeave = () => { leaveRoom(); navigate('/play') }

  // ── победитель ─────────────────────────────────────────────────────────────
  if (winnerId) {
    const winner = room.players.find((p) => p.id === winnerId)
    return (
      <div className="h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-6">
        <div className="text-8xl">🏆</div>
        <h1 className="text-4xl font-bold">{winner?.nickname ?? 'Игрок'} вырвался на свободу!</h1>
        <p className="text-gray-400">Пассивный доход покрыл все расходы</p>
        <button onClick={handleLeave} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition-colors">
          В меню
        </button>
      </div>
    )
  }

  // ── дайс-чип (компактный) ─────────────────────────────────────────────────
  const diceEmoji = diceResult ? ['⚀','⚁','⚂','⚃','⚄','⚅'][diceResult.value - 1] : null
  const rollerName = diceResult?.playerId === myPlayerId
    ? 'Вы'
    : currentPlayer?.nickname ?? '...'

  return (
    <div className="h-screen overflow-hidden bg-gray-900 text-white flex flex-col select-none">

      {/* ── Тост «конец месяца» ──────────────────────────────────────────────── */}
      {monthToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-900/95 text-white px-6 py-3 rounded-xl border border-blue-600 text-sm font-semibold shadow-2xl pointer-events-none">
          {monthToast}
        </div>
      )}

      {/* ── Шапка ────────────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex justify-between items-center px-6 py-3 border-b border-gray-800">
        <span className="font-bold text-sm">🐀 Крысиные бега</span>
        <span className="text-gray-400 text-xs flex items-center gap-2">
          Комната <span className="text-white font-mono">{room.code}</span>
          {' '}· Месяц {room.monthNumber}
          {' '}· Ход {room.turnNumber}
          <span className="text-base ml-1" title={`Сезон: ${room.season}`}>
            {room.season === 'spring' ? '🌸' : room.season === 'summer' ? '☀️' : room.season === 'autumn' ? '🍂' : '❄️'}
          </span>
        </span>
        <button onClick={handleLeave} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          Выйти
        </button>
      </header>

      {/* ── Строка статов ─────────────────────────────────────────────────────── */}
      {myPlayer && (
        <div className="shrink-0 flex justify-center gap-12 px-8 py-2.5 bg-gray-800 border-b border-gray-700">
          <StatBox label="Наличные"   value={fmt(myPlayer.financeSheet.cash)} />
          <StatBox label="Пасс. доход" value={fmt(myPlayer.financeSheet.passiveIncome)} accent />
          <StatBox
            label="До свободы"
            value={
              myPlayer.financeSheet.passiveIncome >= myPlayer.financeSheet.expenses
                ? '🎉 Цель!'
                : '−' + fmt(myPlayer.financeSheet.expenses - myPlayer.financeSheet.passiveIncome) + '/мес'
            }
          />
        </div>
      )}

      {/* ── Основная зона: левая панель | поле | правая панель ──────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Финансовый лист */}
        {myPlayer && <FinancePanel player={myPlayer} />}

        {/* Игровое поле — масштабируется по размеру контейнера */}
        <div
          ref={boardContainerRef}
          className="flex-1 overflow-hidden flex items-center justify-center"
        >
          <div style={{ transform: `scale(${boardScale})`, transformOrigin: 'center center', flexShrink: 0 }}>
            <GameBoard
              players={room.players}
              currentPlayerIndex={room.currentPlayerIndex}
              myPlayerId={myPlayerId}
              season={room.season}
              turnNumber={room.turnNumber}
              monthNumber={room.monthNumber}
              isMyTurn={isMyTurn}
            />
          </div>
        </div>

        {/* Список игроков */}
        <PlayersPanel
          players={room.players}
          currentIndex={room.currentPlayerIndex}
          myPlayerId={myPlayerId}
        />
      </div>

      {/* ── Нижняя панель: результат броска + кнопка ─────────────────────────── */}
      <div className="shrink-0 h-[70px] border-t border-gray-800 flex items-center justify-center gap-5 px-6 bg-gray-900">

        {/* Результат кубика */}
        {diceResult && diceEmoji && (
          <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-2 border border-gray-700">
            <span className="text-3xl">{diceEmoji}</span>
            <div className="flex flex-col gap-0.5">
              <p className="text-gray-300 text-xs leading-snug">
                <span className="text-white font-medium">{rollerName}</span>
                {' '}→ {CELL_LABELS[diceResult.cellType] ?? diceResult.cellType}
                {diceResult.monthEnd && (
                  <span className="text-blue-400 ml-1">· 🗓 Конец месяца!</span>
                )}
              </p>
              {diceResult.cashDelta !== undefined && diceResult.cashDelta !== 0 && (
                <p className={`text-xs font-bold ${diceResult.cashDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {diceResult.cashDelta > 0 ? '+' : ''}{diceResult.cashDelta.toLocaleString('ru-RU')} ₽
                </p>
              )}
            </div>
          </div>
        )}

        {/* Кнопка броска */}
        <button
          onClick={rollDice}
          disabled={!isMyTurn || room.turnPhase !== 'rolling'}
          className={`px-10 py-3 rounded-xl text-lg font-bold transition-all ${
            isMyTurn && room.turnPhase === 'rolling'
              ? 'bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-900/40'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
          }`}
        >
          🎲 Бросить кубик
        </button>

        {!isMyTurn && room.turnPhase === 'card' && (
          <p className="text-gray-600 text-xs">Ожидаем решения игрока...</p>
        )}
      </div>

      {/* ── Уведомления о событиях конца месяца (бизнес/акции) ──────────────── */}
      {room.lastRollNotifications && room.lastRollNotifications.length > 0 && (
        <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-1 max-w-xs pointer-events-none">
          {room.lastRollNotifications.slice(0, 4).map((n, i) => (
            <div
              key={i}
              className="bg-amber-950/90 text-amber-200 text-[10px] px-3 py-1.5 rounded-lg border border-amber-800/50 shadow-lg leading-tight"
            >
              {n}
            </div>
          ))}
        </div>
      )}

      {/* ── Оверлей карточки (появляется через 650 мс после броска) ─────────── */}
      {room.activeCard && overlayVisible && (
        <EventOverlay card={room.activeCard} isMyTurn={isMyTurn} myPlayer={myPlayer} />
      )}
    </div>
  )
}
