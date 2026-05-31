/**
 * Звуковой движок на Web Audio API.
 * Контекст создаётся лениво при первом использовании (обходим autoplay policy).
 */
class SoundEngine {
  private ctx: AudioContext | null = null
  private enabled = true

  toggle() { this.enabled = !this.enabled }
  get isMuted() { return !this.enabled }

  private get audio(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return this.ctx
  }

  private beep(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = 0.25,
    delay = 0,
  ) {
    if (!this.enabled) return
    try {
      const ctx  = this.audio
      const osc  = ctx.createOscillator()
      const vol  = ctx.createGain()
      osc.connect(vol)
      vol.connect(ctx.destination)
      osc.type = type
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay)
      vol.gain.setValueAtTime(gain, ctx.currentTime + delay)
      vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + duration + 0.01)
    } catch { /* ignore if Audio API unavailable */ }
  }

  /** Стук кубика */
  dice() {
    this.beep(180, 0.04, 'square', 0.18)
    this.beep(240, 0.04, 'square', 0.15, 0.06)
    this.beep(200, 0.07, 'square', 0.12, 0.12)
  }

  /** Деньги пришли — восходящий мажор */
  moneyUp() {
    this.beep(523, 0.10, 'sine', 0.20)
    this.beep(659, 0.10, 'sine', 0.20, 0.10)
    this.beep(784, 0.18, 'sine', 0.20, 0.20)
  }

  /** Деньги ушли — нисходящий минор */
  moneyDown() {
    this.beep(440, 0.12, 'triangle', 0.18)
    this.beep(330, 0.18, 'triangle', 0.15, 0.14)
  }

  /** Карточка появилась — бумажный «шорох» */
  card() {
    if (!this.enabled) return
    try {
      const ctx  = this.audio
      const buf  = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.5
      }
      const src  = ctx.createBufferSource()
      src.buffer = buf
      const vol  = ctx.createGain()
      vol.gain.setValueAtTime(0.2, ctx.currentTime)
      src.connect(vol)
      vol.connect(ctx.destination)
      src.start()
    } catch { /* ignore */ }
  }

  /** Победная фанфара */
  win() {
    const notes = [523, 659, 784, 1047, 1319]
    notes.forEach((freq, i) => this.beep(freq, 0.25, 'sine', 0.22, i * 0.13))
  }

  /** Эмодзи-реакция */
  reaction() {
    this.beep(880, 0.07, 'sine', 0.12)
  }

  /** Новое сообщение в чате */
  chat() {
    this.beep(1047, 0.05, 'sine', 0.08)
  }

  /** Разбойничья клетка */
  raid() {
    this.beep(150, 0.08, 'sawtooth', 0.18)
    this.beep(120, 0.12, 'sawtooth', 0.15, 0.09)
  }

  /** Получили кредит */
  loanTaken() {
    this.beep(330, 0.07, 'square', 0.15)
    this.beep(440, 0.10, 'square', 0.13, 0.08)
  }

  /** Торговля принята */
  tradeAccepted() {
    this.beep(660, 0.08, 'sine', 0.18)
    this.beep(880, 0.12, 'sine', 0.18, 0.09)
  }
}

export const sounds = new SoundEngine()
