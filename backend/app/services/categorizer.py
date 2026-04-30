"""
Keyword-based automatic transaction categorization.
Checks merchant name first, then falls back to scanning the raw OCR text.
Returns a category string, defaulting to "Other" if nothing matches.
"""

from typing import Optional

_RULES: list[tuple[str, list[str]]] = [
    ("Food", [
        "mcdonald", "burger king", "wendy", "kfc", "subway", "taco bell", "chipotle",
        "starbucks", "dunkin", "tim horton", "costa coffee", "coffee",
        "pizza hut", "domino", "papa john",
        "restaurant", "cafe", "diner", "bistro", "sushi", "ramen", "noodle",
        "grocery", "supermarket", "whole foods", "trader joe", "walmart grocery",
        "kroger", "safeway", "aldi", "lidl", "costco food",
        "bakery", "donut", "ice cream", "smoothie", "juice bar",
    ]),
    ("Transport", [
        "uber", "lyft", "grab", "bolt", "taxi", "cab",
        "shell", "bp", "chevron", "exxon", "mobil", "sunoco", "citgo",
        "gas station", "petrol", "fuel",
        "parking", "park meter", "valet",
        "transit", "metro", "subway transit", "bus", "train", "amtrak",
        "airline", "delta", "united", "american air", "southwest air",
        "hertz", "avis", "enterprise rent",
    ]),
    ("Shopping", [
        "amazon", "ebay", "etsy", "shopify",
        "walmart", "target", "costco", "sam's club",
        "best buy", "apple store", "microsoft store",
        "zara", "h&m", "gap", "old navy", "forever 21", "uniqlo",
        "nike", "adidas", "foot locker",
        "home depot", "lowe's", "ikea", "bed bath",
        "dollar store", "dollar general", "five below",
    ]),
    ("Health", [
        "pharmacy", "cvs", "walgreen", "rite aid", "boots pharmacy",
        "hospital", "clinic", "doctor", "medical", "dentist", "optician",
        "gym", "fitness", "planet fitness", "anytime fitness", "equinox",
        "vitamin", "supplement", "health food",
        "insurance", "copay",
    ]),
    ("Entertainment", [
        "netflix", "spotify", "apple music", "youtube", "disney+", "hulu",
        "cinema", "movie", "amc theatre", "regal cinema",
        "steam", "playstation", "xbox", "nintendo",
        "concert", "ticket", "event", "museum", "zoo",
        "bowling", "minigolf", "escape room",
        "bar", "pub", "club", "lounge",
    ]),
    ("Bills", [
        "electric", "electricity", "hydro", "utility",
        "water bill", "gas bill", "internet", "broadband",
        "phone bill", "mobile plan", "at&t", "verizon", "t-mobile",
        "rent", "mortgage", "insurance premium",
        "netflix bill", "subscription",
        "comcast", "spectrum", "xfinity",
    ]),
    ("Salary", [
        "payroll", "salary", "direct deposit", "employer", "paycheque", "paycheck",
    ]),
    ("Freelance", [
        "freelance", "invoice", "client payment", "upwork", "fiverr", "paypal transfer",
    ]),
]


def auto_categorize(merchant: Optional[str], raw_text: str = "") -> str:
    search_text = " ".join(filter(None, [merchant, raw_text])).lower()

    for category, keywords in _RULES:
        for kw in keywords:
            if kw in search_text:
                return category

    return "Other"
