import { motion, LayoutGroup } from 'framer-motion'
import { BOARD } from '../../data/constants'
import type { Player, Season } from '../../types/game'

// ── constants ──────────────────────────────────────────────────────────────────

const CELL_PX        = 44           // px per grid unit
const GRID_SIZE      = 15           // 15 × 15 grid
export const BOARD_PX = GRID_SIZE * CELL_PX  // 660 px

const PLAYER_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#a855f7', // purple
  '#f97316', // orange
  '#ec4899', // pink
]

// ── type → visual maps ─────────────────────────────────────────────────────────

const TYPE_BG: Record<string, string> = {
  bonus:       '#78350f',  // amber-900
  opportunity: '#14532d',
  bad_event:   '#450a0a',
  market:      '#1f2937',
  start:       '#713f12',
  vacation:    '#713f12',
  tax:         '#1a1a2e',
  luck:        '#1c1a3e',
}

const TYPE_BORDER: Record<string, string> = {
  bonus:       '#eab308',  // yellow-500
  opportunity: '#22c55e',
  bad_event:   '#ef4444',
  market:      '#6b7280',
  start:       '#f59e0b',
  vacation:    '#f59e0b',
  tax:         '#7c3aed',
  luck:        '#10b981',
}

const TYPE_ICON: Record<string, string> = {
  bonus:       '🎁',
  opportunity: '⭐',
  bad_event:   '⚡',
  market:      '📈',
  start:       '🏁',
  vacation:    '🏖',
  tax:         '🏛',
  luck:        '🍀',
}

const SEASON_LABEL: Record<Season, string> = {
  spring: 'Весна',
  summer: 'Лето',
  autumn: 'Осень',
  winter: 'Зима',
}

const SEASON_EMOJI: Record<Season, string> = {
  spring: '🌸',
  summer: '☀️',
  autumn: '🍂',
  winter: '❄️',
}

// ── grid position helpers ──────────────────────────────────────────────────────

/**
 * Returns the 0-indexed (col, row) in a 15×15 grid for board cell `index`.
 *
 * Layout:
 *   row 0,  cols 1-13  → cells  1-13  (top side, left→right)
 *   col 14, rows 1-13  → cells 14-26  (right side, top→bottom)
 *   row 14, cols 13-1  → cells 27-39  (bottom side, right→left)
 *   col 0,  rows 13-1  → cells 40-52  (left side, bottom→up)
 *   (0, 14)            → cell  0      (start corner, bottom-left)
 */
function cellGridPos(index: number): { col: number; row: number } {
  if (index === 0)             return { col: 0,        row: 14         }
  if (index <= 13)             return { col: index,    row: 0          }
  if (index <= 26)             return { col: 14,       row: index - 13 }
  if (index <= 39)             return { col: 40 - index, row: 14       }
  /* 40-52 */                  return { col: 0,        row: 53 - index }
}

const CORNER_CELLS = new Set([0, 13, 26, 39])

// ── component props ────────────────────────────────────────────────────────────

interface Props {
  players: Player[]
  currentPlayerIndex: number
  myPlayerId: string | null
  season: Season
  turnNumber: number
  monthNumber: number
  isMyTurn: boolean
}

// ── GameBoard ──────────────────────────────────────────────────────────────────

