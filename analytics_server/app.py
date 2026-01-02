from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flasgger import Swagger
from datetime import datetime
from models import db
import os
import time

app = Flask(__name__)

# Swagger configuration
swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": "apispec",
            "route": "/apispec.json",
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/api-docs"
}

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "Analytics Server API",
        "description": "API for tracking and managing analytics events",
        "version": "1.0.0"
    },
    "basePath": "/",
    "schemes": ["http", "https"],
    "tags": [
        {
            "name": "Health",
            "description": "Health check endpoints"
        },
        {
            "name": "Analytics Events",
            "description": "Endpoints for managing analytics events"
        }
    ]
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://analytics_user:analytics_pass@db:5432/analytics_db')
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False


db.init_app(app)


from models import AnalyticsEvent
from auth_middleware import verify_token
from logger import get_logger, create_logging_middleware, log_response

#CORS za frontend
CORS(app, origins=['http://localhost:3000', 'http://localhost:3001'])

# Initialize logger
logger = get_logger('analytics-server')
logging_middleware = create_logging_middleware(logger)

# Add logging middleware
@app.before_request
def before_request():
    g.start_time = time.time()
    g.correlation_id = logging_middleware()

@app.after_request
def after_request(response):
    if hasattr(g, 'correlation_id') and hasattr(g, 'start_time'):
        response.headers['X-Correlation-Id'] = g.correlation_id
        log_response(
            logger,
            g.correlation_id,
            request.url,
            request.method,
            response.status_code,
            g.start_time
        )
    return response

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint
    ---
    tags:
      - Health
    responses:
      200:
        description: Service health status
        schema:
          type: object
          properties:
            status:
              type: string
              example: healthy
            timestamp:
              type: string
              format: date-time
              example: "2024-01-01T12:00:00"
    """
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()}), 200

@app.route('/api/analytics/event', methods=['POST'])
@verify_token
def track_event():
    """Track an analytics event
    ---
    tags:
      - Analytics Events
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - event_type
          properties:
            event_type:
              type: string
              description: Type of the event
              example: page_view
            user_id:
              type: integer
              description: ID of the user
              example: 123
            session_id:
              type: string
              description: Session identifier
              example: "abc123def456"
            page_path:
              type: string
              description: Path of the page
              example: "/dashboard"
            metadata:
              type: object
              description: Additional event metadata
              example: {"key": "value"}
    responses:
      201:
        description: Event tracked successfully
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: true
            event_id:
              type: integer
              example: 1
            timestamp:
              type: string
              format: date-time
              example: "2024-01-01T12:00:00"
      400:
        description: Bad request - missing required fields
        schema:
          type: object
          properties:
            error:
              type: string
              example: "event_type is required"
      500:
        description: Internal server error
        schema:
          type: object
          properties:
            error:
              type: string
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or 'event_type' not in data:
            return jsonify({'error': 'event_type is required'}), 400
        
        # Create analytics event
        # Use user_id from JWT token if not provided in request
        user_id = data.get('user_id') or (hasattr(request, 'user') and request.user.get('userId'))
        event = AnalyticsEvent(
            event_type=data['event_type'],
            user_id=user_id,
            session_id=data.get('session_id'),
            page_path=data.get('page_path'),
            event_metadata=data.get('metadata', {}),
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        db.session.add(event)
        db.session.commit()
        
        logger.info(request.url, g.correlation_id, 'Event tracked successfully', {'event_id': event.id})

        return jsonify({
            'success': True,
            'event_id': event.id,
            'timestamp': event.timestamp.isoformat()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/events', methods=['POST'])
@verify_token
def track_events_batch():
    """Track multiple analytics events in a batch
    ---
    tags:
      - Analytics Events
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - events
          properties:
            events:
              type: array
              items:
                type: object
                required:
                  - event_type
                properties:
                  event_type:
                    type: string
                    example: page_view
                  user_id:
                    type: integer
                    example: 123
                  session_id:
                    type: string
                    example: "abc123def456"
                  page_path:
                    type: string
                    example: "/dashboard"
                  metadata:
                    type: object
                    example: {"key": "value"}
    responses:
      201:
        description: Events tracked successfully
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: true
            count:
              type: integer
              example: 2
            event_ids:
              type: array
              items:
                type: integer
              example: [1, 2]
      400:
        description: Bad request - missing events array
        schema:
          type: object
          properties:
            error:
              type: string
              example: "events array is required"
      500:
        description: Internal server error
    """
    try:
        data = request.get_json()
        
        if not data or 'events' not in data:
            return jsonify({'error': 'events array is required'}), 400
        
        # Get user_id from JWT token if not provided in request
        default_user_id = None
        if hasattr(request, 'user') and request.user:
            default_user_id = request.user.get('userId')
        
        events = []
        for event_data in data['events']:
            if 'event_type' not in event_data:
                continue
            
            # Use user_id from event data, or from JWT token, or None
            user_id = event_data.get('user_id') or default_user_id
                
            event = AnalyticsEvent(
                event_type=event_data['event_type'],
                user_id=user_id,
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
@verify_token
def get_events():
    """Get analytics events with optional filters
    ---
    tags:
      - Analytics Events
    parameters:
      - in: query
        name: user_id
        type: integer
        description: Filter by user ID
        required: false
      - in: query
        name: event_type
        type: string
        description: Filter by event type
        required: false
      - in: query
        name: start_date
        type: string
        format: date-time
        description: Filter events from this date (ISO format)
        required: false
      - in: query
        name: end_date
        type: string
        format: date-time
        description: Filter events until this date (ISO format)
        required: false
      - in: query
        name: limit
        type: integer
        description: Maximum number of events to return
        default: 100
        required: false
      - in: query
        name: offset
        type: integer
        description: Number of events to skip
        default: 0
        required: false
    responses:
      200:
        description: List of analytics events
        schema:
          type: object
          properties:
            events:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: integer
                  event_type:
                    type: string
                  user_id:
                    type: integer
                  session_id:
                    type: string
                  page_path:
                    type: string
                  metadata:
                    type: object
                  ip_address:
                    type: string
                  user_agent:
                    type: string
                  timestamp:
                    type: string
                    format: date-time
            total:
              type: integer
              example: 150
            limit:
              type: integer
              example: 100
            offset:
              type: integer
              example: 0
      500:
        description: Internal server error
    """
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
@verify_token
def get_stats():
    """Get analytics statistics
    ---
    tags:
      - Analytics Events
    parameters:
      - in: query
        name: user_id
        type: integer
        description: Filter by user ID
        required: false
      - in: query
        name: event_type
        type: string
        description: Filter by event type
        required: false
      - in: query
        name: start_date
        type: string
        format: date-time
        description: Filter events from this date (ISO format)
        required: false
      - in: query
        name: end_date
        type: string
        format: date-time
        description: Filter events until this date (ISO format)
        required: false
    responses:
      200:
        description: Analytics statistics
        schema:
          type: object
          properties:
            total_events:
              type: integer
              example: 1000
            event_type_distribution:
              type: object
              additionalProperties:
                type: integer
              example:
                page_view: 500
                click: 300
                purchase: 200
            filters:
              type: object
              properties:
                user_id:
                  type: integer
                event_type:
                  type: string
                start_date:
                  type: string
                end_date:
                  type: string
      500:
        description: Internal server error
    """
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
@verify_token
def update_event(event_id):
    """Update an analytics event by ID
    ---
    tags:
      - Analytics Events
    parameters:
      - in: path
        name: event_id
        type: integer
        required: true
        description: ID of the event to update
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            event_type:
              type: string
              example: page_view
            user_id:
              type: integer
              example: 123
            session_id:
              type: string
              example: "abc123def456"
            page_path:
              type: string
              example: "/dashboard"
            metadata:
              type: object
              example: {"key": "value"}
    responses:
      200:
        description: Event updated successfully
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: true
            event:
              type: object
              properties:
                id:
                  type: integer
                event_type:
                  type: string
                user_id:
                  type: integer
                session_id:
                  type: string
                page_path:
                  type: string
                metadata:
                  type: object
                timestamp:
                  type: string
                  format: date-time
      400:
        description: Bad request
      404:
        description: Event not found
      500:
        description: Internal server error
    """
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
@verify_token
def update_events_batch():
    """Update multiple analytics events in a batch
    ---
    tags:
      - Analytics Events
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - updates
          properties:
            updates:
              type: array
              items:
                type: object
                required:
                  - id
                properties:
                  id:
                    type: integer
                    description: ID of the event to update
                    example: 1
                  event_type:
                    type: string
                    example: page_view
                  user_id:
                    type: integer
                    example: 123
                  session_id:
                    type: string
                    example: "abc123def456"
                  page_path:
                    type: string
                    example: "/dashboard"
                  metadata:
                    type: object
                    example: {"key": "value"}
    responses:
      200:
        description: Events updated successfully
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: true
            count:
              type: integer
              example: 2
            events:
              type: array
              items:
                type: object
      400:
        description: Bad request - missing updates array
      500:
        description: Internal server error
    """
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
@verify_token
def delete_event(event_id):
    """Delete an analytics event by ID
    ---
    tags:
      - Analytics Events
    parameters:
      - in: path
        name: event_id
        type: integer
        required: true
        description: ID of the event to delete
    responses:
      200:
        description: Event deleted successfully
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: true
            message:
              type: string
              example: "Event 1 deleted successfully"
      404:
        description: Event not found
      500:
        description: Internal server error
    """
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
@verify_token
def delete_events():
    """Delete analytics events by filters
    ---
    tags:
      - Analytics Events
    parameters:
      - in: query
        name: user_id
        type: integer
        description: Filter by user ID
        required: false
      - in: query
        name: event_type
        type: string
        description: Filter by event type
        required: false
      - in: query
        name: start_date
        type: string
        format: date-time
        description: Filter events from this date (ISO format)
        required: false
      - in: query
        name: end_date
        type: string
        format: date-time
        description: Filter events until this date (ISO format)
        required: false
    responses:
      200:
        description: Events deleted successfully
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: true
            message:
              type: string
              example: "5 event(s) deleted successfully"
            deleted_count:
              type: integer
              example: 5
      500:
        description: Internal server error
    """
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

