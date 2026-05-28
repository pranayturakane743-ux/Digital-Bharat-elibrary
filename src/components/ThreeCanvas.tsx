import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function ThreeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xfaf9f5, 0.015);

    // 2. Camera setup with fluid widescreen aspect ratio
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 100);
    camera.position.set(0, 1.5, 8);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xfff6e5, 1.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xdfbd69, 2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xf5e3a8, 2, 15);
    pointLight.position.set(-3, 2, 2);
    scene.add(pointLight);

    // 5. Bookshelves: Floating wireframe gold-accent structures
    const shelvesCount = 3;
    const shelvesGroup = new THREE.Group();
    for (let i = 0; i < shelvesCount; i++) {
      const shelfY = -1.5 + i * 2.2;
      const shelfGeo = new THREE.BoxGeometry(12, 0.15, 2.5);
      const shelfMat = new THREE.MeshStandardMaterial({
        color: 0xf5f2e6,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.8
      });
      const shelf = new THREE.Mesh(shelfGeo, shelfMat);
      shelf.position.set(0, shelfY, -1.5);
      shelvesGroup.add(shelf);

      // Gold glowing outline for the shelf edge
      const edgeGeo = new THREE.BoxGeometry(12.05, 0.05, 0.05);
      const edgeMat = new THREE.MeshBasicMaterial({ color: 0xdfbd69 });
      const edge = new THREE.Mesh(edgeGeo, edgeMat);
      edge.position.set(0, shelfY + 0.08, -0.2);
      shelvesGroup.add(edge);
    }
    scene.add(shelvesGroup);

    // 6. 3D books: Gold, Vibranium, and Amber solid bricks
    const booksGroup = new THREE.Group();
    const booksCount = 14;
    const bookColors = [0xdfbd69, 0xbca056, 0x926f1a, 0xd4af37, 0xfcebb3, 0xdaa520, 0xecd189];
    const bookMeshes: THREE.Mesh[] = [];

    for (let i = 0; i < booksCount; i++) {
      const bookWidth = 0.35;
      const bookHeight = 1.3 + Math.random() * 0.3;
      const bookDepth = 0.9;
      const bookGeo = new THREE.BoxGeometry(bookWidth, bookHeight, bookDepth);
      const randomColor = bookColors[i % bookColors.length];
      
      const bookMat = new THREE.MeshStandardMaterial({
        color: randomColor,
        roughness: 0.15,
        metalness: 0.8,
      });
      const book = new THREE.Mesh(bookGeo, bookMat);

      // Arrange books neatly across shelves
      const shelfIndex = i % shelvesCount;
      const shelfY = -1.5 + shelfIndex * 2.2 + bookHeight / 2 + 0.1;
      const xOffset = -4 + (i / booksCount) * 8 + (Math.random() - 0.5) * 0.5;
      
      book.position.set(xOffset, shelfY, -1.3 + (Math.random() - 0.5) * 0.4);
      // Give them subtle individual tilts
      book.rotation.y = (Math.random() - 0.5) * 0.3;
      book.rotation.z = Math.random() > 0.85 ? (Math.random() > 0.5 ? 0.3 : -0.3) : 0; // some leaning

      booksGroup.add(book);
      bookMeshes.push(book);
    }
    scene.add(booksGroup);

    // 7. Swirling floating gold dust particle system
    const particleCount = 180;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const speeds: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      // spread in box
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
      speeds.push(0.01 + Math.random() * 0.03);
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create soft round glowing particle texture using canvas
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 16;
    pCanvas.height = 16;
    const ctx = pCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 16);
    }

    const pTexture = new THREE.CanvasTexture(pCanvas);
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.16,
      map: pTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      color: 0xf3d688,
      depthWrite: false
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 8. Mouse coordinate parallax tracking
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handleMouseMove = (event: MouseEvent) => {
      mouse.targetX = (event.clientX / window.innerWidth - 0.5) * 1.5;
      mouse.targetY = (event.clientY / window.innerHeight - 0.5) * 0.8;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 9. Window resize handling
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. Frame Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse interpolation (lerp)
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      // Pan camera slightly to match cursors
      camera.position.x = mouse.x * 2.5;
      camera.position.y = 1.5 - mouse.y * 1.8;
      camera.lookAt(0, 0.5, 0);

      // Animate books with fine breathing floats
      bookMeshes.forEach((book, idx) => {
        const floatCycle = Math.sin(elapsedTime * 0.5 + idx) * 0.03;
        book.position.y += floatCycle * 0.06;
        // rotates spine slowly
        book.rotation.y += Math.cos(elapsedTime * 0.2 + idx) * 0.0003;
      });

      // Animate neon glow highlights
      pointLight.position.x = Math.sin(elapsedTime * 0.4) * 5;
      pointLight.position.y = Math.cos(elapsedTime * 0.6) * 3 + 1;

      // Animate flowing particle dust
      const posArr = particleGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        // drift downwards or float
        posArr[idx + 1] -= speeds[i] * 0.15; // slow down y
        posArr[idx] += Math.sin(elapsedTime * 0.2 + i) * 0.002; // side wobble

        // reposition if drifted past bottom
        if (posArr[idx + 1] < -6) {
          posArr[idx + 1] = 6;
          posArr[idx] = (Math.random() - 0.5) * 20;
          posArr[idx + 2] = (Math.random() - 0.5) * 15;
        }
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Rotate particles cluster slightly
      particles.rotation.y = elapsedTime * 0.01;

      renderer.render(scene, camera);
    };

    animate();

    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.dispose();
        if (containerRef.current?.contains(rendererRef.current.domElement)) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="3d-particles-container"
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-85"
      style={{ background: 'transparent' }}
    />
  );
}
