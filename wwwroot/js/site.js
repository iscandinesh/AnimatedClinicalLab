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

// Upgrade legacy blog FAQ paragraphs to accessible, collapsible FAQ controls.
// New editor FAQ blocks already use <details>; this preserves that behavior for
// articles authored before the rich FAQ widget was introduced.
window.initBlogFaqs = function () {
    document.querySelectorAll('.blog-rich-content').forEach(container => {
        if (container.dataset.faqReady === 'true') return;

        const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4'));
        headings.filter(h => /faq|frequently asked questions/i.test(h.textContent || '')).forEach(heading => {
            let current = heading.nextElementSibling;
            while (current && !/^H[1-4]$/.test(current.tagName)) {
                const questionText = (current.textContent || '').trim();
                const isQuestion = /^(?:q(?:uestion)?\s*[:.-]|\d+[.)])\s*/i.test(questionText);
                if (!isQuestion) {
                    current = current.nextElementSibling;
                    continue;
                }

                const answer = current.nextElementSibling;
                const answerText = (answer?.textContent || '').trim();
                if (!answer || !/^(?:a(?:nswer)?\s*[:.-])/i.test(answerText)) {
                    current = current.nextElementSibling;
                    continue;
                }

                const details = document.createElement('details');
                details.className = 'faq-item faq-item-enhanced';
                const summary = document.createElement('summary');
                summary.className = 'faq-question';
                summary.textContent = questionText.replace(/^(?:q(?:uestion)?\s*[:.-]|\d+[.)])\s*/i, '');
                const response = document.createElement('div');
                response.className = 'faq-answer';
                response.textContent = answerText.replace(/^(?:a(?:nswer)?\s*[:.-])\s*/i, '');
                details.append(summary, response);
                current.replaceWith(details);
                answer.remove();
                current = details.nextElementSibling;
            }
        });
        container.dataset.faqReady = 'true';
    });
};

// Article links must remain visibly recognisable even when the editor saved an
// inline text colour. Inline styles are set with !important deliberately here.
window.initBlogLinks = function () {
    const isDark = document.body.classList.contains('dark-theme');
    const blue = isDark ? '#60a5fa' : '#2563eb';
    document.querySelectorAll('.blog-rich-content a:not(.cta-button)').forEach(link => {
        link.style.setProperty('color', blue, 'important');
        link.style.setProperty('text-decoration', 'underline', 'important');
        link.style.setProperty('text-decoration-color', blue, 'important');
        link.style.setProperty('text-decoration-thickness', '2px', 'important');
        link.style.setProperty('text-underline-offset', '2px', 'important');
    });
};
