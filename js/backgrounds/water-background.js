/**
 * water-background.js — WebGPU Compute Water Simulation
 *
 * Essentially verbatim from the Three.js example:
 * https://threejs.org/examples/webgpu_compute_water.html
 * Licence: MIT (Three.js)
 *
 * Wrapped as an ES module that exports init / show / hide / dispose
 * for integration with the DynamicSite background system.
 *
 * Asset paths (HDR environment map, duck GLB) are loaded from
 * the Three.js examples CDN so we don't bloat the repo.
 */

import * as THREE from 'three/webgpu';
import {
  instanceIndex, struct, If, uint, int, floor, float, length, clamp,
  vec2, cos, vec3, vertexIndex, Fn, uniform, instancedArray, min, max,
  positionLocal, transformNormalToView, select, globalId
} from 'three/tsl';

import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import WebGPU from 'three/addons/capabilities/WebGPU.js';

// ─── Constants ─────────────────────────────────────────────────────────────
const WIDTH = 128;
const BOUNDS = 6;
const BOUNDS_HALF = BOUNDS * 0.5;
const limit = BOUNDS_HALF - 0.2;
const waterMaxHeight = 0.1;

// Three.js examples CDN base path for assets
const ASSETS_BASE = 'https://threejs.org/examples/';

// ─── Module state ──────────────────────────────────────────────────────────
let container, canvas;
let camera, scene, renderer, controls;
let mouseDown = false;
let firstClick = true;
let updateOriginMouseDown = false;
const mouseCoords = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let frame = 0;
let animationRunning = false;
let isInitialised = false;
let debugHUD = null;

let sun;
let waterMesh;
let poolBorder;
let meshRay;
let computeHeightAtoB, computeHeightBtoA, computeDucks, computeBoat;
let boatDataStorage, boatDataArray;
let pingPong = 0;
const readFromA = uniform( 1 );
let duckModel = null;
let duckMesh = null;

let sailboatMesh = null;
let sailboatEnabled = true;
const sailboatState = {
  bobPhase: 0,            // for gentle rocking
};

const NUM_DUCKS = 100;
const simplex = new SimplexNoise();

// ─── Effect controller (uniforms exposed as controls) ──────────────────────
const effectController = {
  mousePos: uniform( new THREE.Vector2() ).setName( 'mousePos' ),
  mouseSpeed: uniform( new THREE.Vector2() ).setName( 'mouseSpeed' ),
  mouseDeep: uniform( 0.5 ).setName( 'mouseDeep' ),
  mouseSize: uniform( 0.12 ).setName( 'mouseSize' ),
  viscosity: uniform( 0.96 ).setName( 'viscosity' ),
  // Boat displacement uniforms (same math as mouse, independent channel)
  boatPos: uniform( new THREE.Vector2() ).setName( 'boatPos' ),
  boatSpeed: uniform( new THREE.Vector2() ).setName( 'boatSpeed' ),
  boatSize: uniform( 0.18 ).setName( 'boatSize' ),
  boatDeep: uniform( 0.3 ).setName( 'boatDeep' ),
  ducksEnabled: true,
  wireframe: false,
  speed: 5,
};

// ─── Sailboat helpers ─────────────────────────────────────────────────────

function updateSailboat() {
  if ( ! sailboatMesh ) return;
  sailboatMesh.visible = sailboatEnabled;
}

// ─── Noise helper ──────────────────────────────────────────────────────────
function noise( x, y ) {
  let multR = waterMaxHeight;
  let mult = 0.025;
  let r = 0;
  for ( let i = 0; i < 15; i ++ ) {
    r += multR * simplex.noise( x * mult, y * mult );
    multR *= 0.53 + 0.025 * i;
    mult *= 1.25;
  }
  return r;
}

