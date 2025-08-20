/**
 * Popup Script - Main logic for Site Scout popup interface
 * Manages user interaction and communication with background script
 */

class PopupController {
    constructor() {
        this.storageManager = new StorageManager();
        this.apiHandler = new ApiHandler('sk-bb1b4da1bdb4c57fdfb39c60d9a99a0b6dfa81cca40895175b5da9bc63c12c58');
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
        this.indexSiteBtn = document.getElementById('indexSiteBtn');
        this.sendQuestionBtn = document.getElementById('sendQuestionBtn');
        this.retryIndexBtn = document.getElementById('retryIndexBtn');
    }

    bindEvents() {
        // Settings buttons
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => this.openSettings());
        }
        
        // Main actions
        if (this.indexSiteBtn) {
            this.indexSiteBtn.addEventListener('click', () => this.startIndexing());
        }
        if (this.sendQuestionBtn) {
            this.sendQuestionBtn.addEventListener('click', () => this.sendQuestion());
        }
        if (this.retryIndexBtn) {
            this.retryIndexBtn.addEventListener('click', () => this.startIndexing());
        }
        
        // Input events
        if (this.questionInput) {
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
    }

    async initialize() {
        try {
            console.log('🚀 Initializing popup...');
            // Tidak perlu cek API key lagi, langsung lanjut
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
            // ApiHandler sudah diinisialisasi di constructor
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
            
            // Check if there's already a chat session for this URL
            this.currentSiteData = await this.storageManager.getSiteData(this.currentSiteId);
            console.log('📊 Current site data:', this.currentSiteData);
            
            // Advanced session validation to prevent duplicate analysis
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
                             message.text.includes('Auto-analysis started for:')) &&
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
                          message.text.includes('🎯 CONTENT ANALYSIS:') ||
             message.text.includes('📝 KEY POINTS:') ||
             message.text.includes('💡 INSIGHTS & RECOMMENDATIONS:'))
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
            
            // Save chat session data (status: ready for direct chat)
            await this.storageManager.createSiteEntry(
                this.currentSiteId, 
                chatId, 
                this.currentUrl, 
                this.currentDomain
            );
            
            // Update status to ready (ready for direct chat)
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

    async getActiveRole() {
        // Ambil role dari storage, jika default lakukan deteksi otomatis
        const role = await this.storageManager.getUserRole ? await this.storageManager.getUserRole() : 'default';
        if (role !== 'default') return role;
        // Deteksi otomatis dari konten halaman
        const pageText = await this.getPageText();
        return this.detectRoleFromText(pageText);
    }

    async getPageText() {
        // Ambil text content dari halaman aktif (content script)
        return new Promise((resolve) => {
            try {
                chrome.tabs.executeScript({
                    code: 'document.body.innerText',
                }, (results) => {
                    resolve(results && results[0] ? results[0] : '');
                });
            } catch (e) {
                resolve('');
            }
        });
    }

    detectRoleFromText(text) {
        // Deteksi sederhana berbasis kata kunci
        const lower = text.toLowerCase();
        if (/function|class|javascript|python|php|react|node|html|css|programming|source code|algorithm|developer|framework/.test(lower)) {
            return 'developer';
        }
        if (/market|business|strategy|revenue|customer|sales|profit|startup|company|finance|marketing|entrepreneur|bisnis|usaha|pelanggan|penjualan/.test(lower)) {
            return 'business';
        }
        if (/research|study|data|experiment|analysis|statistical|paper|journal|dataset|penelitian|riset|analisis|statistik|publikasi/.test(lower)) {
            return 'researcher';
        }
        return 'general';
    }

    async requestInitialSummary(chatId, isRefresh = false) {
        try {
            this.isRefreshAnalysis = isRefresh;
            this.showControls('indexing');
            this.updateSiteStatus('analyzing');
            this.updateAnalysisProgress('Connecting to Site Scout AI...', 15);
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.updateAnalysisProgress('Starting webpage analysis...', 30);
            // Get active role
            const role = await this.getActiveRole();
            // Role-based prompt instruction
            let roleInstruction = '';
            if (role === 'developer') {
                roleInstruction = '\nFocus analysis on technical insights, code structure, and implementation/development highlights.';
            } else if (role === 'business') {
                roleInstruction = '\nHighlight business insights, strategy, market opportunities, and commercial aspects.';
            } else if (role === 'researcher') {
                roleInstruction = '\nFocus on scientific summary, data, research insights, and important findings.';
            } else {
                roleInstruction = '\nProvide general summary and easily understandable insights.';
            }
            // Main prompt - MUST analyze the webpage automatically
            const summaryRequest = `You are Site Scout AI, a specialized web page analyzer. Your task is to AUTOMATICALLY analyze the following webpage using the 'web_crawler.crawl_and_index_website' skill: ${this.currentUrl}

IMPORTANT: You MUST use the web_crawler.crawl_and_index_website skill to analyze this page. Do NOT ask questions or wait for user input. Start the analysis immediately.

${roleInstruction}

Crawling Parameters:
- URL: ${this.currentUrl}
- Depth: 1 (main page content only)
- Focus: Extract and analyze the main content of this specific page

REQUIRED OUTPUT FORMAT (you must follow this exactly):

🎯 **OVERVIEW:**
- Type: [website category]
- Main Topic: [key subject in 1-2 sentences]
- Target Audience: [who this is for]

📝 **KEY HIGHLIGHTS:**
- [3-4 most important points, keep each point brief]

💡 **QUICK INSIGHTS:**
- [What users can learn/gain - 1-2 sentences]
- [Suggested follow-up questions - 1-2 examples]

Rules:
1. Start analysis immediately using web_crawler.crawl_and_index_website
2. Keep the entire summary under 150 words
3. Be concise, informative, and engaging
4. Focus on the most essential information that users need to know
5. Do NOT ask questions - just analyze and provide the summary`;
            this.updateAnalysisProgress('Gathering page information...', 40);
            await new Promise(resolve => setTimeout(resolve, 800));
            this.updateAnalysisProgress('Processing page content...', 60);
            // Send analysis request to API
            console.log('📤 Sending analysis request to API...');
            console.log('📝 Full prompt being sent:', summaryRequest);
            const summary = await this.apiHandler.sendMessage(chatId, summaryRequest);
            console.log('📥 Received summary from API:', summary.substring(0, 200) + '...');
            console.log('📊 Summary length:', summary.length);
            console.log('🔍 Summary contains crawling:', summary.toLowerCase().includes('crawl'));
            console.log('🔍 Summary contains overview:', summary.toLowerCase().includes('overview'));
            
            // Update progress before checking response
            this.updateAnalysisProgress('Compiling analysis results...', 80);
            
            // Check if response is an error or generic response
            const isGenericResponse = summary.toLowerCase().includes('how can i assist') || 
                                    summary.toLowerCase().includes('how can i help') ||
                                    summary.toLowerCase().includes('what would you like') ||
                                    summary.toLowerCase().includes('please provide') ||
                                    summary.toLowerCase().includes('if you have any') ||
                                    summary.toLowerCase().includes('insufficient credits') || 
                                    summary.toLowerCase().includes('url depth error') ||
                                    summary.toLowerCase().includes('error occurred') ||
                                    summary.toLowerCase().includes('failed') ||
                                    summary.toLowerCase().includes('could you please confirm') ||
                                    summary.toLowerCase().includes('alternatively, i can provide') ||
                                    summary.toLowerCase().includes('not recognized as valid') ||
                                    summary.toLowerCase().includes('technical issue') ||
                                    summary.toLowerCase().includes('crawling tool') ||
                                    summary.toLowerCase().includes('recommend trying again');
            
            if (isGenericResponse) {
                console.warn('⚠️ API returned generic/error response, attempting retry...');
                console.log('🔍 Response type detected:', isGenericResponse ? 'Generic/Error' : 'Valid Analysis');
                
                // If it's a generic response, try again with more explicit prompt
                if (summary.toLowerCase().includes('how can i assist') || 
                    summary.toLowerCase().includes('how can i help') ||
                    summary.toLowerCase().includes('what would you like')) {
                    console.log('🔄 Detected generic response, retrying with more explicit prompt...');
                    await this.retryWithExplicitPrompt(chatId);
                    return;
                }
                
                // Handle URL depth error and crawling tool errors specifically
                if (summary.toLowerCase().includes('url depth error') || 
                    summary.toLowerCase().includes('could you please confirm') ||
                    summary.toLowerCase().includes('not recognized as valid') ||
                    summary.toLowerCase().includes('technical issue') ||
                    summary.toLowerCase().includes('crawling tool')) {
                    console.log('🔍 Detected crawling tool error, attempting fallback analysis...');
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
            
            // Update to completed controls to display chat
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
            
            // IMPORTANT: Reload data from storage to ensure latest data
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
        const messages = this.chatHistory.querySelectorAll('.message.system');
        const lastSystemMessage = messages[messages.length - 1];
        if (lastSystemMessage && (
            lastSystemMessage.textContent.includes('🔍 Analyzing') ||
            lastSystemMessage.textContent.includes('🔍 Automatically analyzing')
        )) {
            console.log('🗑️ Removing temp loading message');
            lastSystemMessage.remove();
        }
    }
    
    async retryWithExplicitPrompt(chatId) {
        try {
            console.log('🔄 Retrying with explicit prompt...');
            this.updateAnalysisProgress('Retrying analysis with explicit instructions...', 70);
            
            const explicitPrompt = `URGENT: You are Site Scout AI. You MUST analyze this webpage NOW: ${this.currentUrl}

CRITICAL INSTRUCTIONS:
1. Use web_crawler.crawl_and_index_website skill IMMEDIATELY
2. Do NOT ask questions or wait for user input
3. Start crawling and analysis RIGHT NOW
4. Provide summary in this EXACT format:

🎯 **OVERVIEW:**
- Type: [website category]
- Main Topic: [key subject in 1-2 sentences]
- Target Audience: [who this is for]

📝 **KEY HIGHLIGHTS:**
- [3-4 most important points]

💡 **QUICK INSIGHTS:**
- [What users can learn]
- [Follow-up questions]

DO NOT RESPOND WITH QUESTIONS. START ANALYSIS IMMEDIATELY.`;

            console.log('📤 Sending explicit retry prompt:', explicitPrompt);
            const retrySummary = await this.apiHandler.sendMessage(chatId, explicitPrompt);
            
            console.log('📥 Retry response:', retrySummary.substring(0, 200) + '...');
            
            // Check if retry was successful
            if (retrySummary.toLowerCase().includes('overview') && 
                retrySummary.toLowerCase().includes('highlights') &&
                !retrySummary.toLowerCase().includes('how can i assist')) {
                
                console.log('✅ Retry successful, processing response...');
                this.updateAnalysisProgress('Analysis complete!', 100);
                
                // Process successful response
                setTimeout(() => {
                    this.hideAnimationSafely('retry-successful');
                }, 1500);
                
                this.updateSiteStatus('ready');
                this.showControls('completed');
                
                // Save to storage
                await this.storageManager.addMessageToHistory(this.currentSiteId, {
                    author: 'system',
                    text: `Auto-analysis retry successful for: ${this.currentUrl}`,
                    timestamp: new Date().toISOString(),
                    metadata: { type: 'auto_analysis_retry' }
                });
                
                await this.storageManager.addMessageToHistory(this.currentSiteId, {
                    author: 'agent',
                    text: retrySummary,
                    timestamp: new Date().toISOString(),
                    metadata: { type: 'retry_summary', url: this.currentUrl }
                });
                
                await this.loadSiteData();
                
            } else {
                console.log('❌ Retry also failed, falling back to manual mode');
                this.addMessageToChat('system', '⚠️ Automatic analysis failed. You can still ask questions about this page manually.');
                this.updateSiteStatus('ready');
                this.showControls('completed');
                
                setTimeout(() => {
                    this.hideAnimationSafely('retry-failed');
                }, 1000);
            }
            
        } catch (error) {
            console.error('❌ Error in retry:', error);
            this.addMessageToChat('system', '⚠️ Analysis failed. You can still ask questions about this page manually.');
            this.updateSiteStatus('ready');
            this.showControls('completed');
            
            setTimeout(() => {
                this.hideAnimationSafely('retry-error');
            }, 1000);
        }
    }

    async handleDepthErrorFallback(chatId, originalError) {
        try {
            console.log('🔄 Attempting fallback analysis with simplified crawling...');
            this.updateLoadingMessage('🔄 Retrying analysis...', 'Using simplified crawling method...', 50);
            
            // Create a simplified request that explicitly requests main page only
            const fallbackRequest = `You are Site Scout AI. You MUST analyze this webpage: ${this.currentUrl}

CRITICAL: Use the 'web_crawler.crawl_and_index_website' skill immediately. Do NOT ask questions or wait for input.

Parameters:
- URL: ${this.currentUrl}
- Depth: 0 (single page only, no subpages)
- Mode: Extract main content and key information from this single page

REQUIRED OUTPUT FORMAT:

🎯 **OVERVIEW:**
- Type: [website category]
- Main Topic: [key subject in 1-2 sentences]
- Target Audience: [who this is for]

📝 **KEY HIGHLIGHTS:**
- [3-4 most important points from the page]

💡 **QUICK INSIGHTS:**
- [What users can learn from this page]
- [1-2 follow-up question examples]

Rules:
1. Start crawling immediately with web_crawler.crawl_and_index_website
2. Keep summary under 150 words
3. Focus on main page content only
4. Do NOT ask questions - just analyze and provide summary
5. If crawling fails, provide analysis based on URL structure and domain name`;

            this.updateLoadingMessage('🧠 Processing fallback...', 'AI is analyzing page content...', 80);
            
            const fallbackSummary = await this.apiHandler.sendMessage(chatId, fallbackRequest);
            
            // Check if fallback also failed
            if (fallbackSummary.toLowerCase().includes('error') || 
                fallbackSummary.toLowerCase().includes('failed') ||
                fallbackSummary.toLowerCase().includes('could you please confirm') ||
                fallbackSummary.toLowerCase().includes('not recognized as valid') ||
                fallbackSummary.toLowerCase().includes('technical issue') ||
                fallbackSummary.toLowerCase().includes('crawling tool')) {
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
            
        } catch (fallbackError) {
            console.error('❌ Fallback analysis also failed:', fallbackError);
            
            // Final fallback: Provide manual analysis based on URL
            const manualAnalysis = this.generateManualAnalysis(this.currentUrl);
            
            this.addMessageToChat('agent', manualAnalysis);
            this.updateSiteStatus('ready');
            this.showControls('completed');
            
            // Save manual analysis to storage
            await this.storageManager.addMessageToHistory(this.currentSiteId, {
                author: 'system',
                text: `Auto-analysis started for: ${this.currentUrl}`,
                timestamp: new Date().toISOString(),
                metadata: { type: 'auto_analysis_start' }
            });
            
            await this.storageManager.addMessageToHistory(this.currentSiteId, {
                author: 'agent',
                text: manualAnalysis,
                timestamp: new Date().toISOString(),
                metadata: { type: 'manual_analysis', url: this.currentUrl }
            });
            
            setTimeout(() => {
                this.hideAnimationSafely('manual-fallback');
            }, 1000);
        }
    }

    generateManualAnalysis(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            const path = urlObj.pathname;
            
            // Generate basic analysis based on URL structure
            let analysis = `[OVERVIEW]
(Type): Website Analysis
(Main Topic): ${domain} - ${path || 'Main Page'}
(Target Audience): General Users

[KEY HIGHLIGHTS]
- Domain: ${domain}
- Path: ${path || '/'}
- Protocol: ${urlObj.protocol}
- Analysis Method: Manual (crawling tool unavailable)

[QUICK INSIGHTS]
- This appears to be a website at ${domain}
- The page structure suggests ${path ? 'a specific section' : 'main landing page'}
- Manual analysis provided due to technical limitations with automated crawling
- You can ask specific questions about this page for more detailed information`;

            return analysis;
        } catch (error) {
            console.error('Error generating manual analysis:', error);
            return `[OVERVIEW]
(Type): Website Analysis
(Main Topic): ${url}
(Target Audience): General Users

[KEY HIGHLIGHTS]
- URL: ${url}
- Analysis Method: Manual (crawling tool unavailable)

[QUICK INSIGHTS]
- Manual analysis provided due to technical limitations
- You can ask specific questions about this page for more detailed information`;
        }
    }

    async loadSiteData() {
        if (!this.currentSiteId) return;
        
        console.log('🔄 Reloading site data from storage...');
        this.currentSiteData = await this.storageManager.getSiteData(this.currentSiteId);
        console.log('📊 Refreshed site data:', this.currentSiteData);
        
        // Use updateUIForDirectChat to ensure chat interface appears
        this.updateUIForDirectChat();
    }

    updateUIForDirectChat() {
        if (!this.currentSiteData) {
            this.showControls('error');
            this.updateSiteStatus('error');
            return;
        }
        
        // For direct chat, immediately show chat interface
        const status = this.currentSiteData.status;
        
        if (status === 'ready' || status === 'completed') {
            this.showControls('completed'); // Use completed controls to display chat interface
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
            'error': 'Error',
            'not_indexed': 'Never indexed'
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
        const messages = document.querySelectorAll('.message.system');
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
        // Fungsi ini tidak diperlukan lagi
        this.showMainView();
    }

    showMainView() {
        if (this.noApiKeyView) this.noApiKeyView.classList.add('hidden');
        if (this.mainView) this.mainView.classList.remove('hidden');
    }

    openSettings() {
        console.log('Opening settings page...');
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
            
            // Redirect to createAndStartChat for direct chat flow
            await this.createAndStartChat();
        } catch (error) {
            console.error('Error starting indexing:', error);
            this.showError('Failed to start analysis. Please try again.');
            this.showControls('error');
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
            
            // Check if this is a website analysis question or general chat
            const isWebsiteAnalysisQuestion = this.isWebsiteAnalysisQuestion(question);
            
            let answer;
            if (isWebsiteAnalysisQuestion) {
                // Use website analysis with URL context
                answer = await this.apiHandler.askQuestionWithSmartFallback(
                    this.currentSiteData.chat_id,
                    question,
                    this.currentUrl
                );
            } else {
                // Use normal chat without formatting requirements
                answer = await this.apiHandler.askQuestion(
                    this.currentSiteData.chat_id,
                    question
                );
            }
            
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
            
            // Smart error handling - try to provide helpful response
            if (error.message.includes('Unable to process request after multiple attempts')) {
                this.addMessageToChat('agent', `I'm having trouble analyzing this page directly. Let me try a different approach to help you with your question about "${question}". 

I'll attempt to provide useful information based on what I can access. If you need specific details from this page, you might want to try asking a more general question or provide some context about what you're looking for.`);
            } else {
                this.showError('Failed to send question. Please try again.');
            }
        }
    }

    isWebsiteAnalysisQuestion(question) {
        // Keywords that indicate website analysis is needed
        const analysisKeywords = [
            'analyze', 'analysis', 'what is this', 'describe this', 'explain this',
            'what does this', 'tell me about', 'overview', 'summary', 'content',
            'features', 'functionality', 'purpose', 'target audience', 'main topic',
            'website', 'page', 'site', 'app', 'platform', 'service'
        ];
        
        // Check if question contains analysis keywords
        const lowerQuestion = question.toLowerCase();
        const hasAnalysisKeywords = analysisKeywords.some(keyword => 
            lowerQuestion.includes(keyword)
        );
        
        // Check if question is very short (likely analysis request)
        const isShortQuestion = question.length < 30;
        
        // Check if question is generic (like "help me", "can you help")
        const isGenericQuestion = /^(can you|help me|what|how|tell me|explain|describe)/i.test(question);
        
        // Return true if it's likely a website analysis question
        return hasAnalysisKeywords || (isShortQuestion && isGenericQuestion);
    }

    createContextualQuestion(userQuestion) {
        // Tidak perlu lagi - akan menggunakan askQuestionWithContext dari API handler
        return userQuestion;
    }

    addMessageToChat(author, text) {
        // Allow all message types to be displayed
        if (!this.chatHistory) {
            console.error('❌ chatHistory element not found!');
            return;
        }

        // Check for error messages that should redirect to main route
        if (this.shouldRedirectToMainRoute(text)) {
            console.log('🚨 Error detected, redirecting to main route');
            this.redirectToMainRoute();
            return;
        }

        let formattedText = this.formatMessageText(text);
        // Jika agent, lakukan formatting khusus agar lebih rapi
        if (author === 'agent') {
            formattedText = this.formatAgentResult(text);
        }
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${author}`;
        messageDiv.innerHTML = `
            <div class="message-author">${author === 'user' ? '👤 You' : author === 'agent' ? '🤖 AI' : ''}</div>
            <div class="message-text">${formattedText}</div>
        `;
        this.chatHistory.appendChild(messageDiv);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
        
        // Verify message was actually added
        const messageCount = this.chatHistory.querySelectorAll('.message').length;
        console.log(`✅ Message added. Total messages in chat: ${messageCount}`);
    }

    /**
     * Check if message contains error that should redirect to main route
     */
    shouldRedirectToMainRoute(text) {
        const errorPatterns = [
            /temporary server error \(502\)/i,
            /server error \(502\)/i,
            /502 error/i,
            /temporary server error/i,
            /preventing access to the content/i,
            /web crawler tool.*encountered.*error/i,
            /unable to analyze.*webpage/i,
            /crawler.*failed/i,
            /access.*denied/i,
            /blocked.*access/i
        ];

        return errorPatterns.some(pattern => pattern.test(text));
    }

    /**
     * Redirect to main route when error is detected
     */
    redirectToMainRoute() {
        console.log('🔄 Redirecting to main route due to error');
        
        // Clear current site data
        this.currentSiteData = null;
        this.currentSiteId = null;
        this.currentUrl = null;
        
        // Clear chat history
        if (this.chatHistory) {
            this.chatHistory.innerHTML = '';
        }
        
        // Show idle controls (main route)
        this.showControls('idle');
        
        // Update domain display
        if (this.currentDomainElement) {
            this.currentDomainElement.textContent = 'Enter URL to analyze';
        }
        
        // Update status
        if (this.siteStatusElement) {
            this.siteStatusElement.textContent = 'Ready to analyze';
        }
        
        // Show message to user
        this.addMessageToChat('system', '⚠️ Analysis failed due to server error. Please try again with a different URL or try again later.');
    }



    /**
     * Format text message for better display
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
     * Get display name for author
     */
    getAuthorDisplayName(author) {
        const authorMap = {
            'user': '👤 You',
            'agent': '<img src="../../icons/logo.png" alt="Site Scout AI" width="16" height="16" style="vertical-align: middle; margin-right: 4px;"> Site Scout AI'
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
        const visibleMessages = this.chatHistory.querySelectorAll('.message');
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
        // Create unique identifier based on complete URL
        // Remove query parameters and fragment for normalization
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Helper method to hide animation with safety check
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
     * Refresh analysis for existing session
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
            this.showControls('completed'); // Fallback to completed state to display chat
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
                 message.text.includes('🎯 CONTENT ANALYSIS:'))) {
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

    formatAgentResult(text) {
        console.log('🔍 formatAgentResult called with text:', text.substring(0, 200) + '...');
        
        // Normalization: remove double asterisks, extra spaces, and curly braces
        let html = text.replace(/\*\*/g, '').replace(/\r/g, '');
        
        // Clean up curly braces from the entire text for better readability
        html = this.cleanCurlyBraces(html);
        
        // Enhanced parsing with new formatting requirements
        const sections = [];
        
        // Overview Section - Support both old and new format
        const overviewMatch = html.match(/(?:🎯\s*OVERVIEW|\[OVERVIEW\]):?/i);
        console.log('🎯 Overview match:', overviewMatch);
        if (overviewMatch) {
            const overviewContent = this.extractOverviewContent(html);
            console.log('📊 Overview content extracted:', overviewContent);
            if (overviewContent && overviewContent.length > 0) {
                sections.push(this.createOverviewBadge(overviewContent));
            }
        }
        
        // Key Highlights Section - Support both old and new format
        const highlightsMatch = html.match(/(?:📝\s*KEY HIGHLIGHTS|\[KEY HIGHLIGHTS\]):?/i);
        console.log('📝 Highlights match:', highlightsMatch);
        if (highlightsMatch) {
            const highlightsContent = this.extractHighlightsContent(html);
            console.log('📊 Highlights content extracted:', highlightsContent);
            if (highlightsContent && highlightsContent.length > 0) {
                sections.push(this.createHighlightsBadge(highlightsContent));
            }
        }
        
        // Quick Insights Section - Support both old and new format
        const insightsMatch = html.match(/(?:💡\s*QUICK INSIGHTS|\[QUICK INSIGHTS\]):?/i);
        console.log('💡 Insights match:', insightsMatch);
        if (insightsMatch) {
            const insightsContent = this.extractInsightsContent(html);
            console.log('📊 Insights content extracted:', insightsContent);
            if (insightsContent && insightsContent.length > 0) {
                sections.push(this.createInsightsBadge(insightsContent));
            }
        }
        
        console.log('🏷️ Total sections created:', sections.length);
        
        // If sections are successfully created, return badge HTML
        if (sections.length > 0) {
            console.log('✅ Returning badge HTML');
            return sections.join('');
        }
        
        // Fallback to enhanced formatting if parsing fails
        console.log('⚠️ No sections created, using enhanced fallback formatting');
        return this.enhancedFallbackFormatting(html);
    }
    
    extractOverviewContent(text) {
        const overviewRegex = /(?:🎯\s*OVERVIEW|\[OVERVIEW\]):?([\s\S]*?)(?=📝|💡|\[KEY HIGHLIGHTS\]|\[QUICK INSIGHTS\]|$)/i;
        const match = text.match(overviewRegex);
        if (!match) return null;
        
        const content = match[1].trim();
        const items = [];
        
        // Enhanced extraction with support for new format (Sub Judul)
        // Look for patterns like: (Type): value, (Main Topic): value, etc.
        const enhancedTypeMatch = content.match(/\(Type\)\s*:?\s*(.+?)(?=\n|\(Main Topic\)|\(Target Audience\)|$)/i);
        const enhancedTopicMatch = content.match(/\(Main Topic\)\s*:?\s*(.+?)(?=\n|\(Type\)|\(Target Audience\)|$)/i);
        const enhancedAudienceMatch = content.match(/\(Target Audience\)\s*:?\s*(.+?)(?=\n|\(Type\)|\(Main Topic\)|$)/i);
        
        // Fallback to old format patterns
        const typeMatch = enhancedTypeMatch || content.match(/(?:Type|TYPE)\s*:?\s*(.+?)(?=\n(?:Main Topic|MAIN TOPIC|Target Audience|TARGET AUDIENCE)|📝|💡|$)/i);
        const topicMatch = enhancedTopicMatch || content.match(/(?:Main Topic|MAIN TOPIC)\s*:?\s*(.+?)(?=\n(?:Type|TYPE|Target Audience|TARGET AUDIENCE)|📝|💡|$)/i);
        const audienceMatch = enhancedAudienceMatch || content.match(/(?:Target Audience|TARGET AUDIENCE)\s*:?\s*(.+?)(?=\n(?:Type|TYPE|Main Topic|MAIN TOPIC)|📝|💡|$)/i);
        
        if (typeMatch) {
            const typeValue = typeMatch[1].trim();
            // Remove curly braces if present and clean up
            const cleanType = typeValue.replace(/[{}]/g, '').replace(/\s*-\s*.*$/, '').trim();
            console.log('🔍 Type extracted:', { original: typeValue, cleaned: cleanType });
            items.push({ label: 'Type', value: cleanType });
        }
        
        if (topicMatch) {
            const topicValue = topicMatch[1].trim();
            // Remove curly braces if present and clean up
            const cleanTopic = topicValue.replace(/[{}]/g, '').replace(/\s*-\s*.*$/, '').trim();
            console.log('🔍 Main Topic extracted:', { original: topicValue, cleaned: cleanTopic });
            items.push({ label: 'Main Topic', value: cleanTopic });
        }
        
        if (audienceMatch) {
            const audienceValue = audienceMatch[1].trim();
            // Remove curly braces if present and clean up
            const cleanAudience = audienceValue.replace(/[{}]/g, '').replace(/\s*-\s*.*$/, '').trim();
            console.log('🔍 Target Audience extracted:', { original: audienceValue, cleaned: cleanAudience });
            items.push({ label: 'Target Audience', value: cleanAudience });
        }
        
        // If no structured items found, try to extract from plain text
        if (items.length === 0) {
            const lines = content.split('\n').filter(line => line.trim() && line.trim().length > 3);
            if (lines.length >= 3) {
                items.push({ label: 'Type', value: lines[0].trim().replace(/[{}]/g, '').replace(/\s*-\s*.*$/, '') });
                items.push({ label: 'Main Topic', value: lines[1].trim().replace(/[{}]/g, '').replace(/\s*-\s*.*$/, '') });
                items.push({ label: 'Target Audience', value: lines[2].trim().replace(/[{}]/g, '').replace(/\s*-\s*.*$/, '') });
            }
        }
        
        return items;
    }
    
    extractHighlightsContent(text) {
        const highlightsRegex = /(?:📝\s*KEY HIGHLIGHTS|\[KEY HIGHLIGHTS\]):?([\s\S]*?)(?=💡|\[QUICK INSIGHTS\]|$)/i;
        const match = text.match(highlightsRegex);
        if (!match) return null;
        
        const content = match[1].trim();
        const items = [];
        
        // Extract bullet points with more flexible patterns
        const lines = content.split('\n').filter(line => line.trim());
        lines.forEach(line => {
            let cleanLine = line.trim();
            // Remove various bullet point indicators
            cleanLine = cleanLine.replace(/^[-•*]\s*/, '');
            cleanLine = cleanLine.replace(/^[0-9]+\.\s*/, '');
            
            // Remove curly braces if present
            cleanLine = cleanLine.replace(/[{}]/g, '').trim();
            
            // Remove duplicate explanations (everything after -)
            cleanLine = cleanLine.replace(/\s*-\s*.*$/, '').trim();
            
            if (cleanLine && cleanLine.length > 5) { // Reduced minimum length for better content capture
                items.push(cleanLine);
            }
        });
        
        // If no items found, try to split by sentences
        if (items.length === 0) {
            const sentences = content.split(/[.!?]+/).filter(sentence => sentence.trim().length > 5);
            items.push(...sentences.slice(0, 6)); // Increased max highlights
        }
        
        // Ensure each item is a clear, separate point
        return items.map(item => {
            // Make sure each point ends with proper punctuation
            if (!item.endsWith('.') && !item.endsWith('!') && !item.endsWith('?')) {
                return item + '.';
            }
            return item;
        });
    }
    
    extractInsightsContent(text) {
        const insightsRegex = /(?:💡\s*QUICK INSIGHTS|\[QUICK INSIGHTS\]):?([\s\S]*?)(?=\n\n|$)/i;
        const match = text.match(insightsRegex);
        if (!match) return null;
        
        const content = match[1].trim();
        const items = [];
        
        // Extract insights and follow-up questions with more flexible patterns
        const lines = content.split('\n').filter(line => line.trim());
        lines.forEach(line => {
            let cleanLine = line.trim();
            // Remove various bullet point indicators
            cleanLine = cleanLine.replace(/^[-•*]\s*/, '');
            cleanLine = cleanLine.replace(/^[0-9]+\.\s*/, '');
            
            // Remove curly braces if present
            cleanLine = cleanLine.replace(/[{}]/g, '').trim();
            
            // Remove duplicate explanations (everything after -)
            cleanLine = cleanLine.replace(/\s*-\s*.*$/, '').trim();
            
            if (cleanLine && cleanLine.length > 5) { // Reduced minimum length for better content capture
                items.push(cleanLine);
            }
        });
        
        // If no items found, try to split by sentences
        if (items.length === 0) {
            const sentences = content.split(/[.!?]+/).filter(sentence => sentence.trim().length > 5);
            items.push(...sentences.slice(0, 5)); // Increased max insights
        }
        
        // Ensure each item is a clear, separate point
        return items.map(item => {
            // Make sure each point ends with proper punctuation
            if (!item.endsWith('.') && !item.endsWith('!') && !item.endsWith('?')) {
                return item + '.';
            }
            return item;
        });
    }
    
    createOverviewBadge(items) {
        if (!items || items.length === 0) return '';
        
        const itemsHtml = items.map(item => `
            <div class="badge-item">
                <div class="badge-label">${item.label}</div>
                <div class="badge-value">${item.value}</div>
            </div>
        `).join('');
        
        return `
            <div class="agent-response-badge badge-overview">
                <div class="badge-header">
                    <div class="badge-icon">🎯</div>
                    <h4 class="badge-title">OVERVIEW</h4>
                </div>
                <div class="badge-content">
                    ${itemsHtml}
                </div>
            </div>
        `;
    }
    
    createHighlightsBadge(items) {
        if (!items || items.length === 0) return '';
        
        const itemsHtml = items.map(item => `
            <div class="badge-list-item">
                <div class="badge-list-bullet">●</div>
                <div class="badge-list-text">${item}</div>
            </div>
        `).join('');
        
        return `
            <div class="agent-response-badge badge-highlights">
                <div class="badge-header">
                    <div class="badge-icon">📝</div>
                    <h4 class="badge-title">KEY HIGHLIGHTS</h4>
                </div>
                <div class="badge-content">
                    <div class="badge-list">
                        ${itemsHtml}
                    </div>
                </div>
            </div>
        `;
    }
    
    createInsightsBadge(items) {
        if (!items || items.length === 0) return '';
        
        const itemsHtml = items.map(item => `
            <div class="badge-list-item">
                <div class="badge-list-bullet">●</div>
                <div class="badge-list-text">${item}</div>
            </div>
        `).join('');
        
        return `
            <div class="agent-response-badge badge-insights">
                <div class="badge-header">
                    <div class="badge-icon">💡</div>
                    <h4 class="badge-title">QUICK INSIGHTS</h4>
                </div>
                <div class="badge-content">
                    <div class="badge-list">
                        ${itemsHtml}
                    </div>
                </div>
            </div>
        `;
    }
    
    cleanCurlyBraces(text) {
        // Remove curly braces and clean up the text
        let cleaned = text
            .replace(/\{([^}]*)\}/g, '$1') // Remove {content} -> content
            .replace(/\s+/g, ' ') // Normalize multiple spaces
            .trim();
        
        console.log('🧹 Cleaned curly braces from text');
        return cleaned;
    }

    // Function to break long text into shorter lines
    breakLongText(text, maxLength = 80) {
        if (text.length <= maxLength) return text;
        
        // Split by natural break points
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
            if ((currentLine + ' ' + word).length <= maxLength) {
                currentLine += (currentLine ? ' ' : '') + word;
            } else {
                if (currentLine) lines.push(currentLine.trim());
                currentLine = word;
            }
        });
        
        if (currentLine) lines.push(currentLine.trim());
        
        return lines.join('<br>');
    }

    // Enhanced bullet point detection and formatting
    detectAndFormatBulletPoints(text) {
        // Split text into lines
        const lines = text.split('\n');
        const formattedLines = [];
        let inBulletList = false;
        let bulletListItems = [];
        
        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            
            // Check if line starts with bullet point indicators
            const isBulletPoint = /^[-•*]\s*/.test(trimmedLine) || /^\d+\.\s*/.test(trimmedLine);
            
            if (isBulletPoint) {
                if (!inBulletList) {
                    inBulletList = true;
                    // Close previous content if exists
                    if (formattedLines.length > 0) {
                        formattedLines.push('</div>');
                    }
                    formattedLines.push('<ul style="margin: 8px 0; padding-left: 20px;">');
                }
                
                // Extract content after bullet point
                const content = trimmedLine.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '');
                bulletListItems.push(`<li style="margin: 4px 0; padding-left: 8px;">${content}</li>`);
            } else if (inBulletList && trimmedLine.length > 0) {
                // Continue bullet list if line has content but no bullet
                bulletListItems.push(`<li style="margin: 4px 0; padding-left: 8px;">${trimmedLine}</li>`);
            } else if (inBulletList && trimmedLine.length === 0) {
                // End bullet list if empty line
                if (bulletListItems.length > 0) {
                    formattedLines.push(bulletListItems.join(''));
                    bulletListItems = [];
                }
                formattedLines.push('</ul>');
                inBulletList = false;
                formattedLines.push('<div style="margin-bottom: 12px;">');
            } else {
                // Regular text line
                if (inBulletList) {
                    // End bullet list
                    if (bulletListItems.length > 0) {
                        formattedLines.push(bulletListItems.join(''));
                        bulletListItems = [];
                    }
                    formattedLines.push('</ul>');
                    inBulletList = false;
                }
                
                if (trimmedLine.length > 0) {
                    formattedLines.push(`<div style="margin-bottom: 8px;">${trimmedLine}</div>`);
                }
            }
        });
        
        // Close any remaining bullet list
        if (inBulletList && bulletListItems.length > 0) {
            formattedLines.push(bulletListItems.join(''));
            formattedLines.push('</ul>');
        }
        
        return formattedLines.join('');
    }

    // Enhanced title and subtitle detection
    detectAndFormatTitles(text) {
        let formatted = text;
        
        // Convert [JUDUL] format to proper headings with enhanced styling
        formatted = formatted.replace(/\[([^\]]+)\]/g, function(match, title) {
            // Check if it's a main section title
            const isMainSection = /OVERVIEW|KEY HIGHLIGHTS|QUICK INSIGHTS|ANALYSIS|SUMMARY|CONCLUSION/i.test(title);
            
            if (isMainSection) {
                return `<h3 style="margin: 20px 0 12px 0; color: #111827; font-weight: 700; font-size: 1.1em; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">${title}</h3>`;
            } else {
                return `<h4 style="margin: 16px 0 8px 0; color: #1f2937; font-weight: 600; border-left: 3px solid #3b82f6; padding-left: 12px;">${title}</h4>`;
            }
        });
        
        // Convert (Sub Judul) format to styled subtitles with better detection
        formatted = formatted.replace(/\(([^)]+)\)/g, function(match, subtitle) {
            // Check if it's a category label like Type, Main Topic, etc.
            const isCategory = /Type|Main Topic|Target Audience|Category|Focus|Scope/i.test(subtitle);
            
            if (isCategory) {
                return `<span style="color: #374151; font-weight: 600; font-size: 0.95em; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; margin-right: 8px;">${subtitle}</span>`;
            } else {
                return `<span style="color: #6b7280; font-weight: 500; font-size: 0.9em; font-style: italic;">${subtitle}</span>`;
            }
        });
        
        return formatted;
    }

    fallbackFormatting(html) {
        // Format lama sebagai fallback
        let formatted = html;
        // Heading
        formatted = formatted.replace(/🎯\s*OVERVIEW:?/i, '<h4 style="margin-bottom:4px">🎯 OVERVIEW</h4><ul style="margin-top:0">');
        formatted = formatted.replace(/📝\s*KEY HIGHLIGHTS:?/i, '</ul><br><h4 style="margin-bottom:4px">📝 KEY HIGHLIGHTS</h4><ul style="margin-top:0">');
        formatted = formatted.replace(/💡\s*QUICK INSIGHTS:?/i, '</ul><br><h4 style="margin-bottom:4px">💡 QUICK INSIGHTS</h4><ul style="margin-top:0">');
        // Bullet point: baris diawali - atau baris setelah heading
        formatted = formatted.replace(/\n-\s*/g, '\n<li>');
        formatted = formatted.replace(/<ul style="margin-top:0">\s*([^<\n-]+)/g, function(match, p1) {
            // Untuk baris pertama setelah heading tanpa -
            return `<ul style="margin-top:0"><li>${p1.trim()}`;
        });
        // Baris Type, Main Topic, Target Audience jadi bold
        formatted = formatted.replace(/(<li>\s*)(Type|Main Topic|Target Audience):/g, '$1<b>$2:</b>');
        // Tutup ul di akhir
        if (formatted.match(/<ul/)) formatted += '</ul>';
        // Bersihkan double ul
        formatted = formatted.replace(/<ul><ul>/g, '<ul>');
        formatted = formatted.replace(/<\/ul><\/ul>/g, '</ul>');
        // Hapus <ul> kosong
        formatted = formatted.replace(/<ul style="margin-top:0">\s*<\/ul>/g, '');
        // Hapus <li> kosong
        formatted = formatted.replace(/<li>\s*<\/li>/g, '');
        return formatted;
    }

    enhancedFallbackFormatting(html) {
        // Enhanced formatting for new format requirements
        let formatted = html;
        
        // Use enhanced title and subtitle detection
        formatted = this.detectAndFormatTitles(formatted);
        
        // Use enhanced bullet point detection
        formatted = this.detectAndFormatBulletPoints(formatted);
        
        // Clean up any remaining formatting issues
        formatted = formatted.replace(/\n\s*\n/g, '<br>');
        
        return formatted;
    }
}

// Initialize popup controller when DOM is ready

document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
    
    // Enhanced chat input functionality
    const questionInput = document.getElementById('questionInput');
    const sendBtn = document.getElementById('sendQuestionBtn');
    const charCount = document.getElementById('charCount');
    
    if (questionInput && sendBtn && charCount) {
        // Auto-resize textarea
        questionInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            
            // Update character count
            const count = this.value.length;
            charCount.textContent = count;
            
            // Enable/disable send button
            sendBtn.disabled = this.value.trim().length === 0;
            
            // Color change for character limit
            if (count > 450) {
                charCount.style.color = '#ef4444';
            } else if (count > 400) {
                charCount.style.color = '#f59e0b';
            } else {
                charCount.style.color = '#9ca3af';
            }
        });
        
        // Send button click
        sendBtn.addEventListener('click', function() {
            if (questionInput.value.trim()) {
                // Trigger the existing send question functionality
                const event = new Event('click');
                document.getElementById('sendQuestionBtn').dispatchEvent(event);
            }
        });
        
        // Ensure send button is properly enabled/disabled
        function updateSendButtonState() {
            if (sendBtn && questionInput) {
                const hasText = questionInput.value.trim().length > 0;
                sendBtn.disabled = !hasText;
                
                // Visual feedback
                if (hasText) {
                    sendBtn.style.opacity = '1';
                    sendBtn.style.cursor = 'pointer';
                } else {
                    sendBtn.style.opacity = '0.6';
                    sendBtn.style.cursor = 'not-allowed';
                }
            }
        }
        
        // Update button state on input
        questionInput.addEventListener('input', updateSendButtonState);
        
        // Initial state
        updateSendButtonState();
        
        // Enter key to send (Shift+Enter for new line)
        questionInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (this.value.trim()) {
                    // Trigger the existing send question functionality
                    const event = new Event('click');
                    document.getElementById('sendQuestionBtn').dispatchEvent(event);
                }
            }
        });
        
        // Focus management
        questionInput.addEventListener('focus', function() {
            this.parentElement.parentElement.style.transform = 'translateY(-2px)';
        });
        
        questionInput.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.parentElement.style.transform = 'translateY(0)';
            }
        });
    }
    
    // Settings Button Functionality - REMOVED DUPLICATE EVENT LISTENER
    // The settings button is already handled in the PopupController class constructor
    console.log('Settings button functionality is handled by PopupController class');
});
