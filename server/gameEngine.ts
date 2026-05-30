import type { GameRoom, Player, Card, Asset, Season } from '../src/types/game'
import { getCardsForRole, BABY_CARD, INVESTMENT_CARDS, BASE_STOCK_PRICES } from '../src/data/cards'
import { ROLES } from '../src/data/roles'
import { BOARD, KIDS_EXPENSE, WINTER_EXPENSE, SUMMER_KIDS_EXPENSE, LAPS_PER_SEASON } from '../src/data/constants'

// ── волатильность акций ───────────────────────────────────────────────────────

const STOCK_VOLATILITY_RANGE: Record<string, number> = {
  none:    0,
  low:     0.05,
  medium:  0.15,
  high:    0.30,
  extreme: 0.60,
}

// ── утилиты ───────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Обновляет рыночные цены акций и пересчитывает дивидендный доход всех игроков */
function updateStockPrices(room: GameRoom): void {
  for (const stockId of Object.keys(room.marketPrices)) {
    const card = INVESTMENT_CARDS.find((c) => c.stockId === stockId)
    if (!card || !card.volatility || card.volatility === 'none') continue

    const range = STOCK_VOLATILITY_RANGE[card.volatility] ?? 0
    if (range === 0) continue

    const change = (Math.random() * 2 - 1) * range  // от -range до +range
    room.marketPrices[stockId] = Math.max(1, Math.round(room.marketPrices[stockId] * (1 + change)))
  }

  // Пересчитываем дивидендный доход для акций/крипты
  for (const player of room.players) {
    let changed = false
    for (const asset of player.assets) {
      if (!asset.stockId || !asset.dividendPercent || !asset.shares) continue
      const currentPrice = room.marketPrices[asset.stockId]
      if (currentPrice === undefined) continue

      const newIncome = Math.round((asset.shares * currentPrice * asset.dividendPercent) / 100 / 12)
      if (asset.monthlyIncome !== newIncome) {
        asset.monthlyIncome = newIncome
        changed = true
      }
    }
    if (changed) calculateCashFlow(player)
  }
}

/**
 * Проверяет провал бизнесов и обновляет статус активов.
 * Возвращает список уведомлений для lastRollNotifications.
 */
function checkBusinessFailures(room: GameRoom, player: Player): string[] {
  const notifications: string[] = []

  // 1. Декрементируем уже закрывающиеся активы
  for (const asset of [...player.assets]) {
    if (asset.status !== 'closing') continue
    asset.closingTurnsLeft = (asset.closingTurnsLeft ?? 1) - 1
    if (asset.closingTurnsLeft <= 0) {
      const refund = Math.round(asset.cost * (asset.sellBackPercent ?? 0) / 100)
      if (refund > 0) player.financeSheet.cash += refund
      player.assets = player.assets.filter((a) => a.id !== asset.id)
      player.financeSheet.expenses = Math.max(0, player.financeSheet.expenses - asset.monthlyExpense)
      notifications.push(
        `✅ «${asset.name}» у ${player.nickname} закрыт.` +
        (refund > 0 ? ` Возврат: ${refund.toLocaleString('ru-RU')} ₽` : ''),
      )
    }
  }

  // 2. Сезонный эффект + бросок на провал у активных активов
  for (const asset of [...player.assets]) {
    if (!asset.failRisk || asset.status === 'closing') continue

    // Обновляем доход с учётом сезона
    if (asset.seasonEffect && asset.baseMonthlyIncome !== undefined) {
      const modifier = asset.seasonEffect[room.season] ?? 0
      asset.monthlyIncome = Math.round(asset.baseMonthlyIncome * (1 + modifier))
    }

    // Бросок на провал
    if (Math.random() * 100 < asset.failRisk) {
      if (asset.failPenalty && asset.failPenalty > 0) {
        player.financeSheet.cash = Math.max(0, player.financeSheet.cash - asset.failPenalty)
        notifications.push(
          `💥 «${asset.name}» у ${player.nickname}: штраф −${asset.failPenalty.toLocaleString('ru-RU')} ₽`,
        )
      }

      if (asset.maxClosingTurns && asset.maxClosingTurns > 0) {
        asset.status = 'closing'
        asset.closingTurnsLeft = asset.maxClosingTurns
        notifications.push(
          `🔴 «${asset.name}» у ${player.nickname} начинает закрываться (${asset.maxClosingTurns} мес.)`,
        )
      } else {
        // Немедленное закрытие
        const refund = Math.round(asset.cost * (asset.sellBackPercent ?? 0) / 100)
        if (refund > 0) player.financeSheet.cash += refund
        player.assets = player.assets.filter((a) => a.id !== asset.id)
        player.financeSheet.expenses = Math.max(0, player.financeSheet.expenses - asset.monthlyExpense)
        notifications.push(
          `❌ «${asset.name}» у ${player.nickname} закрыт.` +
          (refund > 0 ? ` Возврат: ${refund.toLocaleString('ru-RU')} ₽` : ''),
        )
      }
    }
  }

  if (notifications.length > 0) calculateCashFlow(player)
  return notifications
}

