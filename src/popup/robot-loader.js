/**
 * Robot Loading Animation Loader
 * Manages loading and control of robot loading animation dynamically
 */

class RobotLoader {
    constructor() {
        this.loadingOverlay = null;
        this.isLoaded = false;
        this.isVisible = false;
    }

    /**
     * Loads robot animation content from separate HTML file
     */
    async loadRobotAnimation() {
        if (this.isLoaded) return;

        try {
            console.log('🤖 Loading robot animation...');
            
            // CSS sudah ada di popup.html sebagai inline styles, tidak perlu inject external CSS
            
            // Fetch robot animation HTML content
            const response = await fetch(chrome.runtime.getURL('src/popup/robot-loading.html'));
            const htmlContent = await response.text();
            
            // Buat overlay element
            this.loadingOverlay = document.createElement('div');
            this.loadingOverlay.id = 'loadingOverlay';
            this.loadingOverlay.className = 'loading-overlay hidden';
            this.loadingOverlay.innerHTML = htmlContent;
            
            // Tambahkan ke body
            document.body.appendChild(this.loadingOverlay);
            
            this.isLoaded = true;
            console.log('✅ Robot animation loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading robot animation:', error);
            this.createFallbackLoader();
        }
    }



    /**
     * Creates a simple fallback loader if robot animation fails to load
     */
    createFallbackLoader() {
        console.log('🔄 Creating fallback loader...');
        
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.id = 'loadingOverlay';
        this.loadingOverlay.className = 'loading-overlay hidden';
        this.loadingOverlay.innerHTML = `
            <div class="loading-container">
                <div class="fallback-loader">
                    <div class="spinner"></div>
                    <h2>Site Scout</h2>
                    <p>Loading...</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.loadingOverlay);
        this.isLoaded = true;
    }

    /**
     * Menampilkan animasi loading
     */
    async show() {
        if (!this.isLoaded) {
            await this.loadRobotAnimation();
        }
        
        if (this.loadingOverlay) {
            console.log('🎬 Showing robot loading animation');
            this.loadingOverlay.classList.remove('hidden');
            this.loadingOverlay.style.display = 'flex';
            this.isVisible = true;
        }
    }

    /**
     * Menyembunyikan animasi loading
     */
    hide() {
        if (this.loadingOverlay && this.isVisible) {
            console.log('🎬 Hiding robot loading animation');
            this.loadingOverlay.classList.add('hidden');
            
            // Delay for transition
            setTimeout(() => {
                if (this.loadingOverlay) {
                    this.loadingOverlay.style.display = 'none';
                }
            }, 800);
            
            this.isVisible = false;
        }
    }

    /**
     * Update status text dalam animasi
     */
    updateStatus(statusText) {
        if (this.loadingOverlay) {
            const statusElement = this.loadingOverlay.querySelector('#animationStatusText');
            if (statusElement) {
                statusElement.textContent = statusText;
            }
        }
    }

    /**
     * Update progress animation
     */
    updateProgress(percentage) {
        if (this.loadingOverlay) {
            const progressBar = this.loadingOverlay.querySelector('.progress-bar-animation');
            if (progressBar) {
                progressBar.style.width = `${percentage}%`;
            }
        }
    }

    /**
     * Mendapatkan status visibility
     */
    isShowing() {
        return this.isVisible;
    }

    /**
     * Force hide by removing element
     */
    forceHide() {
        if (this.loadingOverlay) {
            console.log('🎬 Force hiding robot animation');
            this.loadingOverlay.remove();
            this.loadingOverlay = null;
            this.isLoaded = false;
            this.isVisible = false;
        }
        
        // CSS sudah inline di popup.html, tidak perlu cleanup external CSS
    }

    /**
     * Preload animation for better performance
     */
    async preload() {
        if (!this.isLoaded) {
            await this.loadRobotAnimation();
            // Sembunyikan setelah preload
            if (this.loadingOverlay) {
                this.loadingOverlay.style.display = 'none';
                this.loadingOverlay.classList.add('hidden');
            }
        }
    }
}

        // Export for use in other files
window.RobotLoader = RobotLoader;
