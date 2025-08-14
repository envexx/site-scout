/**
 * API Handler - Manages all communication with IntentKit Agent API
 * Abstracts fetch calls to API endpoints based on official documentation
 */

class ApiHandler {
    constructor(apiKey) {
        this.apiKey = apiKey;
        // Base URL according to IntentKit documentation
        this.baseUrl = 'https://open.service.crestal.network/v1';
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };
    }

    /**
     * Creates a new chat thread according to IntentKit documentation
     * @returns {Promise<string>} chat_id of the created thread
     */
    async createChatThread() {
        try {
            console.log('Creating chat thread with IntentKit API...');
            
            const response = await fetch(`${this.baseUrl}/chats`, {
                method: 'POST',
                headers: this.headers
                // Empty body as per documentation: curl -X POST "/v1/chats"
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            console.log('Chat thread created:', data);
            
            // According to documentation, response contains "id" field
            if (!data.id) {
                throw new Error('Invalid response: missing id field');
            }
            
            return data.id;
            
        } catch (error) {
            console.error('Error creating chat thread:', error);
            throw new Error(`Failed to create chat thread: ${error.message}`);
        }
    }

    /**
     * Send message to chat thread according to IntentKit documentation
     * @param {string} chatId - Chat thread ID
     * @param {string} messageText - Message text
     * @param {boolean} stream - Whether to use streaming response
     * @returns {Promise<string>} Agent reply
     */
    async sendMessage(chatId, messageText, stream = false) {
        try {
            console.log(`Sending message to chat ${chatId}:`, messageText);
            
            const requestBody = {
                message: messageText
            };
            
            // Add streaming if needed
            if (stream) {
                requestBody.stream = true;
            }
            
            const response = await fetch(`${this.baseUrl}/chats/${chatId}/messages`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            console.log('Message response:', data);
            
            // According to documentation, response is an array of messages
            // Get the last message from agent
            if (Array.isArray(data) && data.length > 0) {
                // Cari message terakhir dari agent (bukan skill atau API)
                const agentMessage = data.reverse().find(msg => msg.author_type === 'agent' && msg.message && msg.message.trim() !== '');
                if (agentMessage && agentMessage.message) {
                    return agentMessage.message;
                }
                // Fallback ke message terakhir yang ada content
                const lastMessage = data.find(msg => msg.message && msg.message.trim() !== '');
                return lastMessage ? lastMessage.message : 'No response from agent';
            }
            
            throw new Error('Invalid response format from API');
            
        } catch (error) {
            console.error('Error sending message:', error);
            throw new Error(`Failed to send message: ${error.message}`);
        }
    }

    /**
     * Send question with URL context for on-demand crawling
     * @param {string} chatId - Chat thread ID
     * @param {string} question - User question
     * @param {string} url - URL to analyze
     * @returns {Promise<string>} Agent response
     */
    async askQuestionWithContext(chatId, question, url) {
        try {
            // Create question with URL context for on-demand analysis with depth specification
            const contextualMessage = `To answer the following question, please use the 'web_crawler.crawl_and_index_website' skill to analyze content from: ${url}

Crawling Parameters:
- Depth: 1 (main page content only)
- Focus: Extract relevant information to answer the question

Question: ${question}

Please provide an accurate answer based on the content from that URL.`;
            
            return await this.sendMessage(chatId, contextualMessage);
        } catch (error) {
            console.error('Error asking question with context:', error);
            throw error;
        }
    }

    /**
     * Alias for compatibility with existing code
     */
    async askQuestion(chatId, question) {
        return await this.sendMessage(chatId, question);
    }

    /**
     * Validate API key by making a test request
     * @returns {Promise<boolean>} true if API key is valid
     */
    async validateApiKey() {
        try {
            console.log('Validating API key...');
            // Test by creating a chat thread
            const chatId = await this.createChatThread();
            console.log('API key validation successful, chat ID:', chatId);
            return chatId ? true : false;
        } catch (error) {
            console.error('API key validation failed:', error);
            return false;
        }
    }

    /**
     * Get chat thread information (if needed)
     * @param {string} chatId - Chat thread ID
     * @returns {Promise<Object>} Thread information
     */
    async getChatInfo(chatId) {
        try {
            // According to documentation, we can get chat info if needed
            const response = await fetch(`${this.baseUrl}/chats/${chatId}`, {
                method: 'GET',
                headers: this.headers
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            return await response.json();
            
        } catch (error) {
            console.error('Error getting chat info:', error);
            throw error;
        }
    }

    /**
     * Update API key
     * @param {string} newApiKey - New API key
     */
    updateApiKey(newApiKey) {
        this.apiKey = newApiKey;
        this.headers.Authorization = `Bearer ${newApiKey}`;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiHandler;
} else if (typeof window !== 'undefined') {
    window.ApiHandler = ApiHandler;
}
