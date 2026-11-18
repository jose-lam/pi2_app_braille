# BrailleCloud (`pi2_app_braille`)

Plataforma SaaS Multi-Tenant para gestión, sincronización y lectura en tiempo real de celdas Braille de 6 puntos con hardware **ESP32**.

## Arquitectura del Sistema

El sistema implementa una jerarquía multi-tenant aislada en **PostgreSQL**:

```text
Institución (Tenant)
 └── Salones (Room + Wi-Fi autorizado + Restricción por IP pública)
      ├── Computadora Global (Sesión web del docente / emisor de texto)
      └── Dispositivos ESP32 (Tokens únicos X-ESP32-Token + telemetría)
```

- **Backend (`backend/`)**: API REST en **Python 3.11+** con **FastAPI**, **SQLAlchemy**, **PostgreSQL**, contraseñas con **bcrypt**, autenticación web con **JWT** y autenticación de hardware mediante `X-ESP32-Token`.
- **Frontend (`src/`)**: SPA en **React + TypeScript + Tailwind CSS** con panel de control por salón, carga de archivos `.txt`, celda Braille interactiva (5 actuadores físicos + extensión virtual P6), grilla de telemetría ESP32 en vivo y barra de reproducción con modos **Libre** y **Sincronizado**.
- **Firmware (`firmware/braille_esp32/braille_esp32.ino`)**: Cliente ESP32 con botones `INPUT_PULLUP` (`GPIO 15`, `GPIO 2`, `GPIO 0`), 5 salidas físicas (`GPIO 23, 33, 26, 32, 25`), almacenamiento persistente en NVS (`Preferences.h`) y **Portal Cautivo** (`BrailleReader-Setup` en `192.168.4.1`) activado al faltar credenciales o mantener `GPIO 15` por 5 segundos.
- **Infraestructura (`deploy/`, `docs/`)**: Configuración de **Nginx**, servicio `systemd` (`gunicorn` + `uvicorn.workers.UvicornWorker`) y guía de despliegue en **Amazon EC2 (Ubuntu Server)**.

## Estructura del Repositorio

```text
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth.py
│   ├── braille_map.py
│   ├── requirements.txt
│   ├── .env.example
│   └── routers/
│       ├── tenants.py
│       ├── rooms.py
│       ├── devices.py
│       └── braille.py
├── src/
│   ├── api/client.ts
│   ├── components/
│   ├── data/firmwareTemplate.ts
│   ├── App.tsx
│   └── types.ts
├── firmware/
│   └── braille_esp32/braille_esp32.ino
├── deploy/
│   ├── nginx.conf
│   └── braille-backend.service
└── docs/
    └── AWS_EC2_DEPLOY.md
```

## Ejecución en Desarrollo Local

### 1. Backend FastAPI + PostgreSQL

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Configura DATABASE_URL y JWT_SECRET_KEY en backend/.env
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend React (Vite)

```bash
npm install
npm run dev
```

La interfaz se sirve en `http://localhost:3000` y redirige automáticamente `/api/*` hacia `http://127.0.0.1:8000`.

## Despliegue en Producción (Amazon EC2)

Consulta la guía completa en [`docs/AWS_EC2_DEPLOY.md`](docs/AWS_EC2_DEPLOY.md).
