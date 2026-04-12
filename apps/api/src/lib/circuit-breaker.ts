export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerOptions {
  failureThreshold: number    // fallos consecutivos para abrir
  successThreshold: number    // éxitos consecutivos en HALF_OPEN para cerrar
  timeout: number             // ms en estado OPEN antes de pasar a HALF_OPEN
  name: string
}

export interface CircuitBreakerStatus {
  name: string
  state: CircuitState
  failures: number
  successes: number
  lastFailureAt: number | null
  nextAttemptAt: number | null
  totalCalls: number
  totalFailures: number
  totalSuccesses: number
}

type StateChangeListener = (status: CircuitBreakerStatus) => void

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failures = 0
  private successes = 0
  private lastFailureAt: number | null = null
  private totalCalls = 0
  private totalFailures = 0
  private totalSuccesses = 0
  private listeners: StateChangeListener[] = []

  constructor(private readonly options: CircuitBreakerOptions) {}

  private transition(newState: CircuitState) {
    this.state = newState
    if (newState === 'CLOSED') {
      this.failures = 0
      this.successes = 0
    } else if (newState === 'HALF_OPEN') {
      this.successes = 0
    }
    this.notify()
  }

  private notify() {
    const status = this.getStatus()
    this.listeners.forEach((fn) => fn(status))
  }

  onStateChange(fn: StateChangeListener) {
    this.listeners.push(fn)
    return () => { this.listeners = this.listeners.filter((l) => l !== fn) }
  }

  getStatus(): CircuitBreakerStatus {
    const nextAttemptAt =
      this.state === 'OPEN' && this.lastFailureAt
        ? this.lastFailureAt + this.options.timeout
        : null
    return {
      name: this.options.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureAt: this.lastFailureAt,
      nextAttemptAt,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++

    if (this.state === 'OPEN') {
      const now = Date.now()
      const nextAttempt = (this.lastFailureAt ?? 0) + this.options.timeout
      if (now < nextAttempt) {
        throw new CircuitOpenError(this.options.name, nextAttempt - now)
      }
      // Tiempo de espera cumplido: pasar a HALF_OPEN
      this.transition('HALF_OPEN')
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (err) {
      if (err instanceof CircuitOpenError) throw err
      this.onFailure()
      throw err
    }
  }

  private onSuccess() {
    this.totalSuccesses++
    if (this.state === 'HALF_OPEN') {
      this.successes++
      if (this.successes >= this.options.successThreshold) {
        this.transition('CLOSED')
      } else {
        this.notify()
      }
    } else {
      this.failures = 0
    }
  }

  private onFailure() {
    this.totalFailures++
    this.failures++
    this.lastFailureAt = Date.now()
    if (this.state === 'HALF_OPEN' || this.failures >= this.options.failureThreshold) {
      this.transition('OPEN')
    } else {
      this.notify()
    }
  }

  // Para la demo: forzar apertura
  forceOpen() {
    this.lastFailureAt = Date.now()
    this.transition('OPEN')
  }

  // Para la demo: forzar cierre
  forceClose() {
    this.transition('CLOSED')
  }
}

export class CircuitOpenError extends Error {
  constructor(public readonly circuit: string, public readonly retryAfterMs: number) {
    super(`Circuit "${circuit}" is OPEN. Retry after ${Math.ceil(retryAfterMs / 1000)}s`)
    this.name = 'CircuitOpenError'
  }
}

// Instancia global del circuit breaker de la "parrilla"
export const grillaCircuit = new CircuitBreaker({
  name: 'grilla',
  failureThreshold: 3,   // se abre al 3er fallo consecutivo
  successThreshold: 2,   // necesita 2 éxitos para cerrarse desde HALF_OPEN
  timeout: 15_000,       // 15s en OPEN antes de intentar HALF_OPEN
})
