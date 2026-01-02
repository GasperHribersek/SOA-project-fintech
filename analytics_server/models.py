from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class AnalyticsEvent(db.Model):
    """Model for analytics events"""
    __tablename__ = 'analytics_events'
    
    id = db.Column(db.Integer, primary_key=True)
    event_type = db.Column(db.String(100), nullable=False, index=True)
    user_id = db.Column(db.Integer, nullable=True, index=True)
    session_id = db.Column(db.String(255), nullable=True, index=True)
    page_path = db.Column(db.String(500), nullable=True)
    event_metadata = db.Column(db.JSON, nullable=True, default={})
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def __repr__(self):
        return f'<AnalyticsEvent {self.id}: {self.event_type}>'
    
    def to_dict(self):
        """Convert event to dictionary"""
        return {
            'id': self.id,
            'event_type': self.event_type,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'page_path': self.page_path,
            'metadata': self.event_metadata,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'timestamp': self.timestamp.isoformat()
        }
