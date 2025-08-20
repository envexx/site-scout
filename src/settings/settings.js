/**
 * Settings Script - Logic for Site Scout settings page
 * Manages API key, site list, and application settings
 */

class SettingsController {
    constructor() {
        console.log('🚀 Initializing SettingsController...');
        try {
            this.storageManager = new StorageManager();
            this.apiHandler = new ApiHandler('sk-bb1b4da1bdb4c57fdfb39c60d9a99ab6dfa81cca40895175b5da9bc63c12c58');
            // Inisialisasi elemen selain API key
            this.initializeElements();
            this.bindEvents();
            this.initialize();
            console.log('✅ SettingsController initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing SettingsController:', error);
        }
    }

    initializeElements() {
        console.log('🔍 Initializing elements...');
        try {
            // Role selection
            this.roleSelect = document.getElementById('roleSelect');
            console.log('Role select:', this.roleSelect);
            
            // Sites elements
            this.sitesList = document.getElementById('sitesList');
            this.refreshSitesBtn = document.getElementById('refreshSitesBtn');
            this.clearAllSitesBtn = document.getElementById('clearAllSitesBtn');
            console.log('Sites elements:', { sitesList: this.sitesList, refreshBtn: this.refreshSitesBtn, clearBtn: this.clearAllSitesBtn });
            
            // Site management elements
            this.reindexBtn = document.getElementById('reindexBtn');
            this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
            console.log('Site management elements:', { reindexBtn: this.reindexBtn, clearHistoryBtn: this.clearHistoryBtn });
            
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
            
            console.log('✅ All elements initialized');
        } catch (error) {
            console.error('❌ Error initializing elements:', error);
        }
    }

    bindEvents() {
        console.log('🔗 Binding events...');
        try {
            // Role selection event
            if (this.roleSelect) {
                this.roleSelect.addEventListener('change', () => this.saveUserRole());
                console.log('✅ Role select event bound');
            }
            
            // Sites events
            if (this.refreshSitesBtn) {
                this.refreshSitesBtn.addEventListener('click', () => this.loadSites());
                console.log('✅ Refresh sites event bound');
            }
            
            if (this.clearAllSitesBtn) {
                this.clearAllSitesBtn.addEventListener('click', () => this.clearAllSites());
                console.log('✅ Clear all sites event bound');
            }
            
            // Site management events
            if (this.reindexBtn) {
                this.reindexBtn.addEventListener('click', () => {
                    console.log('🔄 Reindex button clicked!');
                    this.reindexCurrentSite();
                });
                console.log('✅ Reindex event bound');
            } else {
                console.error('❌ Reindex button not found!');
            }
            
            if (this.clearHistoryBtn) {
                this.clearHistoryBtn.addEventListener('click', () => {
                    console.log('🗑️ Clear history button clicked!');
                    this.clearChatHistory();
                });
                console.log('✅ Clear history event bound');
            } else {
                console.error('❌ Clear history button not found!');
            }
            
            // About events
            if (this.exportDataBtn) {
                this.exportDataBtn.addEventListener('click', () => this.exportData());
                console.log('✅ Export data event bound');
            }
            
            if (this.importDataBtn) {
                this.importDataBtn.addEventListener('click', () => this.fileInput.click());
                console.log('✅ Import data event bound');
            }
            
            if (this.resetAllBtn) {
                this.resetAllBtn.addEventListener('click', () => this.resetAll());
                console.log('✅ Reset all event bound');
            }
            
            if (this.fileInput) {
                this.fileInput.addEventListener('change', () => this.importData());
                console.log('✅ File input event bound');
            }
            
            // Notification events
            if (this.closeNotificationBtn) {
                this.closeNotificationBtn.addEventListener('click', () => this.hideNotification());
                console.log('✅ Close notification event bound');
            }
            
            // Ensure scrolling works properly
            this.enableScrolling();
            
            console.log('✅ All events bound successfully');
        } catch (error) {
            console.error('❌ Error binding events:', error);
        }
    }

