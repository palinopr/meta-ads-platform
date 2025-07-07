from sqlalchemy import Column, String, ForeignKey, DateTime, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from .base import Base

class Creative(Base):
    __tablename__ = "creatives"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ad_id = Column(UUID(as_uuid=True), ForeignKey("ads.id"), nullable=False)
    creative_id = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(500))
    title = Column(String(500))
    body = Column(Text)
    image_url = Column(String(1000))
    video_url = Column(String(1000))
    thumbnail_url = Column(String(1000))
    call_to_action_type = Column(String(100))
    link_url = Column(String(1000))
    instagram_permalink_url = Column(String(1000))
    object_story_spec = Column(JSON)
    created_time = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    ad = relationship("Ad", back_populates="creative")