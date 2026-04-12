# McDollars — Plan de Proyecto

> Una hamburguesería como excusa para enseñar tecnología.

---

## 1. Concepto Central

**McDollars** es una aplicación web de venta de hamburguesas que, por detrás, sirve como plataforma educativa interactiva. Cada sección de la app demuestra —con animaciones, simulaciones y explicaciones en contexto— un concepto tecnológico distinto usando la hamburguesería como analogía.

El usuario ve una app real de hamburguesas. El desarrollador aprende tecnología sin darse cuenta.

---

## 2. Stack Tecnológico

| Capa         | Tecnología                        | Razón                                      |
|--------------|-----------------------------------|--------------------------------------------|
| Frontend     | React + TypeScript + Vite         | Rápido, tipado, estándar de la industria   |
| Estilos      | Tailwind CSS                      | Utility-first, rápido de prototipar        |
| Animaciones  | Framer Motion                     | Para visualizar procesos en tiempo real    |
| Backend      | Node.js + Express + TypeScript    | Mismo lenguaje full-stack                  |
| Base de datos| PostgreSQL + Prisma ORM           | Relacional, ideal para pedidos e inventario|
| Cache        | Redis                             | Demostrar caching con ingredientes         |
| Cola mensajes| BullMQ (sobre Redis)              | Demostrar colas de pedidos                 |
| Contenedores | Docker + Docker Compose           | Facilita demos de Kubernetes localmente    |
| Orquestación | Kubernetes (Minikube para demos)  | El concepto estrella de la app             |
| Testing      | Vitest + Supertest                | Unit + Integration                         |

---

## 3. Estructura del Proyecto (Monorepo)

```
mcdollars/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── pages/          # Una page por concepto tecnológico
│   │   │   ├── components/     # Componentes compartidos (Burger, Counter, etc.)
│   │   │   ├── store/          # Estado global (Zustand)
│   │   │   └── api/            # Cliente HTTP hacia el backend
│   │   └── vite.config.ts
│   │
│   └── api/                    # Node.js backend
│       ├── src/
│       │   ├── routes/         # Endpoints REST
│       │   ├── services/       # Lógica de negocio
│       │   ├── repositories/   # Acceso a datos (Prisma)
│       │   ├── queues/         # BullMQ workers
│       │   └── middlewares/    # Auth, rate-limit, etc.
│       └── prisma/
│           └── schema.prisma
│
├── k8s/                        # Manifiestos de Kubernetes para demos
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml                # Horizontal Pod Autoscaler
│
├── docker-compose.yml
└── PLAN.md
```

---

## 4. Dashboard Principal

La página de inicio es un dashboard con **cards** que listan todos los módulos educativos. Cada card muestra:

- Nombre del concepto tecnológico
- Analogía hamburguesera en una línea
- Tags (ej: `backend`, `infraestructura`, `patrones`)
- Estado: `disponible` / `próximamente`

---

## 5. Módulos Educativos (Pages)

Cada página es funcional como app de hamburguesas Y tiene un panel lateral/modal que explica el concepto tecnológico en juego.

---

### Módulo 1 — Kubernetes & Autoscaling

**Analogía:** Es mediodía. Llegan 200 personas al local. El sistema detecta la cola y abre más cajas. Cuando la cola baja, las cajas adicionales cierran.

**Lo que demuestra:**
- Horizontal Pod Autoscaler (HPA)
- Requests per second (RPS)
- Cómo un Pod es un "cajero/cocinero" en el sistema

**Interacción en la app:**
- Slider que simula "cantidad de clientes llegando por minuto"
- Visualización de pods como empleados que aparecen/desaparecen
- Métricas en tiempo real: CPU usage, pedidos en cola, tiempo de respuesta
- Botón "stress test" que dispara muchos requests al backend real y el usuario ve cómo escala

**Diagrama conceptual:**
```
[Clientes] → [Load Balancer] → [Pod 1 (cajero)]
                              → [Pod 2 (cajero)]  ← HPA los crea automáticamente
                              → [Pod 3 (cajero)]
```

---

### Módulo 2 — Principios SOLID

**Analogía:** Diseñar bien los roles del restaurante.

