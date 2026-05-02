from pydantic import BaseModel, field_validator
from datetime import date as Date, date
from typing import Optional


class GoalCreate(BaseModel):
    name: str
    target_amount: float
    target_date: Date
    notes: Optional[str] = None

    @field_validator("target_date")
    @classmethod
    def must_be_future(cls, v):
        if v <= date.today():
            raise ValueError("Target date must be in the future.")
        return v


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
