from typing import Optional
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field


class Role(str, Enum):
    admin = "admin"
    manager = "manager"
    user = "user"


class UserCreate(BaseModel):
    """Input schema for user registration — rejects extra fields."""

    model_config = ConfigDict(extra="forbid")

    email: str
    password: str = Field(min_length=8)
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class UserUpdate(BaseModel):
    """Input schema for user update — rejects extra fields."""

    model_config = ConfigDict(extra="forbid")

    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[Role] = None
    is_active: Optional[bool] = None


class ProfileUpdate(BaseModel):
    """Input schema for profile update — rejects extra fields."""

    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    """Input schema for forgot-password — rejects extra fields."""

    model_config = ConfigDict(extra="forbid")

    email: str


class ResetPasswordRequest(BaseModel):
    """Input schema for reset-password — rejects extra fields."""

    model_config = ConfigDict(extra="forbid")

    token: str
    new_password: str = Field(min_length=8)


class ChangePasswordRequest(BaseModel):
    """Input schema for change-password — rejects extra fields."""

    model_config = ConfigDict(extra="forbid")

    current_password: str
    new_password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str


# ──────────────────────────────────────────────
# Response schemas for serialization audit
# ──────────────────────────────────────────────


class UserPublic(BaseModel):
    """Public user data exposed by the API — never includes hashed_password."""

    id: str
    email: str
    is_active: bool
    role: str
    created_at: str


class ProfileResponse(BaseModel):
    """User profile data."""

    id: str
    user_id: str
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class UserRegistrationPublic(BaseModel):
    """Public user data returned after registration — does NOT include email
    to avoid re-sending the user's email address in an unauthenticated auth flow."""

    id: str
    is_active: bool
    role: str
    created_at: str


class UserRegistrationResponse(BaseModel):
    """Response after successful user registration.
    Does not include email per security best practices for unauthenticated auth flows."""

    user: UserRegistrationPublic
    profile: ProfileResponse


class LoginResponse(BaseModel):
    """Response after successful login with JWT token."""

    access_token: str
    token_type: str


class UserSessionResponse(BaseModel):
    """Current authenticated user session data."""

    id: str
    email: str
    role: str
    profile: Optional[ProfileResponse] = None