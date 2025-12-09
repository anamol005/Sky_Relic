/* -------------------------------------------------
   SKY RELIC – 2D FLIGHT ENGINE (NO THREE.JS)
-------------------------------------------------- */

console.log("SkyRelic Engine Loaded");

/* -------------------------------------------------
   GLOBAL VARIABLES
-------------------------------------------------- */

const API_BASE = "http://127.0.0.1:8000";

let pilotName = "";
let difficulty = "medium";
let targetPoints = 200;
let score = 0;
let energy = 100;

let map;
let airports = [];
let currentAirport = null;
let destAirport = null;
let planeMarker = null;
let routeLine = null;
let isFlying = false;

let flightSpeed = 1;

const $ = id => document.getElementById(id);

/* -------------------------------------------------
   SMOOTH BANKING FOR 2D PLANE ICON
--------------------------------------------------*/

let currentBankAngle = 0;

function applyPlaneBanking(headingDeg) {
    const planeEl = document.querySelector(".plane-icon");
    if (!planeEl) return;

    const targetBank = headingDeg * 0.25;
    currentBankAngle += (targetBank - currentBankAngle) * 0.15;

    planeEl.style.transform =
        `rotate(${90 + headingDeg}deg) rotateY(${currentBankAngle}deg)`;
}

/* -------------------------------------------------
   SCREEN SWITCHING
-------------------------------------------------- */

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    $(id).classList.add("active");
}

/* -------------------------------------------------
   LOG OUTPUT
-------------------------------------------------- */

function log(msg) {
    const box = $("logOutput");
    box.textContent += "\n> " + msg;
    box.scrollTop = box.scrollHeight;
}

/* -------------------------------------------------
   ENERGY + SCORE
-------------------------------------------------- */

function setEnergy(v) {
    energy = Math.max(0, Math.min(100, v));
    $("energyFill").style.width = energy + "%";
    $("energyValue").textContent = energy.toFixed(0) + "%";
}

function setScore(v) {
    score = v;
    $("scoreDisplay").textContent = v;
}

/* -------------------------------------------------
   WEATHER
-------------------------------------------------- */

function updateWeatherUI(w) {
    if (!w || !w.weather) return;
    $("weatherMain").textContent = w.weather[0].description;
    $("weatherTemp").textContent = w.main.temp.toFixed(0) + "°C";
    $("weatherWind").textContent = w.wind.speed.toFixed(1) + " m/s";
}

function weatherFactor(desc) {
    desc = desc.toLowerCase();
    if (desc.includes("storm")) return 1.8;
    if (desc.includes("rain") || desc.includes("snow")) return 1.4;
    return 1.0;
}

/* -------------------------------------------------
   DISTANCE (Haversine)
-------------------------------------------------- */

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toRad = d => d * Math.PI / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* -------------------------------------------------
   DIFFICULTY
-------------------------------------------------- */

document.querySelectorAll(".difficulty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".difficulty-btn")
            .forEach(b => b.classList.remove("active"));

        btn.classList.add("active");
        difficulty = btn.dataset.diff;

        targetPoints =
            difficulty === "easy" ? 150 :
            difficulty === "hard" ? 260 : 200;

        $("targetDisplay").textContent = targetPoints;
    });
});

/* -------------------------------------------------
   SPEED BUTTONS (1x / 2x / 5x)
-------------------------------------------------- */

document.querySelectorAll(".speed-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".speed-btn")
            .forEach(b => b.classList.remove("active"));

        btn.classList.add("active");
        flightSpeed = Number(btn.dataset.speed);
    });
});

/* -------------------------------------------------
   MISSION START → SHOW BRIEFING
-------------------------------------------------- */

$("startMissionBtn").addEventListener("click", () => {
    pilotName = $("pilotName").value.trim();
    if (!pilotName) return alert("Enter pilot callsign.");

    $("briefingPilotName").textContent = pilotName;
    $("mission-briefing-overlay").classList.add("visible");
});

/* -------------------------------------------------
   INIT LEVEL 1 MAP
-------------------------------------------------- */

async function initLevel1() {
    if (map) return;

    setEnergy(100);
    setScore(0);

    map = L.map("map", { zoomControl: true }).setView([39, -98], 4);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 8
    }).addTo(map);

    const res = await fetch(`${API_BASE}/api/airports`);
    airports = await res.json();
    currentAirport = airports[0];

    // Airport markers
    airports.forEach(ap => {
        const marker = L.circleMarker(
            [ap.latitude_deg, ap.longitude_deg],
            {
                radius: ap === currentAirport ? 8 : 5,
                color: ap === currentAirport ? "#00f5d4" : "#8aa3b8",
                fillColor: ap === currentAirport ? "#00f5d4" : "#1f2933",
                fillOpacity: 0.9
            }
        )
        .addTo(map)
        .bindPopup(`<b>${ap.iata_code}</b><br>${ap.name}`);

        marker.on("click", () => {
            if (!isFlying) {
                map.flyTo([ap.latitude_deg, ap.longitude_deg], 6);
                selectDestination(ap);
            }
        });
    });
}

/* -------------------------------------------------
   SELECT DESTINATION
-------------------------------------------------- */

