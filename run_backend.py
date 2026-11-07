"""
Run PowerPulse Backend Development Server.
Usage: python run_backend.py
"""
import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print(" Starting PowerPulse AI Backend Server on http://localhost:8000")
    print(" Interactive Swagger Docs: http://localhost:8000/docs")
    print("=" * 60)
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)

