import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { MenuPage } from './pages/MenuPage'
import { OrdersPage } from './pages/OrdersPage'
import { KubernetesPage } from './pages/modules/KubernetesPage'
import { SolidPage } from './pages/modules/SolidPage'
import { QueuePage } from './pages/modules/QueuePage'
import { CachingPage } from './pages/modules/CachingPage'
import { RateLimitPage } from './pages/modules/RateLimitPage'
import { CircuitBreakerPage } from './pages/modules/CircuitBreakerPage'
import { MicroservicesPage } from './pages/modules/MicroservicesPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/modules/kubernetes" element={<KubernetesPage />} />
        <Route path="/modules/solid" element={<SolidPage />} />
        <Route path="/modules/queue" element={<QueuePage />} />
        <Route path="/modules/caching" element={<CachingPage />} />
        <Route path="/modules/rate-limit" element={<RateLimitPage />} />
        <Route path="/modules/circuit-breaker" element={<CircuitBreakerPage />} />
        <Route path="/modules/microservices" element={<MicroservicesPage />} />
      </Route>
    </Routes>
  )
}
