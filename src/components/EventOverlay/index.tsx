import { useEffect, useState } from 'react'
import { useSocketStore } from '../../store/socketStore'
import type { Card, Player } from '../../types/game'

interface Props {
  card: Card
  isMyTurn: boolean
  myPlayer: Player | undefined
}

const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽'

const VOLATILITY_LABEL: Record<string, string> = {
  low:     'Низкая',
  medium:  'Средняя',
  high:    'Высокая',
  extreme: 'Экстремальная',
}

const VOLATILITY_COLOR: Record<string, string> = {
  low:     'text-green-400',
  medium:  'text-yellow-400',
  high:    'text-orange-400',
  extreme: 'text-red-400',
}

export default function EventOverlay({ card, isMyTurn, myPlayer }: Props) {
  const [timeLeft, setTimeLeft] = useState(60)
  const { makeDecision } = useSocketStore()

  const cash    = myPlayer?.financeSheet.cash ?? 0
  const needed  = card.downPayment ?? 0
  const canAfford = cash >= needed

  // Таймер — только для текущего игрока
  useEffect(() => {
    if (!isMyTurn) return
    setTimeLeft(60)

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          makeDecision('decline')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [card.id, isMyTurn, makeDecision])

  const isOpportunity = card.type === 'opportunity'
  const isBadEvent    = card.type === 'bad_event'
  const isInvestment  = card.type === 'investment'

  // ── цветовая схема по типу карточки ───────────────────────────────────────
  const accentColor = isOpportunity
    ? 'text-green-400'
    : isBadEvent
      ? 'text-red-400'
      : isInvestment
        ? 'text-yellow-400'
        : 'text-blue-400'

  const borderColor = isOpportunity
    ? 'border-green-700'
    : isBadEvent
      ? 'border-red-700'
      : isInvestment
        ? 'border-yellow-700'
        : 'border-blue-700'

  const bgAccent = isOpportunity
    ? 'bg-green-900/20'
    : isBadEvent
      ? 'bg-red-900/20'
      : isInvestment
        ? 'bg-yellow-900/15'
        : 'bg-blue-900/20'

  const typeLabel = isOpportunity
    ? '💰 Возможность'
    : isBadEvent
      ? '⚠️ Неприятность'
      : isInvestment
        ? '💼 Инвестиция'
        : '📋 Карточка'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`bg-gray-900 border ${borderColor} rounded-2xl p-8 w-full max-w-lg mx-4 flex flex-col gap-6`}>

        {/* ── Заголовок ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className={`text-xs font-semibold uppercase tracking-widest ${accentColor} mb-2 block`}>
              {typeLabel}
            </span>
            <h2 className="text-2xl font-bold text-white">{card.title}</h2>
          </div>
          {isMyTurn && (
            <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 ${
              timeLeft <= 10 ? 'border-red-500 text-red-400' : 'border-gray-600 text-gray-300'
            }`}>
              {timeLeft}
            </div>
          )}
        </div>

        {/* ── Описание ── */}
        <p className="text-gray-400 leading-relaxed">{card.description}</p>

        {/* ── Финансовые детали: Возможность ── */}
        {isOpportunity && (
          <div className={`rounded-xl p-4 ${bgAccent} flex flex-col gap-2 text-sm`}>
            {card.downPayment !== undefined && card.downPayment > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Первоначальный взнос</span>
                <span className="font-semibold text-white">−{fmt(card.downPayment)}</span>
              </div>
            )}
            {card.cashBonus !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-400">Разовый доход</span>
                <span className="font-semibold text-green-400">+{fmt(card.cashBonus)}</span>
              </div>
            )}
            {card.salaryDelta !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-400">Зарплата</span>
                <span className={`font-semibold ${card.salaryDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {card.salaryDelta > 0 ? '+' : ''}{fmt(card.salaryDelta)}/мес
                </span>
              </div>
            )}
            {card.monthlyIncome !== undefined && card.monthlyIncome > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Пассивный доход</span>
                <span className="font-semibold text-green-400">+{fmt(card.monthlyIncome)}/мес</span>
              </div>
            )}
            {card.monthlyExpense !== undefined && card.monthlyExpense > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Расходы актива</span>
                <span className="font-semibold text-red-400">−{fmt(card.monthlyExpense)}/мес</span>
              </div>
            )}
            {card.monthlyIncome !== undefined && card.monthlyExpense !== undefined && (
              <div className="flex justify-between border-t border-gray-700 pt-2 mt-1">
                <span className="text-gray-400">Чистый доход</span>
                <span className={`font-bold ${card.monthlyIncome - card.monthlyExpense >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {card.monthlyIncome - card.monthlyExpense >= 0 ? '+' : ''}
                  {fmt(card.monthlyIncome - card.monthlyExpense)}/мес
                </span>
              </div>
            )}
            {myPlayer && card.downPayment !== undefined && card.downPayment > 0 && (
              <div className="flex justify-between border-t border-gray-700 pt-2 mt-1">
                <span className="text-gray-400">У вас наличных</span>
                <span className={`font-semibold ${canAfford ? 'text-white' : 'text-red-400'}`}>
                  {fmt(cash)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Финансовые детали: Инвестиция ── */}
        {isInvestment && (
          <div className={`rounded-xl p-4 ${bgAccent} flex flex-col gap-2 text-sm`}>
            {card.downPayment !== undefined && card.downPayment > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Вложений</span>
                <span className="font-semibold text-white">−{fmt(card.downPayment)}</span>
              </div>
            )}

            {/* Акции/крипта */}
            {(card.subtype === 'stock' || card.subtype === 'crypto') && card.minShares && (
              <div className="flex justify-between">
                <span className="text-gray-400">Пакет</span>
                <span className="font-semibold text-gray-300">{card.minShares} шт × {fmt(card.costPerShare ?? 0)}</span>
              </div>
            )}

            {card.dividendPercent !== undefined && card.dividendPercent > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Дивиденды</span>
                <span className="font-semibold text-yellow-400">{card.dividendPercent}% годовых</span>
              </div>
            )}

            {card.volatility && card.volatility !== 'none' && (
              <div className="flex justify-between">
                <span className="text-gray-400">Волатильность</span>
                <span className={`font-semibold ${VOLATILITY_COLOR[card.volatility] ?? 'text-gray-300'}`}>
                  {VOLATILITY_LABEL[card.volatility] ?? card.volatility}
                </span>
              </div>
            )}

            {/* Бизнес */}
            {card.monthlyIncome !== undefined && card.monthlyIncome > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Доход/мес</span>
                <span className="font-semibold text-yellow-400">+{fmt(card.monthlyIncome)}/мес</span>
              </div>
            )}

            {card.failRisk !== undefined && card.failRisk > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Риск провала/мес</span>
                <span className={`font-semibold ${card.failRisk >= 30 ? 'text-red-400' : card.failRisk >= 15 ? 'text-orange-400' : 'text-yellow-400'}`}>
                  {card.failRisk}%
                </span>
              </div>
            )}

            {card.sellBackPercent !== undefined && card.sellBackPercent < 100 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Возврат при закрытии</span>
                <span className="font-semibold text-gray-400">{card.sellBackPercent}% вложений</span>
              </div>
            )}

            {card.seasonEffect && (
              <div className="flex justify-between">
                <span className="text-gray-400">Сезонный эффект</span>
                <span className="font-semibold text-blue-400">
                  {Object.entries(card.seasonEffect)
                    .map(([s, v]) => `${s}: ${v > 0 ? '+' : ''}${Math.round(v * 100)}%`)
                    .join(', ')}
                </span>
              </div>
            )}

            {myPlayer && card.downPayment !== undefined && card.downPayment > 0 && (
              <div className="flex justify-between border-t border-gray-700 pt-2 mt-1">
                <span className="text-gray-400">У вас наличных</span>
                <span className={`font-semibold ${canAfford ? 'text-white' : 'text-red-400'}`}>
                  {fmt(cash)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Финансовые детали: Неприятность ── */}
        {isBadEvent && card.penaltyAmount !== undefined && (
          <div className={`rounded-xl p-4 ${bgAccent} flex justify-between text-sm`}>
            <span className="text-gray-400">Штраф / списание</span>
            <span className="font-bold text-red-400">−{fmt(card.penaltyAmount)}</span>
          </div>
        )}

        {isBadEvent && card.penaltyType === 'skip_turns' && (
          <div className={`rounded-xl p-4 ${bgAccent} flex justify-between text-sm`}>
            <span className="text-gray-400">Пропускаешь ходов</span>
            <span className="font-bold text-red-400">{card.skipTurns ?? 1}</span>
          </div>
        )}

        {/* ── Кнопки ── */}
        {isMyTurn ? (
          <div className="flex gap-3 pt-2">
            {(isOpportunity || isInvestment) ? (
              <>
                <button
                  onClick={() => makeDecision('accept')}
                  disabled={!canAfford}
                  className={`flex-1 py-3 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors ${
                    isInvestment
                      ? 'bg-yellow-700 hover:bg-yellow-600'
                      : 'bg-green-700 hover:bg-green-600'
                  }`}
                >
                  {!canAfford
                    ? 'Нет средств'
                    : isInvestment
                      ? 'Инвестировать'
                      : (card.downPayment && card.downPayment > 0)
                        ? 'Принять сделку'
                        : 'Получить'}
                </button>
                <button
                  onClick={() => makeDecision('decline')}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold transition-colors"
                >
                  Пропустить
                </button>
              </>
            ) : (
              <button
                onClick={() => makeDecision('decline')}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold transition-colors"
              >
                Понятно
              </button>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm py-2">
            Ожидаем решения игрока...
          </div>
        )}
      </div>
    </div>
  )
}
