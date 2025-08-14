/**
 * Settings Script - Logika untuk halaman pengaturan Site Scout
 * Mengelola API key, daftar situs, dan pengaturan aplikasi
 */

class SettingsController {
    constructor() {
        this.storageManager = new StorageManager();
        this.apiHandler = null;
        
        this.initializeElements();
        this.bindEvents();
        this.initialize();
    }

    initializeElements() {
        // API Key elements
        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.toggleApiKeyBtn = document.getElementById('toggleApiKeyBtn');
        this.saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
        this.testApiKeyBtn = document.getElementById('testApiKeyBtn');
        this.apiKeyStatus = document.getElementById('apiKeyStatus');
        
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
        // API Key events
        this.toggleApiKeyBtn.addEventListener('click', () => this.toggleApiKeyVisibility());
        this.saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
        this.testApiKeyBtn.addEventListener('click', () => this.testApiKey());
        this.apiKeyInput.addEventListener('input', () => this.onApiKeyInput());
        
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
        
        // Keyboard events
        this.apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveApiKey();
            }
        });
    }

    async initialize() {
        try {
            await this.loadApiKey();
            await this.loadSites();
            await this.updateStats();
        } catch (error) {
            console.error('Error initializing settings:', error);
            this.showNotification('Gagal memuat pengaturan', 'error');
        }
    }

    async loadApiKey() {
        const apiKey = await this.storageManager.getApiKey();
        if (apiKey) {
            this.apiKeyInput.value = apiKey;
            this.testApiKeyBtn.disabled = false;
            this.apiHandler = new ApiHandler(apiKey);
            this.showApiKeyStatus('API Key tersimpan', 'success');
        }
    }

    onApiKeyInput() {
        const apiKey = this.apiKeyInput.value.trim();
        this.testApiKeyBtn.disabled = !apiKey;
        
        if (!apiKey) {
            this.hideApiKeyStatus();
        }
    }

    toggleApiKeyVisibility() {
        const isPassword = this.apiKeyInput.type === 'password';
        this.apiKeyInput.type = isPassword ? 'text' : 'password';
        this.toggleApiKeyBtn.textContent = isPassword ? '🙈' : '👁️';
    }

    async saveApiKey() {
        const apiKey = this.apiKeyInput.value.trim();
        
        if (!apiKey) {
            this.showApiKeyStatus('API Key tidak boleh kosong', 'error');
            return;
        }

        if (!apiKey.startsWith('sk-')) {
            this.showApiKeyStatus('Format API Key tidak valid (harus dimulai dengan sk-)', 'error');
            return;
        }

        try {
            this.showLoading();
            
            const success = await this.storageManager.saveApiKey(apiKey);
            if (success) {
                this.apiHandler = new ApiHandler(apiKey);
                this.testApiKeyBtn.disabled = false;
                this.showApiKeyStatus('API Key berhasil disimpan', 'success');
                this.showNotification('API Key berhasil disimpan', 'success');
            } else {
                this.showApiKeyStatus('Gagal menyimpan API Key', 'error');
            }
        } catch (error) {
            console.error('Error saving API key:', error);
            this.showApiKeyStatus('Terjadi kesalahan saat menyimpan', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async testApiKey() {
        if (!this.apiHandler) {
            this.showApiKeyStatus('Simpan API Key terlebih dahulu', 'error');
            return;
        }

        try {
            this.showLoading();
            this.showApiKeyStatus('Menguji koneksi...', 'info');
            
            const isValid = await this.apiHandler.validateApiKey();
            
            if (isValid) {
                this.showApiKeyStatus('✅ API Key valid dan terhubung', 'success');
                this.showNotification('API Key berhasil divalidasi', 'success');
            } else {
                this.showApiKeyStatus('❌ API Key tidak valid atau tidak dapat terhubung', 'error');
                this.showNotification('API Key tidak valid', 'error');
            }
        } catch (error) {
            console.error('Error testing API key:', error);
            this.showApiKeyStatus('❌ Gagal menguji koneksi', 'error');
            this.showNotification('Gagal menguji API Key', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadSites() {
        try {
            const sites = await this.storageManager.getAllSites();
            this.renderSitesList(sites);
        } catch (error) {
            console.error('Error loading sites:', error);
            this.showNotification('Gagal memuat daftar situs', 'error');
        }
    }

    renderSitesList(sites) {
        const siteEntries = Object.entries(sites);
        
        if (siteEntries.length === 0) {
            this.sitesList.innerHTML = `
                <div class="empty-sites">
                    <h3>🌐 Belum Ada Situs</h3>
                    <p>Situs yang diindeks akan muncul di sini</p>
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
                                `Terakhir diindeks: ${this.formatDate(data.last_indexed_at)}` : 
                                'Belum pernah diindeks'
                            }
                            ${data.chat_history ? ` • ${data.chat_history.length} pesan` : ''}
                        </div>
                    </div>
                    <div class="site-status ${data.status}">${this.getStatusText(data.status)}</div>
                    <div class="site-actions">
                        <button class="site-action-btn reindex" onclick="settingsController.reindexSite('${siteId}', '${data.url || ''}', '${data.domain || ''}')" title="Indeks Ulang">
                            🔄
                        </button>
                        <button class="site-action-btn delete" onclick="settingsController.deleteSite('${siteId}')" title="Hapus">
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
        
        if (confirm(`Yakin ingin menghapus data untuk situs "${displayName}"?`)) {
            try {
                const success = await this.storageManager.deleteSite(siteId);
                if (success) {
                    this.showNotification(`Situs ${displayName} berhasil dihapus`, 'success');
                    await this.loadSites();
                    await this.updateStats();
                } else {
                    this.showNotification('Gagal menghapus situs', 'error');
                }
            } catch (error) {
                console.error('Error deleting site:', error);
                this.showNotification('Terjadi kesalahan saat menghapus', 'error');
            }
        }
    }

    async reindexSite(siteId, url, domain) {
        const displayName = url ? this.getDisplayUrl(url) : (domain || siteId);
        
        if (confirm(`Yakin ingin mengindeks ulang situs "${displayName}"? Riwayat chat akan tetap tersimpan.`)) {
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
                
                this.showNotification(`Memulai pengindeksan ulang untuk ${displayName}`, 'info');
                await this.loadSites();
                
            } catch (error) {
                console.error('Error reindexing site:', error);
                this.showNotification('Gagal memulai pengindeksan ulang', 'error');
            }
        }
    }

    async clearAllSites() {
        if (confirm('Yakin ingin menghapus SEMUA data situs? Tindakan ini tidak dapat dibatalkan.')) {
            try {
                this.showLoading();
                
                const sites = await this.storageManager.getAllSites();
                for (const siteId of Object.keys(sites)) {
                    await this.storageManager.deleteSite(siteId);
                }
                
                this.showNotification('Semua data situs berhasil dihapus', 'success');
                await this.loadSites();
                await this.updateStats();
                
            } catch (error) {
                console.error('Error clearing all sites:', error);
                this.showNotification('Gagal menghapus data situs', 'error');
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
                user_api_key: await this.storageManager.getApiKey(),
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
            this.showNotification('Data berhasil diekspor', 'success');
            
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showNotification('Gagal mengekspor data', 'error');
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
                throw new Error('Format file tidak valid');
            }
            
            if (confirm('Yakin ingin mengimpor data? Data yang ada akan ditimpa.')) {
                // Import API key jika ada
                if (data.user_api_key) {
                    await this.storageManager.saveApiKey(data.user_api_key);
                    this.apiKeyInput.value = data.user_api_key;
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
                
                this.showNotification('Data berhasil diimpor', 'success');
                await this.initialize();
            }
            
        } catch (error) {
            console.error('Error importing data:', error);
            this.showNotification('Gagal mengimpor data: ' + error.message, 'error');
        } finally {
            this.hideLoading();
            this.fileInput.value = '';
        }
    }

    async resetAll() {
        if (confirm('Yakin ingin mereset SEMUA data aplikasi? Tindakan ini tidak dapat dibatalkan.')) {
            if (confirm('Konfirmasi sekali lagi: SEMUA data akan hilang!')) {
                try {
                    this.showLoading();
                    
                    await this.storageManager.clearAllData();
                    
                    // Reset UI
                    this.apiKeyInput.value = '';
                    this.hideApiKeyStatus();
                    this.testApiKeyBtn.disabled = true;
                    
                    this.showNotification('Semua data berhasil direset', 'success');
                    await this.initialize();
                    
                } catch (error) {
                    console.error('Error resetting all data:', error);
                    this.showNotification('Gagal mereset data', 'error');
                } finally {
                    this.hideLoading();
                }
            }
        }
    }

    // UI Helper Methods
    showApiKeyStatus(message, type) {
        this.apiKeyStatus.textContent = message;
        this.apiKeyStatus.className = `status-message ${type}`;
        this.apiKeyStatus.classList.remove('hidden');
    }

    hideApiKeyStatus() {
        this.apiKeyStatus.classList.add('hidden');
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
            'idle': 'Belum Diindeks',
            'indexing': 'Sedang Diindeks',
            'completed': 'Siap',
            'ready': 'Siap Chat',
            'error': 'Error'
        };
        return statusMap[status] || status;
    }

    getDisplayUrl(url) {
        try {
            const urlObj = new URL(url);
            // Untuk URL GitHub, tampilkan path yang lebih deskriptif
            if (urlObj.hostname === 'github.com') {
                const pathParts = urlObj.pathname.split('/').filter(p => p);
                if (pathParts.length >= 2) {
                    return `${urlObj.hostname}/${pathParts[0]}/${pathParts[1]}`;
                }
            }
            
            // Untuk URL lain, tampilkan hostname + path pertama
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

// Global variable untuk akses dari onclick handlers
let settingsController;

// Inisialisasi settings saat DOM ready
document.addEventListener('DOMContentLoaded', () => {
    settingsController = new SettingsController();
});
