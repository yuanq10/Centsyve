from datetime import date, timedelta
from typing import List

CATEGORY_TIPS = {
    "Food": [
        "Meal prep on Sundays to cut weekday dining costs.",
        "Set a weekly grocery budget and stick to it.",
        "Limit coffee shop visits to twice a week.",
    ],
    "Transport": [
        "Carpool or use public transit for your commute.",
        "Combine errands into single trips to save on fuel.",
        "Walk or cycle for short trips under 2km.",
    ],
    "Shopping": [
        "Apply a 48-hour waiting rule before non-essential purchases.",
        "Unsubscribe from retailer emails to reduce impulse buys.",
        "Buy secondhand for clothing and electronics.",
    ],
    "Entertainment": [
        "Audit subscriptions — cancel ones used less than twice a month.",
        "Look for free or discounted local events.",
        "Host gatherings at home instead of going out.",
    ],
    "Bills": [
        "Call providers annually to negotiate better rates.",
        "Switch to a cheaper phone or internet plan.",
        "Review insurance policies every year.",
    ],
    "Health": [
        "Use in-network providers to reduce out-of-pocket costs.",
        "Compare pharmacy prices for regular medications.",
        "Check if your insurer covers gym membership discounts.",
    ],
    "Other": [
        "Track every purchase this week to spot unnecessary spending.",
        "Set a firm monthly discretionary spending limit.",
    ],
}


def analyze_goal(goal, transactions: List) -> dict:
    today = date.today()
    days_remaining = max((goal.target_date - today).days, 1)
    months_remaining = days_remaining / 30

    period_start = today - timedelta(days=days_remaining)
    period_txs = [t for t in transactions if t.date and t.date >= period_start]

    period_months = max(days_remaining / 30, 0.5)
    period_income = sum(t.amount for t in period_txs if t.type == "income")
    period_expenses = sum(t.amount for t in period_txs if t.type == "expense")

    monthly_income = period_income / period_months
    monthly_expenses = period_expenses / period_months
    monthly_savings = monthly_income - monthly_expenses
    required_monthly_savings = goal.target_amount / months_remaining

    on_track = monthly_savings >= required_monthly_savings
    monthly_gap = max(required_monthly_savings - monthly_savings, 0)

    # Monthly average spend per category
    category_spending = {}
    for t in period_txs:
        if t.type == "expense":
            cat = t.category or "Other"
            category_spending[cat] = category_spending.get(cat, 0) + t.amount / period_months

    # Built-in suggestions for top spending categories when not on track
    suggestions = []
    if not on_track:
        sorted_cats = sorted(category_spending.items(), key=lambda x: x[1], reverse=True)
        for cat, monthly_spend in sorted_cats[:3]:
            tips = CATEGORY_TIPS.get(cat, CATEGORY_TIPS["Other"])
            suggestions.append({
                "category": cat,
                "monthly_spend": round(monthly_spend, 2),
                "tip": tips[0],
            })
        if not suggestions:
            suggestions.append({
                "category": "General",
                "monthly_spend": 0,
                "tip": (
                    f"You need an extra ${monthly_gap:.2f}/month. "
                    "Review your largest expense categories and look for areas to cut back."
                ),
            })

    return {
        "on_track": on_track,
        "monthly_savings": round(monthly_savings, 2),
        "required_monthly_savings": round(required_monthly_savings, 2),
        "monthly_gap": round(monthly_gap, 2),
        "months_remaining": round(months_remaining, 1),
        "category_spending": {k: round(v, 2) for k, v in category_spending.items()},
        "suggestions": suggestions,
    }
