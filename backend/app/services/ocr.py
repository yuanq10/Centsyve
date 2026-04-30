import os
import json
from app.core.config import settings


def extract_text_from_image(image_bytes: bytes) -> str:
    """Send image bytes to Google Vision and return the full extracted text."""
    from google.cloud import vision
    from google.oauth2 import service_account

    # Production path: credentials supplied as JSON string env var (Railway)
    if settings.GOOGLE_CREDENTIALS_JSON:
        info = json.loads(settings.GOOGLE_CREDENTIALS_JSON)
        credentials = service_account.Credentials.from_service_account_info(info)
    # Local dev path: credentials supplied as a file path
    elif settings.GOOGLE_APPLICATION_CREDENTIALS and os.path.exists(settings.GOOGLE_APPLICATION_CREDENTIALS):
        credentials = service_account.Credentials.from_service_account_file(
            settings.GOOGLE_APPLICATION_CREDENTIALS
        )
    else:
        raise RuntimeError(
            "Google Vision credentials not configured. "
            "Set GOOGLE_CREDENTIALS_JSON (production) or GOOGLE_APPLICATION_CREDENTIALS (local) in your environment."
        )

    client = vision.ImageAnnotatorClient(credentials=credentials)
    image = vision.Image(content=image_bytes)
    response = client.text_detection(image=image)

    if response.error.message:
        raise RuntimeError(f"Google Vision error: {response.error.message}")

    annotations = response.text_annotations
    return annotations[0].description if annotations else ""
