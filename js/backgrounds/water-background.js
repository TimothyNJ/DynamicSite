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
  instanceIndex, struct, If, uint, int, floor, float, length, clamp, sqrt, abs,
  vec2, cos, sin, vec3, vec4, vertexIndex, Fn, uniform, instancedArray, min, max,
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
let duckInstanceDataStorage = null;

let sailboatMesh = null;
let sailboatEnabled = true;
let tiltIndicatorMesh = null;
let computeDCCorrection = null;
let heightStorageARef = null, heightStorageBRef = null;
let dcCorrectionFrame = 0;
const dcOffset = uniform( 0 ).setName( 'dcOffset' );
const sailboatState = {
  bobPhase: 0,            // for gentle rocking
};

const NUM_DUCKS = 100;
const simplex = new SimplexNoise();
let tiltedDuckCount = 0;
let tiltReadbackFrame = 0;

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
  heightStorageARef = heightStorageA;
  heightStorageBRef = heightStorageB;

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

  // ── DC offset correction — subtract mean height from every cell ──────
  const createDCCorrection = ( buffer ) => Fn( () => {
    buffer.element( instanceIndex ).subAssign( dcOffset );
  } )().compute( WIDTH * WIDTH, [ 16, 16 ] );

  const dcCorrectionA = createDCCorrection( heightStorageA ).setName( 'DC Correct A' );
  const dcCorrectionB = createDCCorrection( heightStorageB ).setName( 'DC Correct B' );
  const dcCorrectionPrev = createDCCorrection( prevHeightStorage ).setName( 'DC Correct Prev' );
  computeDCCorrection = { a: dcCorrectionA, b: dcCorrectionB, prev: dcCorrectionPrev };

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
    velocityY: 'float',
    velocity: 'vec2',
    tiltX: 'float',
    tiltZ: 'float'
  } );

  duckInstanceDataStorage = instancedArray( duckInstanceDataArray, DuckStruct ).setName( 'DuckInstanceData' );

  computeDucks = Fn( () => {
    const yOffset = float( - 0.04 );
    const waterPushFactor = float( 0.015 );
    const linearDamping = float( 0.92 );
    const bounceDamping = float( - 0.4 );
    const gravity = float( - 0.004 );
    const buoyancyFactor = float( 0.15 );
    const waterDrag = float( 0.85 );

    const instancePosition = duckInstanceDataStorage.element( instanceIndex ).get( 'position' ).toVar();
    const velocityY = duckInstanceDataStorage.element( instanceIndex ).get( 'velocityY' ).toVar();
    const velocity = duckInstanceDataStorage.element( instanceIndex ).get( 'velocity' ).toVar();

    const gridCoordX = instancePosition.x.div( BOUNDS ).add( 0.5 ).mul( WIDTH );
    const gridCoordZ = instancePosition.z.div( BOUNDS ).add( 0.5 ).mul( WIDTH );

    const xCoord = uint( clamp( floor( gridCoordX ), 0, WIDTH - 1 ) );
    const zCoord = uint( clamp( floor( gridCoordZ ), 0, WIDTH - 1 ) );
    const heightInstanceIndex = zCoord.mul( WIDTH ).add( xCoord );

    const waterHeight = getCurrentHeight( heightInstanceIndex );
    const { normalX, normalY } = getCurrentNormals( heightInstanceIndex );

    const surfaceY = waterHeight.add( yOffset );

    // Gravity always applies
    velocityY.addAssign( gravity );

    // Buoyancy: if at or below water surface, push up toward surface
    If( instancePosition.y.lessThanEqual( surfaceY ), () => {
      const submergedDelta = surfaceY.sub( instancePosition.y );
      velocityY.addAssign( submergedDelta.mul( buoyancyFactor ) );
      velocityY.mulAssign( waterDrag );

      // Water push only applies when in contact with water
      const pushX = normalX.mul( waterPushFactor );
      const pushZ = normalY.mul( waterPushFactor );
      velocity.x.addAssign( pushX );
      velocity.y.addAssign( pushZ );
    } );
    // When airborne: only gravity, no water interaction

    // Apply vertical velocity
    instancePosition.y.addAssign( velocityY );

    // Horizontal movement and damping
    velocity.x.mulAssign( linearDamping );
    velocity.y.mulAssign( linearDamping );

    instancePosition.x.addAssign( velocity.x );
    instancePosition.z.addAssign( velocity.y );

    // Wall bouncing
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

    // Store smoothed surface tilt for the positionNode to use
    const tiltSmooth = float( 0.7 );  // blend toward current surface slope
    const tiltScale = float( 0.5 );   // scale gradient to visible lean angle
    const airborneDecay = float( 0.9 ); // when airborne, tilt decays toward level
    const oldTiltX = duckInstanceDataStorage.element( instanceIndex ).get( 'tiltX' ).toVar();
    const oldTiltZ = duckInstanceDataStorage.element( instanceIndex ).get( 'tiltZ' ).toVar();

    If( instancePosition.y.lessThanEqual( surfaceY.add( 0.01 ) ), () => {
      // On water: tilt toward surface slope
      const targetTiltX = normalX.mul( tiltScale );
      const targetTiltZ = normalY.mul( tiltScale );
      oldTiltX.addAssign( targetTiltX.sub( oldTiltX ).mul( tiltSmooth ) );
      oldTiltZ.addAssign( targetTiltZ.sub( oldTiltZ ).mul( tiltSmooth ) );
    } ).Else( () => {
      // Airborne: gradually level out
      oldTiltX.mulAssign( airborneDecay );
      oldTiltZ.mulAssign( airborneDecay );
    } );

    duckInstanceDataStorage.element( instanceIndex ).get( 'position' ).assign( instancePosition );
    duckInstanceDataStorage.element( instanceIndex ).get( 'velocityY' ).assign( velocityY );
    duckInstanceDataStorage.element( instanceIndex ).get( 'velocity' ).assign( velocity );
    duckInstanceDataStorage.element( instanceIndex ).get( 'tiltX' ).assign( oldTiltX );
    duckInstanceDataStorage.element( instanceIndex ).get( 'tiltZ' ).assign( oldTiltZ );
  } )().compute( NUM_DUCKS ).setName( 'Update Ducks' );

  // ── Boat compute — exact same physics as ducks, 1 instance ──────────
  const boatStride = 8; // same layout as DuckStruct: vec3 pos + vec2 vel
  const BOAT_PAD = 16; // allocate 16 elements — tiny buffers fail in WebGPU vertex stage
  boatDataArray = new Float32Array( boatStride * BOAT_PAD );
  boatDataArray[ 0 ] = ( Math.random() - 0.5 ) * BOUNDS * 0.5; // posX
  boatDataArray[ 2 ] = ( Math.random() - 0.5 ) * BOUNDS * 0.5; // posZ

  const BoatStruct = struct( {
    position: 'vec3',
    velocityY: 'float',
    velocity: 'vec2',
    tiltX: 'float',
    tiltZ: 'float'
  } );

  boatDataStorage = instancedArray( boatDataArray, BoatStruct ).setName( 'BoatInstanceData' );

  computeBoat = Fn( () => {
    const yOffset = float( - 0.15 );  // waterline at Y≈7.5 in native model × 0.02 scale
    const waterPushFactor = float( 0.015 );
    const linearDamping = float( 0.92 );
    const bounceDamping = float( - 0.4 );
    const gravity = float( - 0.004 );
    const buoyancyFactor = float( 0.15 );
    const waterDrag = float( 0.85 );

    const instancePosition = boatDataStorage.element( instanceIndex ).get( 'position' ).toVar();
    const velocityY = boatDataStorage.element( instanceIndex ).get( 'velocityY' ).toVar();
    const velocity = boatDataStorage.element( instanceIndex ).get( 'velocity' ).toVar();

    const gridCoordX = instancePosition.x.div( BOUNDS ).add( 0.5 ).mul( WIDTH );
    const gridCoordZ = instancePosition.z.div( BOUNDS ).add( 0.5 ).mul( WIDTH );

    const xCoord = uint( clamp( floor( gridCoordX ), 0, WIDTH - 1 ) );
    const zCoord = uint( clamp( floor( gridCoordZ ), 0, WIDTH - 1 ) );
    const heightInstanceIndex = zCoord.mul( WIDTH ).add( xCoord );

    const waterHeight = getCurrentHeight( heightInstanceIndex );
    const { normalX, normalY } = getCurrentNormals( heightInstanceIndex );

    const surfaceY = waterHeight.add( yOffset );

    // Gravity always applies
    velocityY.addAssign( gravity );

    // Buoyancy: if at or below water surface, push up toward surface
    If( instancePosition.y.lessThanEqual( surfaceY ), () => {
      const submergedDelta = surfaceY.sub( instancePosition.y );
      velocityY.addAssign( submergedDelta.mul( buoyancyFactor ) );
      velocityY.mulAssign( waterDrag );

      // Water push only applies when in contact with water
      const pushX = normalX.mul( waterPushFactor );
      const pushZ = normalY.mul( waterPushFactor );
      velocity.x.addAssign( pushX );
      velocity.y.addAssign( pushZ );
    } );

    // Apply vertical velocity
    instancePosition.y.addAssign( velocityY );

    // Horizontal movement and damping
    velocity.x.mulAssign( linearDamping );
    velocity.y.mulAssign( linearDamping );

    instancePosition.x.addAssign( velocity.x );
    instancePosition.z.addAssign( velocity.y );

    // Wall bouncing
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

    // Store smoothed surface tilt
    const tiltSmooth = float( 0.7 );
    const tiltScale = float( 0.5 );
    const airborneDecay = float( 0.9 );
    const oldTiltX = boatDataStorage.element( instanceIndex ).get( 'tiltX' ).toVar();
    const oldTiltZ = boatDataStorage.element( instanceIndex ).get( 'tiltZ' ).toVar();

    If( instancePosition.y.lessThanEqual( surfaceY.add( 0.01 ) ), () => {
      const targetTiltX = normalX.mul( tiltScale );
      const targetTiltZ = normalY.mul( tiltScale );
      oldTiltX.addAssign( targetTiltX.sub( oldTiltX ).mul( tiltSmooth ) );
      oldTiltZ.addAssign( targetTiltZ.sub( oldTiltZ ).mul( tiltSmooth ) );
    } ).Else( () => {
      oldTiltX.mulAssign( airborneDecay );
      oldTiltZ.mulAssign( airborneDecay );
    } );

    boatDataStorage.element( instanceIndex ).get( 'position' ).assign( instancePosition );
    boatDataStorage.element( instanceIndex ).get( 'velocityY' ).assign( velocityY );
    boatDataStorage.element( instanceIndex ).get( 'velocity' ).assign( velocity );
    boatDataStorage.element( instanceIndex ).get( 'tiltX' ).assign( oldTiltX );
    boatDataStorage.element( instanceIndex ).get( 'tiltZ' ).assign( oldTiltZ );
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
    const tx = duckInstanceDataStorage.element( instanceIndex ).get( 'tiltX' );
    const tz = duckInstanceDataStorage.element( instanceIndex ).get( 'tiltZ' );

    // Rotate around Z axis by tiltX (lean in X direction)
    const cz = cos( tx ), sz = sin( tx );
    const x1 = positionLocal.x.mul( cz ).sub( positionLocal.y.mul( sz ) );
    const y1 = positionLocal.x.mul( sz ).add( positionLocal.y.mul( cz ) );
    const z1 = positionLocal.z;

    // Rotate around X axis by tiltZ (lean in Z direction)
    const cx = cos( tz ), sx = sin( tz );
    const x2 = x1;
    const y2 = y1.mul( cx ).sub( z1.mul( sx ) );
    const z2 = y1.mul( sx ).add( z1.mul( cx ) );

    return vec3( x2.add( instancePosition.x ), y2.add( instancePosition.y ), z2.add( instancePosition.z ) );
  } )();

  duckMesh = new THREE.InstancedMesh( duckModel.geometry, duckModel.material, NUM_DUCKS );
  scene.add( duckMesh );

  // ── Tilt indicator sticks — one per duck ─────────────────────────────
  {
    const stickGeo = new THREE.BoxGeometry( 0.01, 0.75, 0.01 ); // thin vertical stick
    stickGeo.translate( 0, 0.44, 0 ); // raise so base sits at duck position

    const stickMat = new THREE.MeshBasicNodeMaterial( { transparent: true, opacity: 0.9 } );

    // Position: read duck position, offset upward
    stickMat.positionNode = Fn( () => {
      const ip = duckInstanceDataStorage.element( instanceIndex ).get( 'position' );
      return vec3(
        positionLocal.x.add( ip.x ),
        positionLocal.y.add( ip.y ).add( float( 0.06 ) ),
        positionLocal.z.add( ip.z )
      );
    } )();

    // Color: based on tilt magnitude in degrees
    stickMat.colorNode = Fn( () => {
      const tx = duckInstanceDataStorage.element( instanceIndex ).get( 'tiltX' );
      const tz = duckInstanceDataStorage.element( instanceIndex ).get( 'tiltZ' );
      const tiltRad = sqrt( tx.mul( tx ).add( tz.mul( tz ) ) );
      const tiltDeg = tiltRad.mul( 180.0 / Math.PI );

      // green(0,0.8,0) → orange(1,0.6,0) → dark orange(0.9,0.3,0) → red(1,0,0)
      const r = clamp( tiltDeg.mul( 0.1 ), 0.0, 1.0 );
      const g = clamp( float( 0.8 ).sub( tiltDeg.mul( 0.07 ) ), 0.0, 0.8 );
      return vec4( r, g, float( 0.0 ), float( 0.9 ) );
    } )();

    tiltIndicatorMesh = new THREE.InstancedMesh( stickGeo, stickMat, NUM_DUCKS );
    tiltIndicatorMesh.frustumCulled = false;
    // Start hidden — shown when borders are toggled on
    const sc = document.querySelector( '.site-container' );
    tiltIndicatorMesh.visible = ! ( sc && sc.classList.contains( 'borders-hidden' ) );
    scene.add( tiltIndicatorMesh );
  }

  // ── Sailboat — same pattern as ducks ─────────────────────────────────
  const boatModel = sailboatGLTF.scene.children[ 0 ];
  boatModel.geometry.scale( 0.02, 0.02, 0.02 );
  boatModel.geometry.computeVertexNormals();
  boatModel.material.positionNode = Fn( () => {
    const instancePosition = boatDataStorage.element( instanceIndex ).get( 'position' );
    const tx = boatDataStorage.element( instanceIndex ).get( 'tiltX' );
    const tz = boatDataStorage.element( instanceIndex ).get( 'tiltZ' );

    // Rotate around Z axis by tiltX (lean in X direction)
    const cz = cos( tx ), sz = sin( tx );
    const x1 = positionLocal.x.mul( cz ).sub( positionLocal.y.mul( sz ) );
    const y1 = positionLocal.x.mul( sz ).add( positionLocal.y.mul( cz ) );
    const z1 = positionLocal.z;

    // Rotate around X axis by tiltZ (lean in Z direction)
    const cx = cos( tz ), sx = sin( tz );
    const x2 = x1;
    const y2 = y1.mul( cx ).sub( z1.mul( sx ) );
    const z2 = y1.mul( sx ).add( z1.mul( cx ) );

    return vec3( x2.add( instancePosition.x ), y2.add( instancePosition.y ), z2.add( instancePosition.z ) );
  } )();
  sailboatMesh = new THREE.InstancedMesh( boatModel.geometry, boatModel.material, 1 );
  sailboatMesh.frustumCulled = false;
  scene.add( sailboatMesh );

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
  if ( tiltIndicatorMesh ) tiltIndicatorMesh.visible = show;
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
    `pos: x=${p.x.toFixed(2)} y=${p.y.toFixed(2)} z=${p.z.toFixed(2)}  |  rot: x=${toDeg(r.x)}° y=${toDeg(r.y)}° z=${toDeg(r.z)}°  |  fov: ${camera.fov}  aspect: ${camera.aspect.toFixed(2)}\n` +
    `tilted ducks: ${tiltedDuckCount} / ${NUM_DUCKS}`;
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
    if ( sailboatEnabled && computeBoat ) {
      renderer.compute( computeBoat );
    }
    frame = 0;
  }

  // Periodic tilt readback for debug counter (every ~30 frames, only when visible)
  tiltReadbackFrame ++;
  if ( tiltIndicatorMesh && tiltIndicatorMesh.visible && duckInstanceDataStorage && tiltReadbackFrame >= 30 ) {
    tiltReadbackFrame = 0;
    const duckStride = 8;
    renderer.getArrayBufferAsync( duckInstanceDataStorage.value ).then( ( buffer ) => {
      const data = new Float32Array( buffer );
      let count = 0;
      for ( let i = 0; i < NUM_DUCKS; i ++ ) {
        const tx = data[ i * duckStride + 6 ];
        const tz = data[ i * duckStride + 7 ];
        const tiltDeg = Math.sqrt( tx * tx + tz * tz ) * ( 180 / Math.PI );
        if ( tiltDeg >= 0.5 ) count ++;
      }
      tiltedDuckCount = count;
    } ).catch( ( e ) => { console.warn( 'tilt readback failed:', e ); } );
  }

  // DC offset correction — readback active height buffer, compute mean, subtract from all cells
  dcCorrectionFrame ++;
  if ( computeDCCorrection && dcCorrectionFrame >= 60 ) {
    dcCorrectionFrame = 0;
    const activeStorage = readFromA.value === 1 ? heightStorageARef : heightStorageBRef;
    renderer.getArrayBufferAsync( activeStorage.value ).then( ( buffer ) => {
      const data = new Float32Array( buffer );
      let sum = 0;
      for ( let i = 0; i < data.length; i ++ ) sum += data[ i ];
      const mean = sum / data.length;
      if ( Math.abs( mean ) > 0.001 ) {
        dcOffset.value = mean;
        renderer.compute( computeDCCorrection.a );
        renderer.compute( computeDCCorrection.b );
        renderer.compute( computeDCCorrection.prev );
      }
    } ).catch( ( e ) => { console.warn( 'DC readback failed:', e ); } );
  }

  updateSailboat();
  renderer.render( scene, camera );
  updateDebugHUD();
}
