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

        // Smooth scrolling for internal links
        document.addEventListener('click', (e) => {
            const anchor = e.target.closest('a[href^="#"]');
            if (anchor) {
                e.preventDefault();
                const targetId = anchor.getAttribute('href');
                if (targetId === '#') return;
                const target = document.querySelector(targetId);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    }

    // Scroll to top on page load/navigation
    window.scrollTo(0, 0);
};
