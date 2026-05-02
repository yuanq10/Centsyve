"""
AI financial advisor powered by the Anthropic Claude API.
All functions receive the user's transaction list and return plain text responses.
"""

import anthropic
from anthropic import APIError
from app.core.config import settings

_SYSTEM_PROMPT = """You are Centsyve AI, a friendly and practical personal finance advisor.
You have access to the user's transaction history and help them understand their spending,
build better budgets, and reach their savings goals.

Guidelines:
- Be concise, warm, and actionable — avoid generic advice.
- Always base insights on the actual transaction data provided.
- Use dollar amounts and percentages from the data when relevant.
- If data is sparse or missing, acknowledge it and give general guidance.
- Never ask for sensitive information like bank account numbers or passwords.
- Format responses with short paragraphs or bullet points for readability."""


def _get_client() -> anthropic.Anthropic:
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError(
            "Anthropic API key not configured. Set ANTHROPIC_API_KEY in your .env file."
        )
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def _format_transactions(transactions: list) -> str:
    if not transactions:
        return "No transactions recorded yet."

    lines = ["Date         | Type    | Amount   | Category       | Merchant"]
    lines.append("-" * 65)
    for t in transactions:
        date = str(t.date or "unknown").ljust(12)
        tx_type = t.type.ljust(7)
        amount = f"${t.amount:.2f}".ljust(9)
        category = (t.category or "—").ljust(15)
        merchant = t.merchant or "—"
        lines.append(f"{date} | {tx_type} | {amount} | {category} | {merchant}")

    total_income = sum(t.amount for t in transactions if t.type == "income")
    total_expenses = sum(t.amount for t in transactions if t.type == "expense")
    lines.append("-" * 65)
    lines.append(f"Total income: ${total_income:.2f}  |  Total expenses: ${total_expenses:.2f}  |  Balance: ${total_income - total_expenses:.2f}")
    return "\n".join(lines)


def get_spending_insights(transactions: list) -> str:
    client = _get_client()
    tx_text = _format_transactions(transactions)

    prompt = f"""Here is the user's complete transaction history:

{tx_text}

Please provide a spending analysis that includes:
1. A brief summary of their overall financial health
2. Top spending categories and what percentage of expenses each represents
3. Any notable spending patterns or trends you notice
4. 2-3 specific, actionable suggestions to improve their finances

Keep the response friendly and under 300 words."""

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
    except APIError as e:
        raise RuntimeError(f"Anthropic API error: {e.message}")
    return message.content[0].text


def get_budget_recommendations(transactions: list) -> str:
    client = _get_client()
    tx_text = _format_transactions(transactions)

    prompt = f"""Here is the user's transaction history:

{tx_text}

Based on this data, provide personalised budget recommendations:
1. Suggest a realistic monthly budget for each spending category
2. Identify any categories where they appear to be overspending
3. Recommend a savings target as a percentage of income
4. Give one concrete tip for each area where they can cut back

Keep the response practical and under 250 words."""

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
    except APIError as e:
        raise RuntimeError(f"Anthropic API error: {e.message}")
    return message.content[0].text


def chat(user_message: str, transactions: list) -> str:
    client = _get_client()
    tx_text = _format_transactions(transactions)

    context = f"""The user's transaction history for context:

{tx_text}

---
User question: {user_message}"""

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": context}],
        )
    except APIError as e:
        raise RuntimeError(f"Anthropic API error: {e.message}")
    return message.content[0].text


def get_goal_advice(goal_name: str, target_amount: float, months_remaining: float,
                    monthly_gap: float, category_spending: dict) -> str:
    client = _get_client()
    spending_lines = "\n".join(
        f"- {cat}: ${amt:.2f}/month"
        for cat, amt in sorted(category_spending.items(), key=lambda x: x[1], reverse=True)
    ) or "No expense data available yet."

    prompt = f"""The user has set a financial goal:
Goal: {goal_name}
Target amount: ${target_amount:.2f}
Time remaining: {months_remaining:.1f} months
Extra savings needed per month: ${monthly_gap:.2f}

Current monthly spending by category:
{spending_lines}

Provide specific, actionable advice to help them reach this goal. Include:
1. The most impactful spending areas to reduce based on their data
2. A realistic monthly savings plan
3. 2-3 creative ways to reduce spending or increase income
4. An encouraging closing message

Keep it under 250 words and make it specific to their actual numbers."""

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
    except APIError as e:
        raise RuntimeError(f"Anthropic API error: {e.message}")
    return message.content[0].text
