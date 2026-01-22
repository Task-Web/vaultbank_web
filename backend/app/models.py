from datetime import datetime, timezone
from typing import Any, Dict, Optional
import sys
import os

from pydantic import BaseModel, Field

from .init_banking_data import generate_banking_state


class StateMeta(BaseModel):
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    version: int = 1
    type: str = "unrestricted"


HUGGINGFACE_INIT_FILE_URL = (
    "https://huggingface.co/datasets/adlsdztony/osworld-v2/blob/main/email_031.tar.gz"
)


def _default_state_data() -> Dict[str, Any]:
    """Generate default banking state with sample data."""
    # Get banking sample data
    banking_state = generate_banking_state()

    # Merge with examples and uploads for compatibility
    return {
        **banking_state,
        "examples": {
            "huggingface_file": {
                "url": HUGGINGFACE_INIT_FILE_URL,
                "note": "Initial example file reference (no verification).",
            }
        },
        "uploads": [],
    }


class UserState(BaseModel):
    meta: StateMeta = Field(default_factory=StateMeta)
    data: Dict[str, Any] = Field(default_factory=_default_state_data)
    note: Optional[str] = None

    def touch(self) -> None:
        self.meta.updated_at = datetime.now(timezone.utc)
        self.meta.version += 1