// ─── Theme-aware gradient background ──────────────────────────────────────
// Paints the site's -25deg page gradient onto a small canvas and uses it as
// the Three.js scene background so the 3D scene blends with the page chrome.
// Theme colours:  dark  #000000 → #96b7c4   light  #4b5b62 → #ffffff
const THEME_COLOURS = {
  dark:  { start: '#000000', end: '#96b7c4' },
  light: { start: '#4b5b62', end: '#ffffff' }
};
let bgTexture = null;

function applyThemeBackground() {
  if ( ! scene ) return;
  const theme = document.body.getAttribute( 'data-theme' ) || 'dark';
  const colours = THEME_COLOURS[ theme ] || THEME_COLOURS.dark;

  // 256×256 offscreen canvas — small but enough for a smooth gradient
  const size = 256;
  const cvs = document.createElement( 'canvas' );
  cvs.width = size;
  cvs.height = size;
  const ctx = cvs.getContext( '2d' );

  // CSS uses -25deg (clockwise from top).  Canvas angle: 90 - (-25) = 115°.
  const angle = 115 * Math.PI / 180;
  const cx = size / 2, cy = size / 2;
  const reach = size / 2 * 1.42; // √2 to cover corners
  const x0 = cx - Math.cos( angle ) * reach;
  const y0 = cy + Math.sin( angle ) * reach;
  const x1 = cx + Math.cos( angle ) * reach;
  const y1 = cy - Math.sin( angle ) * reach;

  const grad = ctx.createLinearGradient( x0, y0, x1, y1 );
  grad.addColorStop( 0, colours.start );
  grad.addColorStop( 1, colours.end );
  ctx.fillStyle = grad;
  ctx.fillRect( 0, 0, size, size );

  if ( bgTexture ) bgTexture.dispose();
  bgTexture = new THREE.CanvasTexture( cvs );
  bgTexture.colorSpace = THREE.SRGBColorSpace;
  scene.background = bgTexture;
}

// ─── Public API ────────────────────────────────────────────────────────────

export function isAvailable() {
  return WebGPU.isAvailable();
}

export function isReady() {
  return isInitialised;
}

