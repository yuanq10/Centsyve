from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import TransactionCreate, TransactionOut, ReceiptScanOut
from app.services.ocr import extract_text_from_image
from app.services.parser import parse_receipt
from app.services.validation import validate_parsed_receipt
from app.api.routes.auth import get_current_user

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("/scan", response_model=ReceiptScanOut)
async def scan_receipt(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be an image")
    image_bytes = await file.read()
    try:
        text = extract_text_from_image(image_bytes)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    return validate_parsed_receipt(parse_receipt(text))


@router.post("/", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.type not in ("income", "expense"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="type must be 'income' or 'expense'")
    transaction = Transaction(user_id=current_user.id, **payload.model_dump())
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.get("/", response_model=list[TransactionOut])
def list_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Transaction).filter(Transaction.user_id == current_user.id).order_by(Transaction.date.desc()).all()
