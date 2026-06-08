window.initHeliumAnimations = () => {
    // 1. Reveal on scroll (Intersection Observer)
    // Re-run this part every time because new elements may have been added to the DOM
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                revealObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Only observe elements that aren't already active
    document.querySelectorAll('.reveal-up:not(.active)').forEach(el => {
        revealObserver.observe(el);
    });

    // 2. Event Listeners - Only attach once
    if (!window.heliumEventsInitialized) {
        window.heliumEventsInitialized = true;

        // Navbar scroll effect
        window.addEventListener('scroll', () => {
            const nav = document.querySelector('.helium-nav');
            if (nav) {
                if (window.scrollY > 50) {
                    nav.classList.add('scrolled');
                } else {
                    nav.classList.remove('scrolled');
                }
            }
        });

        // Parallax effect for floating elements
        document.addEventListener('mousemove', (e) => {
            const amount = 20;
            const x = (e.clientX / window.innerWidth - 0.5) * amount;
            const y = (e.clientY / window.innerHeight - 0.5) * amount;

            document.querySelectorAll('.parallax-element').forEach(el => {
                const speed = el.getAttribute('data-speed') || 1;
                el.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
            });
        });

        // Smooth scrolling for internal and cross-page anchor links
        document.addEventListener('click', (e) => {
            const anchor = e.target.closest('a');
            if (anchor) {
                const href = anchor.getAttribute('href');
                if (!href) return;

                if (href.startsWith('#')) {
                    if (href === '#') return;
                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({
                            behavior: 'smooth'
                        });
                    }
                } else {
                    try {
                        const url = new URL(anchor.href, window.location.href);
                        if (url.pathname === window.location.pathname && url.hash) {
                            const target = document.querySelector(url.hash);
                            if (target) {
                                e.preventDefault();
                                target.scrollIntoView({
                                    behavior: 'smooth'
                                });
                            }
                        }
                    } catch (err) {}
                }
            }
        });
    }

    // Scroll to hash target if present, otherwise to top
    if (window.location.hash) {
        const hashTarget = document.querySelector(window.location.hash);
        if (hashTarget) {
            setTimeout(() => {
                hashTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        } else {
            window.scrollTo(0, 0);
        }
    } else {
        window.scrollTo(0, 0);
    }
};

// Insights blog page category filter
window.filterInsights = (btn, category) => {
    // Update active button state
    document.querySelectorAll('.insight-filter-btn').forEach(b => {
        b.classList.remove('btn-helium-primary');
        b.classList.add('btn-helium-secondary');
    });
    btn.classList.remove('btn-helium-secondary');
    btn.classList.add('btn-helium-primary');

    // Show/hide cards
    document.querySelectorAll('.insight-card-wrapper').forEach(card => {
        if (category === 'all' || card.getAttribute('data-category') === category) {
            card.style.display = '';
            // Re-trigger reveal animation
            card.querySelectorAll('.reveal-up').forEach(el => el.classList.remove('active'));
            setTimeout(() => {
                card.querySelectorAll('.reveal-up').forEach(el => el.classList.add('active'));
            }, 50);
        } else {
            card.style.display = 'none';
        }
    });
};
