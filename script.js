/**
 * ============================================================
 *  Birthday Surprise – Main Interactive Script
 * ============================================================
 *  Dependencies (loaded via CDN before this script):
 *    • THREE  (Three.js r128)
 *    • gsap   (GreenSock + ScrollTrigger plugin)
 *    • confetti (canvas-confetti)
 *
 *  Every feature is self-contained inside the DOMContentLoaded
 *  listener so elements are guaranteed to exist before access.
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // Programmatically preload all local images
  ['img1.png', 'img2.png', 'img3.png', 'img4.png', 'img5.png', 'img6.png', 'img7.png', 'img8.png'].forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  /* ----------------------------------------------------------
   *  0.  UTILITY HELPERS
   * -------------------------------------------------------- */

  /** Simple debounce */
  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /** Detect mobile / low-power devices */
  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(
    navigator.userAgent
  );

  /** Clamp helper */
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  /** Random float in range */
  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  /** Random integer in range (inclusive) */
  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  /* ----------------------------------------------------------
   *  1.  LOADING SCREEN
   * -------------------------------------------------------- */

  const loadingScreen = document.getElementById('loading-screen');
  const loaderBarFill = document.getElementById('loader-bar-fill');

  /**
   * Animate the loader bar from 0 → 100 % over 3 seconds,
   * then fade out the loading screen and kick off the hero.
   */
  function runLoadingSequence() {
    let start = null;
    const duration = 3000; // ms

    function step(timestamp) {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);

      if (loaderBarFill) {
        loaderBarFill.style.width = (progress * 100).toFixed(1) + '%';
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Loading complete – fade out
        if (loadingScreen) {
          loadingScreen.classList.add('loaded');
        }
        // Allow CSS transition to finish (~600 ms) then trigger hero
        setTimeout(triggerHeroEntrance, 700);
      }
    }

    requestAnimationFrame(step);
  }

  runLoadingSequence();

  /* ----------------------------------------------------------
   *  2.  THREE.JS STARFIELD BACKGROUND
   * -------------------------------------------------------- */

  let threeScene, threeCamera, threeRenderer, starField;
  let starOpacities, starBaseOpacities;
  const STAR_COUNT = isMobile ? 800 : 1500;
  const mouse = { x: 0, y: 0 };

  function initStarfield() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    // Scene
    threeScene = new THREE.Scene();

    // Camera
    threeCamera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    threeCamera.position.z = 500;

    // Renderer
    threeRenderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: false,
    });
    threeRenderer.setSize(window.innerWidth, window.innerHeight);
    threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Stars (BufferGeometry + Points)
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    starOpacities = new Float32Array(STAR_COUNT);
    starBaseOpacities = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      // Random position in a large cube
      positions[i * 3] = rand(-1000, 1000);
      positions[i * 3 + 1] = rand(-1000, 1000);
      positions[i * 3 + 2] = rand(-1000, 500);

      // White / light-blue tint
      const tint = rand(0.85, 1);
      colors[i * 3] = tint;                   // R
      colors[i * 3 + 1] = tint;               // G
      colors[i * 3 + 2] = rand(0.9, 1);       // B (slightly more blue)

      sizes[i] = rand(1.0, 3.5);
      starOpacities[i] = rand(0.4, 1);
      starBaseOpacities[i] = starOpacities[i];
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      depthWrite: false,
    });

    starField = new THREE.Points(starGeometry, starMaterial);
    threeScene.add(starField);

    // Mouse parallax listener
    window.addEventListener('mousemove', onMouseMove);

    // Resize listener (debounced)
    window.addEventListener('resize', debounce(onWindowResize, 200));

    // Start render loop
    animateStarfield();
  }

  function onMouseMove(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  function onWindowResize() {
    if (threeCamera && threeRenderer) {
      threeCamera.aspect = window.innerWidth / window.innerHeight;
      threeCamera.updateProjectionMatrix();
      threeRenderer.setSize(window.innerWidth, window.innerHeight);
    }
    // Update 3D carousel positions and radius on window resize
    positionCarouselItems();
  }

  /** Main Three.js render loop */
  function animateStarfield() {
    requestAnimationFrame(animateStarfield);
    if (!starField) return;

    const positions = starField.geometry.attributes.position.array;

    // Gentle drift (move stars slowly toward the camera)
    for (let i = 0; i < STAR_COUNT; i++) {
      positions[i * 3 + 2] += 0.15; // drift forward
      // Wrap around when they pass the camera
      if (positions[i * 3 + 2] > 600) {
        positions[i * 3 + 2] = -1000;
        positions[i * 3] = rand(-1000, 1000);
        positions[i * 3 + 1] = rand(-1000, 1000);
      }
    }
    starField.geometry.attributes.position.needsUpdate = true;

    // Twinkling – randomly nudge opacity via material
    // (PointsMaterial doesn't support per-vertex opacity easily,
    //  so we simulate by subtle global opacity shimmer)
    starField.material.opacity = 0.85 + Math.sin(Date.now() * 0.002) * 0.1;

    // Subtle individual twinkle via size attribute
    const sizeAttr = starField.geometry.attributes.size;
    for (let i = 0; i < STAR_COUNT; i++) {
      if (Math.random() < 0.005) {
        sizeAttr.array[i] = rand(0.5, 4.0);
      }
    }
    sizeAttr.needsUpdate = true;

    // Mouse parallax on camera
    threeCamera.position.x += (mouse.x * 30 - threeCamera.position.x) * 0.02;
    threeCamera.position.y += (mouse.y * 30 - threeCamera.position.y) * 0.02;
    threeCamera.lookAt(threeScene.position);

    threeRenderer.render(threeScene, threeCamera);
  }

  // Initialize as soon as DOM is ready
  initStarfield();

  /* ----------------------------------------------------------
   *  3 & 4.  HERO SECTION ANIMATIONS + NAME SPLIT
   * -------------------------------------------------------- */

  /**
   * Split #hero-name text into individual <span class="hero-letter">
   * elements so each can be independently animated.
   */
  function splitHeroName() {
    const heroName = document.getElementById('hero-name');
    if (!heroName) return;
    const text = heroName.textContent.trim();
    heroName.textContent = '';
    text.split('').forEach((char) => {
      const span = document.createElement('span');
      span.classList.add('hero-letter');
      span.textContent = char === ' ' ? '\u00A0' : char; // preserve spaces
      heroName.appendChild(span);
    });
  }

  // Split immediately so spans exist before animation
  splitHeroName();

  /** Create floating particle dots around the hero name */
  function createHeroParticles() {
    const container = document.getElementById('hero-particles');
    if (!container) return;
    const count = isMobile ? 20 : 40;

    for (let i = 0; i < count; i++) {
      const dot = document.createElement('span');
      dot.classList.add('hero-particle');
      dot.style.position = 'absolute';
      dot.style.width = rand(3, 7) + 'px';
      dot.style.height = dot.style.width;
      dot.style.borderRadius = '50%';
      dot.style.background = `hsla(${randInt(300, 360)}, 80%, 70%, ${rand(0.3, 0.7)})`;
      dot.style.left = rand(5, 95) + '%';
      dot.style.top = rand(5, 95) + '%';
      dot.style.pointerEvents = 'none';

      // Animate with GSAP
      if (typeof gsap !== 'undefined') {
        gsap.to(dot, {
          x: rand(-60, 60),
          y: rand(-60, 60),
          duration: rand(3, 7),
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: rand(0, 3),
        });
        gsap.to(dot, {
          opacity: rand(0.1, 0.5),
          duration: rand(1, 3),
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
        });
      }

      container.appendChild(dot);
    }
  }

  /**
   * Hero entrance timeline – called after the loading screen
   * has faded out.
   */
  function triggerHeroEntrance() {
    if (typeof gsap === 'undefined') return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // 1. Subtitle
    tl.fromTo(
      '.hero-subtitle',
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 1 }
    );

    // 2. Greeting
    tl.fromTo(
      '.hero-greeting',
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 1 },
      '-=0.4'
    );

    // 3. Hero name letters stagger
    tl.fromTo(
      '.hero-letter',
      { y: 50, opacity: 0, rotationX: -90 },
      {
        y: 0,
        opacity: 1,
        rotationX: 0,
        duration: 0.8,
        stagger: 0.05,
      },
      '-=0.5'
    );

    // 4. Heart pulse
    tl.fromTo(
      '.hero-heart',
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' },
      '-=0.2'
    );

    // 4.5. Nursing element entrance
    tl.fromTo(
      '.nursing-element',
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.5)' },
      '-=0.3'
    );

    // 5. Scroll indicator
    tl.fromTo(
      '.scroll-indicator',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8 },
      '-=0.1'
    );

    // Create hero particles after entrance
    tl.call(createHeroParticles);
  }

  /* ----------------------------------------------------------
   *  5.  3D PHOTO CAROUSEL
   * -------------------------------------------------------- */

  const carouselRing = document.getElementById('carousel-ring');
  const carouselItems = document.querySelectorAll('.carousel-item');
  let currentRotation = 0;
  let autoRotateTimer = null;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartRotation = 0;
  let autoRotateResumeTimeout = null;
  const ITEM_COUNT = carouselItems.length || 8;
  const ANGLE_STEP = 360 / ITEM_COUNT;

  /** Get translateZ radius based on screen width */
  function getCarouselRadius() {
    const width = window.innerWidth;
    if (width < 768) {
      // Clamped radius between 180px and 220px on mobile
      return Math.min(220, Math.max(180, 180 + (width - 320) * 0.1));
    } else {
      return 400; // Desktop
    }
  }

  /** Update carousel layout dynamically (Coverflow on mobile, 3D Ring on desktop) */
  function updateCarousel() {
    if (!carouselRing) return;

    const width = window.innerWidth;
    const isMobile = width < 768;

    if (isMobile) {
      // Coverflow style for mobile
      const radius = getCarouselRadius(); // 180px - 220px range
      const cardWidth = width < 400 ? 140 : 150; // card width is 140px-160px

      carouselItems.forEach((item, i) => {
        // Calculate absolute angle of this item in degrees
        const absoluteAngle = (i * ANGLE_STEP + currentRotation);
        // Normalize angle to [-180, 180]
        let diff = ((absoluteAngle % 360) + 360) % 360;
        if (diff > 180) diff -= 360;

        // Convert diff to normalized offset (in card units)
        const offset = diff / ANGLE_STEP;
        const absOffset = Math.abs(offset);
        const sign = offset > 0 ? 1 : -1;

        let tx = 0;
        let tz = 0;
        let ry = 0;
        let scale = 1;
        let opacity = 1;
        let zIndex = 0;

        if (absOffset < 0.05) {
          // Exactly or very close to center (prominent center card)
          tx = 0;
          tz = 0;
          ry = 0;
          scale = 1.1;
          zIndex = 100;
          opacity = 1;
        } else {
          // Side items
          // Smoothly animate transition out of center
          const transitionFactor = Math.min(1, absOffset);
          // 90px base ensures it clears the active center card to prevent overlap
          tx = sign * (transitionFactor * 90 + Math.max(0, absOffset - 1) * 45);
          
          // Translate back along Z to create 3D depth
          tz = -radius * Math.min(1, absOffset);
          
          // Rotate inward (Apple Cover Flow style)
          ry = -sign * 45 * Math.min(1, absOffset);
          
          // Scale down slightly
          scale = 0.85;
          
          // Layer behind center card based on proximity
          zIndex = Math.round(90 - absOffset * 10);
          
          // Gradually fade out items that are far in the background
          opacity = Math.max(0.2, 1 - absOffset * 0.25);
        }

        // Apply Coverflow transform
        item.style.transform = `translateX(${tx}px) translateZ(${tz}px) rotateY(${ry}deg) scale(${scale})`;
        item.style.zIndex = zIndex;
        item.style.opacity = opacity;
        item.style.backfaceVisibility = 'hidden';
      });

      // Clear ring transform on mobile since positioning is handled per-item
      carouselRing.style.transform = 'none';
    } else {
      // Circular 3D Carousel style for desktop
      const radius = getCarouselRadius();
      carouselItems.forEach((item, i) => {
        item.style.transform = `rotateY(${i * ANGLE_STEP}deg) translateZ(${radius}px)`;
        item.style.opacity = 1;
        item.style.zIndex = '';
        item.style.backfaceVisibility = '';
      });

      // Apply the rotation to the ring on desktop
      carouselRing.style.transform = `rotateY(${currentRotation}deg)`;
    }
  }

  /** Position each carousel item in a ring */
  function positionCarouselItems() {
    updateCarousel();
  }

  /** Apply the current rotation to the ring / update items */
  function applyCarouselRotation(angle, animate) {
    if (!carouselRing) return;

    if (animate && typeof gsap !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        // Animate currentRotation directly and update carousel on each tick
        gsap.to({ val: currentRotation }, {
          val: angle,
          duration: 0.6,
          ease: 'power2.out',
          overwrite: 'auto',
          onUpdate: function () {
            currentRotation = this.targets()[0].val;
            updateCarousel();
          }
        });
      } else {
        gsap.to(carouselRing, {
          rotationY: angle,
          duration: 0.6,
          ease: 'power2.out',
          overwrite: 'auto',
          onUpdate: function () {
            currentRotation = gsap.getProperty(carouselRing, 'rotationY');
          }
        });
      }
    } else {
      currentRotation = angle;
      updateCarousel();
    }
  }

  /** Auto-rotation: slowly spin the carousel */
  function startAutoRotate() {
    stopAutoRotate();
    autoRotateTimer = setInterval(() => {
      currentRotation -= 0.15;
      applyCarouselRotation(currentRotation, false);
    }, 16);
  }

  function stopAutoRotate() {
    if (autoRotateTimer) {
      clearInterval(autoRotateTimer);
      autoRotateTimer = null;
    }
  }

  /** Schedule auto-rotate resume after user interaction */
  function scheduleAutoResume() {
    clearTimeout(autoRotateResumeTimeout);
    autoRotateResumeTimeout = setTimeout(startAutoRotate, 3000);
  }

  // --- Drag / swipe handlers ---

  function onCarouselPointerDown(e) {
    isDragging = true;
    dragStartX = e.type.includes('touch')
      ? e.touches[0].clientX
      : e.clientX;
    dragStartRotation = currentRotation;
    stopAutoRotate();
    clearTimeout(autoRotateResumeTimeout);
  }

  function onCarouselPointerMove(e) {
    if (!isDragging) return;
    const clientX = e.type.includes('touch')
      ? e.touches[0].clientX
      : e.clientX;
    const delta = clientX - dragStartX;
    currentRotation = dragStartRotation + delta * 0.3;
    applyCarouselRotation(currentRotation, false);
  }

  function onCarouselPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    scheduleAutoResume();
  }

  /** Initialise the carousel */
  function initCarousel() {
    if (!carouselRing) return;
    positionCarouselItems();

    // Desktop drag
    carouselRing.addEventListener('mousedown', onCarouselPointerDown);
    window.addEventListener('mousemove', onCarouselPointerMove);
    window.addEventListener('mouseup', onCarouselPointerUp);

    // Touch drag
    carouselRing.addEventListener('touchstart', onCarouselPointerDown, { passive: true });
    window.addEventListener('touchmove', onCarouselPointerMove, { passive: true });
    window.addEventListener('touchend', onCarouselPointerUp);

    startAutoRotate();
  }

  initCarousel();

  /* ----------------------------------------------------------
   *  6.  BIRTHDAY MESSAGE TYPEWRITER
   * -------------------------------------------------------- */

  let typewriterTriggered = false;

  function startTypewriter() {
    if (typewriterTriggered) return;
    typewriterTriggered = true;

    const el = document.getElementById('typewriter-text');
    if (!el) return;

    const fullText = el.textContent.trim();
    el.textContent = '';

    // Cursor element
    const cursor = document.createElement('span');
    cursor.classList.add('typewriter-cursor');
    cursor.textContent = '|';
    cursor.style.animation = 'blink-cursor 0.7s step-end infinite';
    el.appendChild(cursor);

    let idx = 0;
    const speed = 40; // ms per character

    function type() {
      if (idx < fullText.length) {
        // Insert char before the cursor
        el.insertBefore(
          document.createTextNode(fullText.charAt(idx)),
          cursor
        );
        idx++;
        setTimeout(type, speed);
      }
    }
    type();
  }

  /** Use IntersectionObserver for typewriter trigger */
  function observeTypewriter() {
    const section = document.getElementById('message');
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startTypewriter();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(section);
  }

  observeTypewriter();

  /* ----------------------------------------------------------
   *  7.  INTERACTIVE GIFT BOX
   * -------------------------------------------------------- */

  let giftOpened = false;

  function initGiftBox() {
    const giftBox = document.getElementById('gift-box');
    const giftLetter = document.getElementById('gift-letter');
    if (!giftBox) return;

    giftBox.addEventListener('click', () => {
      if (giftOpened) return;
      giftOpened = true;

      // Add 'opened' class (CSS animates the lid)
      giftBox.classList.add('opened');
      // Stop any bounce animation
      giftBox.style.animation = 'none';

      // After lid opens (~800ms), trigger confetti + letter
      setTimeout(() => {
        // Confetti burst from gift position
        fireGiftConfetti(giftBox);

        // Show the gift letter
        if (giftLetter) {
          giftLetter.classList.add('visible');
        }
      }, 800);
    });
  }

  /** Fire multiple confetti bursts from the gift box area */
  function fireGiftConfetti(giftBox) {
    if (typeof confetti === 'undefined') return;

    const rect = giftBox.getBoundingClientRect();
    const originX = (rect.left + rect.width / 2) / window.innerWidth;
    const originY = (rect.top + rect.height / 2) / window.innerHeight;

    // Burst 1
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { x: originX, y: originY },
      colors: ['#ff69b4', '#ff1493', '#ffd700', '#ff6347', '#da70d6'],
      startVelocity: 30,
      gravity: 0.8,
    });

    // Burst 2 (delayed)
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 100,
        origin: { x: originX, y: originY - 0.05 },
        colors: ['#ff69b4', '#ffd700', '#ffffff', '#a855f7'],
        startVelocity: 25,
      });
    }, 300);

    // Burst 3 (delayed more)
    setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 120,
        origin: { x: originX, y: originY - 0.1 },
        colors: ['#ec4899', '#f59e0b', '#8b5cf6'],
        startVelocity: 20,
      });
    }, 600);
  }

  initGiftBox();

  /* ----------------------------------------------------------
   *  8.  MEMORY TIMELINE ANIMATIONS
   * -------------------------------------------------------- */

  function initTimelineAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    // Timeline items from the left
    gsap.utils.toArray('.timeline-left').forEach((item) => {
      gsap.from(item, {
        scrollTrigger: {
          trigger: item,
          start: 'top 95%',
          toggleActions: 'play none none none',
        },
        x: -100,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
      });
    });

    // Timeline items from the right
    gsap.utils.toArray('.timeline-right').forEach((item) => {
      gsap.from(item, {
        scrollTrigger: {
          trigger: item,
          start: 'top 95%',
          toggleActions: 'play none none none',
        },
        x: 100,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
      });
    });

    // Timeline dots – scale pop
    gsap.utils.toArray('.timeline-dot').forEach((dot) => {
      gsap.from(dot, {
        scrollTrigger: {
          trigger: dot,
          start: 'top 95%',
          toggleActions: 'play none none none',
        },
        scale: 0,
        duration: 0.5,
        ease: 'back.out(2)',
      });
    });
  }

  initTimelineAnimations();

  /* ----------------------------------------------------------
   *  9.  BIRTHDAY CAKE – BLOW CANDLES
   * -------------------------------------------------------- */

  let candlesBlown = false;

  function initCakeInteraction() {
    const blowBtn = document.getElementById('blow-btn');
    if (!blowBtn) return;

    blowBtn.addEventListener('click', () => {
      if (candlesBlown) return;
      candlesBlown = true;
      blowBtn.disabled = true;
      blowBtn.style.opacity = '0.5';
      blowBtn.style.cursor = 'default';

      const flames = document.querySelectorAll('.flame');
      const smokes = document.querySelectorAll('.smoke');

      // Sequentially extinguish flames
      flames.forEach((flame, idx) => {
        setTimeout(() => {
          flame.classList.remove('active');
          flame.style.opacity = '0';
          flame.style.transform = 'scale(0)';

          // Trigger matching smoke
          if (smokes[idx]) {
            smokes[idx].classList.add('active');
          }
        }, idx * 200);
      });

      // After all flames extinguished + 1 second
      const totalFlameTime = flames.length * 200 + 1000;

      setTimeout(() => {
        // Show wish popup
        const wishPopup = document.getElementById('wish-popup');
        if (wishPopup) {
          wishPopup.classList.add('visible');
        }

        // Small confetti celebration
        if (typeof confetti !== 'undefined') {
          confetti({
            particleCount: 100,
            spread: 90,
            origin: { x: 0.5, y: 0.6 },
            colors: ['#ff69b4', '#ffd700', '#a855f7', '#f472b6'],
          });
        }

        // Hide popup after 4 seconds
        setTimeout(() => {
          if (wishPopup) {
            wishPopup.classList.remove('visible');
          }
        }, 4000);
      }, totalFlameTime);
    });
  }

  initCakeInteraction();

  /* ----------------------------------------------------------
   *  10. FIREWORKS FINALE
   * -------------------------------------------------------- */

  let fireworksRunning = false;

  /** Particle used in firework explosions */
  class FireworkParticle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      const angle = rand(0, Math.PI * 2);
      const speed = rand(1, 6);
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.alpha = 1;
      this.color = color;
      this.size = rand(1.5, 3.5);
      this.friction = 0.97;
      this.gravity = 0.04;
    }

    update() {
      this.vx *= this.friction;
      this.vy *= this.friction;
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= 0.012;
      if (this.alpha < 0) this.alpha = 0;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /** A single firework rocket */
  class Firework {
    constructor(canvasWidth, canvasHeight) {
      this.x = rand(canvasWidth * 0.1, canvasWidth * 0.9);
      this.y = canvasHeight;
      this.targetY = rand(canvasHeight * 0.1, canvasHeight * 0.4);
      this.speed = rand(3, 6);
      this.exploded = false;
      this.particles = [];

      const palette = [
        '#ff69b4', '#ff1493', '#da70d6', '#ffd700',
        '#ffffff', '#a855f7', '#ec4899', '#f472b6',
        '#fbbf24', '#f9a8d4', '#c084fc', '#e879f9',
      ];
      this.color = palette[randInt(0, palette.length - 1)];
    }

    update() {
      if (!this.exploded) {
        this.y -= this.speed;
        if (this.y <= this.targetY) {
          this.explode();
        }
      }

      // Update particles
      this.particles.forEach((p) => p.update());
      this.particles = this.particles.filter((p) => p.alpha > 0.01);
    }

    explode() {
      this.exploded = true;
      const count = randInt(80, 120);
      for (let i = 0; i < count; i++) {
        this.particles.push(new FireworkParticle(this.x, this.y, this.color));
      }
    }

    draw(ctx) {
      if (!this.exploded) {
        // Draw the rocket trail
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      this.particles.forEach((p) => p.draw(ctx));
    }

    /** True when exploded and all particles faded */
    isDead() {
      return this.exploded && this.particles.length === 0;
    }
  }

  /**
   * Launch the full fireworks sequence on #fireworks-canvas
   * for approximately 8 seconds.
   */
  function startFireworks() {
    if (fireworksRunning) return;
    fireworksRunning = true;

    const canvas = document.getElementById('fireworks-canvas');
    if (!canvas) return;
    canvas.classList.add('active');

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const fireworks = [];
    let elapsed = 0;
    const duration = 8000;
    let lastTime = performance.now();
    let launchAccumulator = 0;
    const launchInterval = rand(300, 500);

    function loop(now) {
      const dt = now - lastTime;
      lastTime = now;
      elapsed += dt;
      launchAccumulator += dt;

      // Semi-transparent clear for trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Launch new fireworks
      if (elapsed < duration && launchAccumulator >= launchInterval) {
        launchAccumulator = 0;
        fireworks.push(new Firework(canvas.width, canvas.height));
      }

      // Update + draw
      fireworks.forEach((fw) => {
        fw.update();
        fw.draw(ctx);
      });

      // Remove dead fireworks
      for (let i = fireworks.length - 1; i >= 0; i--) {
        if (fireworks[i].isDead()) fireworks.splice(i, 1);
      }

      // Continue loop until duration + fade out
      if (elapsed < duration + 3000) {
        requestAnimationFrame(loop);
      } else {
        fireworksRunning = false;
      }
    }

    requestAnimationFrame(loop);
  }

  /** Create floating hearts in #finale-hearts */
  function createFinaleHearts() {
    const container = document.getElementById('finale-hearts');
    if (!container) return;

    const heartEmojis = ['❤️', '💖', '💕', '💗', '💝', '🩷'];
    for (let i = 0; i < 20; i++) {
      const heart = document.createElement('span');
      heart.textContent = heartEmojis[randInt(0, heartEmojis.length - 1)];
      heart.style.position = 'absolute';
      heart.style.left = rand(5, 95) + '%';
      heart.style.bottom = '-50px';
      heart.style.fontSize = rand(1.2, 3) + 'rem';
      heart.style.opacity = rand(0.4, 0.9);
      heart.style.pointerEvents = 'none';

      if (typeof gsap !== 'undefined') {
        gsap.to(heart, {
          y: -(window.innerHeight + 100),
          x: rand(-80, 80),
          rotation: rand(-45, 45),
          duration: rand(3, 6),
          ease: 'power1.out',
          delay: rand(0, 2),
          onComplete: () => heart.remove(),
        });
      }

      container.appendChild(heart);
    }
  }

  /** Fire canvas-confetti in bursts during finale */
  function finaleConfettiBursts() {
    if (typeof confetti === 'undefined') return;

    const burstCount = 6;
    for (let i = 0; i < burstCount; i++) {
      setTimeout(() => {
        confetti({
          particleCount: randInt(60, 100),
          spread: rand(60, 140),
          origin: { x: rand(0.2, 0.8), y: rand(0.2, 0.6) },
          colors: ['#ff69b4', '#ffd700', '#a855f7', '#ff6347', '#ffffff'],
          startVelocity: rand(20, 35),
        });
      }, i * 800);
    }
  }

  /** Main celebrate button handler */
  function initFinale() {
    const celebrateBtn = document.getElementById('celebrate-btn');
    if (!celebrateBtn) return;

    celebrateBtn.addEventListener('click', () => {
      celebrateBtn.disabled = true;

      // Fade out .finale-content
      const finaleContent = document.querySelector('.finale-content');
      if (finaleContent && typeof gsap !== 'undefined') {
        gsap.to(finaleContent, {
          opacity: 0,
          y: -30,
          duration: 0.6,
          onComplete: () => {
            finaleContent.style.pointerEvents = 'none';
          },
        });
      }

      // Start fireworks
      startFireworks();

      // Canvas-confetti bursts
      finaleConfettiBursts();

      // Show #finale-message after 2 seconds
      setTimeout(() => {
        const msg = document.getElementById('finale-message');
        if (msg) {
          msg.classList.add('visible');
        }
      }, 2000);

      // Create floating hearts
      setTimeout(createFinaleHearts, 1500);

      // Try to increase music volume slightly
      const bgMusic = document.getElementById('bg-music');
      if (bgMusic && !bgMusic.paused) {
        bgMusic.volume = Math.min(1, bgMusic.volume + 0.2);
      }
    });
  }

  initFinale();

  /* ----------------------------------------------------------
   *  11. FLOATING DECORATIONS
   * -------------------------------------------------------- */

  function createFloatingDecorations() {
    const container = document.getElementById('floating-decorations');
    if (!container) return;

    const decorations = [
      { emoji: '❤️', count: randInt(8, 10), cls: 'deco-heart' },
      { emoji: '🎈', count: randInt(5, 6), cls: 'deco-balloon' },
      { emoji: '✨', count: randInt(8, 10), cls: 'deco-sparkle' },
      { emoji: '🦋', count: randInt(4, 5), cls: 'deco-butterfly' },
    ];

    decorations.forEach(({ emoji, count, cls }) => {
      for (let i = 0; i < count; i++) {
        const el = document.createElement('span');
        el.classList.add('floating-deco', cls);
        el.textContent = emoji;
        el.style.position = 'fixed';
        el.style.left = rand(2, 98) + '%';
        el.style.bottom = '-60px';
        el.style.fontSize = rand(1, 2.5) + 'rem';
        el.style.opacity = rand(0.3, 0.8);
        el.style.pointerEvents = 'none';
        el.style.zIndex = '1';

        // Float-up animation via CSS custom properties
        const dur = rand(8, 20);
        const delay = rand(0, 15);
        el.style.animation = `float-up ${dur}s ${delay}s linear infinite`;

        container.appendChild(el);
      }
    });

    // Inject the @keyframes if not already present
    if (!document.getElementById('float-up-keyframes')) {
      const style = document.createElement('style');
      style.id = 'float-up-keyframes';
      style.textContent = `
        @keyframes float-up {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: var(--deco-opacity, 0.5);
          }
          25% {
            transform: translateY(-25vh) translateX(20px) rotate(15deg);
          }
          50% {
            transform: translateY(-55vh) translateX(-15px) rotate(-10deg);
          }
          75% {
            transform: translateY(-80vh) translateX(10px) rotate(8deg);
          }
          100% {
            transform: translateY(-110vh) translateX(-5px) rotate(-5deg);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  createFloatingDecorations();

  /* ----------------------------------------------------------
   *  12. MUSIC PLAYER
   * -------------------------------------------------------- */

  function initMusicPlayer() {
    const btn = document.getElementById('music-btn');
    const audio = document.getElementById('bg-music');
    if (!btn || !audio) return;

    // Set initial volume
    audio.volume = 0.5;

    btn.addEventListener('click', () => {
      if (audio.paused) {
        audio.play().then(() => {
          btn.classList.add('playing');
          // Update label if one exists
          const label = btn.querySelector('.music-label') || btn;
          if (label.textContent !== undefined) {
            label.textContent = label === btn ? '⏸ Pause' : 'Pause';
          }
        }).catch((err) => {
          console.warn('Audio playback failed:', err.message);
        });
      } else {
        audio.pause();
        btn.classList.remove('playing');
        const label = btn.querySelector('.music-label') || btn;
        if (label.textContent !== undefined) {
          label.textContent = label === btn ? '🎵 Play Music' : 'Play Music';
        }
      }
    });

    // Handle audio errors (e.g., missing file)
    audio.addEventListener('error', () => {
      console.warn('Background music file could not be loaded.');
    });
  }

  initMusicPlayer();

  /* ----------------------------------------------------------
   *  13. SCROLL ANIMATIONS (GSAP ScrollTrigger)
   * -------------------------------------------------------- */

  function initScrollAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    // Section headers fade in
    gsap.utils.toArray('.section-header').forEach((header) => {
      gsap.from(header, {
        scrollTrigger: {
          trigger: header,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
      });
    });

    // Glass cards – scale + opacity
    gsap.utils.toArray('.glass-card').forEach((card) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        scale: 0.92,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
      });
    });

    // Parallax scroll effect on the Three.js camera
    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        if (threeCamera) {
          threeCamera.position.y = -self.progress * 80;
        }
      },
    });

    // Hide scroll indicator after hero
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
      ScrollTrigger.create({
        trigger: '.scroll-indicator',
        start: 'top 20%',
        onEnter: () => {
          gsap.to(scrollIndicator, { opacity: 0, duration: 0.5 });
        },
      });

      // Alternative: hide once user has scrolled 100px
      window.addEventListener(
        'scroll',
        () => {
          if (window.scrollY > 100 && scrollIndicator) {
            gsap.to(scrollIndicator, { opacity: 0, duration: 0.4 });
          }
        },
        { passive: true }
      );
    }
  }

  initScrollAnimations();

  /* ----------------------------------------------------------
   *  14. SMOOTH SCROLL UTILITY
   * -------------------------------------------------------- */

  // Enable smooth scrolling for any anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ----------------------------------------------------------
   *  15. ADDITIONAL POLISH & PERFORMANCE
   * -------------------------------------------------------- */

  /**
   * Add a subtle cursor glow effect that follows the mouse
   * (only on desktop).
   */
  function initCursorGlow() {
    if (isMobile) return;

    const glow = document.createElement('div');
    glow.id = 'cursor-glow';
    glow.style.cssText = `
      position: fixed;
      width: 250px;
      height: 250px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%);
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      transition: opacity 0.3s;
      opacity: 0;
    `;
    document.body.appendChild(glow);

    let glowVisible = false;

    window.addEventListener('mousemove', (e) => {
      glow.style.left = e.clientX + 'px';
      glow.style.top = e.clientY + 'px';
      if (!glowVisible) {
        glow.style.opacity = '1';
        glowVisible = true;
      }
    });

    window.addEventListener('mouseleave', () => {
      glow.style.opacity = '0';
      glowVisible = false;
    });
  }

  initCursorGlow();

  /**
   * Add a gentle parallax sway to sections as the user
   * scrolls – makes the page feel alive.
   */
  function initSectionParallax() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    if (isMobile) return;

    gsap.utils.toArray('section').forEach((section) => {
      const inner = section.querySelector('.section-header');
      if (!inner) return;

      gsap.fromTo(
        inner,
        { y: 20 },
        {
          y: -20,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        }
      );
    });
  }

  initSectionParallax();

  /**
   * Reveal-on-scroll utility for any element with
   * the data-reveal attribute.
   */
  function initRevealOnScroll() {
    const revealEls = document.querySelectorAll('[data-reveal]');
    if (revealEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    revealEls.forEach((el) => observer.observe(el));
  }

  initRevealOnScroll();

  /**
   * Inject CSS keyframe for the typewriter cursor blink
   * (in case it's not in the stylesheet).
   */
  (function injectCursorBlink() {
    if (document.getElementById('typewriter-cursor-keyframe')) return;
    const style = document.createElement('style');
    style.id = 'typewriter-cursor-keyframe';
    style.textContent = `
      @keyframes blink-cursor {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
      .typewriter-cursor {
        font-weight: 100;
        color: #ec4899;
        margin-left: 2px;
      }
    `;
    document.head.appendChild(style);
  })();

  /**
   * Animate numbers if there are any counter elements
   * (e.g., days together, photos taken, etc.)
   */
  function initCounterAnimations() {
    const counters = document.querySelectorAll('[data-count]');
    if (counters.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.getAttribute('data-count'), 10);
            animateCounter(el, target);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((el) => observer.observe(el));
  }

  function animateCounter(el, target) {
    const duration = 2000;
    const start = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  initCounterAnimations();

  /**
   * Easter egg: Konami code reveals a special message.
   * ↑ ↑ ↓ ↓ ← → ← → B A
   */
  (function initKonamiEasterEgg() {
    const pattern = [
      'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
      'b', 'a',
    ];
    let position = 0;

    document.addEventListener('keydown', (e) => {
      if (e.key === pattern[position]) {
        position++;
        if (position === pattern.length) {
          position = 0;
          showEasterEgg();
        }
      } else {
        position = 0;
      }
    });

    function showEasterEgg() {
      if (typeof confetti !== 'undefined') {
        // Mega confetti!
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            confetti({
              particleCount: 150,
              spread: 180,
              origin: { x: rand(0.1, 0.9), y: rand(0.1, 0.7) },
              colors: ['#ff69b4', '#ffd700', '#a855f7', '#00ff88', '#ff6347'],
              startVelocity: 40,
            });
          }, i * 400);
        }
      }

      const toast = document.createElement('div');
      toast.textContent = '🎉 You found the secret! Happy Birthday! 🎉';
      toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #ec4899, #a855f7);
        color: white;
        padding: 24px 40px;
        border-radius: 16px;
        font-size: 1.3rem;
        font-weight: 700;
        z-index: 100000;
        box-shadow: 0 20px 60px rgba(236, 72, 153, 0.5);
        text-align: center;
        animation: easterPop 0.5s ease-out;
      `;
      document.body.appendChild(toast);

      if (!document.getElementById('easter-pop-keyframe')) {
        const s = document.createElement('style');
        s.id = 'easter-pop-keyframe';
        s.textContent = `
          @keyframes easterPop {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
            70% { transform: translate(-50%, -50%) scale(1.1); }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          }
        `;
        document.head.appendChild(s);
      }

      setTimeout(() => {
        toast.style.transition = 'opacity 0.5s';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 600);
      }, 4000);
    }
  })();

  /* ----------------------------------------------------------
   *  16.  BACK-TO-TOP BUTTON (bonus UX)
   * -------------------------------------------------------- */

  (function initBackToTop() {
    const btn = document.createElement('button');
    btn.id = 'back-to-top';
    btn.innerHTML = '↑';
    btn.setAttribute('aria-label', 'Back to top');
    btn.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 30px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #ec4899, #a855f7);
      color: white;
      font-size: 1.3rem;
      cursor: pointer;
      z-index: 9998;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s, transform 0.3s;
      box-shadow: 0 4px 20px rgba(236, 72, 153, 0.4);
    `;
    document.body.appendChild(btn);

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.1)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
    });

    window.addEventListener(
      'scroll',
      () => {
        if (window.scrollY > 500) {
          btn.style.opacity = '1';
          btn.style.pointerEvents = 'auto';
        } else {
          btn.style.opacity = '0';
          btn.style.pointerEvents = 'none';
        }
      },
      { passive: true }
    );
  })();

  /* ----------------------------------------------------------
   *  17.  TILT EFFECT ON CARDS (mouse hover 3D tilt)
   * -------------------------------------------------------- */

  function initCardTilt() {
    if (isMobile) return;

    document.querySelectorAll('.glass-card, .carousel-item').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;

        card.style.transform =
          card.style.transform.replace(/rotateX\([^)]+\)\s*rotateY\([^)]+\)/, '') +
          ` rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        card.style.transition = 'transform 0.1s ease-out';
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = card.style.transform.replace(
          /rotateX\([^)]+\)\s*rotateY\([^)]+\)/,
          ''
        );
        card.style.transition = 'transform 0.4s ease-out';
      });
    });
  }

  initCardTilt();

  /* ----------------------------------------------------------
   *  18.  SPARKLE TRAIL ON MOUSE (desktop only)
   * -------------------------------------------------------- */

  (function initSparkleTrail() {
    if (isMobile) return;

    let lastSparkle = 0;
    const sparkleInterval = 80; // ms between sparkles

    window.addEventListener('mousemove', (e) => {
      const now = Date.now();
      if (now - lastSparkle < sparkleInterval) return;
      lastSparkle = now;

      const sparkle = document.createElement('span');
      sparkle.textContent = '✦';
      sparkle.style.cssText = `
        position: fixed;
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        pointer-events: none;
        font-size: ${rand(8, 16)}px;
        color: hsl(${randInt(300, 360)}, 80%, 70%);
        z-index: 99999;
        opacity: 1;
        transform: translate(-50%, -50%);
        transition: all 0.6s ease-out;
      `;
      document.body.appendChild(sparkle);

      // Trigger fade-out animation on next frame
      requestAnimationFrame(() => {
        sparkle.style.opacity = '0';
        sparkle.style.transform = `translate(${rand(-30, 30)}px, ${rand(-40, -10)}px) scale(0.3)`;
      });

      setTimeout(() => sparkle.remove(), 700);
    });
  })();

  /* ----------------------------------------------------------
   *  19.  PAGE VISIBILITY HANDLER
   * -------------------------------------------------------- */

  /**
   * Pause expensive animations when the tab is hidden
   * and resume when visible again.
   */
  document.addEventListener('visibilitychange', () => {
    const audio = document.getElementById('bg-music');
    if (document.hidden) {
      // Pause auto-rotate to save CPU
      stopAutoRotate();
    } else {
      // Resume if carousel is not being dragged
      if (!isDragging) startAutoRotate();
    }
  });

  /* ----------------------------------------------------------
   *  20.  CONSOLE GREETING
   * -------------------------------------------------------- */

  console.log(
    '%c🎂 Happy Birthday! 🎂',
    'color: #ec4899; font-size: 24px; font-weight: bold;'
  );
  console.log(
    '%cThis website was made with ❤️ just for you!',
    'color: #a855f7; font-size: 14px;'
  );

  /* ==========================================================
   *  END OF BIRTHDAY SURPRISE SCRIPT
   * ========================================================== */
});
