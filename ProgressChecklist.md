# Centsyve — Development Progress Checklist

> Based on the Mobile Expense Tracking Application Development Plan.
> Mark items with `[x]` as they are completed.

---

## Phase 1: Define Minimum Viable Product (MVP)

- [x] Define user authentication requirements (sign up / login)
- [x] Define receipt upload and OCR processing requirements
- [x] Define automatic extraction of transaction details requirements
- [x] Define manual income entry requirements
- [x] Define basic dashboard requirements
  - [x] Total expenses display
  - [x] Total income display
  - [x] Balance over time display

---

## Phase 2: Technology Stack Selection

- [x] Confirm frontend framework: **React Native (Expo)**
- [x] Confirm backend framework: **Python (FastAPI)**
- [x] Confirm database: **PostgreSQL**
- [x] Confirm OCR solution: **Google Vision API (free tier)**
- [x] Confirm AI solution: **Anthropic Claude API**
- [x] Initialize Expo React Native frontend project (`frontend/`)
- [x] Initialize FastAPI backend project (`backend/`) with folder structure and `requirements.txt`

---

## Phase 3: Core Feature Development

### Step 1: Authentication System
- [x] Implement user registration
- [x] Implement user login
- [x] Implement JWT (JSON Web Tokens) for session management

### Step 2: Receipt Processing Pipeline
- [x] Implement receipt image upload (from gallery)
- [x] Implement receipt image capture (via camera)
- [x] Connect image upload to backend server
- [x] Integrate OCR engine to extract text from image
- [x] Implement parsing logic to extract:
  - [x] Total amount
  - [x] Date
  - [x] Merchant name
  - [ ] Item(s) purchased (if possible)

### Step 3: Data Model Design
- [x] Design and implement **Users** table
  - [x] `id`
  - [x] `email`
  - [x] `password_hash`
- [x] Design and implement **Transactions** table
  - [x] `id`
  - [x] `user_id`
  - [x] `type` (income / expense)
  - [x] `amount`
  - [x] `category`
  - [x] `date`
  - [x] `merchant`

### Step 4: Dashboard Implementation
- [x] Display summary metrics
  - [x] Total income
  - [x] Total expenses
  - [x] Current balance
- [x] Implement visual charts
  - [x] Weekly trends chart
  - [x] Monthly trends chart
  - [x] Yearly trends chart

---

## Phase 4: Data Accuracy Improvements

- [x] Implement regular expressions for identifying totals and dates
- [x] Implement keyword matching (e.g., "TOTAL", "AMOUNT")
- [x] Implement data validation rules
- [ ] Evaluate optional machine learning model for receipt parsing

---

## Phase 5: AI Feature Integration

### Features
- [x] Spending breakdown by category
- [x] Budget recommendations
- [ ] Savings goal tracking
- [x] AI assistant for financial advice

### Implementation
- [x] Integrate with an LLM API (Anthropic Claude API)
- [x] Implement analysis of user transaction history
- [x] Implement generation of personalized financial suggestions

---

## Phase 6: User Experience (UX/UI)

- [x] Implement one-tap receipt scanning flow
- [x] Implement automatic transaction categorization where possible
- [x] Design clean and intuitive dashboard UI
- [x] Minimize manual input required from user

---

## Phase 7: Testing

- [x] Write unit tests for backend logic
  - [x] Parser tests (amount, date, merchant, items, confidence) — 30+ tests
  - [x] Categorizer tests — 18 tests
  - [x] Validation tests — 15+ tests
  - [x] Security tests (JWT, password hashing) — 9 tests
- [x] Write integration tests for OCR pipeline
  - [x] Auth route tests (register, login, /me) — 10 tests
  - [x] Transaction route tests (create, list, scan) — 12 tests
  - [x] All 102 tests passing
- [ ] Conduct real-world testing with various receipt formats
- [ ] Handle edge cases:
  - [ ] Blurry images
  - [x] Missing fields (warnings returned when fields not extracted)
  - [x] Unusual receipt layouts (confidence scoring)

---

## Phase 8: Deployment

### Backend Hosting
- [ ] Select and configure hosting provider (AWS, Google Cloud, or Railway)
- [ ] Deploy backend server

### Database Hosting
- [ ] Set up managed PostgreSQL service

### Mobile Deployment
- [ ] Publish to Google Play Store
- [ ] Publish to Apple App Store

---

## Phase 9: Monetization Strategy

- [ ] Define and implement freemium model
- [ ] Define and implement subscription-based premium features
  - [ ] Unlimited receipt scans
  - [ ] Advanced AI insights
  - [ ] Cloud backup and sync

---

## Future Enhancements (Post-Launch)

- [ ] Bank account integration
- [ ] Automatic transaction syncing
- [ ] Multi-currency support
- [ ] Advanced financial forecasting
- [ ] Personalized budgeting plans
