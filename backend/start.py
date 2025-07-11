#!/usr/bin/env python3
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"🚀 Starting Railway Meta API server on port {port}")
    
    # Import the app from railway_main
    from railway_main import app
    
    uvicorn.run(app, host="0.0.0.0", port=port)