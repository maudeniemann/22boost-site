import { gsap } from 'gsap';

/**
 * 22BOOST — Interactive 3D Room Experience
 *
 * Camera dolly forward through a CSS 3D room over 15 seconds.
 * Content planes reveal as the camera reaches their depth.
 * Auto-plays on load with optional keyboard/wheel controls.
 */

const TOTAL_DURATION = 17;
const CAMERA_MAX_Z = 2200;

interface SectionDef {
  name: string;
  planeId: string;
  start: number;
  dur: number;
  keepVisible?: boolean;
}

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

const SECTIONS: SectionDef[] = [
  { name: 'hero', planeId: 'plane-hero', start: 0, dur: 2 },
  { name: 'problem', planeId: 'plane-problem', start: 2, dur: 1.75 },
  // On mobile: sequential reveals (no overlap). On desktop: overlapping fan.
  { name: 'yerba-mate', planeId: 'plane-yerba-mate', start: 3.75, dur: isMobile ? 2.5 : 4 },
  { name: 'rhodiola', planeId: 'plane-rhodiola', start: isMobile ? 6.25 : 4.5, dur: isMobile ? 2.5 : 3.5 },
  { name: 'l-theanine', planeId: 'plane-l-theanine', start: isMobile ? 8.75 : 5.5, dur: isMobile ? 2.25 : 4 },
  { name: 'product', planeId: 'plane-product', start: 11, dur: 2.5 },
  { name: 'cta', planeId: 'plane-cta', start: 13.5, dur: 3.5, keepVisible: true },
];

class Timeline {
  private master: gsap.core.Timeline;
  private isPlaying = true;
  private currentSection = '';

  constructor() {
    if (isMobile) {
      // On mobile: show all content immediately, no animation
      this.master = gsap.timeline();
      SECTIONS.forEach((section) => {
        const plane = document.getElementById(section.planeId);
        if (plane) gsap.set(plane, { opacity: 1 });
      });
      gsap.set('#tagline-top', { opacity: 1 });
      gsap.set('#tagline-bottom', { opacity: 1 });
      // Hide controls
      const controls = document.querySelector('.controls-bar') as HTMLElement;
      if (controls) controls.style.display = 'none';
      return;
    }

    this.hideAllContent();
    this.master = this.buildTimeline();
    this.setupControls();
    this.setupScrollScrub();
    this.updateProgressBar();

    setTimeout(() => {
      this.master.play();
    }, 400);
  }

  private hideAllContent(): void {
    SECTIONS.forEach((section) => {
      const plane = document.getElementById(section.planeId);
      if (plane) {
        gsap.set(plane, { opacity: 0 });
      }
    });
    gsap.set('#tagline-top', { opacity: 0 });
    gsap.set('#tagline-bottom', { opacity: 0 });
  }

  private buildTimeline(): gsap.core.Timeline {
    const tl = gsap.timeline({
      paused: true,
      onUpdate: () => {
        this.updateProgressBar();
        this.updateActiveSection();
      },
      onComplete: () => {
        this.isPlaying = false;
        this.updatePlayPauseButton();
      },
    });

    const cameraRig = document.getElementById('camera-rig');
    if (!cameraRig) return tl;

    // ── Master camera dolly ──
    tl.to(cameraRig, {
      z: CAMERA_MAX_Z,
      duration: TOTAL_DURATION,
      ease: 'power1.inOut',
    }, 0);

    // ── Content reveals ──
    SECTIONS.forEach((section) => {
      const plane = document.getElementById(section.planeId);
      if (!plane) return;

      const contentEls = plane.querySelectorAll('.room-text');

      // Fade in
      tl.to(plane, {
        opacity: 1,
        duration: 0.8,
        ease: 'power2.out',
      }, section.start);

      // Text staggers in
      if (contentEls.length > 0) {
        tl.from(contentEls, {
          opacity: 0,
          y: 25,
          duration: 0.4,
          stagger: 0.06,
          ease: 'power3.out',
        }, section.start + 0.2);
      }

      // Fade out
      if (!section.keepVisible) {
        tl.to(plane, {
          opacity: 0,
          duration: 0.6,
          ease: 'power2.in',
        }, section.start + section.dur - 0.6);
      }
    });

    // ── Tagline reveals ──
    tl.to('#tagline-top', { opacity: 1, duration: 0.8, ease: 'power2.out' }, 7);
    tl.to('#tagline-bottom', { opacity: 1, duration: 0.8, ease: 'power2.out' }, 7.25);
    tl.to('#tagline-top', { opacity: 0, duration: 0.6 }, 9.5);
    tl.to('#tagline-bottom', { opacity: 0, duration: 0.6 }, 9.5);

    return tl;
  }

