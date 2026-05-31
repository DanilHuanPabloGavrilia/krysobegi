import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocketStore } from '../store/socketStore'
import EventOverlay from '../components/EventOverlay'
import GameBoard, { BOARD_PX } from '../components/GameBoard'
import { sounds } from '../utils/sounds'
import type { Player, Asset, TradeOffer, MarketEventResult } from '../types/game'

// ── утилиты ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽'

function progress(player: Player): number {
  const { passiveIncome, expenses } = player.financeSheet
  if (expenses <= 0) return 100
  return Math.min(100, Math.floor((passiveIncome / expenses) * 100))
}

function roleEmoji(roleId: string | null): string {
  switch (roleId) {
    case 'doctor':       return '🩺'
    case 'it':           return '💻'
    case 'teacher':      return '📚'
    case 'entrepreneur': return '🚀'
    default:             return '👤'
  }
}

const CELL_LABELS: Record<string, string> = {
  bonus:        '🎁 Премия',
  start:        '🏁 Старт — конец месяца',
  vacation:     '🏖 Отпуск — пропуск хода',
  tax:          '🏛 Налоговая',
  luck:         '🍀 Удача',
  market:       '📈 Рынок',
  market_news:  '📰 Рыночная новость',
  doodad:       '🛒 Lifestyle-трата',
  opportunity:  '⭐ Возможность',
  bad_event:    '⚡ Неприятность',
}

// ── типы анимаций ─────────────────────────────────────────────────────────────

interface CashAnim { id: string; amount: number }

// ── финансовая панель ─────────────────────────────────────────────────────────

interface FinancePanelProps {
  player: Player
  myPlayerId: string | null
  otherPlayers: Player[]
  onSellAsset: (assetId: string, assetName: string, sellValue: number) => void
  onProposeTradeOffer: (assetId: string, assetName: string) => void
  onTakeLoan: () => void
  onRepayLoan: (loanId: string, repayAmount: number) => void
  marketPrices: Record<string, number>
}

