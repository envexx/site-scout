/**
 * Animation Controller - Mengontrol loading animation overlay dengan RobotLoader
 */

// Animation control untuk loading overlay
class AnimationController {
    constructor() {
        this.robotLoader = new RobotLoader();
        this.statusInterval = null;
        this.currentStatusIndex = 0;
        
        this.statusTexts = [
            "Initializing...",
            "Connecting to AI...",
            "Analyzing content...",
            "Processing data...",
            "Understanding patterns...",
            "Compiling summary...",
            "Almost ready...",
            "Analysis complete!"
        ];
        
        this.init();
    }
    
    async init() {
        // Preload animation untuk performa yang lebih baik
        await this.robotLoader.preload();
        
        // Show animation immediately when popup opens
        this.showAnimation();
        this.startStatusUpdates();
        
        // Add interactive effects
        this.addInteractiveEffects();
    }
    
    async showAnimation() {
        await this.robotLoader.show();
        this.startStatusUpdates(); // Restart status updates
        console.log('🎬 Robot loading animation shown');
    }
    
    hideAnimation() {
        this.robotLoader.hide();
        this.stopStatusUpdates();
        console.log('🎬 Robot loading animation hidden successfully');
    }
    
    startStatusUpdates() {
        this.updateStatus();
        this.statusInterval = setInterval(() => {
            this.updateStatus();
        }, 800);
    }
    
    stopStatusUpdates() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
    }
    
    updateStatus() {
        const status = this.statusTexts[this.currentStatusIndex];
        this.robotLoader.updateStatus(status);
        this.currentStatusIndex = (this.currentStatusIndex + 1) % this.statusTexts.length;
    }
    
    setCustomStatus(status) {
        this.robotLoader.updateStatus(status);
    }
    
    addInteractiveEffects() {
        // Interactive hover effects for the robot bubble
        document.addEventListener('mousemove', (e) => {
            const bubble = document.querySelector('.chat-bubble');
            if (!bubble || !this.robotLoader.isShowing()) return;
            
            const rect = bubble.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const deltaX = (e.clientX - centerX) / 30;
            const deltaY = (e.clientY - centerY) / 30;
            
            bubble.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        });
        
        // Reset bubble position when mouse leaves
        document.addEventListener('mouseleave', () => {
            const bubble = document.querySelector('.chat-bubble');
            if (bubble) {
                bubble.style.transform = 'translate(0px, 0px)';
            }
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Global animation controller instance
    window.animationController = new AnimationController();
    
    // Function to be called when analysis is complete
    window.hideLoadingAnimation = function() {
        if (window.animationController) {
            window.animationController.setCustomStatus("Ready to chat!");
            setTimeout(() => {
                window.animationController.hideAnimation();
                
                // Double check if animation is really hidden
                setTimeout(() => {
                    if (window.animationController.robotLoader.isShowing()) {
                        console.warn('🎬 Animation still visible, forcing hide...');
                        window.animationController.robotLoader.forceHide();
                    }
                }, 500);
            }, 1000);
        }
    };
    
    // Function to update animation status from popup.js
    window.updateAnimationStatus = function(status) {
        if (window.animationController) {
            window.animationController.setCustomStatus(status);
        }
    };
    
    // Direct hide function for immediate hiding
    window.forceHideAnimation = function() {
        if (window.animationController) {
            window.animationController.robotLoader.forceHide();
            window.animationController.stopStatusUpdates();
            console.log('🎬 Animation force hidden');
        }
    };
    
    // Function to restart animation (for reanalysis)
    window.restartAnimation = function() {
        if (window.animationController) {
            console.log('🎬 Restarting robot animation');
            window.animationController.showAnimation();
        }
    };
});
