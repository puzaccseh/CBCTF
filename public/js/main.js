/**
 * public/js/main.js
 * Client-side JavaScript for Cyber Bangla CTF website.
 * Handles: particle animation, counter animation, navbar scroll, mobile menu.
 */

'use strict';

// ── Particle System (Hero Background) ─────────────────────────────────────────
(function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    const PARTICLE_COUNT = 70;
    const CONNECTION_DIST = 130;

    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    function createParticle() {
        return {
            x:  Math.random() * canvas.width,
            y:  Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            r:  Math.random() * 1.8 + 0.4,
            a:  Math.random() * 0.5 + 0.15,
            c:  Math.random() > 0.55 ? '#00ffcc' : '#00aaff'
        };
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(createParticle());
    }

    let rafId;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx   = particles[i].x - particles[j].x;
                const dy   = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < CONNECTION_DIST) {
                    const alpha = (1 - dist / CONNECTION_DIST) * 0.12;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0,255,204,${alpha})`;
                    ctx.lineWidth   = 0.6;
                    ctx.stroke();
                }
            }
        }

        // Draw particles
        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height)  p.vy *= -1;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle   = p.c;
            ctx.globalAlpha = p.a;
            ctx.fill();
        }

        ctx.globalAlpha = 1;
        rafId = requestAnimationFrame(animate);
    }

    animate();

    // Pause when tab not visible (performance)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(rafId);
        } else {
            animate();
        }
    });
})();

// ── Navbar Scroll Effect ───────────────────────────────────────────────────────
(function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    function handleScroll() {
        navbar.classList.toggle('scrolled', window.scrollY > 30);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
})();

// ── Mobile Nav Toggle ────────────────────────────────────────────────────────
(function initMobileNav() {
    const toggle = document.getElementById('navToggle');
    const links  = document.getElementById('navLinks');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
        links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', links.classList.contains('open'));
    });

    // Close on link click
    links.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => links.classList.remove('open'));
    });
})();

// ── Counter Animation (Stats Bar) ─────────────────────────────────────────────
(function initCounters() {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el     = entry.target;
            const target = parseInt(el.getAttribute('data-target'), 10);
            const dur    = 1800;
            const step   = 16;
            const inc    = target / (dur / step);
            let   cur    = 0;

            function tick() {
                cur = Math.min(cur + inc, target);
                el.textContent = Math.floor(cur).toLocaleString();
                if (cur < target) requestAnimationFrame(tick);
            }
            tick();
            observer.unobserve(el);
        });
    }, { threshold: 0.4 });

    counters.forEach(c => observer.observe(c));
})();

// ── Scroll-reveal animation ────────────────────────────────────────────────────
(function initScrollReveal() {
    const cards = document.querySelectorAll(
        '.service-card, .blog-card, .course-card, .team-card, .mv-card'
    );

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity  = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, i * 60);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    cards.forEach(card => {
        card.style.opacity   = '0';
        card.style.transform = 'translateY(24px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(card);
    });
})();
