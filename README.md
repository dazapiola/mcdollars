# McDollars 🍔

> Una hamburguesería como excusa para enseñar tecnología.

McDollars es una aplicación web funcional de venta de hamburguesas que sirve como plataforma educativa interactiva. Cada módulo demuestra —con simulaciones y visualizaciones en tiempo real— un concepto tecnológico distinto usando la hamburguesería como analogía.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS + Framer Motion |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Base de datos | PostgreSQL 16 |
| Cache / Colas | Redis 7 + BullMQ |
| Contenedores | Docker + Docker Compose |
| Orquestación | Kubernetes (Minikube) |

---

## Estructura del proyecto

```
mcdollars/
├── apps/
│   ├── web/          # React frontend (Vite)
│   └── api/          # Node.js backend (Express + Prisma)
├── k8s/              # Manifiestos de Kubernetes
├── docker-compose.yml
├── PLAN.md           # Documento de diseño
└── README.md
```

---

## Levantar el proyecto

### Requisitos

- Node.js 20+
- Docker y Docker Compose

### Opción A — Docker Compose (recomendado)

```bash
# Levantar todos los servicios (PostgreSQL, Redis, API, Web)
docker compose up

# La app estará disponible en http://localhost:5173
# La API en http://localhost:3001
```

### Opción B — Desarrollo local

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar solo la base de datos y Redis
docker compose up postgres redis -d

# 3. Configurar variables de entorno del backend
cp apps/api/.env.example apps/api/.env

# 4. Aplicar migraciones y seed
npm run db:migrate -w apps/api
npm run db:seed -w apps/api

# 5. Levantar ambas apps en modo desarrollo
npm run dev
```

Frontend: `http://localhost:5173`
API: `http://localhost:3001`

---

## API Endpoints

### Productos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/products` | Listar productos (query: `?category=BURGER`) |
| GET | `/api/products/:id` | Obtener un producto |
| POST | `/api/products` | Crear producto |
| PATCH | `/api/products/:id` | Actualizar producto |

### Pedidos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/orders` | Listar todos los pedidos |
| GET | `/api/orders/:id` | Obtener un pedido |
| POST | `/api/orders` | Crear pedido |
| PATCH | `/api/orders/:id/status` | Actualizar estado |

### Health

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Estado de la API y la DB |

---

## Módulos educativos

Cada módulo es una página funcional de la app que además explica un concepto tecnológico.

| # | Módulo | Analogía | Estado |
|---|--------|----------|--------|
| 1 | Kubernetes & Autoscaling | Más clientes → más cajeros automáticos | Próximamente |
| 2 | SOLID Principles | Cada empleado tiene un rol bien definido | Próximamente |
| 3 | Microservicios vs Monolito | Un cocinero vs equipos especializados | Próximamente |
| 4 | Message Queue | El papel del pedido que va a la cocina | Próximamente |
| 5 | Caching con Redis | Hamburguesas pre-cocinadas bajo la lámpara | Próximamente |
| 6 | Rate Limiting | Un pedido por persona en hora pico | Próximamente |
| 7 | Circuit Breaker | La parrilla se rompe, se sirven wraps | Próximamente |
| 8 | REST API Design | El menú es la API | Disponible |
| 9 | CI/CD Pipeline | Lanzar una nueva burger con control de calidad | Próximamente |
| 10 | CAP Theorem | La franquicia sin conexión al depósito | Próximamente |

---

## Kubernetes (Minikube)

Los manifiestos viven en `k8s/`. Para ejecutar la demo de autoscaling:

```bash
# Iniciar Minikube
minikube start

# Aplicar manifiestos
kubectl apply -f k8s/

# Ver pods en tiempo real
kubectl get pods -w

# Ver el HPA en acción
kubectl get hpa -w
```

---

## Fases de desarrollo

- **Fase 1** (actual) — Base: monorepo, CRUD, dashboard, Docker
- **Fase 2** — Módulos core: Kubernetes, SOLID, Message Queue, Redis
- **Fase 3** — Módulos avanzados: Microservicios, Circuit Breaker, Rate Limiting
- **Fase 4** — Polish: CI/CD, CAP Theorem, animaciones, docs inline
