from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import Base, engine
from app.api.routes import auth, transactions, dashboard, ai
import app.models.user        # ensure models are registered before create_all
import app.models.transaction

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Centsyve API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(dashboard.router)
app.include_router(ai.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
