import { Router } from 'express'
import { execSync } from 'child_process'
import os from 'os'

export const metricsRouter = Router()

interface PodInfo {
  name: string
  status: 'Running' | 'Pending' | 'Terminating'
  ready: boolean
  restarts: number
  age: string
  cpu?: string
}

interface MetricsResponse {
  source: 'kubernetes' | 'simulated'
  pods: PodInfo[]
  hpa: {
    minReplicas: number
    maxReplicas: number
    currentReplicas: number
    desiredReplicas: number
    cpuUtilization: number | null
  }
  system: {
    cpuCount: number
    loadAvg: number[]
    freeMemMb: number
    totalMemMb: number
  }
}

function tryKubectl(): PodInfo[] | null {
  try {
    const raw = execSync(
      'kubectl get pods -n mcdollars -l app=mcdollars-api --no-headers 2>/dev/null',
      { timeout: 3000 }
    ).toString()

    if (!raw.trim()) return null

    return raw
      .trim()
      .split('\n')
      .map((line) => {
        const parts = line.trim().split(/\s+/)
        return {
          name: parts[0] ?? 'unknown',
          ready: parts[1]?.startsWith('1') ?? false,
          status: (parts[2] as PodInfo['status']) ?? 'Pending',
          restarts: parseInt(parts[3] ?? '0', 10),
          age: parts[4] ?? '?',
        }
      })
  } catch {
    return null
  }
}

function tryKubectlHPA() {
  try {
    const raw = execSync(
      'kubectl get hpa mcdollars-api-hpa -n mcdollars --no-headers 2>/dev/null',
      { timeout: 3000 }
    ).toString()
    if (!raw.trim()) return null
    const parts = raw.trim().split(/\s+/)
    return {
      minReplicas: parseInt(parts[3] ?? '1', 10),
      maxReplicas: parseInt(parts[4] ?? '10', 10),
      currentReplicas: parseInt(parts[5] ?? '1', 10),
      desiredReplicas: parseInt(parts[6] ?? '1', 10),
      cpuUtilization: parts[1] !== '<unknown>' ? parseInt(parts[1] ?? '0', 10) : null,
    }
  } catch {
    return null
  }
}

// Simula carga progresiva basada en los requests recibidos
let simulatedLoad = 0
let simulatedPods = 1

metricsRouter.post('/simulate-load', (req, res) => {
  const { rps = 10 } = req.body as { rps?: number }
  simulatedLoad = Math.min(rps, 200)
  // Escala pods según carga: 1 pod por cada 20 RPS (igual al HPA)
  const desired = Math.min(Math.max(1, Math.ceil(simulatedLoad / 20)), 10)
  simulatedPods = desired
  res.json({ simulatedLoad, simulatedPods })
})

metricsRouter.post('/simulate-reset', (_req, res) => {
  simulatedLoad = 0
  simulatedPods = 1
  res.json({ simulatedLoad, simulatedPods })
})

metricsRouter.get('/', (_req, res) => {
  const k8sPods = tryKubectl()
  const k8sHpa = tryKubectlHPA()
  const isK8s = k8sPods !== null

  const system = {
    cpuCount: os.cpus().length,
    loadAvg: os.loadavg(),
    freeMemMb: Math.round(os.freemem() / 1024 / 1024),
    totalMemMb: Math.round(os.totalmem() / 1024 / 1024),
  }

  if (isK8s && k8sPods) {
    const response: MetricsResponse = {
      source: 'kubernetes',
      pods: k8sPods,
      hpa: k8sHpa ?? {
        minReplicas: 1,
        maxReplicas: 10,
        currentReplicas: k8sPods.length,
        desiredReplicas: k8sPods.length,
        cpuUtilization: null,
      },
      system,
    }
    return res.json(response)
  }

  // Simulación local
  const cpuUtil = simulatedPods > 0 ? Math.round((simulatedLoad / (simulatedPods * 20)) * 100) : 0
  const pods: PodInfo[] = Array.from({ length: simulatedPods }, (_, i) => ({
    name: `mcdollars-api-${Math.random().toString(36).slice(2, 9)}`,
    status: 'Running',
    ready: true,
    restarts: 0,
    age: `${Math.floor(Math.random() * 59) + 1}m`,
    cpu: `${Math.round(cpuUtil / simulatedPods)}%`,
  }))

  const response: MetricsResponse = {
    source: 'simulated',
    pods,
    hpa: {
      minReplicas: 1,
      maxReplicas: 10,
      currentReplicas: simulatedPods,
      desiredReplicas: simulatedPods,
      cpuUtilization: cpuUtil,
    },
    system,
  }
  res.json(response)
})
