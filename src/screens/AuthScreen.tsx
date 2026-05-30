import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

type Tab = 'register' | 'login'

export default function AuthScreen() {
  const [tab, setTab] = useState<Tab>('register')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  // Уже авторизован — сразу в игру
  useEffect(() => {
    if (localStorage.getItem('nickname')) navigate('/play', { replace: true })
  }, [navigate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name =
      tab === 'register'
        ? nickname.trim()
        : (localStorage.getItem('nickname') ?? email.split('@')[0])
    if (!name || !email.trim() || !password.trim()) return
    localStorage.setItem('nickname', name)
    navigate('/play', { replace: true })
  }

  const inputClass =
    'w-full bg-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow'

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md mb-6">
        <Link to="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← На главную
        </Link>
      </div>

      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md border border-gray-700">
        <h1 className="text-2xl font-bold mb-6 text-center">🐀 Крысиные бега</h1>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 rounded-xl p-1 mb-8">
          {(['register', 'login'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'register' ? 'Регистрация' : 'Войти'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {tab === 'register' && (
            <input
              className={inputClass}
              placeholder="Никнейм"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoFocus
              required
            />
          )}
          <input
            className={inputClass}
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus={tab === 'login'}
            required
          />
          <input
            className={inputClass}
            placeholder="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="mt-2 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            {tab === 'register' ? 'Создать аккаунт' : 'Войти'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          {tab === 'register' ? 'Уже есть аккаунт? ' : 'Нет аккаунта? '}
          <button
            type="button"
            onClick={() => setTab(tab === 'register' ? 'login' : 'register')}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            {tab === 'register' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </p>
      </div>
    </div>
  )
}