/** Тянет карту для игрока с учётом роли и ~30% шанса инвестиционной карточки */
function drawCardForPlayer(player: Player, cellType: 'opportunity' | 'bad_event'): Card {
  const roleId = player.roleId
  if (!roleId) return BABY_CARD

  if (cellType === 'bad_event' && !player.hasKids && Math.random() < 0.08) {
    return BABY_CARD
  }

  // На клетке «Возможность» ~30% шанс получить инвестиционную карточку
  if (cellType === 'opportunity' && Math.random() < 0.30) {
    return INVESTMENT_CARDS[Math.floor(Math.random() * INVESTMENT_CARDS.length)]
  }

  const cards = getCardsForRole(roleId).filter((c) => c.type === cellType)
  if (cards.length === 0) return BABY_CARD
  return cards[Math.floor(Math.random() * cards.length)]
}

function advanceTurn(room: GameRoom): void {
  const n = room.players.length
  let next = (room.currentPlayerIndex + 1) % n

  for (let i = 0; i < n; i++) {
    const p = room.players[next]
    if (p.turnsMissed <= 0) break
    p.turnsMissed = Math.max(0, p.turnsMissed - 1)
    next = (next + 1) % n
  }

  room.currentPlayerIndex = next
  room.turnPhase = 'rolling'
  room.turnNumber++
}

function advanceSeason(room: GameRoom): void {
  const order: Season[] = ['spring', 'summer', 'autumn', 'winter']
  const idx = order.indexOf(room.season)
  room.season = order[(idx + 1) % 4]

  room.players.forEach((p) => {
    if (room.season === 'winter') {
      p.financeSheet.cash = Math.max(0, p.financeSheet.cash - WINTER_EXPENSE)
    } else if (room.season === 'summer' && p.hasKids) {
      p.financeSheet.cash = Math.max(0, p.financeSheet.cash - SUMMER_KIDS_EXPENSE)
    }
  })
}

/**
 * Конец месяца (игрок пересёк / попал на клетку 0).
 * Обновляет цены акций, проверяет бизнесы, начисляет cashFlow всем.
 * Возвращает cashFlow текущего игрока (для UI).
 */
function applyMonthEnd(room: GameRoom, currentPlayer: Player): number {
  room.monthNumber++

  // Обновляем цены акций до начисления дохода
  updateStockPrices(room)

  // Проверяем провалы бизнесов для всех игроков
  for (const p of room.players) {
    const notes = checkBusinessFailures(room, p)
    room.lastRollNotifications.push(...notes)
  }

  // Начисляем cashFlow всем игрокам
  for (const p of room.players) {
    p.financeSheet.cash += p.financeSheet.cashFlow
  }

  currentPlayer.lapsCompleted++
  room.totalLaps++

  if (room.totalLaps > 0 && room.totalLaps % (LAPS_PER_SEASON * room.players.length) === 0) {
    advanceSeason(room)
  }

  return currentPlayer.financeSheet.cashFlow
}

// ── публичные функции ─────────────────────────────────────────────────────────

export function calculateCashFlow(player: Player): void {
  player.financeSheet.passiveIncome = player.assets.reduce((s, a) => s + a.monthlyIncome, 0)
  player.financeSheet.cashFlow =
    player.financeSheet.salary +
    player.financeSheet.passiveIncome -
    player.financeSheet.expenses
}

export function checkWinCondition(player: Player): boolean {
  return (
    player.financeSheet.passiveIncome > 0 &&
    player.financeSheet.passiveIncome >= player.financeSheet.expenses
  )
}

export function initializeGame(room: GameRoom): void {
  room.players.forEach((player) => {
    player.position = 0
    player.lapsCompleted = 0
    player.assets = []
    player.turnsMissed = 0
    player.historyFlags = []
    player.isOnFastTrack = false
    player.activePerkCooldowns = {}
    calculateCashFlow(player)
  })

  room.deck = []
  room.discardPile = []
  room.activeCard = null
  room.currentPlayerIndex = 0
  room.turnPhase = 'rolling'
  room.turnNumber = 1
  room.season = 'spring'
  room.totalLaps = 0
  room.monthNumber = 0
  room.phase = 'playing'
  room.marketPrices = { ...BASE_STOCK_PRICES }
  room.lastRollNotifications = []
}

export interface RollResult {
  dice: number
  cellType: string
  autoAdvance: boolean
  cashDelta?: number
  monthEnd?: boolean
}

