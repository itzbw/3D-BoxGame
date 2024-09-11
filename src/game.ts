import * as THREE from "three";
import * as CANNON from "cannon-es";

let camera: THREE.OrthographicCamera,
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer;
let world: CANNON.World;
let stack: Array<any> = [];
let overhangs: Array<{}> = [];

let gameStarted = false;
const originalBoxSize = 3;
const boxHeight = 1;

let stackLengthDisplay: HTMLDivElement;
let stackLengthCount = 0;

export function gameInit(elem: HTMLElement) {
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
  // initial Cannon JS world

  world = new CANNON.World();
  world.gravity.set(0, -10, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
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

  renderer.setAnimationLoop(animate);
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

    const color = new THREE.Color(`hsl(${30 + stack.length * 4}, 100%, 50%)`);
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

  function animate() {
    if (gameStarted) {
      const speed = 0.15;
      const topLayer = stack[stack.length - 1];

      topLayer.threejs.position[topLayer.direction] += speed;
      topLayer.cannonjs.position[topLayer.direction] += speed;

      // adjust camera
      const cameraTarget = boxHeight * (stack.length - 2) + 4;
      if (camera.position.y < cameraTarget) {
        camera.position.y += speed;
      }
      updatePhysics();
    }
    // Update all stack number positions
    stack.forEach((layer) => {
      if (layer.updateNumberPosition) {
        layer.updateNumberPosition();
      }
    });
    renderer.render(scene, camera);
  }

  function updatePhysics() {
    world.step(1 / 60); // 60 sec

    // copy
    overhangs.forEach((element) => {
      element.threejs.position.copy(element.cannonjs.position);
      element.threejs.quaternion.copy(element.cannonjs.quaternion);
    });
  }

  window.addEventListener("click", () => {
    if (!gameStarted) {
      gameStarted = true;
      addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");
    } else {
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

        // const newLayer = addLayer(
        //   nextX,
        //   nextZ,
        //   topLayer.width,
        //   topLayer.depth,
        //   nextDirection
        // );
        // newLayer.updateNumberPosition = addStackNumber(
        //   stack.length,
        //   nextX,
        //   newLayer.threejs.position.y,
        //   nextZ
        // );
      } else {
        // Game over logic
        console.log("Game Over! Final stack length:", stackLengthCount);
        // You can add more game over handling here if needed
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
