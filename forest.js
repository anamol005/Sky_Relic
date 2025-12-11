/* ============================================================
   SKY RELIC — LOST FOREST (LEVEL 2)
   FIXED ENEMY FREEZE + BLUE UI + GUARD ENEMIES
   ============================================================ */

const canvas = document.getElementById("gameCanvas");

const hpBar = document.getElementById("hpBar");
const fragBar = document.getElementById("fragBar");
const timeBar = document.getElementById("timeBar");
const notifications = document.getElementById("notifications");

/* NEW BLUE UI ELEMENTS */
const gameOverlay = document.getElementById("gameOverlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlaySub = document.getElementById("overlaySub");
const overlayPoints = document.getElementById("overlayPoints");
const btnRestart = document.getElementById("btnRestart");
const btnExit = document.getElementById("btnExit");

/* GAME CONSTANTS */
const WORLD_SIZE = 60;
let PLAYER_SPEED = 6;

let hp = 100;
let fragmentsCollected = 0;
let timeLeft = 120;
let paused = false;

let scene, camera, renderer;
let player;

let fragments = [];
let chests = [];
let obstacles = [];

let enemies = [];
const ENEMY_COUNT = 6;     // normal enemies
const GUARD_COUNT = 2;     // NEW guards near fragments

const ENEMY_SPEED = 3.8;
const ENEMY_RANGE = 13;

let keys = { w:false, a:false, s:false, d:false };

let clock = new THREE.Clock();

/* --------------------------- START GAME ---------------------- */
init();
animate();
startTimer();

/* --------------------------- TIMER ---------------------------- */
function startTimer(){
  setInterval(()=>{
    if(!paused && timeLeft > 0){
      timeLeft--;
      timeBar.style.width = (timeLeft/120*100)+"%";
    }
    if(timeLeft <= 0) endGame(false);
  }, 1000);
}

/* --------------------------- NOTIFICATION --------------------- */
function notify(msg){
  let n = document.createElement("div");
  n.className = "notification";
  n.innerText = msg;
  notifications.appendChild(n);
  setTimeout(()=>n.remove(),2000);
}

/* --------------------------- INIT SCENE ------------------------ */
function init(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7bc47f);
  scene.fog = new THREE.Fog(0x88c070, 20, 130);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 300);
  camera.position.set(0,25,22);

  renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene.add(new THREE.AmbientLight(0xffffff,0.7));
  const sun = new THREE.DirectionalLight(0xffffff,1);
  sun.position.set(40,60,30);
  scene.add(sun);

  /* GROUND */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE*2, WORLD_SIZE*2),
    new THREE.MeshStandardMaterial({color:0x3c8a34})
  );
  ground.rotation.x = -Math.PI/2;
  scene.add(ground);

  /* PLAYER */
  player = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.4,0.8,6,12),
    new THREE.MeshStandardMaterial({color:0x0099ff})
  );
  player.position.set(0,1,0);
  scene.add(player);

  generateTrees();
  spawnFragments();
  spawnEnemies();

  document.addEventListener("keydown", e=>{
    if(keys[e.key] !== undefined) keys[e.key] = true;
  });
  document.addEventListener("keyup", e=>{
    if(keys[e.key] !== undefined) keys[e.key] = false;
  });
}

/* --------------------------- TREES ----------------------------- */
function generateTrees(){
  for(let i=0;i<120;i++){
    let x = Math.random()*WORLD_SIZE*2 - WORLD_SIZE;
    let z = Math.random()*WORLD_SIZE*2 - WORLD_SIZE;

    if(Math.abs(x)<5 && Math.abs(z)<5) continue;

    const h = 2 + Math.random()*1.5;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3,0.4,h,8),
      new THREE.MeshStandardMaterial({color:0x4b3a29})
    );
    trunk.position.set(x,h/2,z);

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(1.6,3.2,8),
      new THREE.MeshStandardMaterial({color:0x2f662b})
    );
    leaves.position.set(x,h+1.4,z);

    scene.add(trunk, leaves);
    obstacles.push({x,z,r:1});
  }
}

/* --------------------------- FRAGMENTS + GUARDS ------------------ */
function spawnFragments(){
  for(let i=0;i<5;i++){
    let x = Math.random()*WORLD_SIZE - WORLD_SIZE/2;
    let z = Math.random()*WORLD_SIZE - WORLD_SIZE/2;

    const frag = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.5),
      new THREE.MeshStandardMaterial({color:0xff00ff, emissive:0xaa00aa})
    );
    frag.position.set(x,1,z);
    fragments.push(frag);
    scene.add(frag);

    if(i < GUARD_COUNT){
      spawnGuardEnemy(x+1.8, z+1.8);
    }
  }
}

function spawnGuardEnemy(x,z){
  const guard = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.45,0.9,8,14),
    new THREE.MeshStandardMaterial({color:0xff0000})
  );
  guard.position.set(x,1,z);
  guard.userData.angle = Math.random()*Math.PI*2;
  guard.userData.timer = 0;

  enemies.push(guard);
  scene.add(guard);
}

/* --------------------------- NORMAL ENEMIES ----------------------- */
function spawnEnemies(){
  for(let i=0;i<ENEMY_COUNT;i++){
    let x = Math.random()*WORLD_SIZE - WORLD_SIZE/2;
    let z = Math.random()*WORLD_SIZE - WORLD_SIZE/2;

    const e = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4,0.8,6,12),
      new THREE.MeshStandardMaterial({color:0xff3333})
    );
    e.position.set(x,1,z);

    e.userData.angle = Math.random()*Math.PI*2;
    e.userData.timer = 0;

    enemies.push(e);
    scene.add(e);
  }
}

