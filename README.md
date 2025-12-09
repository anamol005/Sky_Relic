Sky Relic: Treasure Hunt
========================

Two-level browser game using:
- HTML, CSS, JavaScript (frontend)
- Leaflet.js (Level 1 map)
- Three.js (Level 2 3D forest)
- Python (Flask) backend
- MySQL (airports DB)
- OpenWeatherMap API

-------------------------
1. PROJECT STRUCTURE
-------------------------

(root folder)
  ├─ index.html       -> Home + Level 1 (USA Airspace map)
  ├─ forest.html      -> Level 2 (Lost Forest 3D)
  ├─ styles.css       -> All game styling
  ├─ main.js          -> Level 1 logic
  ├─ forest.js        -> Level 2 logic
  └─ backend/
        └─ app.py     -> Flask backend (MySQL + OpenWeatherMap)


-------------------------
2. BACKEND SETUP (Flask)
-------------------------

Requirements:
- Python installed
- MySQL running
- airports table inside 'airport' database, with at least:
  - name
  - iata_code
  - latitude_deg
  - longitude_deg
  - iso_country

The backend uses:
  host     = 127.0.0.1
  port     = 3306
  database = airport
  user     = root
  password = user

Steps:

1) Open a terminal and go into the "backend" folder:

   cd backend

2) (Optional) Create and activate a virtual environment:

   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate

3) Install dependencies:

   pip install flask flask-cors mysql-connector-python requests

4) Make sure your MySQL server is running and the 'airport' DB exists.
   The app will query 8 US airports by IATA code (JFK, LAX, ORD, DFW, ATL, DEN, SEA, MIA).

5) Run the Flask server:

   python app.py

Backend URL:
   http://localhost:5000

Available endpoints:

   GET /api/airports
      -> Returns 8 airports (from DB or a fallback list)

   GET /api/weather?lat=XX&lon=YY
      -> Proxies OpenWeatherMap and returns live weather JSON


-------------------------
3. FRONTEND SETUP
-------------------------

You can open index.html directly, but it's better to use a small local server
so that everything behaves like a real web app.

From the project root (where index.html is):

   python -m http.server 8000

Then open in your browser:

   http://localhost:8000/index.html


-------------------------
4. GAMEPLAY OVERVIEW
-------------------------

LEVEL 1: USA Airspace Navigation
--------------------------------
- Enter your pilot callsign and choose difficulty:
    Easy   -> 150 points target
    Medium -> 200 points target
    Hard   -> 250 points target
- Click “ACCEPT MISSION” to go to the map.
- On the map:
    - Click an airport marker to select it as your destination.
    - The game:
        * Calculates distance between current airport and destination.
        * Calls live weather for the destination using OpenWeatherMap.
        * Computes energy cost:
              base_cost = distance / 50
              weather factor:
                 - clear: x1.0
                 - rain/snow: x1.3
                 - storm/thunder: x1.5
        * Computes points:
              points = distance / 10
    - HUD shows:
        * Current points
        * Target points
        * Energy bar
        * Distance and cost for current route
        * Simple weather info (description, temp, wind)

- Click "INITIATE FLIGHT":
    - A plane icon flies along a line between the two airports.
    - When it arrives:
        * Energy is reduced by the cost.
        * Points increase by the route reward.
    - You can change speed (1x, 2x, 5x) using buttons on the map.

- Goal:
    - Reach or exceed the target points before your energy hits 0.
    - When you reach the target, a "MISSION ACCOMPLISHED" screen appears.
    - Click "PROCEED TO SECTOR 2" to enter Level 2.


LEVEL 2: The Lost Forest
------------------------
- Loaded from forest.html (button from Level 1).
- Top-down / angled 3D camera using Three.js.
- Environment:
    * Forest ground plane.
    * Random trees (40).
    * Player as a blue capsule.
    * 3 red enemy guards.
    * 5 golden treasure cubes.

- Controls:
    * Move with W, A, S, D.
    * HP bar at the top left.
    * Timer starts at 2:00 minutes.
    * Treasure counter at the bottom.

- Rules:
    * Touch treasures to collect them (auto-collect when close).
    * Enemies will chase you when you are near them.
    * If an enemy touches you, you lose 10 HP (with a short cooldown).
    * If HP reaches 0 -> Mission Failed.
    * If the timer runs out -> Mission Failed.
    * If you collect all 5 treasures before HP/time runs out -> Mission Accomplished.

- Result:
    * A mission overlay appears with:
        - "MISSION ACCOMPLISHED" or "MISSION FAILED"
        - A short message.
        - Button "BACK TO HANGAR" which returns to index.html.


-------------------------
5. CUSTOMIZATION NOTES
-------------------------

- Difficulty:
    main.js controls target points for each difficulty (easy/medium/hard).
    You can adjust:
        targetPoints = 150 / 200 / 250

- Energy & points:
    main.js uses haversine formula and simple division.
    You can tweak:
        energyCost = (distance / 50) * weatherFactor
        pointsGain = distance / 10

- Colours & theme:
    styles.css defines the neon cyberpunk style:
        --accent: #00f5d4;
        --bg: etc...

- You can edit text labels to better match your story or assignment
  (for example add more about the Sky Relic lore in the HTML text).


-------------------------
6. HOW TO PRESENT TO TEACHER
-------------------------

1) Explain that Level 1 demonstrates:
   - Integration of HTML/CSS/JS
   - Using Leaflet.js for an interactive map
   - Using Flask + MySQL as backend
   - Calling a real external API (OpenWeatherMap)
   - Game mechanics based on distance + weather.

2) Explain that Level 2 demonstrates:
   - Basic 3D game programming with Three.js
   - Player controls, enemies, collision detection
   - Timer, health system, and win/lose logic.

3) Show how both levels connect through a single story:
   - Level 1 = triangulating relic signal over USA
   - Level 2 = entering the Lost Forest to collect the relic fragments.
