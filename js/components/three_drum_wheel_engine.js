/**
 * Three.js Drum Wheel Engine
 * A 3D cylindrical drum selector using Three.js
 */

// Use global THREE from CDN instead of import
// import * as THREE from 'three';

export class ThreeDrumWheelEngine {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            items: options.items || [],
            selectedIndex: options.selectedIndex || 0,
            onChange: options.onChange || (() => {}),
            itemHeight: options.itemHeight || 50,
            visibleItems: options.visibleItems || 7,
            ...options
        };

        this.currentRotation = 0;
        this.targetRotation = 0;
        this.isDragging = false;
        this.previousMouseY = 0;
        this.velocity = 0;
        this.selectedIndex = this.options.selectedIndex;

        this.init();
    }

    init() {
        // Setup container
        this.container.style.width = '300px';
        this.container.style.height = '350px';
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        this.container.style.cursor = 'grab';

        // Create Three.js scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        // Setup camera
        const aspect = 300 / 350;
        this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 1000);
        this.camera.position.z = 200;

        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(300, 350);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight.position.set(0, 1, 1);
        this.scene.add(directionalLight);

        // Create drum
        this.createDrum();

        // Add selection indicator
        this.createSelectionIndicator();

        // Setup interactions
        this.setupInteractions();

        // Start animation
        this.animate();
    }

    createDrum() {
        const itemCount = this.options.items.length;
        const radius = 80;
        const height = 300;

        // Create texture with years
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw items
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        this.options.items.forEach((item, index) => {
            const x = ((index + 0.5) / itemCount) * canvas.width;
            const y = canvas.height / 2;
            ctx.fillText(String(item), x, y);
        });

        // Create texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        // Create cylinder geometry
        const geometry = new THREE.CylinderGeometry(radius, radius, height, 32, 1, true);
        
        // Rotate geometry to have seam at back
        geometry.rotateY(Math.PI);

        // Create material
        const material = new THREE.MeshPhongMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });

        // Create mesh
        this.drum = new THREE.Mesh(geometry, material);
        this.scene.add(this.drum);

        // Calculate angle per item
        this.anglePerItem = (Math.PI * 2) / itemCount;
    }

    createSelectionIndicator() {
        // Create selection highlight (a thin box at the front)
        const geometry = new THREE.BoxGeometry(120, 50, 1);
        const material = new THREE.MeshBasicMaterial({
            color: 0x007AFF,
            transparent: true,
            opacity: 0.3
        });
        this.selectionBox = new THREE.Mesh(geometry, material);
        this.selectionBox.position.z = 81;
        this.scene.add(this.selectionBox);
    }

    setupInteractions() {
        const canvas = this.renderer.domElement;

        // Mouse events
        canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));

        // Touch events
        canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
        canvas.addEventListener('touchend', this.onTouchEnd.bind(this));

        // Wheel event
        canvas.addEventListener('wheel', this.onWheel.bind(this));
    }

    onMouseDown(e) {
        this.isDragging = true;
        this.previousMouseY = e.clientY;
        this.velocity = 0;
        this.container.style.cursor = 'grabbing';
    }

    onMouseMove(e) {
        if (!this.isDragging) return;

        const deltaY = e.clientY - this.previousMouseY;
        this.velocity = deltaY * 0.01;
        this.targetRotation += this.velocity;
        this.previousMouseY = e.clientY;
    }

    onMouseUp() {
        this.isDragging = false;
        this.container.style.cursor = 'grab';
        this.applyMomentum();
    }

    onTouchStart(e) {
        if (e.touches.length === 1) {
            this.isDragging = true;
            this.previousMouseY = e.touches[0].clientY;
            this.velocity = 0;
        }
    }

    onTouchMove(e) {
        if (!this.isDragging || e.touches.length !== 1) return;
        e.preventDefault();

        const deltaY = e.touches[0].clientY - this.previousMouseY;
        this.velocity = deltaY * 0.01;
        this.targetRotation += this.velocity;
        this.previousMouseY = e.touches[0].clientY;
    }

    onTouchEnd() {
        this.isDragging = false;
        this.applyMomentum();
    }

    onWheel(e) {
        e.preventDefault();
        this.velocity = -e.deltaY * 0.001;
        this.targetRotation += this.velocity * 10;
        this.snapToItem();
    }

    applyMomentum() {
        const deceleration = 0.95;
        const minVelocity = 0.001;

        const momentumAnimation = () => {
            if (Math.abs(this.velocity) > minVelocity) {
                this.targetRotation += this.velocity;
                this.velocity *= deceleration;
                requestAnimationFrame(momentumAnimation);
            } else {
                this.snapToItem();
            }
        };

        momentumAnimation();
    }

    snapToItem() {
        // Calculate nearest item
        const currentItem = Math.round(this.targetRotation / this.anglePerItem);
        this.targetRotation = currentItem * this.anglePerItem;

        // Calculate selected index (accounting for reverse rotation)
        const itemCount = this.options.items.length;
        this.selectedIndex = (((-currentItem % itemCount) + itemCount) % itemCount);

        // Trigger onChange
        if (this.options.onChange) {
            this.options.onChange(this.options.items[this.selectedIndex], this.selectedIndex);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Smooth rotation
        this.currentRotation += (this.targetRotation - this.currentRotation) * 0.1;
        this.drum.rotation.y = this.currentRotation;

        // Update renderer
        this.renderer.render(this.scene, this.camera);
    }

    // Public methods
    getSelectedValue() {
        return this.options.items[this.selectedIndex];
    }

    setSelectedIndex(index) {
        this.selectedIndex = index;
        this.targetRotation = -index * this.anglePerItem;
    }

    destroy() {
        // Remove event listeners
        const canvas = this.renderer.domElement;
        canvas.removeEventListener('mousedown', this.onMouseDown);
        canvas.removeEventListener('mousemove', this.onMouseMove);
        canvas.removeEventListener('mouseup', this.onMouseUp);
        canvas.removeEventListener('touchstart', this.onTouchStart);
        canvas.removeEventListener('touchmove', this.onTouchMove);
        canvas.removeEventListener('touchend', this.onTouchEnd);
        canvas.removeEventListener('wheel', this.onWheel);

        // Clean up Three.js
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}
