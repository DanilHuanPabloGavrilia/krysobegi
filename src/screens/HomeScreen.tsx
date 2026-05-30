import { useState, useEffect } from 'react'
import { useSocketStore } from '../store/socketStore'

interface Props {
  onEnterLobby: () => void
}

export default function HomeScreen({ onEnterLobby }: Props) {
  const [nickname, setNickname] = useState('')
  const [code, setCode] = useState('')
  const { connect, createRoom, joinRoom, room, error, clearError } = useSocketStore()

  // Переходим в лобби когда сервер подтвердил вход в комнату
  useEffect(() => {
    if (room) onEnterLobby()
  }, [room, onEnterLobby])

  const handleCreate = () => {
    if (!nickname.trim()) return
    clearError()
    connect()
    createRoom(nickname.trim())
  }

  const handleJoin = () => {
    if (!nickname.trim() || !code.trim()) return
    clearError()
    connect()
    joinRoom(code.trim().toUpperCase(), nickname.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') action()
  }

  return (
    <div style={{ padding: 40, maxWidth: 400, margin: '100px auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: 8 }}>🐀 Крысиные бега</h1>
      <p style={{ color: '#888', marginBottom: 32 }}>Финансовая игра · Россия 2026</p>

      <label style={{ display: 'block', marginBottom: 4 }}>Никнейм</label>
      <input
        style={{ width: '100%', padding: '8px 12px', fontSize: 16, marginBottom: 24, boxSizing: 'border-box' }}
        placeholder="Введите никнейм"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, handleCreate)}
        autoFocus
      />

      <button
        style={{ width: '100%', padding: '12px', fontSize: 16, marginBottom: 24, cursor: 'pointer' }}
        onClick={handleCreate}
        disabled={!nickname.trim()}
      >
        Создать комнату
      </button>

      <hr style={{ margin: '0 0 24px' }} />

      <label style={{ display: 'block', marginBottom: 4 }}>Код комнаты</label>
      <input
        style={{ width: '100%', padding: '8px 12px', fontSize: 16, marginBottom: 12, boxSizing: 'border-box' }}
        placeholder="Например: 4821"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, handleJoin)}
        maxLength={4}
      />

      <button
        style={{ width: '100%', padding: '12px', fontSize: 16, cursor: 'pointer' }}
        onClick={handleJoin}
        disabled={!nickname.trim() || !code.trim()}
      >
        Войти по коду
      </button>

      {error && (
        <p style={{ color: 'red', marginTop: 16 }}>{error}</p>
      )}
    </div>
  )
}
