from sqlalchemy import Column, String, ForeignKey, DateTime, Float, Integer, Date, Index
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from .base import Base

class CampaignMetrics(Base):
    __tablename__ = "campaign_metrics"
    __table_args__ = (
        Index('idx_campaign_date', 'campaign_id', 'date_start'),
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    date_start = Column(Date, nullable=False)
    date_stop = Column(Date, nullable=False)
    
    # Performance metrics
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    ctr = Column(Float, default=0.0)  # Click-through rate
    cpc = Column(Float, default=0.0)  # Cost per click
    cpm = Column(Float, default=0.0)  # Cost per mille (1000 impressions)
    cpp = Column(Float, default=0.0)  # Cost per purchase
    
    # Conversion metrics
    conversions = Column(Integer, default=0)
    conversion_rate = Column(Float, default=0.0)
    cost_per_conversion = Column(Float, default=0.0)
    
    # Spend metrics
    spend = Column(Float, default=0.0)
    
    # ROAS metrics
    purchase_value = Column(Float, default=0.0)
    roas = Column(Float, default=0.0)  # Return on ad spend
    
    # Engagement metrics
    reach = Column(Integer, default=0)
    frequency = Column(Float, default=0.0)
    engagement_rate = Column(Float, default=0.0)
    
    # Video metrics (if applicable)
    video_views = Column(Integer, default=0)
    video_view_rate = Column(Float, default=0.0)
    cost_per_thruplay = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    campaign = relationship("Campaign", back_populates="metrics")


class AdSetMetrics(Base):
    __tablename__ = "adset_metrics"
    __table_args__ = (
        Index('idx_adset_date', 'ad_set_id', 'date_start'),
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ad_set_id = Column(UUID(as_uuid=True), ForeignKey("ad_sets.id"), nullable=False)
    date_start = Column(Date, nullable=False)
    date_stop = Column(Date, nullable=False)
    
    # Same metrics as campaign
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    ctr = Column(Float, default=0.0)
    cpc = Column(Float, default=0.0)
    cpm = Column(Float, default=0.0)
    cpp = Column(Float, default=0.0)
    conversions = Column(Integer, default=0)
    conversion_rate = Column(Float, default=0.0)
    cost_per_conversion = Column(Float, default=0.0)
    spend = Column(Float, default=0.0)
    purchase_value = Column(Float, default=0.0)
    roas = Column(Float, default=0.0)
    reach = Column(Integer, default=0)
    frequency = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    ad_set = relationship("AdSet", back_populates="metrics")