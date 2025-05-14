from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from ai_model import predict_anomaly
from sensor_simulator import generate_sensor_data
import numpy as np
import pandas as pd
from datetime import datetime
import time
import threading
import os

app = Flask(__name__, static_folder='../frontend')
CORS(app)

# Mock database
structures_db = {
    "bridge_1": {
        "name": "Adyar River Bridge",
        "type": "Suspension Bridge",
        "age": 15,
        "last_inspection": "2023-05-15",
        "sensors": ["vibration", "strain", "temperature"],
        "location": "New York, NY"
    },
    "tunnel_1": {
        "name": "Madhavaram tunnel"
        "",
        "type": "Vehicular Tunnel",
        "age": 25,
        "last_inspection": "2023-03-10",
        "sensors": ["crack_width", "humidity", "displacement"],
        "location": "New York, NY"
    },
    "building_1": {
        "name": "D2 Building",
        "type": "Skyscraper",
        "age": 92,
        "last_inspection": "2023-01-20",
        "sensors": ["tilt", "wind_load", "settlement"],
        "location": "New York, NY"
    }
}

sensor_data_history = {structure_id: [] for structure_id in structures_db}

def background_sensor_updater():
    """Simulate real-time sensor updates"""
    while True:
        for structure_id in structures_db:
            new_data = generate_sensor_data(structure_id)
            sensor_data_history[structure_id].append(new_data)
            # Keep only last 100 readings
            if len(sensor_data_history[structure_id]) > 100:
                sensor_data_history[structure_id] = sensor_data_history[structure_id][-100:]
        time.sleep(5)

# Start sensor simulation thread
thread = threading.Thread(target=background_sensor_updater)
thread.daemon = True
thread.start()

@app.route('/')
def serve_frontend():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/dashboard')
def serve_dashboard():
    return send_from_directory(app.static_folder, 'dashboard.html')

@app.route('/api/structures')
def get_structures():
    """Get list of all monitored structures"""
    return jsonify(structures_db)

@app.route('/api/structure/<structure_id>')
def get_structure(structure_id):
    """Get details of a specific structure"""
    if structure_id not in structures_db:
        return jsonify({"error": "Structure not found"}), 404
    return jsonify(structures_db[structure_id])

@app.route('/api/sensor-data/<structure_id>')
def get_sensor_data(structure_id):
    """Get recent sensor data for a structure"""
    if structure_id not in sensor_data_history:
        return jsonify({"error": "Structure not found"}), 404
    
    # Get latest data and analyze
    latest_data = sensor_data_history[structure_id][-1] if sensor_data_history[structure_id] else {}
    analysis = predict_anomaly(latest_data)
    
    response = {
        "current": latest_data,
        "history": sensor_data_history[structure_id][-20:],  # Last 20 readings
        "analysis": analysis
    }
    return jsonify(response)

@app.route('/api/alerts')
def get_alerts():
    """Get recent alerts for all structures"""
    alerts = []
    for structure_id in structures_db:
        latest_data = sensor_data_history[structure_id][-1] if sensor_data_history[structure_id] else {}
        analysis = predict_anomaly(latest_data)
        
        if analysis['anomaly_detected']:
            alert_level = "critical" if analysis['severity'] > 7 else "warning"
            alerts.append({
                "structure_id": structure_id,
                "structure_name": structures_db[structure_id]['name'],
                "timestamp": datetime.now().isoformat(),
                "message": f"Anomaly detected in {structures_db[structure_id]['name']}",
                "severity": analysis['severity'],
                "alert_level": alert_level,
                "suggested_action": "Schedule inspection" if alert_level == "warning" else "Immediate inspection required",
                "location": structures_db[structure_id]['location']
            })
    
    # Sort by severity (highest first)
    alerts.sort(key=lambda x: x['severity'], reverse=True)
    return jsonify(alerts[:10])  # Return top 10 most severe alerts

if __name__ == '__main__':
    app.run(debug=True, port=5000)