    enableScrolling() {
        // Prevent any JavaScript from blocking scrolling
        document.addEventListener('wheel', (e) => {
            e.stopPropagation();
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        }, { passive: true });
        
        // Ensure body can scroll
        document.body.style.overflow = 'auto';
        document.body.style.overflowX = 'hidden';
        document.body.style.overflowY = 'auto';
        
        // Remove any potential CSS that might block scrolling
        document.documentElement.style.overflow = 'auto';
        document.documentElement.style.overflowX = 'hidden';
        document.documentElement.style.overflowY = 'auto';
    }

    async initialize() {
        try {
            console.log('🚀 Starting initialization...');
            await this.loadUserRole();
            await this.loadSites();
            await this.updateStats();
            console.log('✅ Initialization completed');
        } catch (error) {
            console.error('❌ Error initializing settings:', error);
            this.showNotification('Failed to load settings', 'error');
        }
    }

    async loadUserRole() {
        try {
            const role = await this.storageManager.getUserRole();
            if (this.roleSelect) {
                this.roleSelect.value = role || 'default';
                console.log('✅ User role loaded:', role);
            }
        } catch (error) {
            console.error('❌ Error loading user role:', error);
        }
    }

    async saveUserRole() {
        try {
            const role = this.roleSelect.value;
            await this.storageManager.saveUserRole(role);
            this.showNotification('Role saved successfully', 'success');
            console.log('✅ User role saved:', role);
        } catch (error) {
            console.error('❌ Error saving user role:', error);
            this.showNotification('Failed to save role', 'error');
        }
    }

    async loadSites() {
        try {
            const sites = await this.storageManager.getAllSites();
            this.renderSitesList(sites);
            console.log('✅ Sites loaded:', Object.keys(sites).length);
        } catch (error) {
            console.error('❌ Error loading sites:', error);
            this.showNotification('Failed to load site list', 'error');
        }
    }

    renderSitesList(sites) {
        try {
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
            
            console.log('✅ Sites list rendered');
        } catch (error) {
            console.error('❌ Error rendering sites list:', error);
        }
    }

    async deleteSite(siteId) {
        try {
            const sites = await this.storageManager.getAllSites();
            const siteData = sites[siteId];
            const displayName = siteData?.url ? this.getDisplayUrl(siteData.url) : (siteData?.domain || siteId);
            
            if (confirm(`Are you sure you want to delete data for site "${displayName}"?`)) {
                const success = await this.storageManager.deleteSite(siteId);
                if (success) {
                    this.showNotification(`Site ${displayName} deleted successfully`, 'success');
                    await this.loadSites();
                    await this.updateStats();
                } else {
                    this.showNotification('Failed to delete site', 'error');
                }
            }
        } catch (error) {
            console.error('❌ Error deleting site:', error);
            this.showNotification('Error occurred while deleting', 'error');
        }
    }

