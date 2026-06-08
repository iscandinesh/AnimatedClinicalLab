// Alpha Diagnostics — Site JS
// Scroll-freeze: adds .scrolled class to #site-header once user scrolls past threshold

window.initScrollHeader = function () {
    const header = document.getElementById('site-header');
    if (!header) return;

    const threshold = 60;

    function onScroll() {
        if (window.scrollY > threshold) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    // Run once on init (handles page refresh mid-scroll)
    onScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
};
