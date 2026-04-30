from pydantic import BaseModel


class InsightsOut(BaseModel):
    spending_insights: str
    budget_recommendations: str


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
