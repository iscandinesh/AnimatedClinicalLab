window.themeInterop = {
    setTheme: function (isDark) {
        if (isDark) {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
        }
    }
};

// Testimonials Auto-Scroller (Continuous Smooth Sideways Scroll)
window.testimonialScroller = {
    animationFrameId: null,
    container: null,
    isHovered: false,
    scrollSpeed: 0.7, // Pixels to scroll per frame
    resumeTimeout: null,
    scrollListener: null,
    
    init: function() {
        this.container = document.getElementById('testimonials-scroll-container');
        if (!this.container) return;
        
        // Clean up any existing listeners and animations
        this.stopAutoScroll();
        
        // Centered starting position (first duplicate set start)
        const halfWidth = this.container.scrollWidth / 2;
        if (halfWidth > 0) {
            this.container.scrollLeft = halfWidth;
        }
        
        // Native scroll listener for seamless boundary wrap-around
        this.scrollListener = () => {
            const hw = this.container.scrollWidth / 2;
            if (hw > 0) {
                if (this.container.scrollLeft >= hw) {
                    this.container.scrollLeft -= hw;
                } else if (this.container.scrollLeft <= 0) {
                    this.container.scrollLeft += hw;
                }
            }
        };
        this.container.addEventListener('scroll', this.scrollListener);
        
        // Pause scrolling on mouse hover
        this.container.addEventListener('mouseenter', () => { 
            this.isHovered = true; 
        });
        this.container.addEventListener('mouseleave', () => { 
            this.isHovered = false; 
        });
        
        // Pause scrolling on mobile touch gesture
        this.container.addEventListener('touchstart', () => {
            this.isHovered = true;
            if (this.resumeTimeout) clearTimeout(this.resumeTimeout);
        }, {passive: true});
        
        this.container.addEventListener('touchend', () => {
            if (this.resumeTimeout) clearTimeout(this.resumeTimeout);
            this.resumeTimeout = setTimeout(() => {
                this.isHovered = false;
            }, 3000);
        });
        
        this.startAutoScroll();
    },
    
    startAutoScroll: function() {
        if (!this.container) return;
        
        const scroll = () => {
            if (this.container && !this.isHovered) {
                this.container.scrollLeft += this.scrollSpeed;
            }
            this.animationFrameId = requestAnimationFrame(scroll);
        };
        
        this.animationFrameId = requestAnimationFrame(scroll);
    },
    
    stopAutoScroll: function() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        if (this.resumeTimeout) {
            clearTimeout(this.resumeTimeout);
            this.resumeTimeout = null;
        }
        if (this.container && this.scrollListener) {
            this.container.removeEventListener('scroll', this.scrollListener);
            this.scrollListener = null;
        }
    },
    
    scroll: function(direction) {
        if (!this.container) return;
        
        this.isHovered = true;
        if (this.resumeTimeout) clearTimeout(this.resumeTimeout);
        
        // Scroll card width + gap (320px + 24px = 344px)
        this.container.scrollBy({ left: direction * 344, behavior: 'smooth' });
        
        // Resume scrolling after 6 seconds of inactivity
        this.resumeTimeout = setTimeout(() => {
            this.isHovered = false;
        }, 6000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.testimonialScroller) {
        window.testimonialScroller.init();
    }
});
