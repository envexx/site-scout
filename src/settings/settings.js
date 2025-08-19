/**
 * Settings Script - Logic for Site Scout settings page
 * Manages API key, site list, and application settings
 */

class SettingsController {
    constructor() {
        this.storageManager = new StorageManager();
        this.apiHandler = new ApiHandler('sk-bb1b4da1bdb4c57fdfb39c60d9a99a0b6dfa81cca40895175b5da9bc63c12c58');
        // Inisialisasi elemen selain API key
        this.initializeElements();
        this.bindEvents();
        this.initialize();
    }

    initializeElements() {
        // Role selection
        this.roleSelect = document.getElementById('roleSelect');
        // Sites elements
        this.sitesList = document.getElementById('sitesList');
        this.refreshSitesBtn = document.getElementById('refreshSitesBtn');
        this.clearAllSitesBtn = document.getElementById('clearAllSitesBtn');
        // Stats elements
        this.totalSites = document.getElementById('totalSites');
        this.totalMessages = document.getElementById('totalMessages');
        this.activeSites = document.getElementById('activeSites');
        // About elements
        this.exportDataBtn = document.getElementById('exportDataBtn');
        this.importDataBtn = document.getElementById('importDataBtn');
        this.resetAllBtn = document.getElementById('resetAllBtn');
        this.fileInput = document.getElementById('fileInput');
        // UI elements
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.notification = document.getElementById('notification');
        this.notificationText = document.getElementById('notificationText');
        this.closeNotificationBtn = document.getElementById('closeNotificationBtn');
    }

    bindEvents() {
        // Role selection event
        this.roleSelect.addEventListener('change', () => this.saveUserRole());
        // Sites events
        this.refreshSitesBtn.addEventListener('click', () => this.loadSites());
        this.clearAllSitesBtn.addEventListener('click', () => this.clearAllSites());
        // About events
        this.exportDataBtn.addEventListener('click', () => this.exportData());
        this.importDataBtn.addEventListener('click', () => this.fileInput.click());
        this.resetAllBtn.addEventListener('click', () => this.resetAll());
        this.fileInput.addEventListener('change', () => this.importData());
        // Notification events
        this.closeNotificationBtn.addEventListener('click', () => this.hideNotification());
    }

    async initialize() {
        try {
            await this.loadUserRole();
            await this.loadSites();
            await this.updateStats();
        } catch (error) {
            console.error('Error initializing settings:', error);
            this.showNotification('Failed to load settings', 'error');
        }
    }

    async loadUserRole() {
        const role = await this.storageManager.getUserRole();
        this.roleSelect.value = role || 'default';
    }

    async saveUserRole() {
        const role = this.roleSelect.value;
        await this.storageManager.saveUserRole(role);
        this.showNotification('Role saved successfully', 'success');
    }

    async loadSites() {
        try {
            const sites = await this.storageManager.getAllSites();
            this.renderSitesList(sites);
        } catch (error) {
            console.error('Error loading sites:', error);
            this.showNotification('Failed to load site list', 'error');
        }
    }

