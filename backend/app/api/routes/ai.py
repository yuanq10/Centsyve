from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.ai import InsightsOut, ChatRequest, ChatResponse
from app.services import ai as ai_service
from app.api.routes.auth import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])


def _get_user_transactions(user_id: int, db: Session):
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.date.desc())
        .limit(100)
        .all()
    )


@router.get("/insights", response_model=InsightsOut)
def get_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transactions = _get_user_transactions(current_user.id, db)
    try:
        insights = ai_service.get_spending_insights(transactions)
        recommendations = ai_service.get_budget_recommendations(transactions)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    return InsightsOut(spending_insights=insights, budget_recommendations=recommendations)


@router.post("/chat", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.message.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty")
    transactions = _get_user_transactions(current_user.id, db)
    try:
        reply = ai_service.chat(payload.message, transactions)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    return ChatResponse(reply=reply)
