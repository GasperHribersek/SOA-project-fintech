import pika
import json
import os
from datetime import datetime
from uuid import uuid4
from flask import request
import threading
import time

class Logger:
    def __init__(self, service_name):
        self.service_name = service_name
        self.connection = None
        self.channel = None
        self.exchange = 'logs_exchange'
        self.queue = 'logging_queue'
        self.rabbitmq_url = os.getenv('RABBITMQ_URL', 'amqp://admin:admin123@rabbitmq:5672')
        self.initialize()

    def initialize(self):
        """Inicializiraj povezavo s RabbitMQ"""
        try:
            # Parse connection URL
            params = pika.URLParameters(self.rabbitmq_url)
            params.socket_timeout = 5
            
            self.connection = pika.BlockingConnection(params)
            self.channel = self.connection.channel()
            
            # Declare exchange
            self.channel.exchange_declare(
                exchange=self.exchange,
                exchange_type='fanout',
                durable=True
            )
            
            # Declare queue
            self.channel.queue_declare(queue=self.queue, durable=True)
            
            # Bind queue to exchange
            self.channel.queue_bind(
                exchange=self.exchange,
                queue=self.queue
            )
            
            print(f"Logger initialized for {self.service_name}")
        except Exception as e:
            print(f"Failed to initialize logger: {str(e)}")
            # Retry after 5 seconds
            threading.Timer(5.0, self.initialize).start()

    def log(self, level, url, correlation_id, message, additional_data=None):
        """Pošlji log v RabbitMQ"""
        try:
            if not self.channel or self.connection.is_closed:
                self.initialize()
            
            timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
            log_message = f"{timestamp} {level.upper()} {url} Correlation: {correlation_id} [{self.service_name}] - {message}"
            
            log_data = {
                'timestamp': timestamp,
                'level': level.upper(),
                'url': url,
                'correlationId': correlation_id,
                'serviceName': self.service_name,
                'message': message
            }
            
            if additional_data:
                log_data.update(additional_data)
            
            self.channel.basic_publish(
                exchange=self.exchange,
                routing_key='',
                body=json.dumps(log_data),
                properties=pika.BasicProperties(
                    delivery_mode=2  # Naredi sporočilo trajno
                )
            )
            
            # Še log na konzolo
            print(log_message)
        except Exception as e:
            print(f"Failed to send log to RabbitMQ: {str(e)}")
            # Povratni log na konzolo
            print(f"{level.upper()} {url} Correlation: {correlation_id} [{self.service_name}] - {message}")

    def info(self, url, correlation_id, message, additional_data=None):
        self.log('INFO', url, correlation_id, message, additional_data)

    def error(self, url, correlation_id, message, additional_data=None):
        self.log('ERROR', url, correlation_id, message, additional_data)

    def warn(self, url, correlation_id, message, additional_data=None):
        self.log('WARN', url, correlation_id, message, additional_data)

    def close(self):
        """Zapri povezavo s RabbitMQ"""
        try:
            if self.channel:
                self.channel.close()
            if self.connection:
                self.connection.close()
        except Exception as e:
            print(f"Error closing logger: {str(e)}")


# Singleton instanca
_logger_instance = None

def get_logger(service_name):
    global _logger_instance
    if _logger_instance is None:
        _logger_instance = Logger(service_name)
    return _logger_instance


def correlation_middleware():
    """Sredstvo za dodajanje correlation ID v zahtevo"""
    correlation_id = request.headers.get('X-Correlation-Id', str(uuid4()))
    request.correlation_id = correlation_id
    return correlation_id


def create_logging_middleware(logger):
    """Ustvari sredstvo za beleženje v Flasku"""
    def logging_middleware():
        from flask import g
        import time
        
        # Get or generate correlation ID
        correlation_id = correlation_middleware()
        g.correlation_id = correlation_id
        
        # Log request
        url = request.url
        start_time = time.time()
        
        logger.info(
            url,
            correlation_id,
            f"{request.method} request received",
            {
                'method': request.method,
                'path': request.path,
                'query': dict(request.args),
                'ip': request.remote_addr
            }
        )
        
        return correlation_id
    
    return logging_middleware


def log_response(logger, correlation_id, url, method, status_code, start_time):
    """Log response"""
    duration = int((time.time() - start_time) * 1000)
    level = 'error' if status_code >= 400 else 'info'
    
    logger.log(
        level,
        url,
        correlation_id,
        f"{method} request completed - Status: {status_code} - Duration: {duration}ms",
        {
            'method': method,
            'statusCode': status_code,
            'duration': duration
        }
    )