async function selectDestination(ap) {
    destAirport = ap;

    $("destCode").textContent = ap.iata_code;
    $("destName").textContent = ap.name;

    const dist = haversine(
        currentAirport.latitude_deg,
        currentAirport.longitude_deg,
        ap.latitude_deg,
        ap.longitude_deg
    );

    // Weather fetch
    let w = null;
    try {
        const r = await fetch(`${API_BASE}/api/weather?lat=${ap.latitude_deg}&lon=${ap.longitude_deg}`);
        w = await r.json();
        updateWeatherUI(w);
    } catch {}

    const diffMult =
        difficulty === "easy" ? 0.8 :
        difficulty === "hard" ? 1.5 : 1.0;

    const factor = w ? weatherFactor(w.weather[0].description) : 1;

    ap._energyCost = Math.round((dist / 50) * factor * diffMult);
    ap._pointsGain = Math.round((dist / 10) * diffMult);

    $("distanceDisplay").textContent = `${dist.toFixed(0)} KM`;
    $("costDisplay").textContent = `${ap._energyCost} UNIT`;

    if (routeLine) routeLine.remove();

    routeLine = L.polyline(
        [
            [currentAirport.latitude_deg, currentAirport.longitude_deg],
            [ap.latitude_deg, ap.longitude_deg]
        ],
        { color: "#00f5d4", dashArray: "6 10", weight: 3 }
    ).addTo(map);

    if (planeMarker) planeMarker.remove();

    planeMarker = L.marker(
        [currentAirport.latitude_deg, currentAirport.longitude_deg],
        {
            icon: L.divIcon({
                html: `<div class="plane-icon">✈</div>`,
                className: "",
                iconSize: [40, 40]
            })
        }
    ).addTo(map);
}

/* -------------------------------------------------
   START FLIGHT (fixed straight plane)
------------------------------------------------- */

$("startFlightBtn").addEventListener("click", startFlight);

function startFlight() {
    if (!destAirport) return log("Select an airport.");
    if (isFlying) return;
    if (energy - destAirport._energyCost < 0) return log("Insufficient energy.");

    isFlying = true;

    $("startFlightBtn").textContent = "IN FLIGHT...";
    $("startFlightBtn").disabled = true;

    const startLat = currentAirport.latitude_deg;
    const startLon = currentAirport.longitude_deg;
    const endLat = destAirport.latitude_deg;
    const endLon = destAirport.longitude_deg;

    const steps = 200;
    let step = 0;

    const interval = setInterval(() => {
        step += flightSpeed;
        const t = Math.min(step / steps, 1);

        const lat = startLat + (endLat - startLat) * t;
        const lon = startLon + (endLon - startLon) * t;

        planeMarker.setLatLng([lat, lon]);

        /* -----------------------------
           STRAIGHT PLANE ROTATION ONLY
        ------------------------------*/

        const dx = endLon - startLon;
        const dy = endLat - startLat;

        // atan2(dy, dx) gives correct forward direction
        let headingDeg = Math.atan2(dy, dx) * 180 / Math.PI;

        // rotate the HTML icon
        const planeEl = document.querySelector(".plane-icon");
        if (planeEl) {
            planeEl.style.transform = `rotate(${headingDeg}deg)`;
        }

        if (t >= 1) {
            clearInterval(interval);
            finishFlight();
        }

    }, 40);
}



/* -------------------------------------------------
   FINISH FLIGHT
-------------------------------------------------- */

function finishFlight() {
    setEnergy(energy - destAirport._energyCost);
    setScore(score + destAirport._pointsGain);

    log(`Arrived at ${destAirport.iata_code}`);

    currentAirport = destAirport;
    destAirport = null;

    $("destCode").textContent = "---";
    $("destName").textContent = "Select an airport";
    $("distanceDisplay").textContent = "0 KM";
    $("costDisplay").textContent = "0 UNIT";

    if (routeLine) routeLine.remove();

    $("startFlightBtn").textContent = "START FLIGHT";
    $("startFlightBtn").disabled = false;

    isFlying = false;

    if (score >= targetPoints) {
        $("finalScore").textContent = score;
        showScreen("screen-success");
    }
}

/* -------------------------------------------------
   PAUSE MENU
-------------------------------------------------- */

document.addEventListener("keydown", e => {
    if (e.key === "Escape")
        $("pauseOverlay").classList.toggle("hidden");
});

$("continueBtn").addEventListener("click", () =>
    $("pauseOverlay").classList.add("hidden")
);

$("mainMenuBtn").addEventListener("click", () => {
    $("pauseOverlay").classList.add("hidden");
    showScreen("screen-home");
});

/* -------------------------------------------------
   BRIEFING ACCEPT / ABORT
-------------------------------------------------- */

$("briefingAcceptBtn").addEventListener("click", () => {
    $("mission-briefing-overlay").classList.remove("visible");
    showScreen("screen-level1");
    initLevel1();
});

$("briefingAbortBtn").addEventListener("click", () => {
    $("mission-briefing-overlay").classList.remove("visible");
    showScreen("screen-home");
});


/* ==================================================
   SKY RELIC CINEMATIC INTRO LOGIC
================================================== */

window.addEventListener("keydown", () => {
    const intro = document.getElementById("intro-screen");

    if (!intro.classList.contains("hidden")) {
        intro.classList.add("hidden");

        setTimeout(() => {
            showScreen("screen-home"); // go to your real home page
        }, 1200);
    }
});
