import { useNavigate } from 'react-router-dom'

const steps = [
  {
    n: '01',
    title: 'Выбери роль',
    desc: 'Врач, IT-специалист или Учитель. Каждая роль — уникальные перки, стартовый капитал и уровень риска.',
  },
  {
    n: '02',
    title: 'Инвестируй',
    desc: 'Покупай активы, бери кредиты, активируй перки. Наращивай пассивный доход быстрее соперников.',
  },
  {
    n: '03',
    title: 'Вырвись на свободу',
    desc: 'Первый, чей пассивный доход превысит расходы — вырывается из крысиных бегов. Ты следующий?',
  },
]

const roles = [
  {
    id: 'doctor',
    emoji: '🩺',
    name: 'Врач',
    salary: '85 000 ₽/мес',
    start: '150 000 ₽',
    risk: 'Высокий',
    riskClass: 'text-red-400',
    perks: ['Частная практика (+40–120 тыс.)', 'Серая зарплата без налогов', 'Привилегированный депозит'],
  },
  {
    id: 'it',
    emoji: '💻',
    name: 'IT-специалист',
    salary: '180 000 ₽/мес',
    start: '300 000 ₽',
    risk: 'Средний',
    riskClass: 'text-yellow-400',
    perks: ['Фриланс-контракты', 'Крипто-инвестиции без KYC', 'Налоговый вычет на ПО'],
  },
  {
    id: 'teacher',
    emoji: '📚',
    name: 'Учитель',
    salary: '45 000 ₽/мес',
    start: '50 000 ₽',
    risk: 'Минимальный',
    riskClass: 'text-green-400',
    perks: ['Частное репетиторство', 'Льготная ипотека', 'Субсидии от государства'],
  },
]

export default function LandingScreen() {
  const navigate = useNavigate()
  const toLogin = () => navigate('/login')

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Nav */}
      <nav className="flex justify-between items-center px-12 py-5 border-b border-gray-800">
        <span className="font-bold text-lg">🐀 Крысиные бега</span>
        <button
          onClick={toLogin}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
        >
          Войти
        </button>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center py-32 px-8">
        <div className="text-7xl mb-8">🐀</div>
        <h1 className="text-6xl font-bold mb-6 leading-tight">
          Крысиные<br />бега
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-xl leading-relaxed">
          Финансовая стратегия по реалиям России 2026.<br />
          Инвестируй, выживай, вырвись на свободу раньше всех.
        </p>
        <button
          onClick={toLogin}
          className="px-10 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-lg font-semibold transition-colors"
        >
          Играть бесплатно →
        </button>
      </section>

      {/* How it works */}
      <section className="bg-gray-800 py-24 px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Как это работает</h2>
          <div className="grid grid-cols-3 gap-12">
            {steps.map((s) => (
              <div key={s.n} className="flex flex-col gap-4">
                <span className="text-5xl font-bold text-blue-500">{s.n}</span>
                <h3 className="text-xl font-semibold">{s.title}</h3>
                <p className="text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-24 px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Выбери свою роль</h2>
          <p className="text-gray-400 text-center mb-16">
            Каждая роль — своя стратегия, свои риски, свой путь к свободе
          </p>
          <div className="grid grid-cols-3 gap-6">
            {roles.map((r) => (
              <div
                key={r.id}
                className="bg-gray-800 rounded-2xl p-8 flex flex-col gap-5 border border-gray-700 hover:border-gray-500 transition-colors"
              >
                <div className="text-5xl">{r.emoji}</div>
                <div>
                  <h3 className="text-2xl font-bold mb-1">{r.name}</h3>
                  <p className="text-gray-400 text-sm">
                    Зарплата: <span className="text-white font-medium">{r.salary}</span>
                  </p>
                  <p className="text-gray-400 text-sm">
                    Старт: <span className="text-white font-medium">{r.start}</span>
                  </p>
                  <p className="text-sm mt-1">
                    Риск: <span className={`font-medium ${r.riskClass}`}>{r.risk}</span>
                  </p>
                </div>
                <ul className="flex flex-col gap-2">
                  {r.perks.map((p) => (
                    <li key={p} className="text-sm text-gray-400 flex gap-2 items-start">
                      <span className="text-blue-400 shrink-0 mt-0.5">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-800 py-24 px-8 text-center">
        <h2 className="text-4xl font-bold mb-4">Готов вырваться на свободу?</h2>
        <p className="text-gray-400 mb-10 text-lg">
          Присоединяйся к игре. Бесплатно. Прямо сейчас.
        </p>
        <button
          onClick={toLogin}
          className="px-10 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-lg font-semibold transition-colors"
        >
          Попробовать бесплатно →
        </button>
      </section>

      {/* Footer */}
      <footer className="py-8 px-12 border-t border-gray-800 text-center text-gray-600 text-sm">
        © 2026 Крысиные бега
      </footer>
    </div>
  )
}
