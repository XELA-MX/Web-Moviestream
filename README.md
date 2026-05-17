# MovieStream — Modelo documental y app web

**Demo en vivo:** [https://act4.x3no.space](https://act4.x3no.space)

Proyecto académico que migra un esquema relacional de una plataforma de streaming (Oracle) a **MongoDB**, documenta el modelo en [`model.md`](model.md) y expone una **interfaz web** para explorar y editar datos.

## Qué hace el proyecto

1. **Migración** (`Migracion/`): lee tablas en Oracle Autonomous Database (conexión por wallet) y vuelca **7 colecciones** en MongoDB: `movies`, `customers`, `activities`, `users`, `devices`, `subscription_plans`, `user_sessions`.
2. **App web** (`web/`): CRUD sobre **películas** (géneros embebidos) y **actividades** (referencias a clientes/películas + snapshots desnormalizados).
3. **Docker** (`web/Dockerfile`): imagen lista para desplegar la app (p. ej. Azure Container Apps) apuntando a MongoDB o **Cosmos DB (API for MongoDB)**.

## Stack y por qué

| Capa | Tecnología | Motivo |
|------|------------|--------|
| Origen | Oracle AD + wallet mTLS | Datos del curso / entorno cloud |
| Migración | Python 3, `oracledb`, `pymongo` | Mismo ecosistema que el script de clase; control total del mapeo fila → documento |
| Base destino | MongoDB (o Cosmos API MongoDB) | Modelo documental, embebidos y referencias |
| Web | Node.js, Express, EJS | Interfaz simple sin SPA; HTML en servidor, fácil de desplegar en contenedor |
| Deploy | Docker + Compose | Solo empaqueta `web/`; la BD es externa vía `MONGO_URI` |

## Requisitos previos

- **Python 3.12+** (migración)
- **Node.js 20+** (app local)
- **Docker** (opcional, para contenedor)
- Instancia **MongoDB** accesible (local, Atlas, VM o Cosmos DB)
- Cuenta **Oracle AD** con wallet descargado (solo para migrar)

## Cómo correrlo desde cero

### 1. Clonar y preparar carpetas

```bash
git clone <tu-repo>
cd Web-Moviestream
```

### 2. Seeding de datos (Oracle → MongoDB)

```bash
cd Migracion
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install oracledb pymongo
```

Copia y edita variables:

```bash
cp .env.example .env
```

En `.env` define al menos:

```env
ORACLE_USER=ADMIN
ORACLE_PASSWORD=...
ORACLE_WALLET_PATH=./Wallet_TC3004B
ORACLE_WALLET_PASSWORD=...    # passphrase del ewallet.pem al descargar el wallet
MONGO_URI=mongodb://usuario:pass@host:27017/moviestream?authSource=admin
MONGO_DB_NAME=moviestream
```

Coloca el wallet descomprimido en `Migracion/Wallet_TC3004B/` (`tnsnames.ora`, `ewallet.pem`, etc.).

Ejecuta la migración (borra y recrea cada colección):

```bash
python main.py
```

Verás conteos por colección e índices creados al final.

### 3. App web (local)

```bash
cd ../web
cp .env.example .env
# Misma MONGO_URI y MONGO_DB_NAME que en Migracion
npm install
npm start
```

Abre **http://localhost:3000** (o el `PORT` de tu `.env`).

La instancia desplegada está en **https://act4.x3no.space** (contenedor Docker + MongoDB remoto).

### 4. App web (Docker)

```bash
cd web
cp .env.example .env   # configurar MONGO_URI (Cosmos o MongoDB)
docker compose build
docker compose up -d
```

Puerto publicado: `${PORT}:3000` según tu `.env`. Healthcheck: `GET /health`.

**Cosmos DB:** usa la connection string del portal Azure en `MONGO_URI`; suele incluir `ssl=true` y `retrywrites=false`. Ver comentarios en `web/.env.example`.

## Estructura del repositorio

```
Web-Moviestream/
├── Migracion/          # ETL Oracle → MongoDB
├── web/                # Express + EJS + Docker
├── model.md            # Diseño documental
├── REFLECTION.md       # Respuestas de reflexión
├── docs/               # Capturas para el README
└── README.md
```

## Captura de la app

Página de inicio con conteos y acceso a películas y actividades:

![MovieStream — inicio](docs/app-screenshot.png)

Listado de películas con búsqueda por título, género y año:

![MovieStream — películas](docs/app-movies.png)

## Documentación adicional

- Modelo y decisiones embed/reference: [`model.md`](model.md)
- Reflexión del proyecto: [`REFLECTION.md`](REFLECTION.md)

## Notas de seguridad

No subas `.env`, wallets (`Wallet_*`) ni contraseñas al repositorio. Están listados en [`.gitignore`](.gitignore).