    renderSitesList(sites) {
        const siteEntries = Object.entries(sites);
        
        if (siteEntries.length === 0) {
            this.sitesList.innerHTML = `
                <div class="empty-sites">
                    <h3>🌐 No Indexed Sites Yet</h3>
                    <p>Sites that are indexed will appear here</p>
                </div>
            `;
            return;
        }

        this.sitesList.innerHTML = siteEntries.map(([siteId, data]) => {
            const displayUrl = data.url ? this.getDisplayUrl(data.url) : (data.domain || siteId);
            return `
                <div class="site-item" data-site-id="${siteId}">
                    <div class="site-info">
                        <div class="site-domain">${displayUrl}</div>
                        <div class="site-meta">
                            ${data.last_indexed_at ? 
                                `Last indexed: ${this.formatDate(data.last_indexed_at)}` : 
                                'Never indexed'
                            }
                            ${data.chat_history ? ` • ${data.chat_history.length} messages` : ''}
                        </div>
                    </div>
                    <div class="site-status ${data.status}">${this.getStatusText(data.status)}</div>
                    <div class="site-actions">
                        <button class="site-action-btn reindex" onclick="settingsController.reindexSite('${siteId}', '${data.url || ''}', '${data.domain || ''}')" title="Reindex">
                            🔄
                        </button>
                        <button class="site-action-btn delete" onclick="settingsController.deleteSite('${siteId}')" title="Delete">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async deleteSite(siteId) {
        const sites = await this.storageManager.getAllSites();
        const siteData = sites[siteId];
        const displayName = siteData?.url ? this.getDisplayUrl(siteData.url) : (siteData?.domain || siteId);
        
        if (confirm(`Are you sure you want to delete data for site "${displayName}"?`)) {
            try {
                const success = await this.storageManager.deleteSite(siteId);
                if (success) {
                    this.showNotification(`Site ${displayName} deleted successfully`, 'success');
                    await this.loadSites();
                    await this.updateStats();
                } else {
                    this.showNotification('Failed to delete site', 'error');
                }
            } catch (error) {
                console.error('Error deleting site:', error);
                this.showNotification('Error occurred while deleting', 'error');
            }
        }
    }

    async reindexSite(siteId, url, domain) {
        const displayName = url ? this.getDisplayUrl(url) : (domain || siteId);
        
        if (confirm(`Are you sure you want to re-index site "${displayName}"? Chat history will be preserved.`)) {
            try {
                // Update status menjadi indexing
                await this.storageManager.updateSiteStatus(siteId, 'indexing');
                
                // Kirim pesan ke background script
                chrome.runtime.sendMessage({
                    action: 'startIndexing',
                    siteId: siteId,
                    url: url,
                    domain: domain
                });
                
                this.showNotification(`Starting re-indexing for ${displayName}`, 'info');
                await this.loadSites();
                
            } catch (error) {
                console.error('Error reindexing site:', error);
                this.showNotification('Failed to start re-indexing', 'error');
            }
        }
    }

    async clearAllSites() {
        if (confirm('Are you sure you want to delete ALL site data? This action cannot be undone.')) {
            try {
                this.showLoading();
                
                const sites = await this.storageManager.getAllSites();
                for (const siteId of Object.keys(sites)) {
                    await this.storageManager.deleteSite(siteId);
                }
                
                this.showNotification('All site data deleted successfully', 'success');
                await this.loadSites();
                await this.updateStats();
                
            } catch (error) {
                console.error('Error clearing all sites:', error);
                this.showNotification('Failed to delete site data', 'error');
            } finally {
                this.hideLoading();
            }
        }
    }

    async updateStats() {
        try {
            const sites = await this.storageManager.getAllSites();
            const siteEntries = Object.entries(sites);
            
            let totalMessages = 0;
            let activeSites = 0;
            
            siteEntries.forEach(([siteId, data]) => {
                if (data.chat_history) {
                    totalMessages += data.chat_history.length;
                }
                if (data.status === 'completed' || data.status === 'ready') {
                    activeSites++;
                }
            });
            
            this.totalSites.textContent = siteEntries.length;
            this.totalMessages.textContent = totalMessages;
            this.activeSites.textContent = activeSites;
            
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    async exportData() {
        try {
            this.showLoading();
            
            const data = {
                user_api_key: 'sk-bb1b4da1bdb4c57fdfb39c60d9a99a0b6dfa81cca40895175b5da9bc63c12c58', // Hardcoded for export
                sites: await this.storageManager.getAllSites(),
                exported_at: new Date().toISOString(),
                version: '1.0'
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `site-scout-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showNotification('Data exported successfully', 'success');
            
        } catch (error) {
            console.error('Error exporting data:', error);
                            this.showNotification('Failed to export data', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async importData() {
        const file = this.fileInput.files[0];
        if (!file) return;

        try {
            this.showLoading();
            
            const text = await file.text();
            const data = JSON.parse(text);
            
            // Validasi format data
            if (!data.sites || typeof data.sites !== 'object') {
                throw new Error('Invalid file format');
            }
            
            if (confirm('Are you sure you want to import data? Existing data will be overwritten.')) {
                // Import API key jika ada
                if (data.user_api_key) {
                    // await this.storageManager.saveApiKey(data.user_api_key); // Removed API key saving
                    // this.apiKeyInput.value = data.user_api_key; // Removed API key input update
                }
                
                // Import sites data
                if (data.sites) {
                    for (const [siteId, siteData] of Object.entries(data.sites)) {
                        await this.storageManager.createSiteEntry(
                            siteId, 
                            siteData.chat_id,
                            siteData.url,
                            siteData.domain
                        );
                        // Update dengan data lengkap
                        const sites = await this.storageManager.getAllSites();
                        sites[siteId] = siteData;
                        await chrome.storage.local.set({ sites });
                    }
                }
                
                this.showNotification('Data imported successfully', 'success');
                await this.initialize();
            }
            
        } catch (error) {
            console.error('Error importing data:', error);
                            this.showNotification('Failed to import data: ' + error.message, 'error');
        } finally {
            this.hideLoading();
            this.fileInput.value = '';
        }
    }

    async resetAll() {
        if (confirm('Are you sure you want to reset ALL application data? This action cannot be undone.')) {
                            if (confirm('Confirm once more: ALL data will be lost!')) {
                try {
                    this.showLoading();
                    
                    await this.storageManager.clearAllData();
                    
                    // Reset UI
                    // this.apiKeyInput.value = ''; // Removed API key input reset
                    // this.hideApiKeyStatus(); // Removed API key status hide
                    // this.testApiKeyBtn.disabled = true; // Removed API key test button disable
                    
                    this.showNotification('All application data reset successfully', 'success');
                    await this.initialize();
                    
                } catch (error) {
                    console.error('Error resetting all data:', error);
                    this.showNotification('Failed to reset data', 'error');
                } finally {
                    this.hideLoading();
                }
            }
        }
    }

    // UI Helper Methods
    showApiKeyStatus(message, type) {
        // this.apiKeyStatus.textContent = message; // Removed API key status update
        // this.apiKeyStatus.className = `status-message ${type}`; // Removed API key status update
        // this.apiKeyStatus.classList.remove('hidden'); // Removed API key status update
    }

    hideApiKeyStatus() {
        // this.apiKeyStatus.classList.add('hidden'); // Removed API key status update
    }

    showLoading() {
        this.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }

    showNotification(message, type = 'info') {
        this.notificationText.textContent = message;
        this.notification.className = `notification ${type}`;
        this.notification.classList.remove('hidden');
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            this.hideNotification();
        }, 5000);
    }

    hideNotification() {
        this.notification.classList.add('hidden');
    }

    // Utility Methods
    getStatusText(status) {
        const statusMap = {
            'idle': 'Not Indexed',
            'indexing': 'Indexing',
            'completed': 'Ready',
            'ready': 'Ready Chat',
            'error': 'Error'
        };
        return statusMap[status] || status;
    }

    getDisplayUrl(url) {
        try {
            const urlObj = new URL(url);
            // For GitHub URLs, display more descriptive path
            if (urlObj.hostname === 'github.com') {
                const pathParts = urlObj.pathname.split('/').filter(p => p);
                if (pathParts.length >= 2) {
                    return `${urlObj.hostname}/${pathParts[0]}/${pathParts[1]}`;
                }
            }
            
            // For other URLs, display hostname + first path
            const pathParts = urlObj.pathname.split('/').filter(p => p);
            if (pathParts.length > 0 && pathParts[0] !== '') {
                return `${urlObj.hostname}/${pathParts[0]}`;
            }
            
            return urlObj.hostname;
        } catch (error) {
            console.error('Error getting display URL:', error);
            return url;
        }
    }

    formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

        // Global variable for access from onclick handlers
let settingsController;

// Inisialisasi settings saat DOM ready
document.addEventListener('DOMContentLoaded', () => {
    settingsController = new SettingsController();
});