/** Бросает кубик, двигает игрока, обрабатывает клетку */
export function rollDice(room: GameRoom, playerId: string): RollResult | string {
  const idx = room.players.findIndex((p) => p.id === playerId)
  if (idx === -1)                       return 'Игрок не найден'
  if (room.currentPlayerIndex !== idx)  return 'Сейчас не ваш ход'
  if (room.turnPhase !== 'rolling')     return 'Кубик уже брошен'

  // Сбрасываем уведомления прошлого хода
  room.lastRollNotifications = []

  const dice   = rand(1, 6)
  const player = room.players[idx]
  const oldPos = player.position

  player.position = (player.position + dice) % BOARD.length

  let cashDelta = 0
  let monthEnd  = false

  // Пересёк стартовую клетку (не попал точно)?
  const passedStart = player.position !== 0 && player.position < oldPos
  if (passedStart) {
    cashDelta += applyMonthEnd(room, player)
    monthEnd   = true
  }

  const cellType = BOARD[player.position]

  switch (cellType) {

    case 'start': {
      // Точное попадание на Старт — конец месяца
      cashDelta += applyMonthEnd(room, player)
      monthEnd   = true
      advanceTurn(room)
      return { dice, cellType, autoAdvance: true, cashDelta, monthEnd }
    }

    case 'bonus': {
      // Случайная премия 3 000 – 15 000 ₽
      const bonus = rand(3_000, 15_000)
      player.financeSheet.cash += bonus
      cashDelta += bonus
      advanceTurn(room)
      return { dice, cellType, autoAdvance: true, cashDelta, ...(monthEnd && { monthEnd }) }
    }

    case 'vacation': {
      player.turnsMissed += 1
      advanceTurn(room)
      return {
        dice, cellType, autoAdvance: true,
        ...(cashDelta !== 0 && { cashDelta }),
        ...(monthEnd && { monthEnd }),
      }
    }

    case 'tax': {
      const penalty = Math.floor(player.financeSheet.salary * 0.1)
      player.financeSheet.cash = Math.max(0, player.financeSheet.cash - penalty)
      cashDelta -= penalty
      advanceTurn(room)
      return { dice, cellType, autoAdvance: true, cashDelta, ...(monthEnd && { monthEnd }) }
    }

    case 'luck': {
      const bonus = rand(10_000, 50_000)
      player.financeSheet.cash += bonus
      cashDelta += bonus
      advanceTurn(room)
      return { dice, cellType, autoAdvance: true, cashDelta, ...(monthEnd && { monthEnd }) }
    }

    case 'market': {
      const base  = Math.max(player.financeSheet.passiveIncome, 20_000)
      const pct   = rand(10, 20) / 100
      const delta = Math.round((Math.random() > 0.5 ? 1 : -1) * pct * base)
      player.financeSheet.cash = Math.max(0, player.financeSheet.cash + delta)
      cashDelta += delta
      advanceTurn(room)
      return { dice, cellType, autoAdvance: true, cashDelta, ...(monthEnd && { monthEnd }) }
    }

    case 'opportunity':
    case 'bad_event': {
      const card = drawCardForPlayer(player, cellType)
      room.activeCard = card
      room.turnPhase  = 'card'
      return {
        dice,
        cellType,
        autoAdvance: false,
        ...(cashDelta !== 0 && { cashDelta }),
        ...(monthEnd && { monthEnd }),
      }
    }

    default:
      advanceTurn(room)
      return {
        dice, cellType, autoAdvance: true,
        ...(cashDelta !== 0 && { cashDelta }),
        ...(monthEnd && { monthEnd }),
      }
  }
}

/** Применяет решение игрока по активной карточке */
export function applyCard(
  room: GameRoom,
  playerId: string,
  decision: 'accept' | 'decline',
): GameRoom | string {
  const idx = room.players.findIndex((p) => p.id === playerId)
  if (idx === -1)                       return 'Игрок не найден'
  if (room.currentPlayerIndex !== idx)  return 'Сейчас не ваш ход'
  if (!room.activeCard)                 return 'Нет активной карточки'

  const player = room.players[idx]
  const card   = room.activeCard

  if ((card.type === 'opportunity' || card.type === 'investment') && decision === 'accept') {
    const needed = card.downPayment ?? 0
    if (player.financeSheet.cash < needed) {
      return `Недостаточно средств (нужно ${needed.toLocaleString('ru-RU')} ₽)`
    }
    applyEffect(player, card, room)
  } else if (card.type === 'bad_event') {
    // Штраф нельзя отклонить — применяется всегда
    applyEffect(player, card, room)
  }
  // investment decline → просто пропускаем, без штрафа

  room.discardPile.push(card)
  room.activeCard = null

  if (checkWinCondition(player)) {
    room.phase = 'finished'
    return room
  }

  advanceTurn(room)
  return room
}

