import * as THREE from "three";

let camera: THREE.OrthographicCamera,
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer;
let stack: Array<{}> = [];

let gameStarted = false;
const originalBoxSize = 3;
const boxHeight = 1;

export function gameInit(elem: HTMLElement) {
  scene = new THREE.Scene();

  addLayer(0, 0, originalBoxSize, originalBoxSize, "x");

  addLayer(-10, 0, originalBoxSize, originalBoxSize, "z");

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

  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  renderer = new THREE.WebGLRenderer({ antialias: true }); // Enabled antialias for better visuals
  renderer.setSize(window.innerWidth, window.innerHeight);
  elem.appendChild(renderer.domElement);

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setPixelRatio(window.devicePixelRatio);

  //   const controls = new OrbitControls(camera, renderer.domElement);

  const geometry = new THREE.BoxGeometry(3, 1, 3);
  const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 0, 0);
  scene.add(mesh);

  function addLayer(
    x: number,
    z: number,
    width: number,
    depth: number,
    direction: "x" | "z"
  ) {
    const y = boxHeight * stack.length;
    const layer = createBox(x, y, z, width, depth);
    layer.direction = direction;

    stack.push(layer);
  }

  function createBox(
    x: number,
    y: number,
    z: number,
    width: number,
    depth: number
  ) {
    const geometry = new THREE.BoxGeometry(width, boxHeight, depth);

    const color = new THREE.Color(`hsl(${30 + stack.length * 4}, 100%, 50%)`);
    const material = new THREE.MeshLambertMaterial({ color });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return { threejs: mesh, width, depth };
  }

  function animate() {
    const speed = 0.15;
    const topLayer = stack[stack.length - 1];
    const initCameraHeight = 4;
    topLayer.threejs.position[topLayer.direction] += speed;

    if (camera.position.y < boxHeight * (stack.length - 2) + initCameraHeight) {
      camera.position.y += speed;
    }

    // requestAnimationFrame(animate);
    // controls.update();
    renderer.render(scene, camera);
  }

  window.addEventListener("click", () => {
    if (!gameStarted) {
      renderer.setAnimationLoop(animate);
      gameStarted = true;
    } else {
      const topLayer = stack[stack.length - 1];
      const direction = topLayer.direction;

      const nextX = direction === "x" ? 0 : -10;
      const nextZ = direction === "z" ? 0 : -10;
      const newWidth = originalBoxSize;
      const newDepth = originalBoxSize;
      const nextDirection = direction === "x" ? "z" : "x";

      addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
    }
  });
}