export default function GameBoard({
  players,
  currentPlayerIndex,
  myPlayerId,
  season,
  turnNumber,
  monthNumber,
  isMyTurn,
}: Props) {

  // Group players by board position for rendering tokens
  const byPos = new Map<number, Player[]>()
  for (const p of players) {
    const list = byPos.get(p.position) ?? []
    list.push(p)
    byPos.set(p.position, list)
  }

  const currentPlayer = players[currentPlayerIndex]

  return (
    <LayoutGroup id="board">
      <div
        style={{
          width:    BOARD_PX,
          height:   BOARD_PX,
          flexShrink: 0,
          display:  'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_PX}px)`,
          gridTemplateRows:    `repeat(${GRID_SIZE}, ${CELL_PX}px)`,
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #1f2937',
          boxShadow: '0 0 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* ── empty top-right corner (grid pos 14,0) ── */}
        <div style={{ gridColumn: 15, gridRow: 1, background: '#0f172a' }} />
        {/* ── empty bottom-right corner (14,14) ── */}
        <div style={{ gridColumn: 15, gridRow: 15, background: '#0f172a' }} />
        {/* ── empty top-left corner (0,0) ── */}
        <div style={{ gridColumn: 1,  gridRow: 1,  background: '#0f172a' }} />

        {/* ── 53 board cells ── */}
        {BOARD.map((type, idx) => {
          const { col, row } = cellGridPos(idx)
          const here      = byPos.get(idx) ?? []
          const isCorner  = CORNER_CELLS.has(idx)
          const iconSize  = isCorner ? 18 : 14

          return (
            <div
              key={idx}
              title={`Клетка ${idx}: ${type}`}
              style={{
                gridColumn: col + 1,
                gridRow:    row + 1,
                background: TYPE_BG[type],
                borderColor: TYPE_BORDER[type],
                borderWidth: isCorner ? 2 : 1,
                borderStyle: 'solid',
                display:  'flex',
                flexDirection: 'column',
                alignItems:    'center',
                justifyContent: 'center',
                position: 'relative',
                gap: 1,
              }}
            >
              {/* type icon */}
              <span style={{ fontSize: iconSize, lineHeight: 1 }}>
                {TYPE_ICON[type]}
              </span>

              {/* cell number */}
              <span style={{
                fontSize: 7,
                color: 'rgba(255,255,255,0.35)',
                lineHeight: 1,
                fontFamily: 'monospace',
              }}>
                {idx}
              </span>

              {/* player tokens */}
              {here.length > 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: 1,
                  left: 0,
                  right: 0,
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 1,
                  padding: '0 1px',
                  pointerEvents: 'none',
                }}>
                  {here.map((p) => {
                    const pi   = players.findIndex(pl => pl.id === p.id)
                    const isMe = p.id === myPlayerId
                    return (
                      <motion.div
                        key={p.id}
                        layoutId={`token-${p.id}`}
                        layout
                        transition={{ type: 'spring', stiffness: 180, damping: 22, duration: 0.5 }}
                        style={{
                          width:  isMe ? 16 : 14,
                          height: isMe ? 16 : 14,
                          borderRadius: '50%',
                          backgroundColor: PLAYER_COLORS[pi % PLAYER_COLORS.length],
                          border: isMe
                            ? '2px solid white'
                            : '1px solid rgba(0,0,0,0.45)',
                          display:  'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 6,
                          color: 'white',
                          fontWeight: 700,
                          boxShadow: isMe ? '0 0 6px rgba(255,255,255,0.5)' : 'none',
                        }}
                      >
                        {p.nickname[0]?.toUpperCase()}
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* ── center info panel ── */}
        <div
          style={{
            gridColumn: '2 / 15',   // CSS cols 2-14  → grid indices 1-13
            gridRow:    '2 / 15',   // CSS rows 2-14
            backgroundColor: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            padding: 12,
            overflow: 'hidden',
          }}
        >
          {/* season badge */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}>
            <span style={{ fontSize: 28 }}>{SEASON_EMOJI[season]}</span>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#f59e0b',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              {SEASON_LABEL[season]}
            </span>
          </div>

          {/* month + turn info */}
          <div style={{
            display: 'flex',
            gap: 10,
            fontSize: 9,
            color: '#4b5563',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            <span>Месяц {monthNumber}</span>
            <span style={{ color: '#1f2937' }}>·</span>
            <span>Ход {turnNumber}</span>
          </div>

          {/* whose turn */}
          <div style={{
            fontSize: isMyTurn ? 14 : 12,
            fontWeight: 700,
            color: isMyTurn ? '#60a5fa' : '#9ca3af',
            textAlign: 'center',
            maxWidth: 380,
          }}>
            {isMyTurn
              ? '🎯 Ваш ход!'
              : `Ход: ${currentPlayer?.nickname ?? '...'}`}
          </div>

          {/* divider */}
          <div style={{ width: '55%', height: 1, background: '#1e293b', margin: '3px 0' }} />

          {/* player list */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            width: '72%',
          }}>
            {players.map((p, i) => {
              const isActive = i === currentPlayerIndex
              return (
                <div key={p.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  opacity: isActive ? 1 : 0.4,
                  transition: 'opacity 0.3s',
                }}>
                  {/* color dot */}
                  <div style={{
                    width: 8, height: 8,
                    borderRadius: '50%',
                    backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length],
                    flexShrink: 0,
                    border: isActive ? '1.5px solid rgba(255,255,255,0.6)' : 'none',
                  }} />
                  {/* nickname */}
                  <span style={{
                    color: 'white',
                    fontSize: 10,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 120,
                    fontWeight: isActive ? 600 : 400,
                  }}>
                    {p.nickname}
                    {p.id === myPlayerId && (
                      <span style={{ color: '#6b7280', fontWeight: 400 }}> (вы)</span>
                    )}
                  </span>
                  {/* position */}
                  <span style={{
                    color: '#374151',
                    fontSize: 9,
                    marginLeft: 'auto',
                    flexShrink: 0,
                    fontFamily: 'monospace',
                  }}>
                    #{p.position}
                  </span>
                  {/* cash */}
                  <span style={{
                    color: '#6b7280',
                    fontSize: 9,
                    flexShrink: 0,
                    fontFamily: 'monospace',
                    minWidth: 60,
                    textAlign: 'right',
                  }}>
                    {p.financeSheet.cash.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              )
            })}
          </div>

          {/* legend */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px 10px',
            marginTop: 6,
            justifyContent: 'center',
          }}>
            {[
              { icon: '🎁', label: 'премия',     color: '#eab308' },
              { icon: '⭐', label: 'шанс',        color: '#22c55e' },
              { icon: '⚡', label: 'неудача',     color: '#ef4444' },
              { icon: '📈', label: 'рынок',       color: '#6b7280' },
            ].map(({ icon, label, color }) => (
              <span key={label} style={{ fontSize: 9, color, display: 'flex', alignItems: 'center', gap: 3 }}>
                {icon} {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </LayoutGroup>
  )
}
