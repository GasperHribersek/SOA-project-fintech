from functools import wraps
from flask import request, jsonify
import jwt
import os
import requests
from datetime import datetime

JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key')
AUTH_SERVICE_URL = os.getenv('AUTH_SERVICE_URL', 'http://auth-service:3001')

def verify_token(f):
    """
    Decorator to verify JWT token from Authorization header
    Verifies locally using shared secret
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'No token provided'}), 401
        
        token = auth_header.split(' ')[1]
        
        try:
            # Verify JWT locally using shared secret
            decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            
            # Attach user info to request
            request.user = {
                'userId': decoded.get('sub') or decoded.get('userId'),
                'sub': decoded.get('sub'),
                'name': decoded.get('name'),
                'email': decoded.get('email')
            }
            
            return f(*args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired', 'details': 'Your session has expired. Please login again.'}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({'error': 'Invalid token', 'details': f'Token verification failed: {str(e)}'}), 401
        except Exception as e:
            return jsonify({'error': 'Token verification failed', 'details': str(e)}), 500
    
    return decorated_function

def verify_token_via_service(f):
    """
    Decorator to verify JWT token by calling auth-service
    Use this if secret is not shared between services
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'No token provided'}), 401
        
        token = auth_header.split(' ')[1]
        
        try:
            # Call auth-service to verify token
            response = requests.get(
                f'{AUTH_SERVICE_URL}/api/auth/validate-token',
                headers={'Authorization': f'Bearer {token}'},
                timeout=5
            )
            
            if response.status_code != 200:
                error_data = response.json() if response.content else {}
                return jsonify({'error': error_data.get('error', 'Invalid token')}), 401
            
            data = response.json()
            if not data.get('valid'):
                return jsonify({'error': data.get('error', 'Invalid token')}), 401
            
            # Attach user info to request
            request.user = data.get('user', {})
            
            return f(*args, **kwargs)
        except requests.exceptions.RequestException as e:
            return jsonify({'error': 'Token verification failed', 'details': str(e)}), 500
        except Exception as e:
            return jsonify({'error': 'Token verification failed', 'details': str(e)}), 500
    
    return decorated_function
