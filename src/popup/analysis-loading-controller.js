/**
 * Analysis Loading Controller
 * Manages the loading animation during page analysis
 */
class AnalysisLoadingController {
    constructor() {
        this.loadingOverlay = null;
        this.isLoaded = false;
        this.progressBar = null;
        this.statusText = null;
        this.progressText = null;
    }

    async loadAnimation() {
        if (this.isLoaded) return;

        try {
            console.log('🔄 Loading analysis animation...');
            
            // Fetch loading animation HTML
            const response = await fetch(chrome.runtime.getURL('src/popup/analysis-loading.html'));
            const htmlContent = await response.text();
            
            // Create overlay
            this.loadingOverlay = document.createElement('div');
            this.loadingOverlay.id = 'analysisLoadingOverlay';
            this.loadingOverlay.style.display = 'none';
            this.loadingOverlay.innerHTML = htmlContent;
            
            // Add to body
            document.body.appendChild(this.loadingOverlay);
            
            // Get elements
            this.progressBar = document.getElementById('analysisProgressBar');
            this.statusText = document.getElementById('analysisStatusText');
            this.progressText = document.getElementById('analysisProgressText');
            
            this.isLoaded = true;
            console.log('✅ Analysis animation loaded');
            
        } catch (error) {
            console.error('❌ Error loading analysis animation:', error);
        }
    }

    async show() {
        if (!this.isLoaded) {
            await this.loadAnimation();
        }
        
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'block';
            // Reset progress
            this.updateProgress(0, 'Memulai analisis...');
        }
    }

    hide() {
        if (this.loadingOverlay) {
            // Add fade-out animation
            this.loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                this.loadingOverlay.style.display = 'none';
                this.loadingOverlay.style.opacity = '1';
            }, 300);
        }
    }

    updateProgress(percentage, message) {
        if (!this.isLoaded) return;

        // Update progress bar
        if (this.progressBar) {
            this.progressBar.style.width = `${percentage}%`;
        }
        
        // Update percentage text
        if (this.progressText) {
            this.progressText.textContent = `${percentage}%`;
        }
        
        // Update status message
        if (this.statusText && message) {
            this.statusText.textContent = message;
        }
    }

    isVisible() {
        return this.loadingOverlay && 
               this.loadingOverlay.style.display === 'block';
    }
}

// Export for use in popup.js
window.AnalysisLoadingController = AnalysisLoadingController;
