/**
 * Test Script untuk IntentKit Agent API
 * Menguji apakah API handler bekerja dengan benar
 */

// Simulasi API Handler untuk testing di Node.js
class ApiHandler {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://open.service.crestal.network/v1';
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };
    }

    async createChatThread() {
        try {
            console.log('🔄 Creating chat thread...');
            
            const response = await fetch(`${this.baseUrl}/chats`, {
                method: 'POST',
                headers: this.headers
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error Response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ Chat thread created:', data);
            
            if (!data.id) {
                throw new Error('Invalid response: missing id field');
            }
            
            return data.id;
            
        } catch (error) {
            console.error('❌ Error creating chat thread:', error);
            throw error;
        }
    }

    async sendMessage(chatId, messageText) {
        try {
            console.log(`🔄 Sending message to chat ${chatId}:`, messageText);
            
            const requestBody = {
                message: messageText
            };
            
            const response = await fetch(`${this.baseUrl}/chats/${chatId}/messages`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error Response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ Message response:', data);
            
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
            console.error('❌ Error sending message:', error);
            throw error;
        }
    }

    async askQuestionWithContext(chatId, question, url) {
        try {
            const contextualMessage = `Untuk menjawab pertanyaan berikut, silakan gunakan skill 'web_crawler.crawl_and_index_website' untuk menganalisis konten dari: ${url}

Pertanyaan: ${question}

Mohon berikan jawaban yang akurat berdasarkan konten dari URL tersebut.`;
            
            return await this.sendMessage(chatId, contextualMessage);
        } catch (error) {
            console.error('❌ Error asking question with context:', error);
            throw error;
        }
    }

    async validateApiKey() {
        try {
            console.log('🔄 Validating API key...');
            const chatId = await this.createChatThread();
            console.log('✅ API key validation successful, chat ID:', chatId);
            return true;
        } catch (error) {
            console.error('❌ API key validation failed:', error);
            return false;
        }
    }
}

// Fungsi testing utama
async function runTests() {
    console.log('🧪 Starting IntentKit API Tests...\n');
    
    // Gunakan API key yang diberikan
    const apiKey = 'sk-bb1b4da1bdb4c57fdfb39c60d9a99a0b6dfa81cca40895175b5da9bc63c12c58';
    
    console.log('🔑 Using provided API key:', apiKey.substring(0, 10) + '...');
    
    try {
        const apiHandler = new ApiHandler(apiKey);
        
        // Test 1: Validate API Key
        console.log('📝 Test 1: API Key Validation');
        const isValid = await apiHandler.validateApiKey();
        if (!isValid) {
            console.log('❌ API Key validation failed. Cannot proceed with other tests.');
            return;
        }
        console.log('✅ API Key is valid!\n');
        
        // Test 2: Create Chat Thread
        console.log('📝 Test 2: Create Chat Thread');
        const chatId = await apiHandler.createChatThread();
        console.log(`✅ Chat thread created with ID: ${chatId}\n`);
        
        // Test 3: Send Simple Message
        console.log('📝 Test 3: Send Simple Message');
        const simpleResponse = await apiHandler.sendMessage(chatId, 'Hello! Can you help me?');
        console.log('✅ Simple message response:', simpleResponse);
        console.log('');
        
        // Test 4: Ask Question with URL Context
        console.log('📝 Test 4: Ask Question with URL Context');
        const testUrl = 'https://github.com/crestalnetwork/intentkit/blob/main/docs/agent_api.md';
        const question = 'Bagaimana cara menggunakan API ini?';
        
        console.log(`🔄 Testing with URL: ${testUrl}`);
        console.log(`🔄 Question: ${question}`);
        
        const contextResponse = await apiHandler.askQuestionWithContext(chatId, question, testUrl);
        console.log('✅ Contextual response:', contextResponse);
        console.log('');
        
        console.log('🎉 All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

// Jalankan tests jika file ini dijalankan langsung
if (typeof window === 'undefined') {
    // Running in Node.js
    try {
        const fetch = require('node-fetch');
        global.fetch = fetch;
        runTests();
    } catch (err) {
        console.error('❌ Failed to require node-fetch:', err);
        console.log('💡 Try running: npm install node-fetch@2');
    }
} else {
    // Running in browser
    console.log('Use runTests() function to start testing');
}

// Export untuk penggunaan di browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiHandler, runTests };
} else if (typeof window !== 'undefined') {
    window.ApiHandler = ApiHandler;
    window.runTests = runTests;
}
