import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocketStore } from '../store/socketStore'
import { ROLES } from '../data/roles'
import type { RoleId, PlayerGoal, PlayerSetup } from '../types/game'
import {
  BASE_LIVING_EXPENSE, KIDS_EXPENSE, CAR_EXPENSE,
  MORTGAGE_EXPENSE, DEFAULT_RENT_EXPENSE,
} from '../data/constants'

const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽'

const GOALS: { id: PlayerGoal; label: string; emoji: string }[] = [
  { id: 'car',               label: 'Машина',            emoji: '🚗' },
  { id: 'travel',            label: 'Путешествие',       emoji: '✈️' },
  { id: 'renovation',        label: 'Ремонт',            emoji: '🔨' },
  { id: 'financial_freedom', label: 'Финансовая свобода',emoji: '🏝' },
  { id: 'apartment',         label: 'Квартира',          emoji: '🏢' },
  { id: 'business',          label: 'Бизнес',            emoji: '💼' },
]

export default function SetupScreen() {
  const navigate = useNavigate()
  const { room, myPlayerId, submitSetup } = useSocketStore()

  const [role, setRole]                   = useState<RoleId>('teacher')
  const [goal, setGoal]                   = useState<PlayerGoal>('financial_freedom')
  const [startCashStr, setStartCashStr]   = useState('0')
  const [hasKids, setHasKids]             = useState(false)
  const [hasCar, setHasCar]               = useState(false)
  const [hasMortgage, setHasMortgage]     = useState(false)
  const [submitted, setSubmitted]         = useState(false)

  // Редирект если нет комнаты или игра уже идёт
  useEffect(() => {
    if (!room) { navigate('/play'); return }
    if (room.phase === 'playing') navigate('/game')
  }, [room, navigate])

  if (!room) return null

  const myPlayer = room.players.find((p) => p.id === myPlayerId)
  // Если этот игрок уже сдал настройку — показываем ожидание
  if (myPlayer?.isReady || submitted) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center flex flex-col gap-6 w-80">
          <div className="text-5xl">⏳</div>
          <h2 className="text-2xl font-bold">Ожидаем остальных...</h2>
          <div className="flex flex-col gap-2">
            {room.players.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-2 text-sm">
                <span>{p.nickname}</span>
                <span className={p.isReady ? 'text-green-400' : 'text-gray-500'}>
                  {p.isReady ? '✓ Готов' : '⌛ Настраивает...'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Расчёт расходов
  const selectedRole = ROLES.find((r) => r.id === role)!
  const rentOrMortgage = hasMortgage ? MORTGAGE_EXPENSE : DEFAULT_RENT_EXPENSE
  const totalExpenses =
    BASE_LIVING_EXPENSE +
    rentOrMortgage +
    (hasKids ? KIDS_EXPENSE : 0) +
    (hasCar   ? CAR_EXPENSE   : 0)
  const startCash  = Math.min(Math.max(parseInt(startCashStr, 10) || 0, 0), 2_000_000)
  const cashFlow   = selectedRole.salary - totalExpenses

  const handleSubmit = () => {
    const setup: PlayerSetup = {
      role,
      goal,
      startCash,
      hasKids,
      hasCar,
      hasMortgage,
      rentExpense: hasMortgage ? 0 : DEFAULT_RENT_EXPENSE,
    }
    submitSetup(setup)
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-y-auto">
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-800 shrink-0">
        <span className="font-bold">🐀 Крысиные бега</span>
        <span className="text-gray-400 text-sm">
          Комната <span className="text-white font-mono">{room.code}</span>
          {' '}· Настройте персонажа
        </span>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* ── Выбор роли ─────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Профессия</h2>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`rounded-xl p-5 border text-left transition-all ${
                  role === r.id
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-700 bg-gray-800/40 hover:border-gray-500'
                }`}
              >
                <div className="text-3xl mb-2">{r.emoji}</div>
                <div className="font-semibold text-white">{r.name}</div>
                <div className="text-green-400 text-sm mt-1">{fmt(r.salary)}/мес</div>
                <div className="text-xs text-gray-500 mt-2 leading-relaxed">
                  {r.passivePerks[0]}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Выбор цели (атмосфера) ─────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
            Мечта <span className="text-gray-600 normal-case">(только для настроения)</span>
          </h2>
          <div className="grid grid-cols-6 gap-3">
            {GOALS.map((g) => (
              <button
                key={g.id}
                onClick={() => setGoal(g.id)}
                className={`rounded-xl py-4 flex flex-col items-center gap-2 border transition-all text-sm ${
                  goal === g.id
                    ? 'border-yellow-500 bg-yellow-900/20 text-yellow-300'
                    : 'border-gray-700 bg-gray-800/40 text-gray-400 hover:border-gray-500'
                }`}
              >
                <span className="text-2xl">{g.emoji}</span>
                <span className="font-medium">{g.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Финансовая настройка ───────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Ваша ситуация</h2>
          <div className="grid grid-cols-2 gap-6">

            {/* Стартовый капитал */}
            <div className="bg-gray-800/40 rounded-xl p-5 border border-gray-700">
              <label className="block text-sm text-gray-400 mb-2">Стартовые наличные</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={2_000_000}
                  step={10_000}
                  value={startCashStr}
                  onChange={(e) => setStartCashStr(e.target.value)}
                  className="flex-1 bg-gray-700 rounded-lg px-4 py-2 text-right text-lg font-mono outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400">₽</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">от 0 до 2 000 000 ₽</p>
            </div>

            {/* Обязательства */}
            <div className="bg-gray-800/40 rounded-xl p-5 border border-gray-700 flex flex-col gap-3">
              <p className="text-sm text-gray-400 mb-1">Обязательства</p>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">
                  Есть ипотека
                  <span className="text-red-400 text-xs ml-2">+{fmt(MORTGAGE_EXPENSE)}/мес</span>
                </span>
                <input type="checkbox" checked={hasMortgage}
                  onChange={(e) => setHasMortgage(e.target.checked)}
                  className="w-4 h-4 accent-blue-500" />
              </label>

              {!hasMortgage && (
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">
                    Аренда жилья
                    <span className="text-red-400 text-xs ml-2">+{fmt(DEFAULT_RENT_EXPENSE)}/мес</span>
                  </span>
                  <input type="checkbox" checked={true} readOnly
                    className="w-4 h-4 accent-gray-400" />
                </label>
              )}

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">
                  Есть дети
                  <span className="text-red-400 text-xs ml-2">+{fmt(KIDS_EXPENSE)}/мес</span>
                </span>
                <input type="checkbox" checked={hasKids}
                  onChange={(e) => setHasKids(e.target.checked)}
                  className="w-4 h-4 accent-blue-500" />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">
                  Есть машина
                  <span className="text-red-400 text-xs ml-2">+{fmt(CAR_EXPENSE)}/мес</span>
                </span>
                <input type="checkbox" checked={hasCar}
                  onChange={(e) => setHasCar(e.target.checked)}
                  className="w-4 h-4 accent-blue-500" />
              </label>
            </div>
          </div>
        </section>

        {/* ── Итоговый финансовый лист ───────────────────────────────────── */}
        <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Стартовый финансовый лист</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Зарплата</span>
              <span className="text-white font-medium">{fmt(selectedRole.salary)}/мес</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Наличные</span>
              <span className="text-white font-medium">{fmt(startCash)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Базовые расходы</span>
              <span className="text-red-400">−{fmt(BASE_LIVING_EXPENSE)}/мес</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{hasMortgage ? 'Ипотека' : 'Аренда'}</span>
              <span className="text-red-400">−{fmt(rentOrMortgage)}/мес</span>
            </div>

            {hasKids && (
              <div className="flex justify-between">
                <span className="text-gray-400">Дети</span>
                <span className="text-red-400">−{fmt(KIDS_EXPENSE)}/мес</span>
              </div>
            )}
            {hasCar && (
              <div className="flex justify-between">
                <span className="text-gray-400">Машина</span>
                <span className="text-red-400">−{fmt(CAR_EXPENSE)}/мес</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
            <span className="text-gray-400">Cash Flow</span>
            <span className={`text-2xl font-bold ${cashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {cashFlow >= 0 ? '+' : ''}{fmt(cashFlow)}/мес
            </span>
          </div>

          <p className="text-xs text-gray-600 mt-3">
            Победа: пассивный доход ≥ {fmt(totalExpenses)}/мес (расходов)
          </p>
        </section>

        {/* ── Кнопка ────────────────────────────────────────────────────── */}
        <button
          onClick={handleSubmit}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] rounded-xl text-lg font-bold transition-all shadow-lg shadow-blue-900/40"
        >
          Готов — начать игру →
        </button>
      </div>
    </div>
  )
}
