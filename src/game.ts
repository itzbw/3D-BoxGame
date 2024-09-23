import * as THREE from "three";
import * as CANNON from "cannon-es";

// @ts-nocheck

let camera: THREE.OrthographicCamera,
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer;
let world: CANNON.World;
let stack: Array<any> = [];
let overhangs: Array<{}> = [];
let lastTime = 0;
const boxSpeed = 5; // Units per second

let gameStarted = false;
let isFirstClick = true; // New flag to control the first click
const originalBoxSize = 3;
const boxHeight = 1;

let stackLengthDisplay: HTMLDivElement;
let stackLengthCount = 0;

export function gameInit(elem: HTMLElement) {
  // Create Game Start Screen
  const gameStartScreen = document.createElement("div");
  gameStartScreen.id = "gameStartScreen";
  gameStartScreen.style.position = "absolute";
  gameStartScreen.style.top = "50%";
  gameStartScreen.style.left = "50%";
  gameStartScreen.style.transform = "translate(-50%, -50%)";
  gameStartScreen.style.fontSize = "24px";
  gameStartScreen.style.fontWeight = "bold";
  gameStartScreen.style.color = "white";
  gameStartScreen.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  gameStartScreen.style.padding = "20px";
  gameStartScreen.style.borderRadius = "10px";
  gameStartScreen.style.textAlign = "center";
  gameStartScreen.style.cursor = "pointer";
  gameStartScreen.textContent = "Start";
  elem.appendChild(gameStartScreen);

  // Create Game Over Screen
  const gameOverScreen = document.createElement("div");
  gameOverScreen.id = "gameOverScreen";
  gameOverScreen.style.position = "absolute";
  gameOverScreen.style.top = "50%";
  gameOverScreen.style.left = "50%";
  gameOverScreen.style.transform = "translate(-50%, -50%)";
  gameOverScreen.style.fontSize = "24px";
  gameOverScreen.style.fontWeight = "bold";
  gameOverScreen.style.color = "black";
  gameOverScreen.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
  gameOverScreen.style.padding = "20px";
  gameOverScreen.style.borderRadius = "10px";
  gameOverScreen.style.textAlign = "center";
  gameOverScreen.style.display = "none"; // Hide initially
  gameOverScreen.textContent = "Game Over! Try Again";
  elem.appendChild(gameOverScreen);

  stackLengthDisplay = document.createElement("div");
  stackLengthDisplay.style.position = "absolute";
  stackLengthDisplay.style.top = "20px";
  stackLengthDisplay.style.left = "20px";
  stackLengthDisplay.style.fontSize = "24px";
  stackLengthDisplay.style.fontWeight = "bold";
  stackLengthDisplay.style.color = "white";
  stackLengthDisplay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  stackLengthDisplay.style.padding = "10px";
  stackLengthDisplay.style.borderRadius = "5px";
  elem.appendChild(stackLengthDisplay);

  // Update stack length display
  function updateStackLengthDisplay() {
    stackLengthDisplay.textContent = `Level: ${stackLengthCount}`;
  }

  // Hide Game Start Screen when clicked and start the game
  gameStartScreen?.addEventListener("click", (event) => {
    event.stopPropagation(); // Prevent the click from bubbling up to the game logic

    if (!gameStarted && isFirstClick) {
      // First click to start the game
      isFirstClick = false;
      gameStarted = true;

      // Hide the game start screen
      gameStartScreen.style.display = "none";

      // Start the game by adding the first moving layer
      addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");
    }
  });

  // Restart the game when Game Over screen is clicked
  gameOverScreen.addEventListener("click", () => {
    location.reload(); // Reload the page to restart the game
  });

  // initial Cannon JS world

  world = new CANNON.World();
  world.gravity.set(0, -10, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
  // @ts-ignore
  world.solver.iterations = 40;
  scene = new THREE.Scene();

  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 20, 0);
  scene.add(directionalLight);

  const width = 10;
  const height = width * (window.innerHeight / window.innerWidth);
  camera = new THREE.OrthographicCamera(
    width / -2,
    width / 2,
    height / 2,
    height / -2,
    1,
    100
  );

  camera.position.set(4, 4, 4);
  camera.lookAt(0, 0, 0);

  //   const axesHelper = new THREE.AxesHelper(5);
  //   scene.add(axesHelper);

  renderer = new THREE.WebGLRenderer({ antialias: true }); // Enabled antialias for better visuals
  renderer.setSize(window.innerWidth, window.innerHeight);
  elem.appendChild(renderer.domElement);

  // renderer.setAnimationLoop(animate);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setPixelRatio(window.devicePixelRatio);

  //   const controls = new OrbitControls(camera, renderer.domElement);
  addLayer(0, 0, originalBoxSize, originalBoxSize, "z", true);
  //   addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");

  function addLayer(
    x: number,
    z: number,
    width: number,
    depth: number,
    direction: "x" | "z" = "z",
    isInitialLayer: boolean = false
  ) {
    const y = boxHeight * stack.length;
    const layer = createBox(x, y, z, width, depth);
    // @ts-ignore
    layer.direction = direction;

    stack.push(layer);
    if (!isInitialLayer) {
      stackLengthCount++; // Increment count only for non-initial layers
      updateStackLengthDisplay();
    }
  }

  function addOverhang(x: number, z: number, width: number, depth: number) {
    const y = boxHeight * (stack.length - 1);
    const overhang = createBox(x, y, z, width, depth);
    overhangs.push(overhang);
  }

  function createBox(
    x: number,
    y: number,
    z: number,
    width: number,
    depth: number,
    falls: boolean = true
  ) {
    const geometry = new THREE.BoxGeometry(width, boxHeight, depth);

    const color = new THREE.Color(`hsl(${180 + stack.length * 4}, 100%, 50%)`);
    const material = new THREE.MeshLambertMaterial({ color });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    scene.add(mesh);

    // Cannon JS
    const cannonBox = new CANNON.Box(
      new CANNON.Vec3(width / 2, boxHeight / 2, depth / 2) // size is calculated from distance from center
    );

    let mass = falls ? 10 : 0;
    const body = new CANNON.Body({ mass, shape: cannonBox });
    body.position.set(x, y, z);
    world.addBody(body);

    return { threejs: mesh, cannonjs: body, width, depth };
  }

  function cutBox(topLayer: any, overlap: number, size: number, delta: number) {
    const direction = topLayer.direction;
    const newWidth = direction === "x" ? overlap : topLayer.width;
    const newDepth = direction === "z" ? overlap : topLayer.depth;

    topLayer.width = newWidth;
    topLayer.depth = newDepth;
    // update mesh size
    topLayer.threejs.scale[direction] = overlap / size;
    topLayer.threejs.position[direction] -= delta / 2;

    // update cannon model
    topLayer.cannonjs.position[direction] -= delta / 2;

    // replace shape with a cut one
    const shape = new CANNON.Box(
      new CANNON.Vec3(newWidth / 2, boxHeight / 2, newDepth / 2)
    );

    topLayer.cannonjs.shapes = [];
    topLayer.cannonjs.addShape(shape);
  }

  function animate(currentTime: number) {
    if (gameStarted) {
      // const speed = 0.15;
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;
      const topLayer = stack[stack.length - 1];
      const previousLayer = stack[stack.length - 2];

      // Move the top layer based on delta time
      const movement = boxSpeed * deltaTime;
      topLayer.threejs.position[topLayer.direction] += movement;
      topLayer.cannonjs.position[topLayer.direction] += movement;

      const buffer = 10; // Adjust this buffer value if needed

      if (previousLayer) {
        const direction = topLayer.direction;
        const delta =
          topLayer.threejs.position[direction] -
          previousLayer.threejs.position[direction];
        const overhangSize = Math.abs(delta);

        const size = direction === "x" ? topLayer.width : topLayer.depth;

        // Only check for game over if the block has moved beyond the size + buffer
        if (overhangSize > size + buffer) {
          gameStarted = false;
          console.log("Game Over! Final stack length:", stackLengthCount);

          // Show Game Over Screen
          const gameOverScreen = document.getElementById("gameOverScreen");
          if (gameOverScreen) {
            gameOverScreen.style.display = "block";
          }
          return; // Exit the function early if game over
        }
      }

      // adjust camera
      const cameraTarget = boxHeight * (stack.length - 2) + 4;
      if (camera.position.y < cameraTarget) {
        camera.position.y += movement;
      }
      updatePhysics();
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  renderer.setAnimationLoop(null); // Remove the built-in animation loop
  requestAnimationFrame(animate); // Start our custom animation loop

  function updatePhysics() {
    world.step(1 / 60); // 60 sec

    // copy
    overhangs.forEach((element) => {
      // @ts-ignore
      element.threejs.position.copy(element.cannonjs.position);
      // @ts-ignore
      element.threejs.quaternion.copy(element.cannonjs.quaternion);
    });
  }

  window.addEventListener("click", () => {
    if (gameStarted && !isFirstClick) {
      const topLayer = stack[stack.length - 1];
      const previousLayer = stack[stack.length - 2];
      const direction = topLayer.direction;

      const delta =
        topLayer.threejs.position[direction] -
        previousLayer.threejs.position[direction];
      const overhangSize = Math.abs(delta);

      const size = direction === "x" ? topLayer.width : topLayer.depth;
      const overlap = size - overhangSize;

      if (overlap > 0) {
        cutBox(topLayer, overlap, size, delta);

        // overhang calculation
        const overhangShift =
          (overlap / 2 + overhangSize / 2) * Math.sign(delta); // + or - depending on direction
        const overhangX =
          direction === "x"
            ? topLayer.threejs.position.x + overhangShift
            : topLayer.threejs.position.x;
        const overhangZ =
          direction === "z"
            ? topLayer.threejs.position.z + overhangShift
            : topLayer.threejs.position.z;
        const overhangWidth = direction === "x" ? overhangSize : topLayer.width;
        const overhangDepth = direction === "z" ? overhangSize : topLayer.depth;

        addOverhang(overhangX, overhangZ, overhangWidth, overhangDepth);

        // next layer
        const nextX = direction === "x" ? topLayer.threejs.position.x : -10;
        const nextZ = direction === "z" ? topLayer.threejs.position.z : -10;
        const nextDirection = direction === "x" ? "z" : "x";

        addLayer(nextX, nextZ, topLayer.width, topLayer.depth, nextDirection);
        updateStackLengthDisplay();
      } else {
        // Game Over logic
        gameStarted = false;
        console.log("Game Over! Final stack length:", stackLengthCount);

        // Show Game Over Screen
        const gameOverScreen = document.getElementById("gameOverScreen");
        if (gameOverScreen) {
          gameOverScreen.style.display = "block";
        }
      }
    }
  });

  updateStackLengthDisplay();

  window.addEventListener("resize", () => {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 10;
    camera.left = (frustumSize * aspect) / -2;
    camera.right = (frustumSize * aspect) / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
