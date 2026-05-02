from pydantic import BaseModel
from datetime import date as Date
from typing import Optional


class GoalCreate(BaseModel):
    name: str
    target_amount: float
    target_date: Date
    notes: Optional[str] = None


class GoalOut(BaseModel):
    id: int
    name: str
    target_amount: float
    target_date: Date
    notes: Optional[str]

    model_config = {"from_attributes": True}


class GoalAnalysis(BaseModel):
    on_track: bool
    monthly_savings: float
    required_monthly_savings: float
    monthly_gap: float
    months_remaining: float
    category_spending: dict
    suggestions: list


class GoalAIAdvice(BaseModel):
    advice: str
