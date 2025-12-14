"""Initialize database tables"""
import os
import time
import sys

# Wait a bit for database to be ready
time.sleep(3)

# Import in the correct order
from models import db
from flask import Flask

# Create Flask app
app = Flask(__name__)

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://analytics_user:analytics_pass@db:5432/analytics_db')
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
db.init_app(app)

# Import models after db is initialized
from models import AnalyticsEvent

# Create tables
try:
    with app.app_context():
        db.create_all()
        print("Database tables created successfully!")
except Exception as e:
    print(f"Error creating database tables: {e}")
    # Retry once after a delay
    time.sleep(5)
    with app.app_context():
        db.create_all()
        print("Database tables created successfully!")