function FinancePanel({
  player,
  otherPlayers,
  onSellAsset,
  onProposeTradeOffer,
  onTakeLoan,
  onRepayLoan,
  marketPrices,
}: FinancePanelProps) {
  const { financeSheet: fs, assets, loans } = player

  const baseExpenses = fs.expenses
    - assets.reduce((s, a) => s + a.monthlyExpense, 0)
    - (loans ?? []).reduce((s, l) => s + l.monthlyPayment, 0)

  function getSellValue(asset: Asset): number {
    if (asset.type === 'stock' || asset.type === 'crypto') {
      return Math.round(
        (asset.shares ?? 0) *
        (marketPrices[asset.stockId ?? ''] ?? asset.costPerShare ?? 0) *
        (asset.sellBackPercent ?? 100) / 100
      )
    }
    return Math.round(asset.cost * (asset.sellBackPercent ?? 100) / 100)
  }

  return (
    <div className="shrink-0 border-r border-gray-800 p-3 overflow-y-auto flex flex-col gap-4" style={{ width: 200 }}>
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Финансовый лист</h3>

      {/* Доходы */}
      <div>
        <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5">Доходы</p>
        <div className="flex flex-col gap-1 text-xs">
          {fs.salary > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Зарплата</span>
              <span>{fmt(fs.salary)}</span>
            </div>
          )}
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
          {(loans ?? []).map(l => (
            <div key={l.id} className="flex justify-between text-orange-400/80">
              <span className="truncate max-w-[100px]">💳 {l.name}</span>
              <span>{fmt(l.monthlyPayment)}</span>
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
            {assets.map(a => {
              const canSell = a.canSell && a.status !== 'closing'
              const sellVal = canSell ? getSellValue(a) : 0
              return (
                <div key={a.id} className="text-[10px] bg-gray-800 rounded-md px-2 py-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`font-medium truncate ${a.status === 'closing' ? 'text-red-400' : 'text-white'}`}>
                      {a.status === 'closing' ? '🔴 ' : ''}{a.name}
                    </p>
                    {canSell && otherPlayers.length > 0 && (
                      <button
                        onClick={() => onProposeTradeOffer(a.id, a.name)}
                        title="Предложить обмен"
                        className="text-[9px] text-purple-400 hover:text-purple-300 shrink-0"
                      >
                        🤝
                      </button>
                    )}
                  </div>
                  <p className="text-gray-500">{fmt(a.monthlyIncome)}/мес</p>
                  {canSell && (
                    <button
                      onClick={() => onSellAsset(a.id, a.name, sellVal)}
                      className="mt-1 w-full text-[9px] bg-gray-700 hover:bg-gray-600 rounded px-1 py-0.5 text-gray-300 transition-colors"
                    >
                      Продать · {fmt(sellVal)}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Кредиты */}
      {(loans ?? []).length > 0 && (
        <div>
          <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5">Кредиты</p>
          <div className="flex flex-col gap-1.5">
            {(loans ?? []).map(l => {
              const repayAmount = Math.round(l.monthlyPayment * l.turnsLeft * 0.9)
              const canRepay = player.financeSheet.cash >= repayAmount
              return (
                <div key={l.id} className="text-[10px] bg-orange-950/40 border border-orange-800/40 rounded-md px-2 py-1.5">
                  <p className="text-orange-300 font-medium truncate">💳 {l.name}</p>
                  <p className="text-gray-500">{l.turnsLeft} мес. ост.</p>
                  <button
                    disabled={!canRepay}
                    onClick={() => onRepayLoan(l.id, repayAmount)}
                    title={canRepay ? `Погасить досрочно — ${fmt(repayAmount)}` : 'Недостаточно средств'}
                    className={`mt-1 w-full text-[9px] rounded px-1 py-0.5 transition-colors ${
                      canRepay
                        ? 'bg-orange-800 hover:bg-orange-700 text-white'
                        : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    Погасить · {fmt(repayAmount)}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Взять кредит */}
      <button
        onClick={onTakeLoan}
        className="mt-auto text-[10px] bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-2 py-2 text-orange-400 transition-colors"
      >
        💳 Взять кредит
      </button>
    </div>
  )
}

// ── панель игроков ────────────────────────────────────────────────────────────

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
                <span className="text-sm">{roleEmoji(p.roleId)}</span>
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

            {/* Значок кредита */}
            {(p.loans ?? []).length > 0 && (
              <div className="text-[9px] text-orange-400/70">
                💳 {p.loans.length} кред.
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── StatBox ───────────────────────────────────────────────────────────────────

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">{label}</span>
      <span className={`text-base font-bold ${accent ? 'text-green-400' : 'text-white'}`}>{value}</span>
    </div>
  )
}

// ── Меню кредитов ─────────────────────────────────────────────────────────────

function LoanMenu({
  playerCash,
  onTake,
  onClose,
}: {
  playerCash: number
  onTake: (tier: 'small' | 'medium' | 'large') => void
  onClose: () => void
}) {
  const tiers = [
    { id: 'small'  as const, name: 'Мини-кредит',    amount: 100_000, payment: 12_000, turns: 10, color: 'text-green-400' },
    { id: 'medium' as const, name: 'Кредит',          amount: 300_000, payment: 35_000, turns: 10, color: 'text-yellow-400' },
    { id: 'large'  as const, name: 'Большой кредит',  amount: 600_000, payment: 75_000, turns: 10, color: 'text-red-400' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-orange-700 rounded-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-1">💳 Взять кредит</h2>
        <p className="text-gray-500 text-sm mb-5">10 месяцев · Досрочное погашение со скидкой 10%</p>
        <div className="flex flex-col gap-3">
          {tiers.map(t => (
            <button
              key={t.id}
              onClick={() => { onTake(t.id); onClose() }}
              className="flex items-center justify-between bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-4 py-3 transition-colors"
            >
              <div className="text-left">
                <p className={`font-semibold ${t.color}`}>{t.name}</p>
                <p className="text-xs text-gray-500">{fmt(t.payment)}/мес × 10 мес.</p>
              </div>
              <span className="text-lg font-bold text-white">+{fmt(t.amount)}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-4 text-center">У вас наличных: {fmt(playerCash)}</p>
        <button onClick={onClose} className="mt-4 w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-gray-400 transition-colors">
          Закрыть
        </button>
      </div>
    </div>
  )
}

// ── Модальное окно предложения обмена ─────────────────────────────────────────

function TradeProposalModal({
  assetName,
  otherPlayers,
  onPropose,
  onClose,
}: {
  assetName: string
  otherPlayers: Player[]
  onPropose: (targetPlayerId: string, price: number) => void
  onClose: () => void
}) {
  const [targetId, setTargetId] = useState(otherPlayers[0]?.id ?? '')
  const [priceStr, setPriceStr] = useState('0')

  const price = Math.max(0, parseInt(priceStr, 10) || 0)
  const target = otherPlayers.find(p => p.id === targetId)
  const canAfford = (target?.financeSheet.cash ?? 0) >= price

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-purple-700 rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-1">🤝 Предложение обмена</h2>
        <p className="text-gray-400 text-sm mb-5">Актив: <span className="text-white font-medium">{assetName}</span></p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">Кому предложить</label>
            <select
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              {otherPlayers.map(p => (
                <option key={p.id} value={p.id}>
                  {roleEmoji(p.roleId)} {p.nickname} · {fmt(p.financeSheet.cash)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">Цена продажи</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                step={10_000}
                value={priceStr}
                onChange={e => setPriceStr(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-right font-mono text-sm text-white"
              />
              <span className="self-center text-gray-400">₽</span>
            </div>
            {target && (
              <p className={`text-xs mt-1 ${canAfford ? 'text-gray-500' : 'text-red-400'}`}>
                У {target.nickname}: {fmt(target.financeSheet.cash)} {!canAfford && '— не хватит'}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            disabled={!targetId || !canAfford}
            onClick={() => { onPropose(targetId, price); onClose() }}
            className="flex-1 py-3 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
          >
            Отправить предложение
          </button>
          <button onClick={onClose} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold transition-colors">
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Оверлей предложения торговли (для целевого игрока) ────────────────────────

function TradeOfferOverlay({
  offer,
  isTarget,
  myCash,
  onRespond,
}: {
  offer: TradeOffer
  isTarget: boolean
  myCash: number
  onRespond: (accept: boolean) => void
}) {
  const [timeLeft, setTimeLeft] = useState(30)
  const canAfford = myCash >= offer.price

  useEffect(() => {
    if (!isTarget) return
    const secsLeft = Math.max(0, Math.ceil((offer.expiresAt - Date.now()) / 1000))
    setTimeLeft(secsLeft)

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          onRespond(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [offer.id, isTarget])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-purple-700 rounded-2xl p-8 w-full max-w-lg mx-4 flex flex-col gap-5"
        style={{ animation: 'pulseBorder 2s infinite' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-2 block">
              🤝 Предложение обмена
            </span>
            <h2 className="text-2xl font-bold">{offer.fromNickname} хочет продать</h2>
            <p className="text-gray-400 mt-1">{offer.assetName}</p>
          </div>
          {isTarget && (
            <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 ${
              timeLeft <= 10 ? 'border-red-500 text-red-400' : 'border-purple-600 text-purple-300'
            }`}>
              {timeLeft}
            </div>
          )}
        </div>

        <div className="bg-purple-900/20 rounded-xl p-4 flex justify-between text-sm">
          <span className="text-gray-400">Цена</span>
          <span className="font-bold text-white">{fmt(offer.price)}</span>
        </div>

        {isTarget ? (
          <>
            <div className="flex justify-between text-sm text-gray-500">
              <span>У вас наличных</span>
              <span className={canAfford ? 'text-white' : 'text-red-400'}>{fmt(myCash)}</span>
            </div>
            <div className="flex gap-3">
              <button
                disabled={!canAfford}
                onClick={() => onRespond(true)}
                className="flex-1 py-3 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
              >
                {canAfford ? 'Принять' : 'Нет средств'}
              </button>
              <button
                onClick={() => onRespond(false)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold transition-colors"
              >
                Отклонить
              </button>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-500 text-sm py-2">
            Ожидаем решения {offer.toPlayerId === offer.fromPlayerId ? 'игрока' : 'покупателя'}...
          </p>
        )}
      </div>
    </div>
  )
}

// ── Глобальный рыночный оверлей ────────────────────────────────────────────────
// Видят ВСЕ игроки одновременно — как в настоящем Cashflow

function MarketEventOverlay({
  result,
  onDismiss,
}: {
  result: MarketEventResult
  onDismiss: () => void
}) {
  const { event, impacts } = result
  const affected = impacts.filter((i) => i.incomeDelta !== 0)

  // Авто-закрытие через 8 секунд
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000)
    return () => clearTimeout(t)
  }, [event.id])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="bg-gray-900 border-2 border-sky-500 rounded-2xl p-8 w-full max-w-lg mx-4 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 0 40px rgba(56, 189, 248, 0.3)' }}
      >
        {/* Шапка */}
        <div className="text-center">
          <div className="text-5xl mb-2">{event.emoji}</div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1">
            📰 Рыночная новость
          </p>
          <h2 className="text-2xl font-bold text-white">{event.title}</h2>
          <p className="text-gray-400 text-sm mt-1">{event.description}</p>
        </div>

        {/* Новостной флеш */}
        <div className="bg-sky-950/60 border border-sky-700/50 rounded-xl px-4 py-3 text-center">
          <p className="text-sky-200 font-semibold text-sm">{event.newsFlash}</p>
        </div>

        {/* Влияние на игроков */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest text-gray-600">Влияние на портфели</p>
          {affected.length === 0 ? (
            <p className="text-gray-500 text-sm text-center">Ни у кого нет затронутых активов</p>
          ) : (
            affected.map((imp) => (
              <div key={imp.playerId} className="flex justify-between items-center bg-gray-800 rounded-lg px-3 py-2 text-sm">
                <span className="text-gray-300">{imp.nickname}</span>
                <span className={`font-bold ${imp.incomeDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {imp.incomeDelta > 0 ? '+' : ''}{imp.incomeDelta.toLocaleString('ru-RU')} ₽/мес
                </span>
              </div>
            ))
          )}
          {impacts.filter((i) => i.incomeDelta === 0).map((imp) => (
            <div key={imp.playerId} className="flex justify-between items-center opacity-40 px-3 py-1 text-xs">
              <span className="text-gray-400">{imp.nickname}</span>
              <span className="text-gray-500">нет активов</span>
            </div>
          ))}
        </div>

        <button
          onClick={onDismiss}
          className="mt-2 w-full py-2.5 bg-sky-700 hover:bg-sky-600 rounded-xl font-semibold transition-colors text-sm"
        >
          Понятно
        </button>
      </div>
    </div>
  )
}

// ── Экран победителя ──────────────────────────────────────────────────────────

function WinnerScreen({
  winner,
  allPlayers,
  onLeave,
}: {
  winner: Player
  allPlayers: Player[]
  onLeave: () => void
}) {
  const sorted = [...allPlayers].sort((a, b) => {
    if (a.id === winner.id) return -1
    if (b.id === winner.id) return 1
    return b.financeSheet.passiveIncome - a.financeSheet.passiveIncome
  })

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-8xl">🏆</div>
      <h1 className="text-4xl font-bold text-center">{winner.nickname} вырвался на свободу!</h1>
      <p className="text-gray-400">Пассивный доход покрыл все расходы</p>

      {/* Таблица итогов */}
      <div className="w-full max-w-lg bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
        <div className="grid grid-cols-4 text-[10px] uppercase tracking-widest text-gray-500 px-4 py-2 border-b border-gray-700">
          <span>#</span>
          <span>Игрок</span>
          <span className="text-right">Пасс. доход</span>
          <span className="text-right">Наличные</span>
        </div>
        {sorted.map((p, i) => (
          <div key={p.id} className={`grid grid-cols-4 px-4 py-3 text-sm ${
            p.id === winner.id ? 'bg-yellow-900/20 border-l-4 border-yellow-400' : ''
          }`}>
            <span className="text-gray-400">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`}</span>
            <span className="flex items-center gap-1">
              <span>{roleEmoji(p.roleId)}</span>
              <span className="truncate">{p.nickname}</span>
            </span>
            <span className={`text-right ${p.financeSheet.passiveIncome > 0 ? 'text-green-400' : 'text-gray-500'}`}>
              {fmt(p.financeSheet.passiveIncome)}/мес
            </span>
            <span className="text-right text-gray-300">{fmt(p.financeSheet.cash)}</span>
          </div>
        ))}
      </div>

      <button onClick={onLeave} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition-colors">
        В меню
      </button>
    </div>
  )
}

// ── Чат ───────────────────────────────────────────────────────────────────────

function ChatPanel({
  messages,
  myPlayerId,
  onSend,
  onClose,
}: {
  messages: import('../store/socketStore').ChatMessage[]
  myPlayerId: string | null
  onSend: (msg: string) => void
  onClose: () => void
}) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = () => {
    if (!input.trim()) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <div
      className="fixed bottom-20 right-4 z-40 w-72 bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
      style={{ animation: 'slideInRight 0.2s ease-out' }}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">💬 Чат</span>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-400 text-sm">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 max-h-48">
        {messages.length === 0 && (
          <p className="text-xs text-gray-600 text-center mt-4">Здесь пока тихо...</p>
        )}
        {messages.map(m => (
          <div key={m.id} className={`text-xs ${m.playerId === myPlayerId ? 'text-right' : ''}`}>
            {m.playerId !== myPlayerId && (
              <span className="text-gray-500 block mb-0.5">{m.nickname}</span>
            )}
            <span className={`inline-block px-2.5 py-1.5 rounded-xl max-w-[90%] text-left ${
              m.playerId === myPlayerId
                ? 'bg-blue-700 text-white'
                : 'bg-gray-800 text-gray-200'
            }`}>
              {m.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 p-2 border-t border-gray-800">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Написать..."
          maxLength={150}
          className="flex-1 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg text-xs font-medium transition-colors"
        >
          →
        </button>
      </div>
    </div>
  )
}

// ── Главный экран игры ────────────────────────────────────────────────────────

export default function GameScreen() {
  const navigate = useNavigate()
  const {
    room, myPlayerId, diceResult, rollDice, leaveRoom, winnerId,
    reactions, chatMessages, lastMarketEvent,
    sellAsset, takeLoan, repayLoan, sendReaction, sendChat,
    proposeTradeOffer, respondToTrade,
  } = useSocketStore()

  // ── масштаб поля ──────────────────────────────────────────────────────────
  const boardContainerRef = useRef<HTMLDivElement>(null)
  const [boardScale, setBoardScale] = useState(1)

  useEffect(() => {
    const el = boardContainerRef.current
    if (!el) return
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      setBoardScale(Math.max(Math.min(width / BOARD_PX, height / BOARD_PX, 1), 0.3))
    }
    const ro = new ResizeObserver(update)
    ro.observe(el)
    update()
    return () => ro.disconnect()
  }, [])

  // ── задержка оверлея карточки ─────────────────────────────────────────────
  const [overlayVisible, setOverlayVisible] = useState(false)
  useEffect(() => {
    if (room?.activeCard) {
      const t = setTimeout(() => setOverlayVisible(true), 650)
      return () => clearTimeout(t)
    }
    setOverlayVisible(false)
  }, [room?.activeCard?.id])

  // ── тост «конец месяца» ───────────────────────────────────────────────────
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

  // ── анимация изменения денег ──────────────────────────────────────────────
  const [cashAnims, setCashAnims] = useState<CashAnim[]>([])
  const prevDiceIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!diceResult?.cashDelta || diceResult.cashDelta === 0) return
    // Дедупликация по playerId + значению (diceResult не имеет уникального id)
    const dedupKey = `${diceResult.playerId}_${diceResult.value}_${diceResult.cashDelta}`
    if (prevDiceIdRef.current === dedupKey) return
    prevDiceIdRef.current = dedupKey

    const id = `${Date.now()}`
    setCashAnims(prev => [...prev, { id, amount: diceResult.cashDelta! }])
    setTimeout(() => setCashAnims(prev => prev.filter(a => a.id !== id)), 1600)

    if (diceResult.cashDelta > 0) sounds.moneyUp()
    else sounds.moneyDown()
  }, [diceResult])

  // ── звуки ─────────────────────────────────────────────────────────────────
  useEffect(() => { if (diceResult) sounds.dice() }, [diceResult?.value])
  useEffect(() => { if (room?.activeCard) sounds.card() }, [room?.activeCard?.id])
  useEffect(() => { if (winnerId) sounds.win() }, [winnerId])
  useEffect(() => { if (lastMarketEvent) sounds.moneyUp() }, [lastMarketEvent?.event.id])

  // ── состояние UI ──────────────────────────────────────────────────────────
  const [showChat, setShowChat]       = useState(false)
  const [showLoanMenu, setShowLoanMenu] = useState(false)
  const [tradeModal, setTradeModal]   = useState<{ assetId: string; assetName: string } | null>(null)
  const [soundMuted, setSoundMuted]   = useState(false)

  // ── навигация ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!room)                       navigate('/play')
    else if (room.phase === 'setup') navigate('/setup')
  }, [room, navigate])

  if (!room) return null

  const myPlayer      = room.players.find((p) => p.id === myPlayerId)
  const currentPlayer = room.players[room.currentPlayerIndex]
  const isMyTurn      = currentPlayer?.id === myPlayerId
  const otherPlayers  = room.players.filter((p) => p.id !== myPlayerId)

  const handleLeave = () => { leaveRoom(); navigate('/play') }

  const handleSellAsset = useCallback((assetId: string, _name: string, _val: number) => {
    if (window.confirm(`Продать актив за ${fmt(_val)}?`)) {
      sellAsset(assetId)
      sounds.moneyUp()
    }
  }, [sellAsset])

  const handleTakeLoan = useCallback((tier: 'small' | 'medium' | 'large') => {
    takeLoan(tier)
    sounds.loanTaken()
  }, [takeLoan])

  const handleRepayLoan = useCallback((loanId: string, repayAmount: number) => {
    if (window.confirm(`Погасить досрочно за ${fmt(repayAmount)}?`)) {
      repayLoan(loanId)
    }
  }, [repayLoan])

  const handleProposeTrade = useCallback((targetPlayerId: string, price: number) => {
    if (!tradeModal) return
    proposeTradeOffer({ assetId: tradeModal.assetId, targetPlayerId, price })
  }, [tradeModal, proposeTradeOffer])

  const handleRespondToTrade = useCallback((accept: boolean) => {
    respondToTrade(accept)
    if (accept) sounds.tradeAccepted()
  }, [respondToTrade])

  const handleReaction = useCallback((emoji: string) => {
    sendReaction(emoji)
    sounds.reaction()
  }, [sendReaction])

  const handleChat = useCallback((msg: string) => {
    sendChat(msg)
  }, [sendChat])

  // ── победитель ────────────────────────────────────────────────────────────
  if (winnerId) {
    const winner = room.players.find((p) => p.id === winnerId)
    if (winner) {
      return <WinnerScreen winner={winner} allPlayers={room.players} onLeave={handleLeave} />
    }
  }

  // ── кубик ─────────────────────────────────────────────────────────────────
  const diceEmoji   = diceResult ? ['⚀','⚁','⚂','⚃','⚄','⚅'][diceResult.value - 1] : null
  const rollerName  = diceResult?.playerId === myPlayerId
    ? 'Вы'
    : currentPlayer?.nickname ?? '...'

  // ── оверлей торговли ──────────────────────────────────────────────────────
  const pendingTrade       = room.pendingTradeOffer
  const isTradeTarget      = pendingTrade?.toPlayerId === myPlayerId

  const REACTION_EMOJIS = ['👍', '🔥', '😂', '😱', '🎉', '💀']

  return (
    <div className="h-screen overflow-hidden bg-gray-900 text-white flex flex-col select-none">

      {/* ── Анимации изменения денег ──────────────────────────────────────────── */}
      {cashAnims.map(a => (
        <div
          key={a.id}
          style={{
            animation: 'floatUp 1.6s ease-out forwards',
            position: 'fixed',
            top: '45%',
            left: '50%',
            fontSize: '2rem',
            fontWeight: 900,
            color: a.amount > 0 ? '#4ade80' : '#f87171',
            zIndex: 200,
            pointerEvents: 'none',
            textShadow: '0 2px 12px rgba(0,0,0,0.9)',
            whiteSpace: 'nowrap',
          }}
        >
          {a.amount > 0 ? '+' : ''}{a.amount.toLocaleString('ru-RU')} ₽
        </div>
      ))}

      {/* ── Реакции от игроков ────────────────────────────────────────────────── */}
      {reactions.map(r => (
        <div
          key={r.id}
          style={{
            animation: 'reactionPop 2.5s ease-out forwards',
            position: 'fixed',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '3rem',
            zIndex: 150,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          <span>{r.emoji}</span>
          <span style={{ fontSize: '0.6rem', color: '#9ca3af', fontWeight: 600 }}>{r.nickname}</span>
        </div>
      ))}

      {/* ── Тост «конец месяца» ───────────────────────────────────────────────── */}
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
          <span className="text-base ml-1">
            {room.season === 'spring' ? '🌸' : room.season === 'summer' ? '☀️' : room.season === 'autumn' ? '🍂' : '❄️'}
          </span>
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSoundMuted(!soundMuted); sounds.toggle() }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            title={soundMuted ? 'Включить звук' : 'Выключить звук'}
          >
            {soundMuted ? '🔇' : '🔊'}
          </button>
          <button onClick={handleLeave} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Выйти
          </button>
        </div>
      </header>

      {/* ── Строка статов ─────────────────────────────────────────────────────── */}
      {myPlayer && (
        <div className="shrink-0 flex justify-center gap-12 px-8 py-2.5 bg-gray-800 border-b border-gray-700">
          <StatBox label="Наличные"    value={fmt(myPlayer.financeSheet.cash)} />
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

      {/* ── Основная зона ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {myPlayer && (
          <FinancePanel
            player={myPlayer}
            myPlayerId={myPlayerId}
            otherPlayers={otherPlayers}
            onSellAsset={handleSellAsset}
            onProposeTradeOffer={(assetId, assetName) => setTradeModal({ assetId, assetName })}
            onTakeLoan={() => setShowLoanMenu(true)}
            onRepayLoan={handleRepayLoan}
            marketPrices={room.marketPrices}
          />
        )}

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

        <PlayersPanel
          players={room.players}
          currentIndex={room.currentPlayerIndex}
          myPlayerId={myPlayerId}
        />
      </div>

      {/* ── Нижняя панель ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 h-[70px] border-t border-gray-800 flex items-center justify-between gap-4 px-6 bg-gray-900">

        {/* Результат кубика */}
        <div className="flex-1">
          {diceResult && diceEmoji && (
            <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-2 border border-gray-700 w-fit">
              <span className="text-3xl">{diceEmoji}</span>
              <div className="flex flex-col gap-0.5">
                <p className="text-gray-300 text-xs leading-snug">
                  <span className="text-white font-medium">{rollerName}</span>
                  {' '}→ {CELL_LABELS[diceResult.cellType] ?? diceResult.cellType}
                  {diceResult.monthEnd && <span className="text-blue-400 ml-1">· 🗓 Конец месяца!</span>}
                </p>
                {diceResult.cashDelta !== undefined && diceResult.cashDelta !== 0 && (
                  <p className={`text-xs font-bold ${diceResult.cashDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {diceResult.cashDelta > 0 ? '+' : ''}{diceResult.cashDelta.toLocaleString('ru-RU')} ₽
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Реакции */}
        <div className="flex gap-1">
          {REACTION_EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => handleReaction(e)}
              className="w-8 h-8 text-lg rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
              title={`Реакция ${e}`}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Кнопка броска + чат */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChat(s => !s)}
            className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-colors relative ${
              showChat ? 'bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            💬
            {chatMessages.length > 0 && !showChat && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] font-bold flex items-center justify-center">
                {Math.min(chatMessages.length, 9)}
              </span>
            )}
          </button>

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
        </div>
      </div>

      {/* ── Уведомления событий конца месяца ─────────────────────────────────── */}
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

      {/* ── Чат ──────────────────────────────────────────────────────────────── */}
      {showChat && (
        <ChatPanel
          messages={chatMessages}
          myPlayerId={myPlayerId}
          onSend={handleChat}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* ── Меню кредитов ────────────────────────────────────────────────────── */}
      {showLoanMenu && myPlayer && (
        <LoanMenu
          playerCash={myPlayer.financeSheet.cash}
          onTake={handleTakeLoan}
          onClose={() => setShowLoanMenu(false)}
        />
      )}

      {/* ── Модальное окно предложения обмена ────────────────────────────────── */}
      {tradeModal && (
        <TradeProposalModal
          assetName={tradeModal.assetName}
          otherPlayers={otherPlayers}
          onPropose={handleProposeTrade}
          onClose={() => setTradeModal(null)}
        />
      )}

      {/* ── Оверлей входящего предложения обмена ─────────────────────────────── */}
      {pendingTrade && (
        <TradeOfferOverlay
          offer={pendingTrade}
          isTarget={isTradeTarget}
          myCash={myPlayer?.financeSheet.cash ?? 0}
          onRespond={handleRespondToTrade}
        />
      )}

      {/* ── Глобальный рыночный оверлей — видят ВСЕ ─────────────────────────── */}
      {lastMarketEvent && !room.activeCard && (
        <MarketEventOverlay
          result={lastMarketEvent}
          onDismiss={() => useSocketStore.setState({ lastMarketEvent: null })}
        />
      )}

      {/* ── Оверлей карточки события ─────────────────────────────────────────── */}
      {room.activeCard && overlayVisible && (
        <EventOverlay card={room.activeCard} isMyTurn={isMyTurn} myPlayer={myPlayer} />
      )}
    </div>
  )
}