    async reindexSite(siteId, url, domain) {
        try {
            const displayName = url ? this.getDisplayUrl(url) : (domain || siteId);
            
            if (confirm(`Are you sure you want to re-index site "${displayName}"? Chat history will be preserved.`)) {
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
            }
        } catch (error) {
            console.error('❌ Error reindexing site:', error);
            this.showNotification('Failed to start re-indexing', 'error');
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
                console.error('❌ Error clearing all sites:', error);
                this.showNotification('Failed to delete site data', 'error');
            } finally {
                this.hideLoading();
            }
        }
    }

    async reindexCurrentSite() {
        try {
            console.log('🔄 Starting reindexCurrentSite...');
            this.showLoading();
            this.showNotification('Re-analyzing current site...', 'info');
            
            // Get current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('Current tab:', tab);
            
            if (tab && tab.url) {
                // Create new chat session for re-indexing
                const chatId = await this.apiHandler.createChatThread();
                const siteId = this.createSiteIdentifier(tab.url);
                
                // Update storage with new chat session
                await this.storageManager.createSiteEntry(siteId, chatId, tab.url, new URL(tab.url).hostname);
                
                this.showNotification('Site re-analyzed successfully!', 'success');
                
                // Close settings and return to popup
                setTimeout(() => {
                    window.close();
                }, 1500);
            } else {
                this.showNotification('No active tab found', 'error');
            }
        } catch (error) {
            console.error('❌ Error reindexing site:', error);
            this.showNotification('Failed to re-analyze site', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async clearChatHistory() {
        try {
            console.log('🗑️ Starting clearChatHistory...');
            this.showLoading();
            
            // Get current active tab
            const tab = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('Current tab for clear history:', tab);
            
            if (tab && tab[0] && tab[0].url) {
                const siteId = this.createSiteIdentifier(tab[0].url);
                const siteData = await this.storageManager.getSiteData(siteId);
                
                if (siteData) {
                    siteData.chat_history = [];
                    await this.storageManager.createSiteEntry(siteId, siteData.chat_id, tab[0].url, new URL(tab[0].url).hostname);
                    this.showNotification('Chat history cleared successfully', 'success');
                } else {
                    this.showNotification('No site data found for current page', 'info');
                }
            } else {
                this.showNotification('No active tab found', 'error');
            }
        } catch (error) {
            console.error('❌ Error clearing chat history:', error);
            this.showNotification('Failed to clear chat history', 'error');
        } finally {
            this.hideLoading();
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
            
            if (this.totalSites) this.totalSites.textContent = siteEntries.length;
            if (this.totalMessages) this.totalMessages.textContent = totalMessages;
            if (this.activeSites) this.activeSites.textContent = activeSites;
            
            console.log('✅ Stats updated');
        } catch (error) {
            console.error('❌ Error updating stats:', error);
        }
    }

    async exportData() {
        try {
            this.showLoading();
            
            const data = {
                user_api_key: 'sk-bb1b4da1bdb4c57fdfb39c60d9a99a6dfa81cca40895175b5da9bc63c12c58', // Hardcoded for export
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
            console.error('❌ Error exporting data:', error);
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
            console.error('❌ Error importing data:', error);
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
                    
                    this.showNotification('All application data reset successfully', 'success');
                    await this.initialize();
                    
                } catch (error) {
                    console.error('❌ Error resetting all data:', error);
                    this.showNotification('Failed to reset data', 'error');
                } finally {
                    this.hideLoading();
                }
            }
        }
    }

    // UI Helper Methods
    showApiKeyStatus(message, type) {
        // Removed API key status update
    }

    hideApiKeyStatus() {
        // Removed API key status hide
    }

    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('hidden');
        }
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('hidden');
        }
    }

    showNotification(message, type = 'info') {
        try {
            if (this.notificationText && this.notification) {
                this.notificationText.textContent = message;
                this.notification.className = `notification ${type}`;
                this.notification.classList.remove('hidden');
                
                // Auto hide after 5 seconds
                setTimeout(() => {
                    this.hideNotification();
                }, 5000);
                
                console.log('✅ Notification shown:', message, type);
            }
        } catch (error) {
            console.error('❌ Error showing notification:', error);
        }
    }

    hideNotification() {
        if (this.notification) {
            this.notification.classList.add('hidden');
        }
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
            console.error('❌ Error getting display URL:', error);
            return url;
        }
    }

    formatDate(isoString) {
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('❌ Error formatting date:', error);
            return isoString;
        }
    }

    createSiteIdentifier(url) {
        // Create unique identifier based on complete URL
        // Remove query parameters and fragment for normalization
        try {
            const urlObj = new URL(url);
            const cleanUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
            return btoa(cleanUrl).replace(/[/+=]/g, '_'); // Base64 encode dan buat filesystem-safe
        } catch (error) {
            console.error('❌ Error creating site identifier:', error);
            return btoa(url).replace(/[/+=]/g, '_');
        }
    }
}

// Global variable for access from onclick handlers
let settingsController;

// Inisialisasi settings saat DOM ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 DOM Content Loaded - Starting settings initialization...');
    try {
        settingsController = new SettingsController();
        console.log('✅ Settings controller created successfully');
    } catch (error) {
        console.error('❌ Error creating settings controller:', error);
    }
});

// Debug: Check if elements exist
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔍 Debug: Checking if elements exist...');
    const elements = [
        'roleSelect', 'sitesList', 'refreshSitesBtn', 'clearAllSitesBtn',
        'reindexBtn', 'clearHistoryBtn', 'totalSites', 'totalMessages',
        'activeSites', 'exportDataBtn', 'importDataBtn', 'resetAllBtn'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`${id}: ${element ? '✅ Found' : '❌ Not found'}`);
    });
});
