from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from models import db
import os

app = Flask(__name__)

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://analytics_user:analytics_pass@db:5432/analytics_db')
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False


db.init_app(app)


from models import AnalyticsEvent

#CORS za frontend
CORS(app, origins=['http://localhost:3000', 'http://localhost:3001'])

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()}), 200

@app.route('/api/analytics/event', methods=['POST'])
def track_event():
    """Track an analytics event"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or 'event_type' not in data:
            return jsonify({'error': 'event_type is required'}), 400
        
        # Create analytics event
        event = AnalyticsEvent(
            event_type=data['event_type'],
            user_id=data.get('user_id'),
            session_id=data.get('session_id'),
            page_path=data.get('page_path'),
            event_metadata=data.get('metadata', {}),
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        db.session.add(event)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'event_id': event.id,
            'timestamp': event.timestamp.isoformat()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/events', methods=['POST'])
def track_events_batch():
    """Track multiple analytics events in a batch"""
    try:
        data = request.get_json()
        
        if not data or 'events' not in data:
            return jsonify({'error': 'events array is required'}), 400
        
        events = []
        for event_data in data['events']:
            if 'event_type' not in event_data:
                continue
                
            event = AnalyticsEvent(
                event_type=event_data['event_type'],
                user_id=event_data.get('user_id'),
                session_id=event_data.get('session_id'),
                page_path=event_data.get('page_path'),
                event_metadata=event_data.get('metadata', {}),
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            events.append(event)
        
        db.session.add_all(events)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'count': len(events),
            'event_ids': [e.id for e in events]
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/events', methods=['GET'])
def get_events():
    """Get analytics events with optional filters"""
    try:
        # Query parameters
        user_id = request.args.get('user_id', type=int)
        event_type = request.args.get('event_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', default=100, type=int)
        offset = request.args.get('offset', default=0, type=int)
        
        # Build query
        query = AnalyticsEvent.query
        
        if user_id:
            query = query.filter(AnalyticsEvent.user_id == user_id)
        if event_type:
            query = query.filter(AnalyticsEvent.event_type == event_type)
        if start_date:
            query = query.filter(AnalyticsEvent.timestamp >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(AnalyticsEvent.timestamp <= datetime.fromisoformat(end_date))
        
        # Order by timestamp descending
        query = query.order_by(AnalyticsEvent.timestamp.desc())
        
        # Pagination
        total = query.count()
        events = query.limit(limit).offset(offset).all()
        
        return jsonify({
            'events': [event.to_dict() for event in events],
            'total': total,
            'limit': limit,
            'offset': offset
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/stats', methods=['GET'])
def get_stats():
    """Get analytics statistics"""
    try:
        user_id = request.args.get('user_id', type=int)
        event_type = request.args.get('event_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build query
        query = AnalyticsEvent.query
        
        if user_id:
            query = query.filter(AnalyticsEvent.user_id == user_id)
        if event_type:
            query = query.filter(AnalyticsEvent.event_type == event_type)
        if start_date:
            query = query.filter(AnalyticsEvent.timestamp >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(AnalyticsEvent.timestamp <= datetime.fromisoformat(end_date))
        
        total_events = query.count()
        
        # Get event type distribution
        from sqlalchemy import func
        event_type_counts = db.session.query(
            AnalyticsEvent.event_type,
            func.count(AnalyticsEvent.id).label('count')
        ).group_by(AnalyticsEvent.event_type).all()
        
        event_type_distribution = {event_type: count for event_type, count in event_type_counts}
        
        return jsonify({
            'total_events': total_events,
            'event_type_distribution': event_type_distribution,
            'filters': {
                'user_id': user_id,
                'event_type': event_type,
                'start_date': start_date,
                'end_date': end_date
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/event/<int:event_id>', methods=['PUT'])
def update_event(event_id):
    """Update an analytics event by ID"""
    try:
        event = AnalyticsEvent.query.get_or_404(event_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Update fields if provided
        if 'event_type' in data:
            event.event_type = data['event_type']
        if 'user_id' in data:
            event.user_id = data['user_id']
        if 'session_id' in data:
            event.session_id = data['session_id']
        if 'page_path' in data:
            event.page_path = data['page_path']
        if 'metadata' in data:
            event.event_metadata = data['metadata']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'event': event.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/events', methods=['PUT'])
def update_events_batch():
    """Update multiple analytics events in a batch"""
    try:
        data = request.get_json()
        
        if not data or 'updates' not in data:
            return jsonify({'error': 'updates array is required'}), 400
        
        updated_count = 0
        updated_events = []
        
        for update_data in data['updates']:
            if 'id' not in update_data:
                continue
            
            event = AnalyticsEvent.query.get(update_data['id'])
            if not event:
                continue
            
            # Update fields if provided
            if 'event_type' in update_data:
                event.event_type = update_data['event_type']
            if 'user_id' in update_data:
                event.user_id = update_data['user_id']
            if 'session_id' in update_data:
                event.session_id = update_data['session_id']
            if 'page_path' in update_data:
                event.page_path = update_data['page_path']
            if 'metadata' in update_data:
                event.event_metadata = update_data['metadata']
            
            updated_events.append(event)
            updated_count += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'count': updated_count,
            'events': [e.to_dict() for e in updated_events]
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/event/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    """Delete an analytics event by ID"""
    try:
        event = AnalyticsEvent.query.get_or_404(event_id)
        
        db.session.delete(event)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Event {event_id} deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/events', methods=['DELETE'])
def delete_events():
    """Delete analytics events by filters"""
    try:
        # Query parameters
        user_id = request.args.get('user_id', type=int)
        event_type = request.args.get('event_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build query
        query = AnalyticsEvent.query
        
        if user_id:
            query = query.filter(AnalyticsEvent.user_id == user_id)
        if event_type:
            query = query.filter(AnalyticsEvent.event_type == event_type)
        if start_date:
            query = query.filter(AnalyticsEvent.timestamp >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(AnalyticsEvent.timestamp <= datetime.fromisoformat(end_date))
        
        # Get count before deletion
        count = query.count()
        
        # Delete all matching events
        query.delete(synchronize_session=False)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'{count} event(s) deleted successfully',
            'deleted_count': count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=True)

