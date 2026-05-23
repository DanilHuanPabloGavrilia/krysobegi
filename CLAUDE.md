# CLAUDE.md — Крысиные бега

Финансовая веб-игра по реалиям России 2026.
Читай этот файл перед каждой задачей. Здесь весь контекст проекта.

---

## Стек

```
Фронтенд                    Бэкенд
────────────────────        ──────────────────
React 18 + Vite             Node.js + Express
TypeScript (strict)         Socket.io 4
Zustand (стейт игры)        Состояние в памяти (Map)
Tailwind CSS                Без БД в MVP
Framer Motion (анимации)    Railway (хостинг)
Vercel (хостинг)
```

---

## Структура папок

```
krysobegi/
├── CLAUDE.md                  ← этот файл
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
│
├── server/
│   ├── index.ts               ← точка входа Socket.io сервера
│   ├── roomManager.ts         ← управление комнатами (Map<code, GameRoom>)
│   ├── gameEngine.ts          ← вся игровая логика (ходы, карточки, финансы)
│   ├── botPlayer.ts           ← логика бота (замена вышедшего игрока)
│   └── timer.ts               ← таймер хода, автопередача
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── types/
│   │   ├── game.ts            ← все интерфейсы игры
│   │   └── socket.ts          ← типы Socket.io событий
│   │
│   ├── store/
│   │   ├── gameStore.ts       ← Zustand стор игрового состояния
│   │   └── socketStore.ts     ← соединение с сервером
│   │
│   ├── components/
│   │   ├── FinanceSheet/      ← финансовый лист игрока
│   │   ├── PlayerList/        ← список игроков + прогресс-бары
│   │   ├── MiniMap/           ← мини-карта поля (позиции игроков)
│   │   ├── EventOverlay/      ← оверлей карточки события
│   │   ├── PerkPanel/         ← панель перков роли
│   │   ├── DiceRoll/          ← анимация броска кубика
│   │   └── Timer/             ← таймер хода
│   │
│   ├── screens/
│   │   ├── HomeScreen.tsx     ← главная (новая игра / войти по коду)
│   │   ├── RoleScreen.tsx     ← выбор роли
│   │   ├── LobbyScreen.tsx    ← лобби комнаты (список игроков, кик, старт)
│   │   ├── GameScreen.tsx     ← основной игровой экран
│   │   └── ResultScreen.tsx   ← экран победы / конца игры
│   │
│   └── data/
│       ├── roles.ts           ← данные всех ролей (перки, стартовые параметры)
│       ├── cards.ts           ← все карточки событий и возможностей
│       └── macroEvents.ts     ← макро-события (влияют на всех игроков)
```

---

## Ключевые типы (src/types/game.ts)

```typescript
type RoleId = 'doctor' | 'it' | 'teacher' | 'locksmith' | 'official' | 'entrepreneur' | 'silovik' | 'realtor'

type CardType = 'opportunity' | 'bad_event' | 'payday' | 'market' | 'macro'

type GamePhase = 'lobby' | 'role_selection' | 'playing' | 'fast_track' | 'finished'

type TurnPhase = 'waiting' | 'rolling' | 'card' | 'perk' | 'done'

interface FinanceSheet {
  salary: number           // зарплата в месяц
  passiveIncome: number    // пассивный доход от активов
  expenses: number         // общие расходы
  cashFlow: number         // passiveIncome + salary - expenses
  cash: number             // наличные на руках
}

interface Asset {
  id: string
  name: string
  type: 'real_estate' | 'business' | 'stock' | 'deposit' | 'crypto'
  cost: number
  monthlyIncome: number
  monthlyExpense: number   // ипотека, обслуживание
  ownedBy: string          // playerId
}

interface Perk {
  id: string
  name: string
  description: string
  income?: number          // разовый доход при успехе
  monthlyIncome?: number   // доход в мес при успехе
  riskPercent: number      // 0–100, шанс провала
  penaltyAmount?: number   // штраф при провале
  penaltyType?: 'fine' | 'fire' | 'arrest' | 'reputation'
  cooldownTurns: number    // раз в N ходов
  availableFromTurn: number
}

interface Role {
  id: RoleId
  name: string
  emoji: string
  salary: number
  startExpenses: number
  startCash: number
  passivePerks: string[]   // описания пассивных перков
  activePerks: Perk[]
  riskLevel: 'low' | 'medium' | 'high' | 'very_high'
}

interface Player {
  id: string
  nickname: string
  roleId: RoleId
  financeSheet: FinanceSheet
  assets: Asset[]
  position: number         // позиция на круге (0–N клеток)
  isBot: boolean
  isReady: boolean
  isOnFastTrack: boolean
  activePerkCooldowns: Record<string, number>  // perkId → ходов до разблокировки
  turnsMissed: number      // пропускает ходы (арест и т.д.)
  historyFlags: string[]   // накопленные флаги ('took_envelope', 'bribed_official'...)
}

interface Card {
  id: string
  type: CardType
  title: string
  description: string
  // для opportunity:
  cost?: number
  downPayment?: number
  monthlyIncome?: number
  monthlyExpense?: number
  // для bad_event:
  penaltyAmount?: number
  penaltyType?: 'cash' | 'percent_income' | 'skip_turns'
  // условие применения (некоторые карточки зависят от флагов игрока):
  triggerIfFlag?: string
  penaltyMultiplierIfFlag?: number
}

interface GameRoom {
  code: string             // 4-значный код комнаты
  hostId: string
  players: Player[]
  phase: GamePhase
  currentPlayerIndex: number
  turnPhase: TurnPhase
  turnNumber: number
  deck: Card[]             // перемешанная колода
  discardPile: Card[]
  activeCard: Card | null  // текущая открытая карточка
  macroEventQueue: string[] // предстоящие макро-события
  turnTimeoutSeconds: number // 60 секунд по умолчанию
  createdAt: number
}

interface GameState {
  room: GameRoom | null
  myPlayerId: string | null
  connected: boolean
}
```