// ── приватное: применение эффектов карты ──────────────────────────────────────

function applyEffect(player: Player, card: Card, room: GameRoom): void {

  if (card.type === 'opportunity') {
    player.financeSheet.cash -= card.downPayment ?? 0

    if (card.cashBonus !== undefined) {
      player.financeSheet.cash += card.cashBonus
    }
    if (card.salaryDelta !== undefined) {
      player.financeSheet.salary += card.salaryDelta
    }
    if (card.monthlyIncome !== undefined) {
      const asset: Asset = {
        id:             `${card.id}_${Date.now()}`,
        name:           card.title,
        type:           card.assetType ?? 'business',
        cost:           card.cost ?? 0,
        monthlyIncome:  card.monthlyIncome,
        monthlyExpense: card.monthlyExpense ?? 0,
        ownedBy:        player.id,
      }
      player.assets.push(asset)
      player.financeSheet.expenses += asset.monthlyExpense
    }
    calculateCashFlow(player)

  } else if (card.type === 'investment') {
    player.financeSheet.cash -= card.downPayment ?? 0

    if (card.subtype === 'stock' || card.subtype === 'crypto') {
      // Текущая рыночная цена (могла измениться с момента выдачи карточки)
      const currentPrice = card.stockId
        ? (room.marketPrices[card.stockId] ?? card.costPerShare ?? 0)
        : (card.costPerShare ?? 0)
      const shares = card.minShares ?? 1

      const monthlyIncome = (card.dividendPercent && card.dividendPercent > 0)
        ? Math.round((shares * currentPrice * card.dividendPercent) / 100 / 12)
        : 0

      const asset: Asset = {
        id:             `${card.id}_${Date.now()}`,
        name:           card.title,
        type:           card.subtype === 'crypto' ? 'crypto' : 'stock',
        cost:           card.downPayment ?? 0,
        monthlyIncome,
        monthlyExpense: 0,
        ownedBy:        player.id,
        stockId:        card.stockId,
        shares,
        costPerShare:   card.costPerShare,
        dividendPercent: card.dividendPercent,
        volatility:     card.volatility,
        canSell:        card.canSell ?? true,
        sellBackPercent: card.sellBackPercent ?? 100,
      }
      player.assets.push(asset)

    } else if (card.subtype === 'deposit') {
      const principal = card.downPayment ?? 0
      const monthlyIncome = (card.dividendPercent && card.dividendPercent > 0)
        ? Math.round((principal * card.dividendPercent) / 100 / 12)
        : 0

      const asset: Asset = {
        id:             `${card.id}_${Date.now()}`,
        name:           card.title,
        type:           'deposit',
        cost:           principal,
        monthlyIncome,
        monthlyExpense: 0,
        ownedBy:        player.id,
        stockId:        card.stockId,
        dividendPercent: card.dividendPercent,
        volatility:     'none',
        canSell:        card.canSell ?? true,
        sellBackPercent: card.sellBackPercent ?? 100,
      }
      player.assets.push(asset)

    } else if (card.subtype === 'business') {
      const baseMonthlyIncome = card.monthlyIncome ?? 0
      const seasonModifier    = card.seasonEffect ? (card.seasonEffect[room.season] ?? 0) : 0
      const monthlyIncome     = Math.round(baseMonthlyIncome * (1 + seasonModifier))

      const asset: Asset = {
        id:              `${card.id}_${Date.now()}`,
        name:            card.title,
        type:            'business',
        cost:            card.downPayment ?? 0,
        monthlyIncome,
        monthlyExpense:  card.monthlyExpense ?? 0,
        ownedBy:         player.id,
        failRisk:        card.failRisk,
        failPenalty:     card.failPenalty,
        maxClosingTurns: card.closingTurns,
        status:          'active',
        canSell:         false,
        sellBackPercent: card.sellBackPercent ?? 0,
        seasonEffect:    card.seasonEffect,
        baseMonthlyIncome,
      }
      player.assets.push(asset)
      player.financeSheet.expenses += asset.monthlyExpense
    }

    calculateCashFlow(player)

  } else if (card.type === 'bad_event') {
    switch (card.penaltyType) {
      case 'cash':
        if (card.penaltyAmount) {
          player.financeSheet.cash = Math.max(0, player.financeSheet.cash - card.penaltyAmount)
        }
        break
      case 'skip_turns':
        player.turnsMissed += card.skipTurns ?? 1
        break
      case 'percent_income': {
        const loss = Math.floor(player.financeSheet.salary * 0.1)
        player.financeSheet.cash = Math.max(0, player.financeSheet.cash - loss)
        break
      }
      case 'baby':
        if (!player.hasKids) {
          player.hasKids = true
          player.financeSheet.expenses += KIDS_EXPENSE
          calculateCashFlow(player)
        }
        break
    }
  }
}

export { ROLES }
