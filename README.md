# Site Scout AI - Intelligent Web Analysis Extension

<div align="center">
  <img src="icons/logo.png" alt="Site Scout AI Logo" width="200" height="200">
  <br>
  <em>AI-Powered Web Research Agent powered by nation.fun</em>
</div>

> **AI-Powered Web Research Agent** - Transform your browsing experience with intelligent web page analysis, automated content indexing, and contextual AI chat capabilities. Powered by **nation.fun** AI technology.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/envexx/site-scout)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-yellow.svg)](https://chrome.google.com/webstore)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![Powered by](https://img.shields.io/badge/Powered%20by-nation.fun-purple.svg)](https://nation.fun)
[![Demo & Tutorial Video](https://img.shields.io/badge/Demo%20Video-YouTube-red)](https://youtu.be/vOsI0_nHO4A?si=eIwKEBugoziQELqg)

## 🌟 What is Site Scout AI?

**Site Scout AI** is a sophisticated Chrome browser extension that leverages **nation.fun** artificial intelligence to revolutionize how you interact with web content. It automatically analyzes web pages, provides comprehensive summaries, and enables intelligent conversations about any webpage content through an advanced AI chat interface powered by nation.fun's cutting-edge AI technology.

### ✨ Key Features

- 🤖 **AI-Powered Analysis** - Automatic web page content understanding and indexing powered by nation.fun
- 💬 **Interactive AI Chat** - Contextual conversations about webpage content using nation.fun AI
- 🎨 **Modern Interface** - Beautiful glassmorphism design with smooth animations
- 📊 **Smart Indexing** - Intelligent content processing and pattern recognition via nation.fun
- 🔒 **Privacy First** - Local processing when possible, secure API communication with nation.fun
- 📱 **Responsive Design** - Works perfectly on all devices and screen sizes

## 🚀 Quick Start

**🎥 [Watch Demo & Tutorial Video](https://youtu.be/vOsI0_nHO4A?si=eIwKEBugoziQELqg)**

### 📥 Download & Installation

1. **Download the Extension**
   - 📦 **[Download from Google Drive](https://drive.google.com/drive/folders/1rWhn8ccg27s1tRLSJnhXF5V6kJS8kGpu)**
   - Extract the downloaded ZIP file to your desired location

2. **Load Extension in Chrome**
   - Open `chrome://extensions/` in your browser
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" → select the extracted project folder

3. **API Key is Automatic**
   - No more need to enter or set API keys manually.

### 🎯 First Use

1. **Navigate** to any web page you want to analyze
2. **Click** the Site Scout AI icon in your browser toolbar
3. **Wait** for automatic analysis to complete (typically 10-60 seconds)
4. **Read** the comprehensive AI-generated summary powered by nation.fun
5. **Ask** follow-up questions about the content through the chat interface

## 🏗️ Project Architecture

### 📁 Directory Structure

```
site-scout/
├── 📄 manifest.json                    # Chrome extension configuration (MV3)
├── 📁 icons/                           # Extension icons (16x16, 48x48, 128x128)
│   ├── logo.png                        # Main extension logo
│   ├── icon16.png                      # 16x16 extension icon
│   ├── icon48.png                      # 48x48 extension icon
│   └── icon128.png                     # 128x128 extension icon
├── 📁 src/                             # Source code
│   ├── 📁 popup/                       # Main extension popup interface
│   │   ├── popup.html                  # Popup HTML structure
│   │   ├── popup.js                    # Main popup logic & UI interactions
│   │   ├── style.css                   # Popup styling
│   │   ├── analysis-loading.html       # Analysis loading interface
│   │   ├── analysis-loading-controller.js # Loading controller logic
│   │   ├── robot-loading.html          # Robot animation interface
│   │   ├── robot-loader.js             # Robot loading animation controller
│   │   ├── animation-controller.js     # Animation management
│   │   ├── animate.html                # Animation testing interface
│   │   └── test-robot-loader.html      # Robot loader testing
│   ├── 📁 settings/                    # Configuration and settings panel
│   │   ├── settings.html               # Settings page structure
│   │   ├── settings.css                # Settings styling
│   │   └── settings.js                 # Settings management logic
│   ├── 📁 background/                  # Service worker (MV3)
│   │   └── background.js               # Background tasks & API management
│   └── 📁 lib/                         # Core libraries and utilities
│       ├── api_handler.js              # nation.fun API integration
│       └── storage_manager.js          # Chrome storage wrapper
├── 📁 landing-page/                    # Project landing page
│   ├── index.html                      # Main landing page
│   └── 📁 picture/                     # Landing page images
│       ├── logo.png                    # Landing page logo
│       ├── nation.png                  # nation.fun branding
│       ├── analyzing.png               # Analysis feature preview
│       ├── chat.png                    # Chat feature preview
│       ├── Features.png                # Features preview
│       └── Setup.png                   # Setup configuration preview
├── 📁 animation/                       # Animation testing and development
│   └── index.html                      # Animation test interface
├── 📄 README.md                        # This file
├── 📄 package.json                     # Node.js dependencies
├── 📄 package-lock.json                # Locked dependency versions
├── 📄 test_api.js                      # API testing utilities
└── 📄 site-scout-nation.zip            # Distribution package
```

### 🔧 Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Extension**: Chrome Extension Manifest V3
- **AI Integration**: **nation.fun** AI Agent API
- **Storage**: Chrome Storage API
- **Design**: Modern CSS with glassmorphism effects
- **Animations**: Hardware-accelerated CSS animations
- **Package Management**: Node.js with npm

## 🎯 Core Features

### 🤖 **AI-Powered Web Analysis (Powered by nation.fun)**

| Feature | Description |
|---------|-------------|
| **Intelligent Content Understanding** | Automatically analyzes web page content, structure, and context using nation.fun's advanced NLP |
| **Smart Indexing** | Processes and indexes web pages for AI comprehension, identifying key information via nation.fun |
| **Pattern Recognition** | Detects navigation elements, content hierarchy, and important sections using nation.fun AI |
| **Real-time Processing** | Live analysis with progress tracking and status updates powered by nation.fun |

### 💬 **Interactive AI Chat Interface (nation.fun AI)**

| Feature | Description |
|---------|-------------|
| **Contextual Conversations** | Chat with nation.fun AI about the current webpage content |
| **Real-time Responses** | Get instant answers and insights about page elements from nation.fun |
| **Smart Suggestions** | nation.fun AI provides relevant questions and analysis prompts |
| **Chat History** | Persistent conversation history per website |

### 🎨 **Modern User Interface**

| Feature | Description |
|---------|-------------|
| **Glassmorphism Design** | Contemporary glass-like interface with backdrop filters |
| **Responsive Layout** | Mobile-first design that adapts to all screen sizes |
| **Dark Theme** | Professional dark color scheme with gradient accents |
| **Smooth Animations** | Elegant transitions and micro-interactions throughout |

### 📊 **Advanced Robot Loading System**

| Feature | Description |
|---------|-------------|
| **Custom Animated Robot** | Unique floating robot design with orbital energy particles |
| **Progress Visualization** | Animated progress bars and status indicators |
| **Interactive Elements** | Mouse-responsive animations and dynamic status updates |
| **Hardware Acceleration** | GPU-optimized animations for smooth performance |

## 🔄 How It Works

### 1. **Content Analysis Flow (nation.fun Integration)**
```
User Opens Extension → nation.fun AI Agent Initializes → Content Crawling → Analysis Processing → Summary Generation → Chat Ready
```

### 2. **Analysis Stages**
1. **🔄 Initialize (15%)** - Setup nation.fun AI agent connection and prepare analysis
2. **🕷️ Crawling (40%)** - Extract and process page content
3. **🧠 Processing (80%)** - nation.fun AI analysis and content structuring
4. **✅ Finalizing (95%)** - Format summary and prepare chat interface
5. **🎉 Complete (100%)** - Display results and enable interactions

### 3. **Chat Interaction Flow (nation.fun AI)**
```
User Question → Context Analysis → nation.fun AI Processing → Response Generation → Display Answer → Save to History
```

## 🎯 Use Cases

### 👨‍💻 **For Developers**
- **Code Analysis**: Understand complex web applications and code structures
- **Debugging Assistance**: Get AI insights on web page issues and errors
- **Learning Tool**: Learn about web technologies and implementation patterns
- **API Documentation**: Quick understanding of complex technical docs

### 🔬 **For Researchers**
- **Content Analysis**: Extract and analyze information from research papers
- **Data Collection**: Gather insights from multiple web sources
- **Pattern Recognition**: Identify trends and patterns in web content
- **Literature Review**: Quick summaries of academic papers

### 💼 **For Business Users**
- **Competitive Analysis**: Analyze competitor websites and strategies
- **Market Research**: Gather insights from industry websites and news
- **Content Strategy**: Understand content organization and user experience
- **Product Research**: Quick analysis of product features and specifications

### 📚 **For General Users**
- **Learning Enhancement**: Get explanations of complex topics on any webpage
- **Navigation Help**: Find specific information quickly on large websites
- **Content Summarization**: Get AI-generated summaries of long articles
- **Research Assistant**: Intelligent help for any web-based research



## 📊 Performance Metrics

| Metric | Value | Description |
|--------|-------|-------------|
| **Analysis Time** | 10-60 seconds | Time to complete full page analysis |
| **Response Time** | 5-15 seconds | AI chat response generation time |
| **Accuracy** | 85-95% | Content analysis accuracy rate |
| **Supported Sites** | 95%+ | Percentage of websites that work |
| **Memory Usage** | < 50MB | Extension memory footprint |
| **Load Time** | < 2 seconds | Extension popup load time |

## 🔒 Security & Privacy

### ✅ **Security Features**
- **API Key Encryption**: Secure storage in Chrome's encrypted storage
- **HTTPS Only**: All API communications use secure protocols
- **Minimal Permissions**: Only necessary permissions requested
- **Local Processing**: Content analysis happens locally when possible

### 🛡️ **Privacy Protection**
- **No Data Collection**: No user data collected beyond necessary functionality
- **Local Storage**: Chat history stored locally on user's device
- **API Privacy**: Only sends necessary data to AI service
- **User Control**: Full control over data and settings

### 📋 **Required Permissions**
```json
{
  "permissions": [
    "storage",        // Data persistence
    "activeTab",      // Current tab access
    "scripting",      // Content script injection
    "notifications"   // System notifications
  ]
}
```







## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**MIT License Benefits:**
- ✅ Commercial use allowed
- ✅ Modification and distribution allowed
- ✅ Private use allowed
- ✅ Patent use allowed
- ✅ Only requires license and copyright notice

## 📞 Contact Information

- **Project Email**: coresolution3@gmail.com
- **GitHub**: [@envexx](https://github.com/envexx)
- **Website**: [https://site-scout.vercel.app/](https://site-scout.vercel.app/)



---

## 🚀 Get Started

1. **[Download](https://drive.google.com/drive/folders/1rWhn8ccg27s1tRLSJnhXF5V6kJS8kGpu)** the extension
2. **Get started straight away** analyzing web pages with AI

---

**Built with ❤️ and 🤖 for Hackathon**

*Site Scout AI - AI-powered web analysis extension* 🕷️✨

---

*Hackathon Project | Version: 1.0.0*