---

## Socket.io события (src/types/socket.ts)

```typescript
// Клиент → Сервер
interface ClientEvents {
  createRoom: (nickname: string, cb: (code: string) => void) => void
  joinRoom: (data: { code: string; nickname: string }, cb: (error?: string) => void) => void
  selectRole: (roleId: RoleId) => void
  kickPlayer: (playerId: string) => void
  setReady: () => void
  startGame: () => void
  rollDice: () => void
  makeDecision: (decision: 'accept' | 'decline') => void
  activatePerk: (perkId: string) => void
  confirmPerk: (perkId: string, decision: 'accept' | 'decline') => void
  loanRequest: (data: { toPlayerId: string; amount: number; interestPercent: number }) => void
  loanResponse: (data: { requestId: string; accepted: boolean }) => void
}

// Сервер → Клиент
interface ServerEvents {
  roomUpdated: (room: GameRoom) => void
  gameStarted: (room: GameRoom) => void
  diceRolled: (data: { playerId: string; value: number; cellType: CardType }) => void
  cardDrawn: (card: Card) => void
  turnChanged: (playerId: string) => void
  timerTick: (secondsLeft: number) => void
  macroEvent: (event: { title: string; description: string; effects: object }) => void
  gameFinished: (winnerId: string) => void
  playerDisconnected: (playerId: string) => void
  botReplaced: (playerId: string) => void
  error: (message: string) => void
}
```

---

## Игровые правила (для gameEngine.ts)

### Победа
Пассивный доход игрока ≥ расходов → выход на Fast Track.
На Fast Track: первый кто выполняет цель мечты → победа.

### Ход
1. Игрок бросает кубик (1–6)
2. Двигается по кругу (24 клетки)
3. В зависимости от типа клетки — тянет карточку
4. Принимает решение (60 секунд, иначе автоотказ)
5. Обновляется финансовый лист
6. Может активировать перк (до или после карточки)
7. Ход передаётся следующему

### Таймер
- 60 секунд на решение
- При истечении: автоматический отказ от карточки, перк не активируется
- Ход передаётся следующему игроку

### Бот
- Заменяет игрока при дисконнекте
- Стратегия: принимать все возможности если хватает наличных, иначе отказ
- Перки не активирует (упрощение для MVP)

### Финансы
- Каждый «Зарплатный день» (синяя клетка): `cash += cashFlow`
- cashFlow пересчитывается при каждом изменении активов/обязательств
- Отрицательный cashFlow → игрок берёт кредит автоматически (ставка 10%/мес)

---

## Роли в MVP (3 штуки)

Полные данные в `src/data/roles.ts`. Здесь краткий список:

| ID | Роль | Зарплата | Старт | Риск |
|---|---|---|---|---|
| `doctor` | Врач | 85 000 | 150 000 | Высокий |
| `it` | IT-специалист | 180 000 | 300 000 | Средний |
| `teacher` | Учитель | 45 000 | 50 000 | Минимальный |

---

## Правила кода

- TypeScript strict mode везде, no `any`
- Вся игровая логика только в `server/gameEngine.ts` — фронтенд не считает, только отображает
- Состояние игры — единственный источник правды: `GameRoom` на сервере
- Компоненты получают данные через Zustand стор, не через пропсы вниз по дереву
- Каждый компонент в своей папке: `ComponentName/index.tsx` + `ComponentName.types.ts`
- Все магические числа — в `src/data/constants.ts`
- Socket события типизированы через `ClientEvents` / `ServerEvents`

---

## Что НЕ делать

- Не добавлять БД в MVP — состояние только в памяти сервера
- Не делать авторизацию — только никнейм
- Не делать мобильную версию — только десктоп
- Не делать анимации пока не работает логика
- Не трогать дизайн — сначала функциональность, потом визуал
- Не добавлять роли кроме трёх MVP ролей
- Не реализовывать Fast Track в MVP — только крысиные бега

---

## Текущий статус задач

### Готово
- [x] scaffold: Vite + React + TS + Tailwind + Socket.io
- [x] структура папок и файлов

### Сделать в первую очередь
- [ ] `src/types/game.ts` — все интерфейсы
- [ ] `src/types/socket.ts` — типы событий
- [ ] `server/index.ts` — базовый Socket.io сервер
- [ ] `server/roomManager.ts` — создание/вход/кик
- [ ] `src/data/roles.ts` — данные 3 ролей
- [ ] `src/data/cards.ts` — минимальная колода (20 карточек)

### Потом
- [ ] `server/gameEngine.ts` — логика ходов
- [ ] `server/timer.ts` — таймер хода
- [ ] `server/botPlayer.ts` — бот-замена
- [ ] Все React экраны
- [ ] Все компоненты
- [ ] Деплой Railway + Vercel

---

## Деплой

```
Фронтенд → Vercel
  команда сборки: npm run build
  папка: dist

Бэкенд → Railway
  start command: node dist/server/index.js
  переменные: PORT, CLIENT_URL (для CORS)

CORS: сервер разрешает только домен Vercel
WebSocket: Socket.io через тот же Railway домен
```

---

## Переменные окружения

```bash
# server/.env
PORT=3001
CLIENT_URL=https://krysobegi.vercel.app

# src/.env
VITE_SERVER_URL=https://krysobegi.up.railway.app
```
