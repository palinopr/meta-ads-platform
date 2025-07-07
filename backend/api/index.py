from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Import routes
from .auth import router as auth_router
from .meta import router as meta_router

load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Meta Ads Analytics API",
    description="Backend API for Meta Ads Analytics Platform",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://frontend-ten-eta-42.vercel.app",
        "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(meta_router)

@app.get("/")
async def root():
    return {"message": "Meta Ads Analytics API", "status": "operational"}

@app.get("/api")
async def api_root():
    return {"message": "Meta Ads Analytics API", "status": "operational"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "0.1.0"}