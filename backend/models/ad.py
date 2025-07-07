from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from .base import Base

class Ad(Base):
    __tablename__ = "ads"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ad_set_id = Column(UUID(as_uuid=True), ForeignKey("ad_sets.id"), nullable=False)
    ad_id = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(500))
    status = Column(String(50))
    creative_id = Column(String(255))
    tracking_specs = Column(JSON)
    conversion_specs = Column(JSON)
    created_time = Column(DateTime(timezone=True))
    updated_time = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    ad_set = relationship("AdSet", back_populates="ads")
    creative = relationship("Creative", back_populates="ad", uselist=False)