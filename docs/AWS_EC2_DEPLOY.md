# Guía de Despliegue en AWS Academy (Amazon EC2 - Ubuntu Server)

Arquitectura: 100% basada en Máquinas Virtuales (Amazon EC2 + PostgreSQL + Nginx + Gunicorn/Uvicorn), sin servicios Serverless, optimizada para latencia < 300 ms y sin cold starts.

## 1. Lanzar Instancia EC2 y Configurar Security Group
1. En la consola de **AWS Academy / EC2**, haz clic en **Launch instance**:
   - **OS Image**: Ubuntu Server 24.04 LTS (o 22.04 LTS), arquitectura x86_64.
   - **Instance type**: `t3.small` (recomendado) o `t2.micro` / `t3.micro`.
   - **Key pair**: Crea o selecciona tu llave `.pem`.
2. Configura las reglas entrantes (**Inbound Rules**) del **Security Group**:
   - `SSH (TCP 22)`: Tu IP pública (administración por terminal).
   - `HTTP (TCP 80)`: `0.0.0.0/0` (acceso de usuarios web y dispositivos ESP32).
   - `HTTPS (TCP 443)`: `0.0.0.0/0` (opcional con Certbot/SSL).
   - `Custom TCP (8000)`: `0.0.0.0/0` (solo si deseas probar FastAPI directo; en producción Nginx atiende en el puerto 80 y redirige `/api/` internamente a `127.0.0.1:8000`).
3. Conéctate por SSH:
   ```bash
   chmod 400 tu-llave.pem
   ssh -i tu-llave.pem ubuntu@<IP_PUBLICA_EC2>
   ```

## 2. Instalar Dependencias del Sistema (Python, PostgreSQL, Nginx, Node.js)
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-venv python3-pip postgresql postgresql-contrib nginx git curl

# Instalar Node.js 22 LTS (para compilar el frontend React)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

## 3. Configurar PostgreSQL
```bash
sudo -u postgres psql -c "CREATE USER braille_user WITH PASSWORD 'TuPasswordFuerte2026!';"
sudo -u postgres psql -c "CREATE DATABASE braille_saas OWNER braille_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE braille_saas TO braille_user;"
```

## 4. Clonar Proyecto y Desplegar Backend FastAPI
```bash
sudo mkdir -p /opt/braille-saas
sudo chown -R ubuntu:ubuntu /opt/braille-saas
cd /opt/braille-saas
# Copia o clona tu repositorio aquí

cd /opt/braille-saas/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
nano .env
# Ajusta DATABASE_URL, JWT_SECRET_KEY (generado con: openssl rand -hex 32) y CORS_ORIGINS
```

## 5. Compilar Frontend y Configurar Nginx
```bash
cd /opt/braille-saas
npm install
npm run build

sudo mkdir -p /var/www/braille-saas
sudo cp -r dist /var/www/braille-saas/
sudo cp deploy/nginx.conf /etc/nginx/sites-available/braille-saas
sudo ln -sf /etc/nginx/sites-available/braille-saas /etc/nginx/sites-enabled/braille-saas
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## 6. Crear Servicio systemd para Backend Inmortal
```bash
sudo cp /opt/braille-saas/deploy/braille-backend.service /etc/systemd/system/braille-backend.service
sudo systemctl daemon-reload
sudo systemctl enable braille-backend
sudo systemctl start braille-backend
sudo systemctl status braille-backend
```
