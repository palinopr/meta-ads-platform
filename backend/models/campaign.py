from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, Float, Integer, JSON
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from .base import Base

class Campaign(Base):
    __tablename__ = "campaigns"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ad_account_id = Column(UUID(as_uuid=True), ForeignKey("meta_ad_accounts.id"), nullable=False)
    campaign_id = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(500))
    status = Column(String(50))
    objective = Column(String(100))
    buying_type = Column(String(50))
    budget_remaining = Column(Float)
    daily_budget = Column(Float)
    lifetime_budget = Column(Float)
    bid_strategy = Column(String(100))
    created_time = Column(DateTime(timezone=True))
    updated_time = Column(DateTime(timezone=True))
    start_time = Column(DateTime(timezone=True))
    stop_time = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    ad_account = relationship("MetaAdAccount", back_populates="campaigns")
    ad_sets = relationship("AdSet", back_populates="campaign", cascade="all, delete-orphan")
    metrics = relationship("CampaignMetrics", back_populates="campaign", cascade="all, delete-orphan")