from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, Float, Integer, JSON
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from .base import Base

class AdSet(Base):
    __tablename__ = "ad_sets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    ad_set_id = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(500))
    status = Column(String(50))
    billing_event = Column(String(100))
    bid_amount = Column(Integer)
    daily_budget = Column(Float)
    lifetime_budget = Column(Float)
    budget_remaining = Column(Float)
    targeting = Column(JSON)  # Store targeting specs as JSON
    promoted_object = Column(JSON)  # Store promoted object details
    optimization_goal = Column(String(100))
    created_time = Column(DateTime(timezone=True))
    updated_time = Column(DateTime(timezone=True))
    start_time = Column(DateTime(timezone=True))
    end_time = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    campaign = relationship("Campaign", back_populates="ad_sets")
    ads = relationship("Ad", back_populates="ad_set", cascade="all, delete-orphan")
    metrics = relationship("AdSetMetrics", back_populates="ad_set", cascade="all, delete-orphan")