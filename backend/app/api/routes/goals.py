from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.goal import GoalCreate, GoalOut, GoalAnalysis, GoalAIAdvice
from app.services.goal_analysis import analyze_goal
from app.services import ai as ai_service
from app.api.routes.auth import get_current_user

router = APIRouter(prefix="/goals", tags=["goals"])


def _get_transactions(user_id: int, db: Session):
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.date.desc())
        .all()
    )


@router.get("/", response_model=List[GoalOut])
def list_goals(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Goal).filter(Goal.user_id == current_user.id).order_by(Goal.target_date).all()


@router.post("/", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = Goal(user_id=current_user.id, **payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    db.delete(goal)
    db.commit()


@router.get("/{goal_id}/analysis", response_model=GoalAnalysis)
def get_analysis(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    transactions = _get_transactions(current_user.id, db)
    return analyze_goal(goal, transactions)


@router.get("/{goal_id}/ai-advice", response_model=GoalAIAdvice)
def get_ai_advice(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    transactions = _get_transactions(current_user.id, db)
    analysis = analyze_goal(goal, transactions)
    try:
        advice = ai_service.get_goal_advice(
            goal.name,
            goal.target_amount,
            analysis["months_remaining"],
            analysis["monthly_gap"],
            analysis["category_spending"],
        )
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    return GoalAIAdvice(advice=advice)