  // ── Scroll / Wheel Scrub ──

  private setupScrollScrub(): void {
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    const hint = document.getElementById('scroll-hint');

    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY / 4000;
      const newProgress = Math.max(0, Math.min(1, this.master.progress() + delta));
      this.master.progress(newProgress);

      if (this.isPlaying) {
        this.master.pause();
        this.isPlaying = false;
        this.updatePlayPauseButton();
      }

      if (hint) hint.classList.add('hidden');

      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (!this.isPlaying && this.master.progress() < 1) {
          this.master.play();
          this.isPlaying = true;
          this.updatePlayPauseButton();
        }
      }, 3000);
    }, { passive: false });

    // Touch swipe
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
      if ((e.target as HTMLElement).closest('form, input, button, a')) return;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if ((e.target as HTMLElement).closest('form, input, button, a')) return;
      const deltaY = touchStartY - e.touches[0].clientY;
      touchStartY = e.touches[0].clientY;

      const delta = deltaY / 2000;
      const newProgress = Math.max(0, Math.min(1, this.master.progress() + delta));
      this.master.progress(newProgress);

      if (this.isPlaying) {
        this.master.pause();
        this.isPlaying = false;
        this.updatePlayPauseButton();
      }

      if (hint) hint.classList.add('hidden');
    }, { passive: true });
  }

  // ── Controls ──

  private setupControls(): void {
    const playPauseBtn = document.getElementById('play-pause');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => this.togglePlayPause());
    }

    const progressBar = document.getElementById('progress-track');
    if (progressBar) {
      progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        this.scrubTo(ratio);
      });
    }

    const skipDots = document.querySelectorAll('.skip-dot');
    skipDots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const sectionName = (dot as HTMLElement).dataset.target;
        const section = SECTIONS.find((s) => s.name === sectionName);
        if (section) {
          this.scrubTo(section.start / TOTAL_DURATION);
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlayPause();
      }
      if (e.code === 'ArrowRight') this.skipForward();
      if (e.code === 'ArrowLeft') this.skipBackward();
    });
  }

  private togglePlayPause(): void {
    if (this.isPlaying) {
      this.master.pause();
    } else {
      if (this.master.progress() >= 1) {
        this.hideAllContent();
        this.master.restart();
      } else {
        this.master.play();
      }
    }
    this.isPlaying = !this.isPlaying;
    this.updatePlayPauseButton();
  }

  private scrubTo(ratio: number): void {
    const time = ratio * TOTAL_DURATION;
    this.master.seek(time);
    if (!this.isPlaying) {
      this.master.pause();
    }
  }

  private skipForward(): void {
    const currentTime = this.master.time();
    const nextSection = SECTIONS.find((s) => s.start > currentTime + 0.5);
    if (nextSection) {
      this.master.seek(nextSection.start);
    }
  }

  private skipBackward(): void {
    const currentTime = this.master.time();
    const prevSections = SECTIONS.filter((s) => s.start < currentTime - 1);
    if (prevSections.length > 0) {
      this.master.seek(prevSections[prevSections.length - 1].start);
    }
  }

  private updateProgressBar(): void {
    const fill = document.getElementById('progress-fill');
    const timeDisplay = document.getElementById('time-display');
    if (fill) {
      fill.style.width = `${this.master.progress() * 100}%`;
    }
    if (timeDisplay) {
      timeDisplay.textContent = `${Math.floor(this.master.time())}s / ${TOTAL_DURATION}s`;
    }
  }

  private updateActiveSection(): void {
    const currentTime = this.master.time();
    let activeName = SECTIONS[0].name;

    for (const section of SECTIONS) {
      if (currentTime >= section.start) {
        activeName = section.name;
      }
    }

    if (activeName !== this.currentSection) {
      this.currentSection = activeName;
      document.querySelectorAll('.skip-dot').forEach((dot) => {
        const isActive = (dot as HTMLElement).dataset.target === activeName;
        dot.classList.toggle('active', isActive);
      });
    }
  }

  private updatePlayPauseButton(): void {
    const btn = document.getElementById('play-pause');
    if (btn) {
      btn.setAttribute('aria-label', this.isPlaying ? 'Pause' : 'Play');
      btn.innerHTML = this.isPlaying
        ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="3.5" height="12" rx="1"/><rect x="9.5" y="2" width="3.5" height="12" rx="1"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2 L14 8 L4 14 Z"/></svg>';
    }
  }
}

if (typeof window !== 'undefined') {
  new Timeline();
}
