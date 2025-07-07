from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from api import auth, meta
from models import Base, engine

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting Meta Ads Analytics Platform API...")
    # Create database tables
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    print("Shutting down...")

app = FastAPI(
    title="Meta Ads Analytics API",
    description="Backend API for Meta Ads Analytics Platform",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(meta.router)

@app.get("/")
async def root():
    return {"message": "Meta Ads Analytics API", "status": "operational"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "0.1.0"}