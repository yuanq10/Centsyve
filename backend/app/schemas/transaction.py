from pydantic import BaseModel
from datetime import date as Date
from typing import Optional


class ScannedItem(BaseModel):
    name: str
    price: float


class ReceiptScanOut(BaseModel):
    amount: Optional[float]
    date: Optional[Date]
    merchant: Optional[str]
    suggested_category: str = "Other"
    items: list[ScannedItem] = []
    confidence: float = 0.0
    warnings: list[str] = []
    raw_text: str


class TransactionCreate(BaseModel):
    type: str                       # "income" or "expense"
    amount: float
    category: Optional[str] = None
    date: Optional[Date] = None
    merchant: Optional[str] = None
    description: Optional[str] = None


class TransactionOut(BaseModel):
    id: int
    type: str
    amount: float
    category: Optional[str]
    date: Optional[Date]
    merchant: Optional[str]
    description: Optional[str]

    model_config = {"from_attributes": True}
