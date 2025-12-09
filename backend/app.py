from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import mysql.connector
import requests
import os

app = Flask(__name__, static_folder="../assets")
CORS(app)

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3306,
    "database": "airport",
    "user": "root",
    "password": "user",
}

WEATHER_API_KEY = "04451ce2b836d52c0f0ce84c1215a66a"


# -------------------------------------------------
# DATABASE CONNECTION
# -------------------------------------------------
def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)


# -------------------------------------------------
# API — AIRPORTS
# -------------------------------------------------
@app.route("/api/airports")
def get_airports():
    """Return US airport list from DB; fallback to static if DB fails."""
    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        query = """
        SELECT name, iata_code, latitude_deg, longitude_deg
        FROM airports
        WHERE iso_country = 'US'
          AND iata_code IN ('JFK','LAX','ORD','DFW','ATL','DEN','SEA','MIA')
        """
        cur.execute(query)
        rows = cur.fetchall()
        cur.close()
        conn.close()
    except Exception:
        rows = []

    # Fallback if DB failed
    if not rows:
        rows = [
            {"name": "John F Kennedy Intl", "iata_code": "JFK", "latitude_deg": 40.6413, "longitude_deg": -73.7781},
            {"name": "Los Angeles Intl", "iata_code": "LAX", "latitude_deg": 33.9416, "longitude_deg": -118.4085},
            {"name": "Chicago O'Hare", "iata_code": "ORD", "latitude_deg": 41.9742, "longitude_deg": -87.9073},
            {"name": "Dallas/Fort Worth", "iata_code": "DFW", "latitude_deg": 32.8998, "longitude_deg": -97.0403},
            {"name": "Hartsfield–Jackson Atlanta", "iata_code": "ATL", "latitude_deg": 33.6407, "longitude_deg": -84.4277},
            {"name": "Denver Intl", "iata_code": "DEN", "latitude_deg": 39.8561, "longitude_deg": -104.6737},
            {"name": "Seattle-Tacoma", "iata_code": "SEA", "latitude_deg": 47.4502, "longitude_deg": -122.3088},
            {"name": "Miami Intl", "iata_code": "MIA", "latitude_deg": 25.7959, "longitude_deg": -80.2870},
        ]

    return jsonify(rows)


# -------------------------------------------------
# API — WEATHER LOOKUP
# -------------------------------------------------
@app.route("/api/weather")
def get_weather():
    lat = request.args.get("lat")
    lon = request.args.get("lon")

    if not lat or not lon:
        return jsonify({"error": "Missing lat/lon"}), 400

    url = (
        f"https://api.openweathermap.org/data/2.5/weather"
        f"?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}&units=metric"
    )

    try:
        res = requests.get(url, timeout=5)
        return jsonify(res.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------------------------------------------
# STATIC ASSET SERVER (GLB, PNG, ETC)
# -------------------------------------------------
@app.route("/assets/<path:filename>")
def serve_assets(filename):
    assets_path = os.path.join(os.path.dirname(__file__), "../assets")
    return send_from_directory(assets_path, filename)


# -------------------------------------------------
# RUN FLASK SERVER
# -------------------------------------------------
if __name__ == "__main__":
    app.run(debug=True, port=8000)
