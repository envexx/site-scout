/**
 * Popup Script - Main logic for Site Scout popup interface
 * Manages user interaction and communication with background script
 */

class PopupController {
    constructor() {
        this.storageManager = new StorageManager();
        this.apiHandler = null;
        this.currentDomain = null;
        this.currentUrl = null;
        this.currentSiteId = null;
        this.currentSiteData = null;
        this.animationHidden = false; // Track if animation is already hidden
        
        this.initializeElements();
        this.bindEvents();
        this.initialize();
        
        // Global debug function for manual hide animation
        window.debugHideAnimation = () => {
            console.log('🎬 Debug: Force hiding animation manually');
            this.animationHidden = false; // Reset flag
            this.hideAnimationSafely('manual-debug');
        };
    }

    initializeElements() {
        // Views
        this.noApiKeyView = document.getElementById('noApiKeyView');
        this.mainView = document.getElementById('mainView');
        
        // Elements
        this.currentDomainEl = document.getElementById('currentDomain');
        this.siteStatusEl = document.getElementById('siteStatus');
        this.chatHistory = document.getElementById('chatHistory');
        this.questionInput = document.getElementById('questionInput');
        this.typingIndicator = document.getElementById('typingIndicator');
        
        // Controls
        this.idleControls = document.getElementById('idleControls');
        this.completedControls = document.getElementById('completedControls');
        this.errorControls = document.getElementById('errorControls');
        
        // Buttons
        this.settingsBtn = document.getElementById('settingsBtn');
        this.openSettingsBtn = document.getElementById('openSettingsBtn');
        this.indexSiteBtn = document.getElementById('indexSiteBtn');
        this.sendQuestionBtn = document.getElementById('sendQuestionBtn');
        this.reindexBtn = document.getElementById('reindexBtn');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.retryIndexBtn = document.getElementById('retryIndexBtn');
    }

