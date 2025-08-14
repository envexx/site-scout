/**
 * Background Script (Service Worker) - Site Scout
 * Manages background tasks like site indexing and API communication
 */

// Import storage manager untuk komunikasi dengan chrome.storage
importScripts('../lib/storage_manager.js', '../lib/api_handler.js');

class BackgroundController {
    constructor() {
        this.storageManager = new StorageManager();
        this.activeIndexing = new Map(); // Track ongoing indexing
        
        this.initialize();
    }

    initialize() {
        // Listen for messages from popup and content scripts
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Akan mengirim response secara asinkron
        });

        // Listen untuk instalasi ekstensi
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });

        // Listen untuk startup browser
        chrome.runtime.onStartup.addListener(() => {
            this.handleStartup();
        });

        console.log('Site Scout Background Script initialized');
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'startIndexing':
                    await this.startSiteIndexing(request.siteId, request.url, request.domain);
                    sendResponse({ success: true });
                    break;

                case 'getIndexingStatus':
                    const status = await this.getIndexingStatus(request.siteId || request.domain);
                    sendResponse({ status });
                    break;

                case 'cancelIndexing':
                    await this.cancelIndexing(request.siteId || request.domain);
                    sendResponse({ success: true });
                    break;

                case 'ping':
                    sendResponse({ success: true, timestamp: Date.now() });
                    break;

                default:
                    sendResponse({ error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ error: error.message });
        }
    }

    handleInstallation(details) {
        if (details.reason === 'install') {
            console.log('Site Scout installed for the first time');
            // Can add initial setup if needed
            this.showWelcomeNotification();
        } else if (details.reason === 'update') {
            console.log('Site Scout updated to version', chrome.runtime.getManifest().version);
        }
    }

    handleStartup() {
        console.log('Site Scout background script started');
        // Resume any interrupted indexing
        this.resumeInterruptedIndexing();
    }

    async startSiteIndexing(siteId, url, domain) {
        try {
            console.log(`Starting indexing for site: ${url} (ID: ${siteId})`);

            // Check if there is already an indexing running for this site
            if (this.activeIndexing.has(siteId)) {
                throw new Error('Indexing is already running for this site');
            }

            // Dapatkan API key
            const apiKey = await this.storageManager.getApiKey();
            if (!apiKey) {
                throw new Error('API key not found. Please set it in settings.');
            }

            // Buat API handler
            const apiHandler = new ApiHandler(apiKey);

            // Langkah 1: Buat chat thread
            console.log('Creating chat thread...');
            const chatId = await apiHandler.createChatThread();
            
            if (!chatId) {
                throw new Error('Failed to create chat thread');
            }

            // Langkah 2: Simpan data awal ke storage
            await this.storageManager.createSiteEntry(siteId, chatId, url, domain);
            
            // Langkah 3: Tandai sebagai aktif
            this.activeIndexing.set(siteId, {
                chatId,
                url,
                domain,
                startTime: Date.now(),
                apiHandler
            });

            // Langkah 4: Kirim introduction message
            console.log('Sending introduction message...');
            await this.sendIndexingCommand(siteId, url, chatId, apiHandler);

            // Langkah 5: Set status ready karena tidak perlu indexing
            await this.storageManager.updateSiteStatus(siteId, 'ready');
            this.activeIndexing.delete(siteId);

        } catch (error) {
            console.error('Error starting indexing:', error);
            
            // Update status menjadi error
            await this.storageManager.updateSiteStatus(siteId, 'error');
            
            // Hapus dari tracking aktif
            this.activeIndexing.delete(siteId);
            
            throw error;
        }
    }

    async sendIndexingCommand(siteId, url, chatId, apiHandler) {
        try {
            // Untuk direct chat flow, kita tidak perlu melakukan indexing di awal
            // Cukup membuat introduction message untuk memperkenalkan URL context
            const introMessage = `Hi! I'm viewing the page: ${url}. I'm ready to answer questions about the content on this page. Feel free to ask anything!`;
            
            const response = await apiHandler.sendMessage(chatId, introMessage);
            console.log('Introduction message sent, response:', response);
            
            // Simpan introduction ke history
            await this.storageManager.addMessageToHistory(siteId, {
                author: 'system',
                text: `Chat session started for: ${url}`,
                timestamp: new Date().toISOString()
            });

            await this.storageManager.addMessageToHistory(siteId, {
                author: 'agent',
                text: response,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error sending introduction message:', error);
            throw error;
        }
    }

    async monitorIndexingProgress(siteId) {
        const monitoring = this.activeIndexing.get(siteId);
        if (!monitoring) return;

        const { chatId, apiHandler, startTime } = monitoring;
        const maxDuration = 15 * 60 * 1000; // 15 menit timeout
        
        const checkProgress = async () => {
            try {
                // Check if it has timed out
                if (Date.now() - startTime > maxDuration) {
                    console.log(`Indexing timeout for ${siteId}`);
                    await this.storageManager.updateSiteStatus(siteId, 'error');
                    this.activeIndexing.delete(siteId);
                    return;
                }

                // Check status from API or other indicators
                // For now, we'll use a simple approach
                // by checking if there's a response indicating completion
                
                // Simple polling - in a real implementation, might need
                // a more sophisticated mechanism
                const currentStatus = await this.checkIndexingCompletion(siteId, chatId, apiHandler);
                
                if (currentStatus === 'completed') {
                    console.log(`Indexing completed for ${siteId}`);
                    await this.storageManager.updateSiteStatus(siteId, 'completed');
                    const siteData = await this.storageManager.getSiteData(siteId);
                    this.activeIndexing.delete(siteId);
                    
                    // Send success notification
                    this.showCompletionNotification(siteData?.url || siteId);
                    return;
                }

                if (currentStatus === 'error') {
                    console.log(`Indexing failed for ${siteId}`);
                    await this.storageManager.updateSiteStatus(siteId, 'error');
                    this.activeIndexing.delete(siteId);
                    return;
                }

                // Continue monitoring if still in process
                setTimeout(checkProgress, 30000); // Check setiap 30 detik

            } catch (error) {
                console.error('Error monitoring progress:', error);
                await this.storageManager.updateSiteStatus(siteId, 'error');
                this.activeIndexing.delete(siteId);
            }
        };

        // Start monitoring
        setTimeout(checkProgress, 30000); // Check pertama setelah 30 detik
    }

    async checkIndexingCompletion(siteId, chatId, apiHandler) {
        try {
            // Simple implementation: send status check message
            const statusQuery = "Is the indexing complete?";
            const response = await apiHandler.sendMessage(chatId, statusQuery);
            
            // Simpan interaksi ini
            await this.storageManager.addMessageToHistory(siteId, {
                author: 'system',
                text: statusQuery,
                timestamp: new Date().toISOString()
            });

            await this.storageManager.addMessageToHistory(siteId, {
                author: 'agent', 
                text: response,
                timestamp: new Date().toISOString()
            });

            // Analisis response untuk menentukan status
            const lowerResponse = response.toLowerCase();
            
            if (lowerResponse.includes('pengindeksan selesai') || 
                lowerResponse.includes('indexing completed') ||
                lowerResponse.includes('crawling completed')) {
                return 'completed';
            }

            if (lowerResponse.includes('error') || 
                lowerResponse.includes('gagal') ||
                lowerResponse.includes('failed')) {
                return 'error';
            }

            return 'indexing'; // Still in process

        } catch (error) {
            console.error('Error checking completion:', error);
            return 'error';
        }
    }

    async getIndexingStatus(siteId) {
        const siteData = await this.storageManager.getSiteData(siteId);
        const isActive = this.activeIndexing.has(siteId);
        
        return {
            status: siteData?.status || 'idle',
            isActive,
            lastIndexed: siteData?.last_indexed_at || null
        };
    }

    async cancelIndexing(siteId) {
        console.log(`Cancelling indexing for ${siteId}`);
        
        this.activeIndexing.delete(siteId);
        await this.storageManager.updateSiteStatus(siteId, 'idle');
    }

    async resumeInterruptedIndexing() {
        try {
            // Periksa situs yang statusnya 'indexing' saat startup
            const sites = await this.storageManager.getAllSites();
            
            for (const [siteId, siteData] of Object.entries(sites)) {
                if (siteData.status === 'indexing') {
                    console.log(`Resuming interrupted indexing for ${siteId}`);
                    
                    // Reset status atau lanjutkan tergantung kebutuhan
                    // Untuk sederhananya, kita reset ke idle
                    await this.storageManager.updateSiteStatus(siteId, 'idle');
                }
            }
        } catch (error) {
            console.error('Error resuming interrupted indexing:', error);
        }
    }

    showWelcomeNotification() {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: '/icons/logo.png',
            title: 'Site Scout Installed!',
            message: 'Click the extension icon to start indexing websites.'
        });
    }

    showCompletionNotification(url) {
        const displayUrl = url.length > 50 ? url.substring(0, 50) + '...' : url;
        chrome.notifications.create({
            type: 'basic',
            iconUrl: '/icons/logo.png', 
            title: 'Indexing Complete!',
            message: `${displayUrl} has been indexed and is ready for questions.`
        });
    }

    // Utility method untuk logging dengan timestamp
    log(message, ...args) {
        console.log(`[${new Date().toISOString()}] ${message}`, ...args);
    }
}

// Inisialisasi background controller
const backgroundController = new BackgroundController();
