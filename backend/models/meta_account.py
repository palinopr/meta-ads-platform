from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, Integer
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from .base import Base

class MetaAdAccount(Base):
    __tablename__ = "meta_ad_accounts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    account_id = Column(String(255), unique=True, nullable=False, index=True)
    account_name = Column(String(255))
    currency = Column(String(10))
    timezone_name = Column(String(100))
    status = Column(String(50))
    spend_cap = Column(Integer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="ad_accounts")
    campaigns = relationship("Campaign", back_populates="ad_account", cascade="all, delete-orphan")