/* --------------------------- ENEMY AI ----------------------------- */
function updateEnemies(dt){
  enemies.forEach(e=>{
    const dist = e.position.distanceTo(player.position);

    if(dist < ENEMY_RANGE){
      const dir = new THREE.Vector3().subVectors(player.position, e.position).normalize();
      e.position.add(dir.multiplyScalar(ENEMY_SPEED*dt));
      e.rotation.y = Math.atan2(dir.x, dir.z);
    } else {
      e.userData.timer += dt;
      if(e.userData.timer > 1.2){
        e.userData.angle += (Math.random()*1 - 0.5);
        e.userData.timer = 0;
      }
      e.position.x += Math.sin(e.userData.angle)*1.2*dt;
      e.position.z += Math.cos(e.userData.angle)*1.2*dt;
    }

    if(dist < 1.3){
      hp -= 20 * dt;
      if(hp < 0) hp = 0;

      hpBar.style.width = hp + "%";

      if(hp <= 0) endGame(false);
    }
  });
}

/* --------------------------- MAIN LOOP ---------------------------- */
function animate(){
  requestAnimationFrame(animate);
  if(paused) return;

  const dt = clock.getDelta();

  movePlayer(dt);
  updateEnemies(dt);
  checkFragments();
  checkChestCollision();
  updateFloatingChests();

  renderer.render(scene, camera);
}

/* --------------------------- MOVE PLAYER -------------------------- */
function movePlayer(dt){
  let dir = new THREE.Vector3();
  if(keys.w) dir.z -= 1;
  if(keys.s) dir.z += 1;
  if(keys.a) dir.x -= 1;
  if(keys.d) dir.x += 1;

  if(dir.lengthSq()>0){
    dir.normalize();

    const next = player.position.clone().add(dir.multiplyScalar(PLAYER_SPEED*dt));

    let blocked = false;
    for(const o of obstacles)
      if(next.distanceTo(new THREE.Vector3(o.x,1,o.z)) < o.r+0.4)
        blocked = true;

    if(!blocked){
      player.position.copy(next);
      player.rotation.y = Math.atan2(dir.x, dir.z);
    }
  }

  const camOffset = new THREE.Vector3(0,25,22);
  camera.position.lerp(player.position.clone().add(camOffset),0.08);
  camera.lookAt(player.position);
}

/* --------------------------- FRAGMENTS --------------------------- */
function checkFragments(){
  fragments.forEach(f=>{
    if(f.visible && f.position.distanceTo(player.position) < 1.3){
      f.visible = false;
      fragmentsCollected++;

      fragBar.style.width = (fragmentsCollected/5*100)+"%";
      notify("Fragment "+fragmentsCollected+"/5");

      if(fragmentsCollected === 5){
        notify("All fragments collected!");
        spawnChests();
      }
    }
  });
}

/* --------------------------- CHESTS ------------------------------ */
function spawnChests(){
  for(let i=0;i<2;i++){
    let x = Math.random()*WORLD_SIZE - WORLD_SIZE/2;
    let z = Math.random()*WORLD_SIZE - WORLD_SIZE/2;

    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(1,1,1),
      new THREE.MeshStandardMaterial({
        color:0x00aaff,
        emissive:0x0077ff,
        emissiveIntensity:1.5
      })
    );
    chest.position.set(x,1,z);

    const marker = new THREE.Mesh(
      new THREE.ConeGeometry(0.4,1.2,6),
      new THREE.MeshStandardMaterial({color:0xffffff})
    );
    marker.position.set(x,2.5,z);
    marker.rotation.x = Math.PI;

    chest.userData.floatOffset = Math.random()*Math.PI*2;
    chest.userData.win = (i===0);

    scene.add(chest, marker);
    chests.push({chest, marker});
  }
}

function updateFloatingChests(){
  const time = performance.now()*0.002;

  chests.forEach(obj=>{
    obj.chest.position.y = 1 + Math.sin(time + obj.chest.userData.floatOffset)*0.25;
    obj.marker.position.y = 2.5 + Math.sin(time + obj.chest.userData.floatOffset)*0.25;
  });
}

/* --------------------------- CHEST COLLISION --------------------- */
function checkChestCollision(){
  chests.forEach(obj=>{
    if(obj.chest.visible && obj.chest.position.distanceTo(player.position) < 1.4){
      obj.chest.visible = false;
      endGame(obj.chest.userData.win);
    }
  });
}

/* --------------------------- END GAME BLUE UI -------------------- */
function endGame(win){
  paused = true;
  gameOverlay.classList.remove("hidden");

  let points = Math.floor(Math.random()*300 + 100);
  overlayPoints.innerText = points + " POINTS EARNED";

  if(win){
    overlayTitle.innerText = "MISSION ACCOMPLISHED";
    overlaySub.innerText = "Relic Signal Triangulated Successfully.";
  } else {
    overlayTitle.innerText = "MISSION FAILED";
    overlaySub.innerText = "Pilot integrity compromised.";
  }

  btnRestart.onclick = () => location.reload();
  btnExit.onclick = () => window.location.href = "index.html";
}