| Principio | Rol en el restaurante |
|-----------|----------------------|
| **S** — Single Responsibility | El cajero solo toma pedidos. El cocinero solo cocina. El repartidor solo entrega. Nadie hace todo. |
| **O** — Open/Closed | El menú puede extenderse con nuevas hamburguesas sin cambiar la caja registradora. |
| **L** — Liskov Substitution | Un cocinero nuevo puede reemplazar al anterior sin cambiar el proceso. |
| **I** — Interface Segregation | El cocinero no necesita saber el precio. Solo recibe la orden de cocina. |
| **D** — Dependency Inversion | El sistema de pedidos no depende de si la cocina es de gas o eléctrica. Depende de la abstracción "cocina". |

**Interacción en la app:**
- Vista de "código malo vs código bueno" con el mismo caso (agregar una hamburguesa vegana)
- Live diff mostrando la refactorización
- Diagrama interactivo de clases/roles

---

### Módulo 3 — Microservicios vs Monolito

**Analogía:**
- **Monolito:** Un solo cocinero hace todo: toma el pedido, cocina, cobra y entrega.
- **Microservicios:** Hay un equipo separado para pedidos, cocina, pagos y delivery.

**Lo que demuestra:**
- Cuándo un monolito es suficiente (local chico)
- Cuándo escalar a microservicios (cadena con 500 locales)
- Comunicación entre servicios (HTTP síncrono vs mensajes asíncronos)
- Fallo de un servicio no tumba a los demás

**Interacción en la app:**
- Toggle "Monolito / Microservicios" que cambia la arquitectura visual
- Simulador: "apagar" el servicio de pagos y ver qué pasa en cada arquitectura

---

### Módulo 4 — Cola de Mensajes (Message Queue)

**Analogía:** El papel del pedido que va desde la caja hasta la cocina. La cocina toma los pedidos en orden. Si hay mucho trabajo, los pedidos esperan en la cola sin perderse.

**Lo que demuestra:**
- Productor / Consumidor
- FIFO (primer pedido en llegar, primero en cocinarse)
- Dead letter queue (pedido con ingrediente que no hay → va a DLQ)
- BullMQ en acción real

**Interacción en la app:**
- Pantalla que muestra la cola de pedidos en tiempo real
- Worker visible procesando de a uno
- Botón "sobrecargar cocina" para ver cómo crece la cola
- Visualización de reintentos y DLQ

---

### Módulo 5 — Caching con Redis

**Analogía:** Las hamburguesas más pedidas del día se preparan con anticipación y se ponen bajo la lámpara de calor. No hace falta cocinarlas cada vez desde cero.

**Lo que demuestra:**
- Cache hit vs cache miss
- TTL (Time To Live): la hamburguesa bajo la lámpara no puede estar más de 10 minutos
- Invalidación de caché: si cambia el precio, hay que tirar la caché del menú
- Estrategias: cache-aside, write-through

**Interacción en la app:**
- Endpoint del menú con métricas: "respondido desde cache" vs "consultado a DB"
- Contador de cache hits/misses en tiempo real
- Control de TTL interactivo

---

### Módulo 6 — Rate Limiting

**Analogía:** En la hora pico, solo se acepta 1 pedido por persona por vez para que el sistema no colapse. Si mandás demasiadas requests, la caja te dice "aguarda un momento".

**Lo que demuestra:**
- Token bucket / sliding window
- HTTP 429 Too Many Requests
- Por qué el rate limiting protege el sistema
- DDoS en pequeña escala

**Interacción en la app:**
- Botón "Spam pedidos" que dispara requests masivas
- Visualización del throttling en tiempo real
- Configuración del límite en vivo

---

### Módulo 7 — Patrón Circuit Breaker

**Analogía:** La parrilla se rompe. En vez de que todos los pedidos de hamburguesas fallen con error, el sistema automáticamente ofrece wraps (el fallback) hasta que la parrilla vuelva.

**Lo que demuestra:**
- Estados del circuit breaker: Closed / Open / Half-Open
- Fallback graceful
- Evitar cascada de errores
- Tiempo de recuperación

**Interacción en la app:**
- Botón "romper la parrilla" que abre el circuit
- Visualización del estado en tiempo real (semáforo)
- Timer de half-open
- Pedidos redirigidos al fallback visualmente

---

### Módulo 8 — REST API Design

**Analogía:** El menú es la API. Los métodos HTTP son las acciones que podés hacer.

