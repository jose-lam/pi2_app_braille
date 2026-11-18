import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers import braille, devices, rooms, tenants

load_dotenv()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="BrailleCloud SaaS API",
    description="Plataforma Multi-Tenant para lectores Braille ESP32 con sincronización en la nube.",
    version="2.0.0",
    lifespan=lifespan,
)

raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tenants.router)
app.include_router(rooms.router)
app.include_router(devices.router)
app.include_router(braille.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "braille-saas-fastapi"}
