// SKY RELIC – LEVEL 2 (Lost Forest)

let scene, camera, renderer;
let player;
const enemies = [];
const treasures = [];
let keys = {};

let hp = 100;
let collected = 0;
let timer = 120;
let timerInterval;

const hpFill = document.getElementById("hpFill");
const hpText = document.getElementById("hpText");
const treasureCount = document.getElementById("treasureCount");
const timerText = document.getElementById("timerText");
const resultOverlay = document.getElementById("forestResult");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");

document.getElementById("startForestBtn").onclick = () => {
  document.getElementById("forestIntro").classList.remove("active");
  document.getElementById("forestGame").classList.add("active");
  initForest();
};

function initForest() {
  const container = document.getElementById("forestContainer");

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x144226);

  const w = container.clientWidth;
  const h = container.clientHeight;

  camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
  camera.position.set(0, 25, 20);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(12, 20, 10);
  scene.add(dir);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x2d6a4f })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b3714 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x0f3d27 });

  for (let i = 0; i < 40; i++) {
    const x = (Math.random() - 0.5) * 50;
    const z = (Math.random() - 0.5) * 50;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8),
      trunkMat
    );
    trunk.position.set(x, 0.6, z);
    scene.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 3, 10),
      leafMat
    );
    leaves.position.set(x, 2.2, z);
    scene.add(leaves);
  }

  const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 12);
  const headGeo = new THREE.SphereGeometry(0.5, 12, 12);
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x1e40af });

  const body = new THREE.Mesh(bodyGeo, blueMat);
  const head = new THREE.Mesh(headGeo, blueMat);
  head.position.y = 0.9;

  player = new THREE.Group();
  player.add(body);
  player.add(head);
  player.position.set(0, 0.6, 0);
  scene.add(player);

  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
  for (let i = 0; i < 3; i++) {
    const eBody = new THREE.Mesh(bodyGeo, redMat);
    const eHead = new THREE.Mesh(headGeo, redMat);
    eHead.position.y = 0.9;

    const enemy = new THREE.Group();
    enemy.add(eBody);
    enemy.add(eHead);
    enemy.position.set(
      (Math.random() - 0.5) * 40,
      0.6,
      (Math.random() - 0.5) * 40
    );
    enemy.userData.speed = 0.06 + Math.random() * 0.04;
    enemies.push(enemy);
    scene.add(enemy);
  }

  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 });
  for (let i = 0; i < 5; i++) {
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.7),
      goldMat
    );
    cube.position.set(
      (Math.random() - 0.5) * 45,
      0.5,
      (Math.random() - 0.5) * 45
    );
    cube.userData.collected = false;
    treasures.push(cube);
    scene.add(cube);
  }

  window.onkeydown = e => keys[e.key.toLowerCase()] = true;
  window.onkeyup = e => keys[e.key.toLowerCase()] = false;

  timerInterval = setInterval(() => {
    timer--;
    updateTimer();
    if (timer <= 0) endMission(false, "Time is up!");
  }, 1000);
  updateTimer();
  animate();
}

function updateTimer() {
  const m = Math.floor(timer / 60);
  const s = timer % 60;
  timerText.textContent = `${m}:${s.toString().padStart(2, "0")}`;
}

function animate() {
  requestAnimationFrame(animate);
  updatePlayer();
  updateEnemies();
  checkCollisions();
  renderer.render(scene, camera);
}

function updatePlayer() {
  const speed = 0.18;
  let dx = 0, dz = 0;

  if (keys["w"]) dz -= speed;
  if (keys["s"]) dz += speed;
  if (keys["a"]) dx -= speed;
  if (keys["d"]) dx += speed;

  const len = Math.hypot(dx, dz);
  if (len > 0) {
    dx /= len; dz /= len;
    dx *= speed; dz *= speed;
    player.position.x += dx;
    player.position.z += dz;
    player.position.x = THREE.MathUtils.clamp(player.position.x, -28, 28);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -28, 28);
  }
}

function updateEnemies() {
  enemies.forEach(enemy => {
    const dx = player.position.x - enemy.position.x;
    const dz = player.position.z - enemy.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 12) {
      enemy.position.x += (dx / dist) * enemy.userData.speed;
      enemy.position.z += (dz / dist) * enemy.userData.speed;
    }
  });
}

function checkCollisions() {
  treasures.forEach(t => {
    if (t.userData.collected) return;
    const d = t.position.distanceTo(player.position);
    if (d < 1.5) {
      t.userData.collected = true;
      scene.remove(t);
      collected++;
      treasureCount.textContent = collected;
      if (collected === 5) endMission(true, "You recovered all relic fragments!");
    }
  });

  enemies.forEach(e => {
    const d = e.position.distanceTo(player.position);
    if (d < 1.2) applyDamage(10);
  });
}

let lastHit = 0;
function applyDamage(amount) {
  const now = performance.now();
  if (now - lastHit < 600) return;
  lastHit = now;

  hp -= amount;
  if (hp < 0) hp = 0;
  hpFill.style.width = hp + "%";
  hpText.textContent = `${hp} HP`;
  if (hp <= 0) endMission(false, "You were defeated by the guards.");
}

function endMission(success, msg) {
  clearInterval(timerInterval);
  resultOverlay.classList.remove("hidden");
  resultTitle.textContent = success ? "MISSION ACCOMPLISHED" : "MISSION FAILED";
  resultMessage.textContent = msg;
}


