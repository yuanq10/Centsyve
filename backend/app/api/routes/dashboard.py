from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date, timedelta
from app.db.session import get_db
from app.models.transaction import Transaction
from app.models.user import User
from app.api.routes.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    total_income = sum(t.amount for t in rows if t.type == "income")
    total_expenses = sum(t.amount for t in rows if t.type == "expense")
    return {
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "balance": round(total_income - total_expenses, 2),
    }


@router.get("/trends")
def get_trends(
    period: str = Query("monthly", regex="^(weekly|monthly|yearly)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()

    if period == "weekly":
        # Last 7 days, one data point per day
        days = [today - timedelta(days=i) for i in range(6, -1, -1)]
        labels = [d.strftime("%a") for d in days]
        income, expenses = _aggregate_by_day(db, current_user.id, days)

    elif period == "monthly":
        # Last 6 months, one data point per month
        months = []
        for i in range(5, -1, -1):
            m = today.month - i
            y = today.year
            while m <= 0:
                m += 12
                y -= 1
            months.append((y, m))
        labels = [date(y, m, 1).strftime("%b") for y, m in months]
        income, expenses = _aggregate_by_month(db, current_user.id, months)

    else:  # yearly
        # Last 4 years, one data point per year
        years = list(range(today.year - 3, today.year + 1))
        labels = [str(y) for y in years]
        income, expenses = _aggregate_by_year(db, current_user.id, years)

    return {"labels": labels, "income": income, "expenses": expenses}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _aggregate_by_day(db, user_id, days):
    rows = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.date >= days[0],
            Transaction.date <= days[-1],
        )
        .all()
    )
    income = []
    expenses = []
    for d in days:
        inc = sum(t.amount for t in rows if t.type == "income" and t.date == d)
        exp = sum(t.amount for t in rows if t.type == "expense" and t.date == d)
        income.append(round(inc, 2))
        expenses.append(round(exp, 2))
    return income, expenses


def _aggregate_by_month(db, user_id, months):
    from calendar import monthrange
    income = []
    expenses = []
    for y, m in months:
        last_day = monthrange(y, m)[1]
        start = date(y, m, 1)
        end = date(y, m, last_day)
        rows = (
            db.query(Transaction)
            .filter(
                Transaction.user_id == user_id,
                Transaction.date >= start,
                Transaction.date <= end,
            )
            .all()
        )
        income.append(round(sum(t.amount for t in rows if t.type == "income"), 2))
        expenses.append(round(sum(t.amount for t in rows if t.type == "expense"), 2))
    return income, expenses


def _aggregate_by_year(db, user_id, years):
    income = []
    expenses = []
    for y in years:
        start = date(y, 1, 1)
        end = date(y, 12, 31)
        rows = (
            db.query(Transaction)
            .filter(
                Transaction.user_id == user_id,
                Transaction.date >= start,
                Transaction.date <= end,
            )
            .all()
        )
        income.append(round(sum(t.amount for t in rows if t.type == "income"), 2))
        expenses.append(round(sum(t.amount for t in rows if t.type == "expense"), 2))
    return income, expenses
