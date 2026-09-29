import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.routes import admin, auth, complaints, demo, map as map_routes, notifications, officer
from app.core.config import settings
from app.main_limiter import limiter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cityfix")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.run_inline_worker:
        from app.workers.memory_worker import start_inline_worker, stop_worker

        start_inline_worker()
        logger.info("Inline memory worker started")
        yield
        stop_worker()
    else:
        yield


app = FastAPI(
    title="CityFix API",
    description="AI civic intelligence platform with Hindsight-backed memory.",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files (local storage provider)
upload_dir = Path(settings.upload_dir)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(officer.router)
app.include_router(admin.router)
app.include_router(notifications.router)
app.include_router(map_routes.router)
app.include_router(demo.router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok", "hindsight_enabled": settings.hindsight_enabled}