export async function init() {
  if ( isInitialised ) return;
  if ( ! WebGPU.isAvailable() ) {
    console.warn( '[WaterBackground] WebGPU not available' );
    return;
  }

  // Container — fixed full-screen behind everything
  container = document.createElement( 'div' );
  container.id = 'water-background-container';
  container.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:1;pointer-events:none;';
  document.body.appendChild( container );

  camera = new THREE.PerspectiveCamera( 55, window.innerWidth / window.innerHeight, 1, 3000 );
  camera.position.set( 0, 2.5, 8 );
  camera.lookAt( 0, 0, 0 );

  scene = new THREE.Scene();

  sun = new THREE.DirectionalLight( 0xFFFFFF, 4.0 );
  sun.position.set( - 1, 2.6, 1.4 );
  scene.add( sun );

  // ── Height storage buffers ───────────────────────────────────────────
  const heightArray = new Float32Array( WIDTH * WIDTH );
  const prevHeightArray = new Float32Array( WIDTH * WIDTH );

  let p = 0;
  for ( let j = 0; j < WIDTH; j ++ ) {
    for ( let i = 0; i < WIDTH; i ++ ) {
      const x = i * 128 / WIDTH;
      const y = j * 128 / WIDTH;
      const height = noise( x, y );
      heightArray[ p ] = height;
      prevHeightArray[ p ] = height;
      p ++;
    }
  }

  const heightStorageA = instancedArray( heightArray ).setName( 'HeightA' );
  const heightStorageB = instancedArray( new Float32Array( heightArray ) ).setName( 'HeightB' );
  const prevHeightStorage = instancedArray( prevHeightArray ).setName( 'PrevHeight' );

  // ── Neighbour helpers ────────────────────────────────────────────────
  const getNeighborIndicesTSL = ( index ) => {
    const width = uint( WIDTH );
    const x = int( index.mod( WIDTH ) );
    const y = int( index.div( WIDTH ) );
    const leftX = max( 0, x.sub( 1 ) );
    const rightX = min( x.add( 1 ), width.sub( 1 ) );
    const bottomY = max( 0, y.sub( 1 ) );
    const topY = min( y.add( 1 ), width.sub( 1 ) );
    const westIndex = y.mul( width ).add( leftX );
    const eastIndex = y.mul( width ).add( rightX );
    const southIndex = bottomY.mul( width ).add( x );
    const northIndex = topY.mul( width ).add( x );
    return { northIndex, southIndex, eastIndex, westIndex };
  };

  const getNeighborValuesTSL = ( index, store ) => {
    const { northIndex, southIndex, eastIndex, westIndex } = getNeighborIndicesTSL( index );
    const north = store.element( northIndex );
    const south = store.element( southIndex );
    const east = store.element( eastIndex );
    const west = store.element( westIndex );
    return { north, south, east, west };
  };

  // ── Compute height kernel ────────────────────────────────────────────
  const createComputeHeight = ( readBuffer, writeBuffer ) => Fn( () => {
    const { viscosity, mousePos, mouseSize, mouseDeep, mouseSpeed,
            boatPos, boatSize, boatDeep, boatSpeed } = effectController;
    const height = readBuffer.element( instanceIndex ).toVar();
    const prevHeight = prevHeightStorage.element( instanceIndex ).toVar();
    const { north, south, east, west } = getNeighborValuesTSL( instanceIndex, readBuffer );
    const neighborHeight = north.add( south ).add( east ).add( west );
    neighborHeight.mulAssign( 0.5 );
    neighborHeight.subAssign( prevHeight );
    const newHeight = neighborHeight.mul( viscosity );
    const x = float( globalId.x ).mul( 1 / WIDTH );
    const y = float( globalId.y ).mul( 1 / WIDTH );
    const centerVec = vec2( 0.5 );
    // Mouse displacement
    const mousePhase = clamp(
      length( ( vec2( x, y ).sub( centerVec ) ).mul( BOUNDS ).sub( mousePos ) ).mul( Math.PI ).div( mouseSize ),
      0.0, Math.PI
    );
    newHeight.addAssign( cos( mousePhase ).add( 1.0 ).mul( mouseDeep ).mul( mouseSpeed.length() ) );
    // Boat displacement — same cosine bump, independent channel
    const boatPhase = clamp(
      length( ( vec2( x, y ).sub( centerVec ) ).mul( BOUNDS ).sub( boatPos ) ).mul( Math.PI ).div( boatSize ),
      0.0, Math.PI
    );
    newHeight.addAssign( cos( boatPhase ).add( 1.0 ).mul( boatDeep ).mul( boatSpeed.length() ) );
    prevHeightStorage.element( instanceIndex ).assign( height );
    writeBuffer.element( instanceIndex ).assign( newHeight );
  } )().compute( WIDTH * WIDTH, [ 16, 16 ] );

  computeHeightAtoB = createComputeHeight( heightStorageA, heightStorageB ).setName( 'Update Height A→B' );
  computeHeightBtoA = createComputeHeight( heightStorageB, heightStorageA ).setName( 'Update Height B→A' );

  // ── Water mesh ───────────────────────────────────────────────────────
  const waterGeometry = new THREE.PlaneGeometry( BOUNDS, BOUNDS, WIDTH - 1, WIDTH - 1 );

  const waterMaterial = new THREE.MeshStandardNodeMaterial( {
    color: 0x9bd2ec,
    metalness: 0.9,
    roughness: 0,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  } );

  const getCurrentHeight = ( index ) => {
    return select( readFromA, heightStorageA.element( index ), heightStorageB.element( index ) );
  };

  const getCurrentNormals = ( index ) => {
    const { northIndex, southIndex, eastIndex, westIndex } = getNeighborIndicesTSL( index );
    const north = getCurrentHeight( northIndex );
    const south = getCurrentHeight( southIndex );
    const east = getCurrentHeight( eastIndex );
    const west = getCurrentHeight( westIndex );
    const normalX = ( west.sub( east ) ).mul( WIDTH / BOUNDS );
    const normalY = ( south.sub( north ) ).mul( WIDTH / BOUNDS );
    return { normalX, normalY };
  };

  waterMaterial.normalNode = Fn( () => {
    const { normalX, normalY } = getCurrentNormals( vertexIndex );
    return transformNormalToView( vec3( normalX, normalY.negate(), 1.0 ) ).toVertexStage();
  } )();

  waterMaterial.positionNode = Fn( () => {
    return vec3( positionLocal.x, positionLocal.y, getCurrentHeight( vertexIndex ) );
  } )();

  waterMesh = new THREE.Mesh( waterGeometry, waterMaterial );
  waterMesh.rotation.x = - Math.PI * 0.5;
  waterMesh.matrixAutoUpdate = false;
  waterMesh.updateMatrix();
  scene.add( waterMesh );

  // ── Pool border ──────────────────────────────────────────────────────
  const borderGeom = new THREE.TorusGeometry( 4.2, 0.1, 12, 4 );
  borderGeom.rotateX( Math.PI * 0.5 );
  borderGeom.rotateY( Math.PI * 0.25 );
  poolBorder = new THREE.Mesh( borderGeom, new THREE.MeshStandardMaterial( {
    color: 0x0a0a12,
    roughness: 0.03,
    metalness: 0.95,
    envMapIntensity: 2.5
  } ) );
  scene.add( poolBorder );

  // ── Raycast plane ────────────────────────────────────────────────────
  const geometryRay = new THREE.PlaneGeometry( BOUNDS, BOUNDS, 1, 1 );
  meshRay = new THREE.Mesh( geometryRay, new THREE.MeshBasicMaterial( { color: 0xFFFFFF, visible: false } ) );
  meshRay.rotation.x = - Math.PI / 2;
  meshRay.matrixAutoUpdate = false;
  meshRay.updateMatrix();
  scene.add( meshRay );

  // ── Duck compute + instancing ────────────────────────────────────────
  const duckStride = 8;
  const duckInstanceDataArray = new Float32Array( NUM_DUCKS * duckStride );

  for ( let i = 0; i < NUM_DUCKS; i ++ ) {
    duckInstanceDataArray[ i * duckStride + 0 ] = ( Math.random() - 0.5 ) * BOUNDS * 0.7;
    duckInstanceDataArray[ i * duckStride + 1 ] = 0;
    duckInstanceDataArray[ i * duckStride + 2 ] = ( Math.random() - 0.5 ) * BOUNDS * 0.7;
  }

  const DuckStruct = struct( {
    position: 'vec3',
    velocity: 'vec2'
  } );

  const duckInstanceDataStorage = instancedArray( duckInstanceDataArray, DuckStruct ).setName( 'DuckInstanceData' );

  computeDucks = Fn( () => {
    const yOffset = float( - 0.04 );
    const verticalResponseFactor = float( 0.98 );
    const waterPushFactor = float( 0.015 );
    const linearDamping = float( 0.92 );
    const bounceDamping = float( - 0.4 );

    const instancePosition = duckInstanceDataStorage.element( instanceIndex ).get( 'position' ).toVar();
    const velocity = duckInstanceDataStorage.element( instanceIndex ).get( 'velocity' ).toVar();

    const gridCoordX = instancePosition.x.div( BOUNDS ).add( 0.5 ).mul( WIDTH );
    const gridCoordZ = instancePosition.z.div( BOUNDS ).add( 0.5 ).mul( WIDTH );

    const xCoord = uint( clamp( floor( gridCoordX ), 0, WIDTH - 1 ) );
    const zCoord = uint( clamp( floor( gridCoordZ ), 0, WIDTH - 1 ) );
    const heightInstanceIndex = zCoord.mul( WIDTH ).add( xCoord );

    const waterHeight = getCurrentHeight( heightInstanceIndex );
    const { normalX, normalY } = getCurrentNormals( heightInstanceIndex );

    const targetY = waterHeight.add( yOffset );
    const deltaY = targetY.sub( instancePosition.y );
    instancePosition.y.addAssign( deltaY.mul( verticalResponseFactor ) );

    const pushX = normalX.mul( waterPushFactor );
    const pushZ = normalY.mul( waterPushFactor );

    velocity.x.mulAssign( linearDamping );
    velocity.y.mulAssign( linearDamping );
    velocity.x.addAssign( pushX );
    velocity.y.addAssign( pushZ );

    instancePosition.x.addAssign( velocity.x );
    instancePosition.z.addAssign( velocity.y );

    If( instancePosition.x.lessThan( - limit ), () => {
      instancePosition.x = - limit;
      velocity.x.mulAssign( bounceDamping );
    } ).ElseIf( instancePosition.x.greaterThan( limit ), () => {
      instancePosition.x = limit;
      velocity.x.mulAssign( bounceDamping );
    } );

    If( instancePosition.z.lessThan( - limit ), () => {
      instancePosition.z = - limit;
      velocity.y.mulAssign( bounceDamping );
    } ).ElseIf( instancePosition.z.greaterThan( limit ), () => {
      instancePosition.z = limit;
      velocity.y.mulAssign( bounceDamping );
    } );

    duckInstanceDataStorage.element( instanceIndex ).get( 'position' ).assign( instancePosition );
    duckInstanceDataStorage.element( instanceIndex ).get( 'velocity' ).assign( velocity );
  } )().compute( NUM_DUCKS ).setName( 'Update Ducks' );

  // ── Boat compute — exact same physics as ducks, 1 instance ──────────
  const boatStride = 8; // same layout as DuckStruct: vec3 pos + vec2 vel
  boatDataArray = new Float32Array( boatStride );
  boatDataArray[ 0 ] = ( Math.random() - 0.5 ) * BOUNDS * 0.5; // posX
  boatDataArray[ 2 ] = ( Math.random() - 0.5 ) * BOUNDS * 0.5; // posZ

  const BoatStruct = struct( {
    position: 'vec3',
    velocity: 'vec2'
  } );

  boatDataStorage = instancedArray( boatDataArray, BoatStruct ).setName( 'BoatInstanceData' );

  computeBoat = Fn( () => {
    const yOffset = float( - 0.12 );
    const verticalResponseFactor = float( 0.98 );
    const waterPushFactor = float( 0.015 );
    const linearDamping = float( 0.92 );
    const bounceDamping = float( - 0.4 );

    const instancePosition = boatDataStorage.element( instanceIndex ).get( 'position' ).toVar();
    const velocity = boatDataStorage.element( instanceIndex ).get( 'velocity' ).toVar();

    const gridCoordX = instancePosition.x.div( BOUNDS ).add( 0.5 ).mul( WIDTH );
    const gridCoordZ = instancePosition.z.div( BOUNDS ).add( 0.5 ).mul( WIDTH );

    const xCoord = uint( clamp( floor( gridCoordX ), 0, WIDTH - 1 ) );
    const zCoord = uint( clamp( floor( gridCoordZ ), 0, WIDTH - 1 ) );
    const heightInstanceIndex = zCoord.mul( WIDTH ).add( xCoord );

    const waterHeight = getCurrentHeight( heightInstanceIndex );
    const { normalX, normalY } = getCurrentNormals( heightInstanceIndex );

    const targetY = waterHeight.add( yOffset );
    const deltaY = targetY.sub( instancePosition.y );
    instancePosition.y.addAssign( deltaY.mul( verticalResponseFactor ) );

    const pushX = normalX.mul( waterPushFactor );
    const pushZ = normalY.mul( waterPushFactor );

    velocity.x.mulAssign( linearDamping );
    velocity.y.mulAssign( linearDamping );
    velocity.x.addAssign( pushX );
    velocity.y.addAssign( pushZ );

    instancePosition.x.addAssign( velocity.x );
    instancePosition.z.addAssign( velocity.y );

    If( instancePosition.x.lessThan( - limit ), () => {
      instancePosition.x = - limit;
      velocity.x.mulAssign( bounceDamping );
    } ).ElseIf( instancePosition.x.greaterThan( limit ), () => {
      instancePosition.x = limit;
      velocity.x.mulAssign( bounceDamping );
    } );

    If( instancePosition.z.lessThan( - limit ), () => {
      instancePosition.z = - limit;
      velocity.y.mulAssign( bounceDamping );
    } ).ElseIf( instancePosition.z.greaterThan( limit ), () => {
      instancePosition.z = limit;
      velocity.y.mulAssign( bounceDamping );
    } );

    boatDataStorage.element( instanceIndex ).get( 'position' ).assign( instancePosition );
    boatDataStorage.element( instanceIndex ).get( 'velocity' ).assign( velocity );
  } )().compute( 1 ).setName( 'Update Boat' );

  // ── Load assets ──────────────────────────────────────────────────────
  const hdrLoader = new HDRLoader().setPath( ASSETS_BASE + 'textures/equirectangular/' );
  const glbloader = new GLTFLoader().setPath( ASSETS_BASE + 'models/gltf/' );
  glbloader.setDRACOLoader( new DRACOLoader().setDecoderPath( ASSETS_BASE + 'jsm/libs/draco/gltf/' ) );

  // Separate loader for the sailboat (different base path — our own assets folder)
  const sailboatLoader = new GLTFLoader();

  const [ env, model, sailboatGLTF ] = await Promise.all( [
    hdrLoader.loadAsync( 'blouberg_sunrise_2_1k.hdr' ),
    glbloader.loadAsync( 'duck.glb' ),
    sailboatLoader.loadAsync( 'assets/models/sailboat.glb' )
  ] );

  env.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = env;
  scene.environmentIntensity = 1.25;

  // Use the site's theme gradient as the visible background instead of the
  // HDR map (which looked brownish).  HDR stays as environment for reflections.
  applyThemeBackground();

  duckModel = model.scene.children[ 0 ];
  duckModel.material.positionNode = Fn( () => {
    const instancePosition = duckInstanceDataStorage.element( instanceIndex ).get( 'position' );
    const newPosition = positionLocal.add( instancePosition );
    return newPosition;
  } )();

  duckMesh = new THREE.InstancedMesh( duckModel.geometry, duckModel.material, NUM_DUCKS );
  scene.add( duckMesh );

  // ── Sailboat — DIAGNOSTIC: InstancedMesh + positionNode reading storage (no compute) ──
  const boatModel = sailboatGLTF.scene.children[ 0 ];
  boatModel.geometry.scale( 0.02, 0.02, 0.02 );
  boatModel.geometry.computeVertexNormals();
  boatModel.material.positionNode = Fn( () => {
    const instancePosition = boatDataStorage.element( instanceIndex ).get( 'position' );
    const newPosition = positionLocal.add( instancePosition );
    return newPosition;
  } )();
  sailboatMesh = new THREE.InstancedMesh( boatModel.geometry, boatModel.material, 1 );
  sailboatMesh.frustumCulled = false;
  scene.add( sailboatMesh );
  console.log( '[WaterBackground] DIAGNOSTIC: boat reading from storage, compute DISABLED' );

  // ── Renderer ─────────────────────────────────────────────────────────
  renderer = new THREE.WebGPURenderer( { antialias: true, requiredLimits: { maxStorageBuffersInVertexStage: 2 } } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;
  container.appendChild( renderer.domElement );

  canvas = renderer.domElement;

  controls = new OrbitControls( camera, container );

  // ── Event listeners ──────────────────────────────────────────────────
  container.addEventListener( 'pointermove', onPointerMove );
  container.addEventListener( 'pointerdown', onPointerDown );
  container.addEventListener( 'pointerup', onPointerUp );
  window.addEventListener( 'resize', onWindowResize );

  // Re-apply scene background when the user switches theme
  new MutationObserver( () => applyThemeBackground() )
    .observe( document.body, { attributes: true, attributeFilter: [ 'data-theme' ] } );

  isInitialised = true;
  createDebugHUD();
  console.log( '[WaterBackground] Initialised' );
}

export function show() {
  if ( ! isInitialised || ! container ) return;
  container.style.display = '';
  container.style.pointerEvents = 'auto';
  if ( ! animationRunning ) {
    animationRunning = true;
    renderer.setAnimationLoop( render );
  }
}

export function hide() {
  if ( ! container ) return;
  container.style.display = 'none';
  container.style.pointerEvents = 'none';
  // Keep animation loop running so water state persists,
  // but we could pause to save GPU if desired.
}

export function dispose() {
  if ( ! isInitialised ) return;
  animationRunning = false;
  if ( renderer ) {
    renderer.setAnimationLoop( null );
    renderer.dispose();
  }
  if ( container && container.parentNode ) {
    container.parentNode.removeChild( container );
  }
  window.removeEventListener( 'resize', onWindowResize );
  isInitialised = false;
}

// ─── Control getters (read current state for UI sync) ──────────────────────
export function getMouseSize() { return effectController.mouseSize.value; }
export function getMouseDeep() { return effectController.mouseDeep.value; }
export function getViscosity() { return effectController.viscosity.value; }
export function getSpeed() { return effectController.speed; }
export function getDucksEnabled() { return effectController.ducksEnabled; }
export function getSailboatEnabled() { return sailboatEnabled; }
export function getWireframe() { return effectController.wireframe; }

// ─── Control setters (called from Backgrounds page) ────────────────────────
export function setMouseSize( v ) { effectController.mouseSize.value = v; }
export function setMouseDeep( v ) { effectController.mouseDeep.value = v; }
export function setViscosity( v ) { effectController.viscosity.value = v; }
export function setSpeed( v ) { effectController.speed = v; }
export function setDucksEnabled( v ) {
  effectController.ducksEnabled = v;
  if ( duckMesh ) duckMesh.visible = v;
}
export function setSailboatEnabled( v ) {
  sailboatEnabled = v;
  if ( sailboatMesh ) sailboatMesh.visible = v;
}
export function setWireframe( v ) {
  effectController.wireframe = v;
  if ( waterMesh ) {
    waterMesh.material.wireframe = v;
    waterMesh.material.needsUpdate = true;
  }
  if ( poolBorder ) {
    poolBorder.material.wireframe = v;
    poolBorder.material.needsUpdate = true;
  }
  if ( duckModel ) {
    duckModel.material.wireframe = v;
    duckModel.material.needsUpdate = true;
  }
}

export function getEffectController() {
  return effectController;
}

// ─── Internal event handlers (verbatim from example) ───────────────────────

function onWindowResize() {
  if ( ! camera || ! renderer ) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

function setMouseCoords( x, y ) {
  mouseCoords.set(
    ( x / renderer.domElement.clientWidth ) * 2 - 1,
    - ( y / renderer.domElement.clientHeight ) * 2 + 1
  );
}

function onPointerDown() {
  mouseDown = true;
  firstClick = true;
  updateOriginMouseDown = true;
}

function onPointerUp() {
  mouseDown = false;
  firstClick = false;
  updateOriginMouseDown = false;
  if ( controls ) controls.enabled = true;
}

function onPointerMove( event ) {
  if ( event.isPrimary === false ) return;
  setMouseCoords( event.clientX, event.clientY );
}

function raycast() {
  if ( mouseDown && ( firstClick || ! controls.enabled ) ) {
    raycaster.setFromCamera( mouseCoords, camera );
    const intersects = raycaster.intersectObject( meshRay );
    if ( intersects.length > 0 ) {
      const point = intersects[ 0 ].point;
      if ( updateOriginMouseDown ) {
        effectController.mousePos.value.set( point.x, point.z );
        updateOriginMouseDown = false;
      }
      effectController.mouseSpeed.value.set(
        ( point.x - effectController.mousePos.value.x ),
        ( point.z - effectController.mousePos.value.y )
      );
      effectController.mousePos.value.set( point.x, point.z );
      if ( firstClick ) {
        controls.enabled = false;
      }
    } else {
      updateOriginMouseDown = true;
      effectController.mouseSpeed.value.set( 0, 0 );
    }
    firstClick = false;
  } else {
    updateOriginMouseDown = true;
    effectController.mouseSpeed.value.set( 0, 0 );
  }
}

// ─── Debug HUD (temporary) ────────────────────────────────────────────────
function createDebugHUD() {
  debugHUD = document.createElement( 'div' );
  debugHUD.id = 'water-debug-hud';
  debugHUD.style.cssText = [
    'position: fixed',
    'top: 50px',
    'left: 50%',
    'transform: translateX(-50%)',
    'z-index: 10000',
    'background: rgba(0,0,0,0.75)',
    'color: #0f0',
    'font-family: monospace',
    'font-size: 14px',
    'padding: 12px 20px',
    'border-radius: 8px',
    'pointer-events: none',
    'white-space: pre',
    'text-align: left',
    'line-height: 1.6'
  ].join(';');
  document.body.appendChild( debugHUD );

  // Match initial border-guide visibility
  const sc = document.querySelector( '.site-container' );
  const hidden = sc && sc.classList.contains( 'borders-hidden' );
  debugHUD.style.display = hidden ? 'none' : '';
}

// Called by the global toggleBorders function in script.js
export function toggleDebugHUD( show ) {
  if ( debugHUD ) debugHUD.style.display = show ? '' : 'none';
}

function updateDebugHUD() {
  if ( ! debugHUD || ! camera ) return;
  // Only show on the home page
  const isHome = document.body.classList.contains( 'water-bg-active' );
  if ( ! isHome ) { debugHUD.style.display = 'none'; return; }
  const sc = document.querySelector( '.site-container' );
  const bordersHidden = sc && sc.classList.contains( 'borders-hidden' );
  debugHUD.style.display = bordersHidden ? 'none' : '';
  const p = camera.position;
  const r = camera.rotation;
  const toDeg = ( rad ) => ( rad * 180 / Math.PI ).toFixed( 1 );
  debugHUD.textContent =
    `pos: x=${p.x.toFixed(2)} y=${p.y.toFixed(2)} z=${p.z.toFixed(2)}  |  rot: x=${toDeg(r.x)}° y=${toDeg(r.y)}° z=${toDeg(r.z)}°  |  fov: ${camera.fov}  aspect: ${camera.aspect.toFixed(2)}`;
}

function render() {
  raycast();
  frame ++;

  if ( frame >= 7 - effectController.speed ) {
    if ( pingPong === 0 ) {
      renderer.compute( computeHeightAtoB, [ 8, 8, 1 ] );
      readFromA.value = 0;
    } else {
      renderer.compute( computeHeightBtoA, [ 8, 8, 1 ] );
      readFromA.value = 1;
    }
    pingPong = 1 - pingPong;

    if ( effectController.ducksEnabled ) {
      renderer.compute( computeDucks );
    }
    // DIAGNOSTIC: compute disabled — boat uses initial CPU position from boatDataArray
    // if ( sailboatEnabled && computeBoat ) {
    //   renderer.compute( computeBoat );
    // }
    frame = 0;
  }

  updateSailboat();
  renderer.render( scene, camera );
  updateDebugHUD();
}
