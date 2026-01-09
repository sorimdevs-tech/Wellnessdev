from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from database import connect_to_mongo, close_mongo_connection
from routes import auth, users, hospitals, doctors, appointments, medical_records, settings, notifications
from routes.admin import router as admin_router
from routes.chat import router as chat_router
import traceback

app = FastAPI(
    title="Wellness API",
    description="Healthcare and Wellness Management API",
    version="1.0.0"
)

# Request validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"\n🚨 REQUEST VALIDATION ERROR on {request.method} {request.url}")
    print(f"📋 Request body: {await request.body()}")
    print(f"📋 Validation errors:")
    for error in exc.errors():
        print(f"  • Field: {error['loc']}, Error: {error['msg']}, Type: {error['type']}")
    print(f"❌ Validation failed with {len(exc.errors())} errors\n")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": str(await request.body())},
    )

# Global exception handler (excludes HTTPException which FastAPI handles)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        raise exc  # Let FastAPI handle HTTPException
    error_detail = str(exc)
    traceback_str = traceback.format_exc()
    print(f"Unhandled exception: {error_detail}")
    print(f"Traceback: {traceback_str}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": error_detail,
            "type": type(exc).__name__
        }
    )

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Event handlers
@app.on_event("startup")
async def startup():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown():
    await close_mongo_connection()

# Include routers
app.include_router(auth)
app.include_router(users)
app.include_router(hospitals)
app.include_router(doctors)
app.include_router(appointments)
app.include_router(medical_records)
app.include_router(settings)
app.include_router(notifications)
app.include_router(admin_router)
app.include_router(chat_router)

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "Wellness API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