**Lo que demuestra:**
- GET /menu → ver el menú
- POST /orders → hacer un pedido
- PUT /orders/:id → modificar pedido
- DELETE /orders/:id → cancelar pedido
- Status codes: 200, 201, 400, 404, 409, 500
- Idempotencia

**Interacción en la app:**
- API Explorer integrado (estilo Postman simplificado)
- Cada request muestra el HTTP method, body, response y status code
- Explicación del "por qué ese status code"

---

### Módulo 9 — CI/CD Pipeline

**Analogía:** Lanzar una nueva hamburguesa al menú. Primero se prueba en cocina (dev), luego en el local de prueba (staging), luego en todos los locales (producción). Si algo falla en el paso de calidad, no llega a producción.

**Lo que demuestra:**
- Stages: build → test → staging → prod
- Rollback automático
- Feature flags (la nueva burger solo se ve en ciertos locales)
- Blue/Green deployment

**Interacción en la app:**
- Visualización animada del pipeline
- Botón "introducir bug" para ver cómo el pipeline lo frena
- Simulación de rollback

---

### Módulo 10 — CAP Theorem

**Analogía:** Red de locales de la franquicia. Si la red se corta entre el depósito central y un local, ¿el local sigue vendiendo aunque el stock pueda estar desactualizado (disponibilidad) o frena todo hasta reconectarse (consistencia)?

**Lo que demuestra:**
- Consistency, Availability, Partition Tolerance
- Por qué solo podés elegir 2 de 3
- SQL vs NoSQL en este contexto

**Interacción en la app:**
- Simulador de red particionada
- Toggle entre modos CP y AP
- Visualización de divergencia de datos

---

## 6. Modelo de Datos (Base)

```prisma
model Product {
  id          String   @id @default(cuid())
  name        String
  description String
  price       Float
  category    String   // burger, side, drink
  available   Boolean  @default(true)
  createdAt   DateTime @default(now())
  orderItems  OrderItem[]
}

model Order {
  id          String      @id @default(cuid())
  status      OrderStatus @default(PENDING)
  total       Float
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  items       OrderItem[]
}

model OrderItem {
  id        String  @id @default(cuid())
  quantity  Int
  unitPrice Float
  productId String
  orderId   String
  product   Product @relation(fields: [productId], references: [id])
  order     Order   @relation(fields: [orderId], references: [id])
}

enum OrderStatus {
  PENDING
  COOKING
  READY
  DELIVERED
  CANCELLED
}
```

---

## 7. Fases de Desarrollo

### Fase 1 — Base (Sprint 1-2)
- [ ] Setup monorepo (npm workspaces)
- [ ] Backend: Express + Prisma + PostgreSQL
- [ ] Frontend: React + Vite + Tailwind
- [ ] Docker Compose con todos los servicios
- [ ] CRUD básico de productos y pedidos
- [ ] Dashboard con cards de módulos (sin contenido educativo aún)

### Fase 2 — Módulos Core (Sprint 3-5)
- [ ] Módulo Kubernetes / Autoscaling (requiere Minikube)
- [ ] Módulo SOLID (principalmente frontend + backend side-by-side)
- [ ] Módulo Cola de Mensajes (BullMQ real)
- [ ] Módulo Caching (Redis real)

### Fase 3 — Módulos Avanzados (Sprint 6-8)
- [ ] Módulo Microservicios
- [ ] Módulo Circuit Breaker
- [ ] Módulo Rate Limiting
- [ ] Módulo REST API Design

### Fase 4 — Polish (Sprint 9-10)
- [ ] Módulo CI/CD
- [ ] Módulo CAP Theorem
- [ ] Animaciones y UX general
- [ ] Documentación inline

---

## 8. Convenciones de Código

- TypeScript estricto en frontend y backend
- ESLint + Prettier
- Commits en inglés siguiendo Conventional Commits (`feat:`, `fix:`, `docs:`)
- Branches: `feature/<nombre>`, `fix/<nombre>`
- Cada módulo educativo vive en su propia carpeta con su lógica aislada

---

## 9. Próximos Pasos Inmediatos

1. Revisar y aprobar este documento
2. Definir qué módulos educativos priorizar para la primera demo
3. Iniciar Fase 1: scaffolding del monorepo, Docker Compose, y UI base del dashboard
4. Decidir si Kubernetes se demuestra con Minikube local o con un proveedor cloud

---

*Documento vivo — actualizar con cada decisión de diseño relevante.*
