class StorageManager {
    constructor() {
        this.storage = chrome.storage.local;
    }

    async getApiKey() {
        try {
            const result = await this.storage.get('apiKey');
            return result.apiKey;
        } catch (error) {
            console.error('Error getting API key:', error);
            return null;
        }
    }

    async saveApiKey(apiKey) {
        try {
            await this.storage.set({ apiKey });
            return true;
        } catch (error) {
            console.error('Error saving API key:', error);
            return false;
        }
    }

    // Get all sites from storage
    async getAllSites() {
        try {
            const result = await this.storage.get(null); // Get all storage data
            const sites = {};
            
            // Filter for site entries (exclude apiKey and other non-site data)
            for (const [key, value] of Object.entries(result)) {
                if (key !== 'apiKey' && typeof value === 'object' && value.url) {
                    sites[key] = value;
                }
            }
            
            return sites;
        } catch (error) {
            console.error('Error getting all sites:', error);
            return {};
        }
    }

    // Delete a site by ID
    async deleteSite(siteId) {
        try {
            await this.storage.remove(siteId);
            return true;
        } catch (error) {
            console.error('Error deleting site:', error);
            return false;
        }
    }

    // Clear all data from storage
    async clearAllData() {
        try {
            await this.storage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing all data:', error);
            return false;
        }
    }

    async createSiteEntry(siteId, chatId, url, domain) {
        try {
            const siteData = {
                chat_id: chatId,
                url: url,
                domain: domain,
                created_at: new Date().toISOString(),
                status: 'ready',
                chat_history: []
            };

            await this.storage.set({ [siteId]: siteData });
            return true;
        } catch (error) {
            console.error('Error creating site entry:', error);
            return false;
        }
    }

    async getSiteData(siteId) {
        try {
            const result = await this.storage.get(siteId);
            return result[siteId];
        } catch (error) {
            console.error('Error getting site data:', error);
            return null;
        }
    }

    async updateSiteData(siteId, newData) {
        try {
            const currentData = await this.getSiteData(siteId);
            if (!currentData) {
                throw new Error('Site data not found');
            }

            const updatedData = { ...currentData, ...newData };
            await this.storage.set({ [siteId]: updatedData });
            return true;
        } catch (error) {
            console.error('Error updating site data:', error);
            return false;
        }
    }

    async updateSiteStatus(siteId, status) {
        return this.updateSiteData(siteId, { status });
    }

    async addMessageToHistory(siteId, message) {
        try {
            const currentData = await this.getSiteData(siteId);
            if (!currentData) {
                throw new Error('Site data not found');
            }

            const chatHistory = currentData.chat_history || [];
            chatHistory.push(message);

            return this.updateSiteData(siteId, { chat_history: chatHistory });
        } catch (error) {
            console.error('Error adding message to history:', error);
            return false;
        }
    }

    async clearHistory(siteId) {
        return this.updateSiteData(siteId, { chat_history: [] });
    }

    async getUserRole() {
        try {
            const result = await this.storage.get('userRole');
            return result.userRole || 'default';
        } catch (error) {
            console.error('Error getting user role:', error);
            return 'default';
        }
    }

    async saveUserRole(role) {
        try {
            await this.storage.set({ userRole: role });
            return true;
        } catch (error) {
            console.error('Error saving user role:', error);
            return false;
        }
    }
}