    bindEvents() {
        // Settings buttons
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.openSettingsBtn.addEventListener('click', () => this.openSettings());
        
        // Main actions
        this.indexSiteBtn.addEventListener('click', () => this.startIndexing());
        this.sendQuestionBtn.addEventListener('click', () => this.sendQuestion());
        this.reindexBtn.addEventListener('click', () => this.triggerFreshAnalysis());
        this.clearHistoryBtn.addEventListener('click', () => this.clearChatHistory());
        this.retryIndexBtn.addEventListener('click', () => this.startIndexing());
        
        // Input events
        this.questionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendQuestion();
            }
        });
        
        this.questionInput.addEventListener('input', () => {
            this.autoResizeTextarea();
        });
    }

    async initialize() {
        try {
            console.log('🚀 Initializing popup...');
            
            // First check API key before anything else
            const apiKey = await this.storageManager.getApiKey();
            console.log('🔑 API Key found:', apiKey ? 'Yes' : 'No');
            
            if (!apiKey) {
                console.log('❌ No API key, showing setup view');
                this.showNoApiKeyView();
                // Hide any loading animations immediately for setup view
                this.hideAnimationSafely('no-api-key');
                return;
            }
            
            // Show main view immediately since we have an API key
            this.showMainView();
            
            // Get current URL
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url) {
                this.currentUrl = tab.url;
                this.currentDomain = new URL(tab.url).hostname;
                this.currentSiteId = this.createSiteIdentifier(tab.url);
                this.currentDomainEl.textContent = this.getDisplayUrl(tab.url);
                
                console.log('📍 Current URL:', this.currentUrl);
                console.log('🆔 Site ID:', this.currentSiteId);
            }
            
            this.apiHandler = new ApiHandler(apiKey);
            console.log('✅ API Handler created');
            
            // Implementasi Direct Chat Flow
            console.log('🔄 Initializing direct chat...');
            await this.initializeDirectChat();
            this.showMainView();
            console.log('✅ Popup initialization complete');
            
            // Fallback: Hide animation setelah maksimal 8 detik
            setTimeout(() => {
                this.hideAnimationSafely('fallback-timeout');
            }, 8000);
            
        } catch (error) {
            console.error('❌ Error initializing popup:', error);
            this.showError('Failed to load data. Please try again.');
            this.showControls('error');
            this.updateSiteStatus('error');
            
            // Hide animation on error
            setTimeout(() => {
                this.hideAnimationSafely('initialization-error');
            }, 2000);
        }
    }

    async initializeDirectChat() {
        if (!this.currentSiteId || !this.apiHandler) {
            console.error('Missing currentSiteId or apiHandler');
            this.showControls('error');
            return;
        }
        
        try {
            // Show initial loading state immediately
            this.showAnalysisProgress('Checking analysis status...', 5);
            
            // Cek apakah sudah ada chat session untuk URL ini
            this.currentSiteData = await this.storageManager.getSiteData(this.currentSiteId);
            console.log('📊 Current site data:', this.currentSiteData);
            
            // Advanced session validation untuk mencegah duplikasi analisis
            const sessionStatus = this.validateExistingSession();
            console.log('🔍 Session validation result:', sessionStatus);
            
            if (sessionStatus.isValid && sessionStatus.hasCompleteAnalysis) {
                console.log('⚡ Found valid cached session - loading immediately without animation');
                
                // Immediately load cached session without showing loading animation
                this.hideAnimationSafely('cached-session-found');
                this.updateUIForDirectChat();
                await this.loadChatHistory();
                
                // Show cache indicator in UI
                this.showCacheIndicator();
                
                return; // Exit early, no need for new analysis
            }
            
            if (sessionStatus.isValid && sessionStatus.hasPartialAnalysis) {
                console.log('🔄 Valid session found but analysis incomplete - resuming...');
                
                // Use existing session but check if we need to complete analysis
                this.updateUIForDirectChat();
                await this.loadChatHistory();
                this.hideAnimationSafely('incomplete-session-loaded');
                
                return;
            }
            
            if (sessionStatus.isValid && !sessionStatus.hasAnalysis) {
                console.log('🔄 Valid session found but no analysis - starting analysis...');
                
                // Update animation status
                if (window.updateAnimationStatus) {
                    window.updateAnimationStatus('Preparing analysis...');
                }
                
                // Use existing session for analysis
                this.showControls('indexing');
                this.updateSiteStatus('connecting');
                await this.requestInitialSummary(this.currentSiteData.chat_id);
                this.updateUIForDirectChat();
                
                return;
            }
            
            // No valid session - create new one
            console.log('🆕 Creating new session and starting analysis...');
            
            // Update animation status
            if (window.updateAnimationStatus) {
                window.updateAnimationStatus('Connecting to AI...');
            }
            
            // Show loading state
            this.showControls('indexing'); 
            this.updateSiteStatus('connecting');
            
            await this.createAndStartChat();
        } catch (error) {
            console.error('❌ Error in initializeDirectChat:', error);
            this.showControls('error');
            this.updateSiteStatus('error');
        }
    }

    /**
     * Advanced validation of existing session with detailed status
     */
    validateExistingSession() {
        const result = {
            isValid: false,
            hasAnalysis: false,
            hasCompleteAnalysis: false,
            hasPartialAnalysis: false,
            sessionAge: null,
            analysisQuality: 'none',
            duplicateCount: 0
        };

        if (!this.currentSiteData || !this.currentSiteData.chat_history) {
            return result;
        }

        result.isValid = true;
        result.sessionAge = Date.now() - new Date(this.currentSiteData.created_at || Date.now()).getTime();

        const chatHistory = this.currentSiteData.chat_history;
        
        // Look for auto-analysis messages for this specific URL
        const autoAnalysisMessages = chatHistory.filter(message => 
            message.author === 'system' && 
            message.text && 
            (message.text.includes('Auto-analysis started for:') || 
             message.text.includes('Auto-analysis dimulai untuk:')) &&
            message.text.includes(this.currentUrl)
        );

        // Look for agent analysis responses
        const analysisResponses = chatHistory.filter(message =>
            message.author === 'agent' &&
            message.text &&
            (message.text.includes('🎯 OVERVIEW:') || 
             message.text.includes('📝 KEY HIGHLIGHTS:') ||
             message.text.includes('💡 QUICK INSIGHTS:') ||
             message.text.includes('🎯 CONTENT ANALYSIS:') || 
             message.text.includes('📝 KEY POINTS:') ||
             message.text.includes('💡 INSIGHTS & RECOMMENDATIONS:') ||
             message.text.includes('🎯 ANALISIS KONTEN:') || 
             message.text.includes('📝 POIN PENTING:') ||
             message.text.includes('💡 INSIGHT & REKOMENDASI:'))
        );

        // Detect duplicates
        result.duplicateCount = autoAnalysisMessages.length;
        
        if (autoAnalysisMessages.length > 0) {
            result.hasAnalysis = true;
            
            if (analysisResponses.length > 0) {
                // Check quality of latest analysis
                const latestAnalysis = analysisResponses[analysisResponses.length - 1];
                const analysisText = latestAnalysis.text;
                
                // Quality check based on content completeness
                if (analysisText.includes('🎯') && analysisText.includes('📝') && analysisText.includes('💡')) {
                    if (analysisText.length > 200) { // Substantial content
                        result.hasCompleteAnalysis = true;
                        result.analysisQuality = 'complete';
                    } else {
                        result.hasPartialAnalysis = true;
                        result.analysisQuality = 'partial';
                    }
                } else {
                    result.hasPartialAnalysis = true;
                    result.analysisQuality = 'incomplete';
                }
            } else {
                result.hasPartialAnalysis = true;
                result.analysisQuality = 'no_response';
            }
        }

        console.log('🔍 Session validation:', {
            url: this.currentUrl,
            isValid: result.isValid,
            hasCompleteAnalysis: result.hasCompleteAnalysis,
            hasPartialAnalysis: result.hasPartialAnalysis,
            duplicateCount: result.duplicateCount,
            analysisQuality: result.analysisQuality,
            sessionAgeMinutes: Math.round(result.sessionAge / 60000),
            totalMessages: chatHistory.length
        });

        return result;
    }

    /**
     * Legacy function for backward compatibility
     */
    hasExistingAutoAnalysis() {
        const validation = this.validateExistingSession();
        return validation.hasCompleteAnalysis;
    }

    async createAndStartChat() {
        try {
            this.showControls('indexing'); // Tampilkan loading
            this.updateSiteStatus('connecting');
            
            // Buat chat session
            await this.createChatSession();
            
            // Update UI ke ready state
            this.updateUIForDirectChat();
            
        } catch (error) {
            console.error('Error creating chat session:', error);
            this.showControls('error');
            this.updateSiteStatus('error');
            this.showError('Failed to create chat session: ' + error.message);
        }
    }

    async createChatSession() {
        try {
            console.log('Creating direct chat session for:', this.currentUrl);
            
            // Buat chat thread baru
            const chatId = await this.apiHandler.createChatThread();
            
            if (!chatId) {
                throw new Error('Failed to create chat session');
            }
            
            // Simpan data chat session (status: ready untuk langsung chat)
            await this.storageManager.createSiteEntry(
                this.currentSiteId, 
                chatId, 
                this.currentUrl, 
                this.currentDomain
            );
            
            // Update status menjadi ready (siap untuk chat langsung)
            await this.storageManager.updateSiteStatus(this.currentSiteId, 'ready');
            
            // Load data yang baru dibuat
            this.currentSiteData = await this.storageManager.getSiteData(this.currentSiteId);
            
            console.log('✅ Chat session created, requesting initial summary...');
            
            // Minta ringkasan otomatis dari halaman
            await this.requestInitialSummary(chatId);
            
            console.log('✅ Initial summary requested successfully');
            
            // Reload data terbaru dari storage
            await this.loadSiteData();
            
        } catch (error) {
            console.error('Error creating chat session:', error);
            throw error;
        }
    }

    async requestInitialSummary(chatId, isRefresh = false) {
        try {
            this.isRefreshAnalysis = isRefresh;
            this.showControls('indexing');
            this.updateSiteStatus('analyzing');
            
            // Show analysis progress in chat with better messages
            this.updateAnalysisProgress('Connecting to Site Scout AI...', 15);
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.updateAnalysisProgress('Starting webpage analysis...', 30);
            
            // Create concise summary request with focused instructions and depth specification
            const summaryRequest = `As Site Scout AI, I will analyze the following webpage using the 'web_crawler.crawl_and_index_website' skill: ${this.currentUrl}

Crawling Parameters:
- Depth: 1 (main page only)
- Focus: Extract and analyze the main content of this specific page

Task: Provide a concise, focused summary in this format:

🎯 **OVERVIEW:**
- Type: [website category]
- Main Topic: [key subject in 1-2 sentences]
- Target Audience: [who this is for]

📝 **KEY HIGHLIGHTS:**
- [3-4 most important points, keep each point brief]

💡 **QUICK INSIGHTS:**
- [What users can learn/gain - 1-2 sentences]
- [Suggested follow-up questions - 1-2 examples]

Keep the entire summary under 150 words. Be concise, informative, and engaging. Focus on the most essential information that users need to know.`;

            // Step 2: Crawling with better progress messages
            this.updateAnalysisProgress('Gathering page information...', 40);
            await new Promise(resolve => setTimeout(resolve, 800));
            this.updateAnalysisProgress('Processing page content...', 60);
            
            // Kirim request summary ke API
            console.log('📤 Sending analysis request to API...');
            const summary = await this.apiHandler.sendMessage(chatId, summaryRequest);
            console.log('📥 Received summary from API:', summary.substring(0, 100) + '...');
            
            // Update progress before checking response
            this.updateAnalysisProgress('Compiling analysis results...', 80);
            
            // Check if response is an error (like insufficient credits, URL depth errors, etc.)
            if (summary.toLowerCase().includes('insufficient credits') || 
                summary.toLowerCase().includes('url depth error') ||
                summary.toLowerCase().includes('error occurred') ||
                summary.toLowerCase().includes('failed') ||
                summary.toLowerCase().includes('could you please confirm') ||
                summary.toLowerCase().includes('alternatively, i can provide')) {
                console.warn('⚠️ API returned error response, hiding animation early');
                
                // Handle URL depth error specifically
                if (summary.toLowerCase().includes('url depth error') || summary.toLowerCase().includes('could you please confirm')) {
                    console.log('🔍 Detected URL depth error, attempting fallback analysis...');
                    this.handleDepthErrorFallback(chatId, summary);
                    return;
                }
                
                setTimeout(() => {
                    this.hideAnimationSafely('api-error-response');
                }, 500);
            }
            
            // Update to completion
            this.updateAnalysisProgress('Analysis complete!', 100);
            
            // Brief delay to show completion
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Update status to ready
            console.log('✅ Setting status to ready...');
            this.updateSiteStatus('ready');
            
            // Update ke completed controls untuk menampilkan chat
            this.showControls('completed');
            
            // Hide animation after completion (only for initial analysis, not refresh)
            if (!this.isRefreshAnalysis) {
                setTimeout(() => {
                    this.hideAnimationSafely('analysis-complete');
                }, 1500);
            }
            
            // Save to storage with additional metadata
            console.log('💾 Saving system message to storage...');
            await this.storageManager.addMessageToHistory(this.currentSiteId, {
                author: 'system',
                text: `Auto-analysis started for: ${this.currentUrl}`,
                timestamp: new Date().toISOString(),
                metadata: { type: 'auto_analysis_start' }
            });
            
            console.log('💾 Saving agent summary to storage...');
            await this.storageManager.addMessageToHistory(this.currentSiteId, {
                author: 'agent',
                text: summary,
                timestamp: new Date().toISOString(),
                metadata: { type: 'initial_summary', url: this.currentUrl }
            });
            
            console.log('✅ Summary storage complete!');
            
            // PENTING: Reload data dari storage untuk memastikan data terbaru
            await this.loadSiteData();
            
            // Reset refresh flag
            this.isRefreshAnalysis = false;
            
        } catch (error) {
            console.error('Error requesting initial summary:', error);
            this.removeTempMessage();
            this.addMessageToChat('system', '⚠️ Unable to analyze this page right now. You can still ask questions about this page.');
            this.updateSiteStatus('ready'); // Stay ready even if analysis fails
            
            // Hide animation on error
            setTimeout(() => {
                this.hideAnimationSafely('analysis-error');
            }, 1000);
        }
    }

    removeTempMessage() {
        // Remove temporary loading message
        const messages = this.chatHistory.querySelectorAll('.chat-message.system');
        const lastSystemMessage = messages[messages.length - 1];
        if (lastSystemMessage && (
            lastSystemMessage.textContent.includes('🔍 Analyzing') ||
            lastSystemMessage.textContent.includes('🔍 Automatically analyzing')
        )) {
            console.log('🗑️ Removing temp loading message');
            lastSystemMessage.remove();
        }
    }

    async handleDepthErrorFallback(chatId, originalError) {
        try {
            console.log('🔄 Attempting fallback analysis with simplified crawling...');
            this.updateLoadingMessage('🔄 Retrying analysis...', 'Using simplified crawling method...', 50);
            
            // Create a simplified request that explicitly requests main page only
            const fallbackRequest = `I need to analyze this webpage: ${this.currentUrl}

Please use the 'web_crawler.crawl_and_index_website' skill with these specific parameters:
- URL: ${this.currentUrl}
- Depth: 1 (main page content only, no deep crawling)
- Mode: Extract main content and key information from this single page

Provide a brief summary in this format:

🎯 **OVERVIEW:**
- Type: [website category]
- Main Topic: [key subject in 1-2 sentences]
- Target Audience: [who this is for]

📝 **KEY HIGHLIGHTS:**
- [3-4 most important points from the page]

💡 **QUICK INSIGHTS:**
- [What users can learn from this page]
- [1-2 follow-up question examples]

Keep the summary under 150 words and focus on the main page content only.`;

            this.updateLoadingMessage('🧠 Processing fallback...', 'AI is analyzing page content...', 80);
            
            const fallbackSummary = await this.apiHandler.sendMessage(chatId, fallbackRequest);
            
            // Check if fallback also failed
            if (fallbackSummary.toLowerCase().includes('error') || 
                fallbackSummary.toLowerCase().includes('failed') ||
                fallbackSummary.toLowerCase().includes('could you please confirm')) {
                throw new Error('Fallback analysis also failed');
            }
            
            console.log('✅ Fallback analysis successful');
            this.updateLoadingMessage('✅ Finalizing analysis...', 'Preparing summary for you...', 95);
            
            // Process the successful fallback response
            setTimeout(() => {
                this.hideAnimationSafely('analysis-complete');
            }, 1500);
            
            // Add the summary to chat
            this.addMessageToChat('agent', fallbackSummary);
            this.updateSiteStatus('ready');
            
            this.updateLoadingMessage('🎉 Analysis complete!', 'Summary is ready...', 100);
            
            // Save to storage
            await this.storageManager.addMessageToHistory(this.currentSiteId, {
                author: 'system',
                text: `Auto-analysis started for: ${this.currentUrl}`,
                timestamp: new Date().toISOString(),
                metadata: { type: 'auto_analysis_start' }
            });
            
            await this.storageManager.addMessageToHistory(this.currentSiteId, {
                author: 'agent',
                text: fallbackSummary,
                timestamp: new Date().toISOString(),
                metadata: { type: 'fallback_summary', url: this.currentUrl }
            });
            
        } catch (error) {
            console.error('❌ Fallback analysis failed:', error);
            this.removeTempMessage();
            this.addMessageToChat('system', '⚠️ Unable to analyze this page automatically. The page may have crawling restrictions. You can still ask questions about this page and I\'ll try to help.');
            this.updateSiteStatus('ready');
            
            setTimeout(() => {
                this.hideAnimationSafely('fallback-failed');
            }, 1000);
        }
    }

    async loadSiteData() {
        if (!this.currentSiteId) return;
        
        console.log('🔄 Reloading site data from storage...');
        this.currentSiteData = await this.storageManager.getSiteData(this.currentSiteId);
        console.log('📊 Refreshed site data:', this.currentSiteData);
        
        // Gunakan updateUIForDirectChat untuk memastikan chat interface muncul
        this.updateUIForDirectChat();
    }

    updateUIForDirectChat() {
        if (!this.currentSiteData) {
            this.showControls('error');
            this.updateSiteStatus('error');
            return;
        }
        
        // Untuk direct chat, langsung tampilkan interface chat
        const status = this.currentSiteData.status;
        
        if (status === 'ready' || status === 'completed') {
            this.showControls('completed'); // Gunakan completed controls untuk menampilkan chat interface
            this.updateSiteStatus('ready');
            this.loadChatHistory();
            
            // Hide animation setelah UI ready
            setTimeout(() => {
                this.hideAnimationSafely('ui-ready');
            }, 800);
        } else {
            this.updateUI(); // Fallback ke logic lama
        }
    }

    updateUI() {
        if (!this.currentSiteData) {
            // Situs belum diindeks
            this.showControls('idle');
            this.updateSiteStatus('idle');
            return;
        }
        
        const status = this.currentSiteData.status;
        this.showControls(status);
        this.updateSiteStatus(status);
        
        if (status === 'completed' || status === 'ready') {
            this.loadChatHistory();
        }
    }

    showControls(status) {
        console.log(`🎛️ showControls called with status: ${status}`);
        
        // Hide all controls
        this.idleControls.classList.add('hidden');
        this.completedControls.classList.add('hidden');
        this.errorControls.classList.add('hidden');
        
        // For indexing status, immediately show the analysis progress
        if (status === 'indexing' || status === 'analyzing') {
            this.showAnalysisProgress('Menghubungkan ke Site Scout AI...', 15);
            return;
        }
        
        // Show appropriate control based on status
        const controlMap = {
            'idle': this.idleControls,
            'completed': this.completedControls,
            'ready': this.completedControls, // Status 'ready' uses the same chat interface
            'error': this.errorControls
        };
        
        if (controlMap[status]) {
            controlMap[status].classList.remove('hidden');
            console.log(`✅ Showing ${status} controls, completedControls hidden: ${this.completedControls.classList.contains('hidden')}`);
        } else {
            console.log(`⚠️ No control mapping for status: ${status}`);
        }
        
        // Hide animation when completed controls are shown
        if (status === 'completed' || status === 'ready') {
            setTimeout(() => {
                this.hideAnimationSafely('controls-' + status);
            }, 600);
        }
        
        // Hide animation on error state
        if (status === 'error') {
            setTimeout(() => {
                this.hideAnimationSafely('error-state');
            }, 1000);
        }
    }

    updateSiteStatus(status) {
        this.siteStatusEl.textContent = this.getStatusText(status);
        this.siteStatusEl.className = `site-status ${status}`;
    }

    getStatusText(status) {
        const statusMap = {
            'idle': 'Click to Start',
            'connecting': 'Connecting...',
            'analyzing': 'Analyzing Page...',
            'indexing': 'Indexing...',
            'completed': 'Ready for Questions',
            'ready': 'Ready to Chat',
            'cached': 'Loaded from Cache',
            'error': 'Error'
        };
        return statusMap[status] || status;
    }

    showCacheIndicator() {
        // Update status to show cache indicator
        this.updateSiteStatus('cached');
        
        // Add visual indicator in chat
        this.addMessageToChat('system', '⚡ Loaded from cache - Previous analysis available instantly!');
        
        // Add refresh option for getting fresh analysis
        this.addRefreshAnalysisOption();
        
        console.log('💾 Cache indicator shown');
    }

    addRefreshAnalysisOption() {
        // Check if refresh button already exists
        if (document.querySelector('.refresh-analysis-btn')) return;
        
        // Find action buttons container
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) {
            const refreshBtn = document.createElement('button');
            refreshBtn.className = 'btn btn-secondary refresh-analysis-btn';
            refreshBtn.innerHTML = '<span class="btn-icon">🔄</span>Fresh Analysis';
            refreshBtn.title = 'Get updated analysis of this page';
            
            refreshBtn.addEventListener('click', async () => {
                console.log('🔄 Manual refresh analysis requested');
                // Remove the cache indicator message
                this.removeCacheIndicator();
                await this.refreshSiteAnalysis();
            });
            
            // Insert at the beginning of action buttons
            actionButtons.insertBefore(refreshBtn, actionButtons.firstChild);
        }
    }

    removeCacheIndicator() {
        // Remove cache indicator message
        const messages = document.querySelectorAll('.chat-message.system');
        messages.forEach(message => {
            if (message.textContent.includes('Loaded from cache')) {
                message.remove();
            }
        });
        
        // Remove refresh button
        const refreshBtn = document.querySelector('.refresh-analysis-btn');
        if (refreshBtn) {
            refreshBtn.remove();
        }
    }

    showNoApiKeyView() {
        this.noApiKeyView.classList.remove('hidden');
        this.mainView.classList.add('hidden');
        
        // Hide animation if showing API key setup
        setTimeout(() => {
            this.hideAnimationSafely('api-key-setup');
        }, 1000);
    }

    showMainView() {
        this.noApiKeyView.classList.add('hidden');
        this.mainView.classList.remove('hidden');
    }

    openSettings() {
        chrome.runtime.openOptionsPage();
    }

    async startIndexing() {
        try {
            // Show initial analysis state immediately
            this.updateAnalysisProgress('Starting Site Scout AI...', 5);
            
            // Show animation for manual indexing
            if (window.animationController) {
                window.animationController.showAnimation();
                if (window.updateAnimationStatus) {
                    window.updateAnimationStatus('Starting analysis...');
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 800));
            this.updateAnalysisProgress('Connecting to Site Scout AI...', 15);
            
            // Redirect ke createAndStartChat untuk direct chat flow
            await this.createAndStartChat();
        } catch (error) {
            console.error('Error starting indexing:', error);
            this.showError('Failed to start analysis. Please try again.');
            this.showControls('error');
        }
    }

    /**
     * Trigger fresh analysis untuk session yang sudah ada (dipanggil secara manual oleh user)
     */
    async triggerFreshAnalysis() {
        try {
            console.log('🔄 User triggered fresh analysis (manual)...');
            
            // Reset animation flag dan tampilkan robot animation overlay
            this.animationHidden = false;
            if (window.animationController) {
                window.animationController.showAnimation();
                if (window.updateAnimationStatus) {
                    window.updateAnimationStatus('Starting fresh analysis...');
                }
            }
            
            if (this.currentSiteData && this.currentSiteData.chat_id) {
                await this.refreshSiteAnalysis();
            } else {
                // Jika tidak ada session, buat baru
                await this.createAndStartChat();
            }
        } catch (error) {
            console.error('❌ Error triggering fresh analysis:', error);
            this.showError('Failed to start analysis. Please try again.');
            
            // Hide animation on error
            setTimeout(() => {
                this.hideAnimationSafely('reanalysis-error');
            }, 1000);
        }
    }

    async pollIndexingStatus() {
        const pollInterval = setInterval(async () => {
            try {
                const siteData = await this.storageManager.getSiteData(this.currentSiteId);
                
                if (siteData && siteData.status !== 'indexing') {
                    clearInterval(pollInterval);
                    this.currentSiteData = siteData;
                    this.updateUI();
                }
            } catch (error) {
                console.error('Error polling status:', error);
                clearInterval(pollInterval);
            }
        }, 3000); // Poll setiap 3 detik
        
        // Stop polling setelah 10 menit
        setTimeout(() => {
            clearInterval(pollInterval);
        }, 600000);
    }

    async sendQuestion() {
        const question = this.questionInput.value.trim();
        if (!question || !this.currentSiteData) return;
        
        try {
            // Display user message
            this.addMessageToChat('user', question);
            this.questionInput.value = '';
            this.autoResizeTextarea();
            
            // Show typing indicator
            this.showTypingIndicator();
            
            // Kirim pertanyaan dengan context URL untuk on-demand crawling
            const answer = await this.apiHandler.askQuestionWithContext(
                this.currentSiteData.chat_id,
                question,
                this.currentUrl
            );
            
            // Hide indicator and show answer
            this.hideTypingIndicator();
            this.addMessageToChat('agent', answer);
            
            // Save to history (save original user question, not the modified one)
            await this.storageManager.addMessageToHistory(this.currentSiteId, {
                author: 'user',
                text: question,
                timestamp: new Date().toISOString()
            });
            
            await this.storageManager.addMessageToHistory(this.currentSiteId, {
                author: 'agent',
                text: answer,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error sending question:', error);
            this.hideTypingIndicator();
            this.showError('Failed to send question. Please try again.');
        }
    }

    createContextualQuestion(userQuestion) {
        // Tidak perlu lagi - akan menggunakan askQuestionWithContext dari API handler
        return userQuestion;
    }

    addMessageToChat(author, text) {
        if (!this.chatHistory) {
            console.error('❌ chatHistory element not found!');
            return;
        }
        
        console.log(`💬 Adding message to chat:`, {
            author, 
            textPreview: text.substring(0, 50) + '...',
            chatHistoryExists: !!this.chatHistory,
            completedControlsHidden: this.completedControls?.classList.contains('hidden')
        });
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${author}`;
        
                    // Format text to support simple markdown and emojis
        const formattedText = this.formatMessageText(text);
        
        messageDiv.innerHTML = `
            <div class="chat-message-author">${this.getAuthorDisplayName(author)}</div>
            <div class="chat-message-text">${formattedText}</div>
        `;
        
        this.chatHistory.appendChild(messageDiv);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
        
        // Verify message was actually added
        const messageCount = this.chatHistory.querySelectorAll('.chat-message').length;
        console.log(`✅ Message added. Total messages in chat: ${messageCount}`);
    }

    /**
     * Format text message untuk tampilan yang lebih baik
     */
    formatMessageText(text) {
                    // Escape HTML first
        let formatted = this.escapeHtml(text);
        
        // Detect and wrap URLs with break-url class for better handling
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        formatted = formatted.replace(urlRegex, '<span class="break-url">$1</span>');
        
        // Convert basic markdown formatting
        formatted = formatted
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/\n/g, '<br>') // Line breaks
            .replace(/---/g, '<hr>'); // Horizontal rules
        
        return formatted;
    }

    /**
     * Get display name untuk author
     */
    getAuthorDisplayName(author) {
        const authorMap = {
            'user': '👤 You',
            'agent': '<img src="../../icons/logo.png" alt="Site Scout AI" width="16" height="16" style="vertical-align: middle; margin-right: 4px;"> Site Scout AI',
            'system': '⚙️ System'
        };
        return authorMap[author] || author;
    }

    loadChatHistory() {
        console.log('📜 loadChatHistory called');
        console.log('🔍 Chat history debug:', {
            hasSiteData: !!this.currentSiteData,
            hasChatHistory: !!(this.currentSiteData?.chat_history),
            messagesCount: this.currentSiteData?.chat_history?.length || 0,
            chatHistoryElement: !!this.chatHistory,
            completedControlsHidden: this.completedControls?.classList.contains('hidden')
        });
        
        if (!this.currentSiteData || !this.currentSiteData.chat_history) {
            console.log('📭 No chat history data, showing empty chat');
            this.showEmptyChat();
            return;
        }
        
        this.chatHistory.innerHTML = '';
        
        if (this.currentSiteData.chat_history.length === 0) {
            console.log('📭 Empty chat history, showing empty state');
            this.showEmptyChat();
            return;
        }
        
        console.log(`📜 Loading ${this.currentSiteData.chat_history.length} messages from history`);
        this.currentSiteData.chat_history.forEach((message, index) => {
            console.log(`💬 Message ${index + 1}:`, message.author, message.text.substring(0, 50) + '...');
            this.addMessageToChat(message.author, message.text);
        });
        
        // Cek apakah ada pesan yang benar-benar muncul di UI
        const visibleMessages = this.chatHistory.querySelectorAll('.chat-message');
        console.log(`🔍 UI Debug: Added ${visibleMessages.length} visible messages to DOM`);
        
        if (visibleMessages.length === 0) {
            console.log('⚠️ No visible messages in UI despite history, showing empty state');
            this.showEmptyChat();
        } else {
            console.log('✅ Messages successfully loaded into chat UI');
            this.hideAnimationSafely('chat-history-loaded');
        }
        
        // Hide animation setelah chat history dimuat
        setTimeout(() => {
            this.hideAnimationSafely('chat-history-loaded');
        }, 500);
    }

    showEmptyChat() {
        this.chatHistory.innerHTML = `
            <div class="empty-chat">
                <div class="analysis-progress">
                    <div class="progress-icon">🔍</div>
                    <h3>Analyzing Page Content</h3>
                    <p class="progress-message">AI is reading and understanding the webpage...</p>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: 0%"></div>
                    </div>
                    <div class="progress-text">0%</div>
                </div>
            </div>
        `;
        
        // Hide animation ketika empty chat sudah siap ditampilkan
        setTimeout(() => {
            this.hideAnimationSafely('empty-chat-ready');
        }, 300);
    }

    showAnalysisProgress(message = 'Site Scout is analyzing...', progress = 0) {
        this.chatHistory.innerHTML = `
            <div class="analysis-progress">
                <div class="progress-icon">🤖</div>
                <h3>Site Scout AI</h3>
                <p class="progress-message">${message}</p>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
                <div class="progress-text">${progress}%</div>
                <div class="progress-details">
                    <small>Gathering information from this webpage...</small>
                </div>
            </div>
        `;
    }

    updateAnalysisProgress(message, progress) {
        const progressMessage = this.chatHistory.querySelector('.progress-message');
        const progressBar = this.chatHistory.querySelector('.progress-bar');
        const progressText = this.chatHistory.querySelector('.progress-text');
        
        if (progressMessage) progressMessage.textContent = message;
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${progress}%`;
    }

    async clearChatHistory() {
        if (!this.currentSiteId) return;
        
        if (confirm('Are you sure you want to delete all chat history?')) {
            try {
                const siteData = await this.storageManager.getSiteData(this.currentSiteId);
                if (siteData) {
                    siteData.chat_history = [];
                    await this.storageManager.createSiteEntry(this.currentSiteId, siteData.chat_id, this.currentUrl, this.currentDomain);
                    this.showEmptyChat();
                }
            } catch (error) {
                console.error('Error clearing chat history:', error);
                this.showError('Failed to delete chat history.');
            }
        }
    }

    showTypingIndicator() {
        this.typingIndicator.classList.remove('hidden');
        this.sendQuestionBtn.disabled = true;
    }

    hideTypingIndicator() {
        this.typingIndicator.classList.add('hidden');
        this.sendQuestionBtn.disabled = false;
    }

    autoResizeTextarea() {
        // Modern auto-resize functionality (no scrollbar needed)
        this.questionInput.style.height = 'auto';
        const maxHeight = 120; // max-height from CSS
        const newHeight = Math.min(this.questionInput.scrollHeight, maxHeight);
        this.questionInput.style.height = newHeight + 'px';
        
        // Ensure scrolling is disabled
        this.questionInput.style.overflow = newHeight >= maxHeight ? 'hidden' : 'hidden';
    }

    showError(message) {
        // Can be improved with a better notification system
        alert(message);
    }

    /**
     * Update loading message - now only uses robot animation status
     */
    updateLoadingMessage(title, subtitle, progressPercent = null) {
        // Since we removed indexingControls, just update robot animation status
        if (window.updateAnimationStatus) {
            window.updateAnimationStatus(title);
        }
        
        // Log the loading progress for debugging
        console.log(`🔄 Loading: ${title} - ${subtitle} (${progressPercent || 'N/A'}%)`);
    }

    createSiteIdentifier(url) {
        // Buat identifier unik berdasarkan URL lengkap
        // Hapus parameter query dan fragment untuk normalisasi
        try {
            const urlObj = new URL(url);
            const cleanUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
            return btoa(cleanUrl).replace(/[/+=]/g, '_'); // Base64 encode dan buat filesystem-safe
        } catch (error) {
            console.error('Error creating site identifier:', error);
            return btoa(url).replace(/[/+=]/g, '_');
        }
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Helper method untuk hide animation dengan safety check
     */
    hideAnimationSafely(reason = 'unknown') {
        if (this.animationHidden) {
            console.log(`🎬 Animation already hidden, skipping hide request from: ${reason}`);
            return;
        }
        
        console.log(`🎬 Hiding animation - reason: ${reason}`);
        this.animationHidden = true;
        
        // Try multiple methods to hide animation
        if (window.hideLoadingAnimation) {
            window.hideLoadingAnimation();
        }
        
        // Force hide as backup after short delay
        setTimeout(() => {
            if (window.forceHideAnimation) {
                console.log(`🎬 Force hiding animation - reason: ${reason}`);
                window.forceHideAnimation();
            }
        }, 1500);
    }

    // shouldRefreshAnalysis() removed - we always do fresh analysis now

    /**
     * Refresh analysis untuk session yang sudah ada
     */
    async refreshSiteAnalysis() {
        try {
            console.log('🔄 Starting analysis refresh...');
            
            // Clean up duplicate analysis messages first
            await this.cleanupDuplicateAnalysis();
            
            // Update status
            this.updateSiteStatus('analyzing');
            
            // Update animation status
            if (window.updateAnimationStatus) {
                window.updateAnimationStatus('Refreshing analysis...');
            }
            
            // Pastikan ada chat_id
            if (!this.currentSiteData.chat_id) {
                console.error('❌ No chat_id found for refresh');
                throw new Error('No chat_id available for analysis');
            }
            
            console.log('🤖 Requesting fresh analysis...');
            // Minta analysis baru (with refresh flag)
            await this.requestInitialSummary(this.currentSiteData.chat_id, true);
            
            console.log('✅ Analysis complete, updating UI...');
            
            // PENTING: Reload data terbaru dari storage setelah analysis
            await this.loadSiteData();
            
            // Explicitly show completed controls and update status
            console.log('🎛️ Showing completed controls after refresh analysis...');
            this.showControls('completed');
            this.updateSiteStatus('ready');
            
            // Load chat history to show the new analysis
            console.log('📜 Loading chat history after refresh...');
            await this.loadChatHistory();
            
            // Ensure animation is hidden after refresh analysis complete
            setTimeout(() => {
                console.log('🎬 Manually hiding animation after refresh analysis...');
                this.hideAnimationSafely('refresh-analysis-complete');
            }, 1000);
            
        } catch (error) {
            console.error('❌ Error refreshing analysis:', error);
            this.showControls('completed'); // Fallback ke completed state untuk menampilkan chat
            this.updateSiteStatus('ready');
            this.addMessageToChat('system', '⚠️ Failed to update analysis, but you can still ask questions about this page.');
            
            // Hide animation on error
            setTimeout(() => {
                this.hideAnimationSafely('refresh-analysis-error');
            }, 1000);
        }
    }

    async cleanupDuplicateAnalysis() {
        if (!this.currentSiteData || !this.currentSiteData.chat_history) return;
        
        console.log('🧹 Cleaning up duplicate analysis messages...');
        
        const chatHistory = this.currentSiteData.chat_history;
        const autoAnalysisMessages = [];
        const analysisResponses = [];
        
        // Identify all auto-analysis related messages for this URL
        chatHistory.forEach((message, index) => {
            if (message.author === 'system' && 
                message.text && 
                message.text.includes('Auto-analysis started for:') &&
                message.text.includes(this.currentUrl)) {
                autoAnalysisMessages.push({...message, index});
            }
            
            if (message.author === 'agent' && 
                message.text && 
                (message.text.includes('🎯 OVERVIEW:') || 
                 message.text.includes('🎯 CONTENT ANALYSIS:') ||
                 message.text.includes('🎯 ANALISIS KONTEN:'))) {
                analysisResponses.push({...message, index});
            }
        });
        
        console.log(`🔍 Found ${autoAnalysisMessages.length} auto-analysis messages and ${analysisResponses.length} analysis responses`);
        
        // If there are multiple analysis sets, keep only the most recent complete one
        if (autoAnalysisMessages.length > 1 || analysisResponses.length > 1) {
            console.log('🗑️ Removing duplicate analysis messages...');
            
            // Filter out old analysis messages, keep only non-analysis messages and the latest analysis
            const messagesToRemove = new Set();
            
            // Mark old auto-analysis messages for removal (keep last one)
            if (autoAnalysisMessages.length > 1) {
                for (let i = 0; i < autoAnalysisMessages.length - 1; i++) {
                    messagesToRemove.add(autoAnalysisMessages[i].index);
                }
            }
            
            // Mark old analysis responses for removal (keep last one)
            if (analysisResponses.length > 1) {
                for (let i = 0; i < analysisResponses.length - 1; i++) {
                    messagesToRemove.add(analysisResponses[i].index);
                }
            }
            
            // Create cleaned history
            const cleanedHistory = chatHistory.filter((message, index) => !messagesToRemove.has(index));
            
            if (cleanedHistory.length < chatHistory.length) {
                // Update the storage with cleaned history
                const updateSuccess = await this.storageManager.updateSiteData(this.currentSiteId, {
                    chat_history: cleanedHistory
                });
                
                if (updateSuccess) {
                    // Update current data
                    this.currentSiteData.chat_history = cleanedHistory;
                    console.log(`✅ Cleaned up duplicates. Reduced from ${chatHistory.length} to ${cleanedHistory.length} messages`);
                } else {
                    console.error('❌ Failed to update cleaned history in storage');
                }
            }
        }
    }
}

// Initialize popup controller when DOM is ready

document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});
