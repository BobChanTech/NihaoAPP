import VocabDB from './vocab-db.js';
import paymentManager from './payment.js';
import ShareManager from './managers/share-manager.js';
import SearchManager from './managers/search-manager.js';
import SimpleSpeechManager from './managers/speech-manager.js';
import StrokeManager from './managers/stroke-manager.js';
import FavoritesManager from './managers/favorites-manager.js';
import DisplayManager from './managers/display-manager.js';
import DataManager from './managers/data-manager.js';

/**
 * 中文词汇学习应用 - 强力修复版/双存储收藏集成
 */
class ChineseVocabApp {
    constructor() {
        this.db = new VocabDB();
        this.currentWords = [];
        this.currentAudio = null;
        this.isDataLoaded = false;
        this.dataVersion = '1.0.4';
        this.lastUpdateTime = null;
        this.userLanguage = localStorage.getItem('userLanguage') || 'vi';
        this.currentIndex = 0;
        this.updateAvailable = false;
        this.updateInfo = null;
        this.isUpdating = false;

        // 意见反馈计数器
        this.feedbackViewCount = 0;      // 浏览词条计数
        this.feedbackOperationCount = 0; // 操作计数（搜索+笔画+发音+收藏）
        this.FEEDBACK_THRESHOLD = 50;    // 触发阈值（浏览50个词条或累计50次操作）

        // 初始化管理器
        this.shareManager = new ShareManager();
        this.searchManager = new SearchManager(this);
        this.speechManager = new SimpleSpeechManager(this);
        this.strokeManager = new StrokeManager(this);
        this.favoritesManager = new FavoritesManager(this);
        this.displayManager = new DisplayManager(this);
        this.dataManager = new DataManager(this);

        // 初始化UI引用与事件
        this.initElements();
        this.initEventListeners();
        this.initServiceWorkerListener();
        console.log('应用: 初始化完成，版本:', this.dataVersion);
    }

    normalizeVersion(version) {
        if (!version) return [0, 0, 0];
        const normalized = version.toString().trim().replace(/[^\d.]/g, '');
        if (!normalized) return [0, 0, 0];
        return normalized.split('.').map(Number);
    }

    compareVersions(v1, v2) {
        const v1Parts = this.normalizeVersion(v1);
        const v2Parts = this.normalizeVersion(v2);
        
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const num1 = v1Parts[i] || 0;
            const num2 = v2Parts[i] || 0;
            if (num1 > num2) return 1;
            if (num1 < num2) return -1;
        }
        return 0;
    }

    initServiceWorkerListener() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                console.log('应用收到Service Worker消息:', event.data);
                if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
                    this.handleUpdateAvailable(event.data);
                }
            });
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ 
                    type: 'GET_VERSION',
                    currentVersion: this.dataVersion 
                });
            }
        }
    }

    handleUpdateAvailable(updateData) {
        console.log('应用: 处理版本更新通知:', updateData);
        if (this.isUpdating) {
            console.log('应用: 正在更新中，跳过此次通知');
            return;
        }
        const serverVersion = updateData.newVersion;
        // 如果没有服务器版本信息，不显示更新提示
        if (!serverVersion) {
            console.log('应用: 未收到有效的服务器版本信息，跳过更新提示');
            return;
        }
        const comparisonResult = this.compareVersions(serverVersion, this.dataVersion);
        if (comparisonResult <= 0) {
            console.log('应用: 已是最新版本，跳过更新提示');
            return;
        }
        this.updateAvailable = true;
        this.updateInfo = updateData;
        this.updateVersionDisplay(serverVersion);
        this.showUpdateButton();
        this.showToast(`发现新版本 ${serverVersion}，请点击更新按钮下载最新数据`, 'info', 8000);
    }

    showUpdateButton() {
        const updateBtn = document.getElementById('checkUpdate');
        if (updateBtn) {
            updateBtn.textContent = '🔄 有新版本';
            updateBtn.classList.add('update-available');
            updateBtn.style.background = '#4CAF50';
            updateBtn.style.color = 'white';
            updateBtn.title = '点击下载最新版本和功能';
        }
    }

    updateVersionDisplay(newVersion) {
        const dataVersionElement = document.getElementById('dataVersion');
        if (dataVersionElement) {
            dataVersionElement.textContent = `v${newVersion}`;
        }
    }

    showStrokeOrder(word = null) {
        // 支持传入 word 参数（用于搜索结果预览模式）
        let currentWord = word;
        
        // 如果没有传入 word，则从当前浏览位置获取
        if (!currentWord) {
            currentWord = this.currentWords && this.currentWords[this.currentIndex];
        }
        
        // 添加调试日志以便通过F12控制台追踪问题
        console.log('Stroke Order Debug - Current Word:', currentWord);
        console.log('Stroke Order Debug - Current Words Array:', this.currentWords);
        console.log('Stroke Order Debug - Current Index:', this.currentIndex);
        
        if (!currentWord) {
            console.warn('Stroke Order Debug - No current word selected');
            this.showToast('请先选择一个词汇再查看笔画顺序', 'info');
            return;
        }
        
        console.log('Stroke Order Debug - Calling strokeManager.showStrokeOrder with word:', currentWord);
        // 修改调用方式，确保正确传递参数
        if (this.strokeManager && typeof this.strokeManager.showStrokeOrder === 'function') {
            return this.strokeManager.showStrokeOrder(currentWord);
        } else {
            console.error('Stroke Order Debug - strokeManager not available or showStrokeOrder is not a function');
            this.showToast('笔画顺序功能暂时不可用', 'error');
            return Promise.resolve(false);
        }
    }

    initElements() {
        this.wordGrid = document.getElementById('wordGrid');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.noResults = document.getElementById('noResults');
        this.totalWordsElement = document.getElementById('totalWords');
        this.displayCountElement = document.getElementById('displayCount');
        this.dataVersionElement = document.getElementById('dataVersion');
        this.dataStatusElement = document.getElementById('dataStatus');
        this.lastUpdatedElement = document.getElementById('lastUpdated');
        this.exportBtn = document.getElementById('exportData');
        this.clearBtn = document.getElementById('clearData');
        this.updateBtn = document.getElementById('checkUpdate');
        this.importModal = document.getElementById('importModal');
        this.fileInput = document.getElementById('fileInput');
        this.cancelImportBtn = document.getElementById('cancelImport');
        this.confirmImportBtn = document.getElementById('confirmImport');
        this.favoriteBtn = document.getElementById('favorite-btn');
        this.favoritesBtn = document.getElementById('favorites-btn');
        this.strokeBtn = document.getElementById('stroke-btn');
    }

    safeSetText(el, text) { if (el) el.textContent = text; }
    safeSetDisplay(el, value) { if (el && el.style) el.style.display = value; }
    safeSetValue(el, value) { if (el) el.value = value; }

    get isDesktop() {
        return typeof window.isDesktopDevice === 'function'
            ? window.isDesktopDevice() : this.isDesktopFallback();
    }

    isDesktopFallback() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        return !isMobile;
    }

    initDesktopInteraction() {
        if (!this.isDesktop) return;
        const container = document.querySelector('.cards-container');
        if (!container) return;
        const prevBtn = document.createElement('button');
        prevBtn.id = 'prev-vocab';
        prevBtn.className = 'desktop-nav-btn';
        prevBtn.textContent = '‹';
        prevBtn.style.cssText = `
            position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.7); color: white; border: none;
            border-radius: 50%; width: 50px; height: 50px; font-size: 24px;
            cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center;
        `;
        const nextBtn = document.createElement('button');
        nextBtn.id = 'next-vocab';
        nextBtn.className = 'desktop-nav-btn';
        nextBtn.textContent = '›';
        nextBtn.style.cssText = `
            position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.7); color: white; border: none;
            border-radius: 50%; width: 50px; height: 50px; font-size: 24px;
            cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center;
        `;
        container.style.position = 'relative';
        container.appendChild(prevBtn);
        container.appendChild(nextBtn);
        prevBtn.addEventListener('click', async () => await this.searchManager.prevSameLength());
        nextBtn.addEventListener('click', async () => await this.searchManager.nextSameLength());
        document.addEventListener('keydown', async (e) => {
            if (e.key === 'ArrowLeft') { e.preventDefault(); await this.searchManager.prevSameLength(); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); await this.searchManager.nextSameLength(); }
        });
    }

        initEventListeners() {
        if (this.exportBtn) this.exportBtn.addEventListener('click', () => this.exportData());
        if (this.clearBtn) this.clearBtn.addEventListener('click', () => this.confirmClearData());
        if (this.updateBtn) this.updateBtn.addEventListener('click', () => this.performUpdate());

        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                if (this.confirmImportBtn) this.confirmImportBtn.disabled = !e.target.files.length;
            });
        }
        if (this.cancelImportBtn) {
            this.cancelImportBtn.addEventListener('click', () => {
                if (this.importModal) this.importModal.style.display = 'none';
                if (this.fileInput) this.fileInput.value = '';
            });
        }
        if (this.confirmImportBtn) {
            this.confirmImportBtn.addEventListener('click', () => this.importData());
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.importModal) this.importModal.style.display = 'none';
            }
        });

        this.favoritesManager.initEventListeners();

        const shareBtn = document.getElementById('share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => { this.shareCurrentWord(); });
        }
        const strokeBtn = document.getElementById('stroke-btn');
        if (strokeBtn) {
            strokeBtn.addEventListener('click', () => { 
                // Call the updated stroke order function that supports multi-character words
                try {
                    console.log('Stroke Button Clicked - Starting stroke order display process');
                    this.showStrokeOrder();
                    // 记录笔画操作
                    this.recordOperation('stroke');
                } catch (error) {
                    console.error('Error showing stroke order:', error);
                    this.showToast('无法显示笔画顺序，请稍后重试', 'error');
                }
            });
        }

        // 初始化意见反馈模态框事件
        this.initFeedbackModalListeners();

        const container = document.querySelector('.cards-container');
        if (container) {
            let touchStartX = 0, touchStartY = 0, ANGLE = 1.2, isHorizontalSwipe = false;
            container.addEventListener('touchstart', (e) => {
                const t = e.touches[0];
                touchStartX = t.clientX; touchStartY = t.clientY; isHorizontalSwipe = false;
            }, { passive: true });
            container.addEventListener('touchmove', (e) => {
                if (isHorizontalSwipe) return;
                const t = e.touches[0];
                const dx = t.clientX - touchStartX, dy = t.clientY - touchStartY;
                if (Math.abs(dx) > Math.abs(dy) * ANGLE) {
                    isHorizontalSwipe = true; e.preventDefault();
                }
            }, { passive: false });
            container.addEventListener('touchend', async (e) => {
                if (!isHorizontalSwipe) return;
                const t = e.changedTouches[0], dx = t.clientX - touchStartX;
                dx < 0 ? await this.searchManager.nextSameLength() : await this.searchManager.prevSameLength();
                e.preventDefault();
            }, { passive: true });
        }

        window.addEventListener('languageSelected', (e) => {
            const code = e?.detail?.language;
            if (code) { this.setLearningLanguage(code); }
        });
    }

    showToast(message, type = 'info', duration = 1800) {
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'block';
        requestAnimationFrame(() => toast.classList.add('show'));
        if (this._toastTimer) clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.style.display = 'none', 260);
        }, duration);
    }

    /**
     * 显示多汉字提示模态框
     */
    showStrokeWarningModal() {
        // Get error message
        let nativeTip = '';
        let englishTip = '';
        
        if (window.languageManager) {
            const nativeLang = window.languageManager.currentLanguage?.code || 'vi';
            nativeTip = window.languageManager.getTranslation(nativeLang, 'strokeSingleCharOnly');
            englishTip = window.languageManager.getTranslation('en', 'strokeSingleCharOnly');
        } else {
            nativeTip = '笔顺功能只支持一个汉字';
            englishTip = 'This function only supports single Chinese characters, please select one character by click 【一】 in the bottom left to display stroke order.';
        }
        
        // Get modal elements
        const modal = document.getElementById('stroke-warning-modal');
        const content = document.getElementById('stroke-warning-content');
        const closeBtn = document.getElementById('close-stroke-warning');
        
        if (!modal || !content || !closeBtn) {
            console.error('多汉字提示模态框元素未找到');
            this.showToast(`${nativeTip}\n${englishTip}`, 'info');
            return;
        }
        
        // Set content
        content.innerHTML = `
            <div class="warning-text english">${englishTip}</div>
        `;
        
        // Show modal
        modal.classList.add('show');
        modal.style.display = 'flex';
        
        // Add event listener for close button
        const closeHandler = () => {
            this.closeStrokeWarningModal();
            closeBtn.removeEventListener('click', closeHandler);
        };
        
        closeBtn.addEventListener('click', closeHandler);
        
        // Add event listener for modal background click
        const modalHandler = (e) => {
            if (e.target === modal) {
                this.closeStrokeWarningModal();
                modal.removeEventListener('click', modalHandler);
            }
        };
        
        modal.addEventListener('click', modalHandler);
    }
    
    /**
     * 关闭多汉字提示模态框
     */
    closeStrokeWarningModal() {
        const modal = document.getElementById('stroke-warning-modal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
        }
    }

    async getWordById(id) {
        return this.dataManager.getWordById(id);
    }

    async showWordById(id) {
        try {
            const word = await this.dataManager.getWordById(id);
            if (!word) return;
            
            // 查找当前词条在原有currentWords数组中的位置
            const index = this.currentWords.findIndex(w => String(w.ID || w.id) === String(id));
            
            if (index !== -1) {
                // 如果在原有数组中找到，直接设置currentIndex并显示
                this.currentIndex = index;
            } else {
                // 如果没找到，保持原currentWords不变，只显示当前词条
                // 这样左右滑动仍会基于原数组
                // 这里不修改currentWords，只调用showWordPreview显示当前词条
            }
            
            await this.showWordPreview(word);
            await this.favoritesManager.updateFavoriteButtonState(word.ID || word.id);
        } catch (e) { console.error('显示词条失败', e); }
    }

    async shareCurrentWord() {
        try {
            const word = this.currentWords && this.currentWords[this.currentIndex];
            if (!word) {
                this.showToast('没有可分享的内容', 'error');
                return;
            }
            
            const result = await this.shareManager.share(word, this.showToast.bind(this));
            if (result && result.success) {
                this.shareManager.recordShare();
                console.log('分享选项已显示:', result.message);
                // 不显示成功提示，让用户自己选择分享类型
            }
        } catch (error) {
            console.error('分享失败:', error);
            // 只在真正的错误时才显示失败提示
            if (error.message && !error.message.includes('取消')) {
                this.showToast('分享失败，请重试', 'error');
            }
        }
    }

    setLearningLanguage(code) {
        if (!code) return;
        this.userLanguage = code;
        localStorage.setItem('userLanguage', code);

        if (window.languageManager && window.languageManager.currentLanguage) {
            const lang = window.languageManager.currentLanguage;
            const labelEl = document.getElementById('native-label');
            if (labelEl) labelEl.textContent = (lang.englishName || lang.name || code).toUpperCase();
        } else {
            const labelEl = document.getElementById('native-label');
            if (labelEl) labelEl.textContent = code.toUpperCase();
        }

        if (this.currentWords && this.currentWords.length > 0) {
            this.searchManager.renderWordCards?.(this.currentWords);
            this.searchManager.updateCard2?.(this.currentWords[0]);
        } else {
            this.searchManager.updateCard2?.(null);
        }
    }

    async showWordPreview(word) {
        await this.displayManager.renderWord(word);
    }

    async showWordAtIndex(index) {
        // 确保currentWords总是有数据
        if (!this.currentWords || this.currentWords.length === 0) {
            // 加载所有词汇作为默认数据
            const allWords = await this.dataManager.getAllWords?.();
            if (allWords && allWords.length > 0) {
                this.currentWords = allWords;
            } else {
                // 如果获取失败，创建默认词汇
                this.currentWords = [{
                    ID: 'default-1',
                    chinese_cn: '你好',
                    pinyin: 'nǐ hǎo',
                    pinyin_no_tone: 'ni hao',
                    english_en: 'hello',
                    hsk_level: 1,
                    word_count: 2,
                    is_premium: false
                }];
            }
        }
        
        // 确保索引有效
        if (index === null || index < 0 || index >= this.currentWords.length) {
            index = 0;
        }
        
        this.currentIndex = index;
        const word = this.currentWords[index];
        
        // 确保word有效
        if (!word) {
            console.error('showWordAtIndex: word is null');
            return;
        }
        
        await this.displayManager.renderWord(word);
        
        // 记录词条浏览（用于意见反馈触发）
        this.recordWordView();
    }

    getTranslationForWord(word) {
        if (!word) return '';
        const map = {
            'vi': 'vietnamese_vn', 'id': 'indonesian_id', 'es': 'spanish_es',
            'de': 'german_de', 'fr': 'french_fr', 'ru': 'russian_ru',
            'hi': 'hindi_hi', 'en': 'english_en', 'ko': 'korean_kr',
            'ja': 'japanese_ja', 'th': 'thai_th', 'my': 'malay_ms',
            'km': 'khmer_km', 'lo': 'lao_lo', 'mya': 'burmese_my', 'bn': 'bengali_bn'
        };
        const field = map[this.userLanguage] || map['en'];
        return word[field] || '';
    }

        async exportData() {
        return this.dataManager.exportData();
    }

    async importData() {
        const file = this.fileInput ? this.fileInput.files[0] : null;
        if (!file) return;
        await this.dataManager.importData(file);
        // 保留UI操作
        this.safeSetDisplay(this.importModal, 'none');
        this.safeSetValue(this.fileInput, '');
    }

    confirmClearData() {
        if (confirm('确定要清除所有本地数据吗？这将删除所有已下载的词汇数据。')) {
            this.clearData();
        }
    }

    async clearData() {
        return this.dataManager.clearData();
    }

    async performUpdate() {
        if (this.isUpdating) {
            return;
        }
        try {
            this.isUpdating = true;
            if (this.updateAvailable && this.updateInfo) {
                this.updateAvailable = false;
                this.updateInfo = null;
                const updateBtn = document.getElementById('checkUpdate');
                if (updateBtn) {
                    updateBtn.textContent = '检查更新';
                    updateBtn.classList.remove('update-available');
                    updateBtn.style.background = '';
                    updateBtn.style.color = '';
                    updateBtn.title = '检查应用更新';
                    updateBtn.disabled = true;
                }
                this.showToast('正在下载最新数据...', 'info');
                try {
                    await this.clearAllCaches();
                    await this.clearLocalDatabase();
                    this.clearLocalStorage();
                    await this.downloadAndStoreData();
                    await this.loadData();
                    this.showToast('更新完成！新数据已加载', 'success');
                } catch (error) {
                    console.error('应用: 更新失败:', error);
                    this.showToast('更新失败: ' + error.message, 'error');
                    this.updateAvailable = true;
                    this.updateInfo = { newVersion: this.dataVersion };
                }
            } else {
                await this.checkForUpdates();
            }
        } finally {
            const updateBtn = document.getElementById('checkUpdate');
            if (updateBtn) {
                updateBtn.disabled = false;
            }
            this.isUpdating = false;
        }
    }

    async clearAllCaches() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_DATABASE_CACHE' });
        }
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
                if (cacheName.includes('chinese-learn')) {
                    await caches.delete(cacheName);
                }
            }
        }
    }

    async clearLocalDatabase() {
        return this.dataManager.clearLocalDatabase();
    }

    clearLocalStorage() {
        this.dataManager.clearLocalStorage();
        // 保留userLanguage的清除逻辑
        localStorage.removeItem('userLanguage');
    }

    async checkForUpdates() {
        try {
            this.updateDataStatus('检查更新中...', 'loading');
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
            } else {
                const response = await fetch('./src/data/version.json');
                if (response.ok) {
                    const versionInfo = await response.json();
                    const serverVersion = versionInfo.version || '1.0.4';
                    if (!this.compareVersions(serverVersion, this.dataVersion)) {
                        if (confirm(`发现新版本 (${serverVersion})，是否下载更新？`)) {
                            await this.downloadAndStoreData();
                            this.showToast('数据更新完成！', 'success');
                        }
                    } else {
                        this.showToast('已经是最新版本', 'info');
                    }
                } else {
                    this.showToast('无法检查更新，请确保网络连接正常', 'info');
                }
            }
        } catch (error) {
            console.error('检查更新失败:', error);
            this.showToast('检查更新失败，可能是网络问题', 'info');
        }
    }

    updateDataStatus(message, type = 'info') {
        if (!this.dataStatusElement) return;
        this.dataStatusElement.textContent = message;
        this.dataStatusElement.className = `status ${type}`;
    }

    async downloadAndStoreData() {
        return this.dataManager.downloadAndStoreData();
    }

    async loadData() {
        return this.dataManager.loadData();
    }

    /**
     * 加载所有词汇到 currentWords
     */
    async loadAllWords() {
        const allWords = await this.dataManager.searchWords({
            searchText: '',
            hskLevel: '',
            wordCount: '',
            hidePremium: false
        });
        
        if (Array.isArray(allWords) && allWords.length > 0) {
            this.currentWords = allWords;
            this.currentIndex = 0;
            console.log('[App] 加载所有词汇:', allWords.length, '条');
        }
    }

    async init() {
        try {
            // 应用付费用户样式
            this.applyPaidUserStyle();

            await this.dataManager.init();
            const hasData = await this.dataManager.hasData();
            if (!hasData) {
                await this.downloadAndStoreData();
            } else {
                await this.loadData();
            }
            this.isDataLoaded = true;
            this.updateDataStatus('数据加载完成', 'success');
            this.searchManager.setDataLoaded(true);
            setTimeout(async () => {
                // 处理URL参数（只有在没有位置记录时才使用）
                const lastWordCount = this.searchManager.getLastWordCount();
                if (!lastWordCount) {
                    const urlParams = new URLSearchParams(window.location.search);
                    const length = urlParams.get('length');
                    if (length) {
                        this.searchManager.currentWordCountFilter = length;
                        const lengthBtn = document.querySelector(`.len-btn[data-length="${length}"]`);
                        if (lengthBtn) lengthBtn.classList.add('active');
                    }
                }
                
                // 初始化时加载词汇（带位置记忆）
                await this.searchManager.initLoadAllWords().catch(error => {
                    console.error('初始化加载词汇失败:', error);
                    // 回退到加载所有词汇
                    this.loadAllWords();
                });
            }, 100);
            this.initDesktopInteraction();
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
            }
        } catch (error) {
            console.error('初始化失败:', error);
            this.updateDataStatus('数据加载失败', 'error');
            this.showToast('初始化失败，请刷新页面重试', 'error');
            // 即使初始化失败，也要显示默认卡片
            await this.showWordAtIndex(0);
        }
    }

    /**
     * 应用付费用户样式
     * 如果是付费用户，在页面容器上添加 is-paid-user 类
     */
    applyPaidUserStyle() {
        // 方法1：检查是否已经有全局的 paymentManager 实例
        if (window.paymentManager && typeof window.paymentManager.isPaidUser === 'function') {
            if (window.paymentManager.isPaidUser()) {
                document.documentElement.classList.add('is-paid-user');
                console.log('付费用户样式已应用（来自全局变量）');
            }
            return;
        }

        // 方法2：通过 import 导入
        import('./payment.js').then(paymentModule => {
            // 获取默认导出或模块本身
            const paymentMgr = paymentModule.default || paymentModule;
            if (paymentMgr && typeof paymentMgr.isPaidUser === 'function') {
                if (paymentMgr.isPaidUser()) {
                    document.documentElement.classList.add('is-paid-user');
                    console.log('付费用户样式已应用（来自模块导入）');
                }
            }
        }).catch(err => {
            console.error('加载 payment.js 失败:', err);
        });
    }

    // ==================== 意见反馈功能 ====================

    /**
     * 初始化意见反馈模态框事件监听器
     */
    initFeedbackModalListeners() {
        const skipBtn = document.getElementById('skip-feedback');
        const submitBtn = document.getElementById('submit-feedback');
        const exportBtn = document.getElementById('export-feedback');
        const modal = document.getElementById('feedback-modal');

        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.closeFeedbackModal(false));
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitFeedback());
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportFeedback());
        }

        // 点击模态框外部关闭
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeFeedbackModal(false);
                }
            });
        }

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
                this.closeFeedbackModal(false);
            }
        });

        // 监听搜索按钮点击
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.recordOperation('search');
            });
        }

        // 监听发音按钮点击
        const speechBtn = document.getElementById('speech-btn');
        if (speechBtn) {
            speechBtn.addEventListener('click', () => {
                this.recordOperation('speech');
            });
        }

        // 监听收藏按钮点击
        const favoritesBtn = document.getElementById('favorites-btn');
        if (favoritesBtn) {
            favoritesBtn.addEventListener('click', () => {
                this.recordOperation('favorites');
            });
        }
    }

    /**
     * 检测是否为iOS设备（简化版，避免性能问题）
     */
    isIOS() {
        const ua = navigator.userAgent;
        return /iPhone|iPad|iPod/.test(ua);
    }

    /**
     * 导出反馈数据为JSON文件
     */
    exportFeedback() {
        // 收集当前表单数据
        const feedbackData = {
            favoriteFeature: document.querySelector('input[name="favorite-feature"]:checked')?.value || '',
            paymentWillingness: document.querySelector('input[name="payment-willingness"]:checked')?.value || '',
            newFeatures: Array.from(document.querySelectorAll('input[name="new-features"]:checked')).map(cb => cb.value),
            suggestion: document.getElementById('feedback-suggestion')?.value || '',
            timestamp: new Date().toISOString(),
            language: this.userLanguage,
            exportedAt: new Date().toISOString()
        };

        // 生成JSON字符串
        const jsonStr = JSON.stringify(feedbackData, null, 2);
        
        // iOS特殊处理
        if (this.isIOS()) {
            this.showIOSExportModal(jsonStr);
            return;
        }
        
        // Android/桌面端：创建Blob对象并下载
        const blob = new Blob([jsonStr], { type: 'application/json' });
        
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `feedback_${new Date().toISOString().slice(0,10)}.json`;
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 释放URL对象
        URL.revokeObjectURL(url);
        
        // 显示提示
        this.showToast(this.getFeedbackText('exportSuccess'), 'success');
        
        // 发送到GA4
        if (typeof gtag !== 'undefined') {
            gtag('event', 'feedback_exported', {
                'has_favorite': feedbackData.favoriteFeature.length > 0,
                'has_willingness': feedbackData.paymentWillingness.length > 0,
                'features_count': feedbackData.newFeatures.length,
                'has_suggestion': feedbackData.suggestion.length > 0
            });
        }
        
        console.log('反馈已导出:', feedbackData);
    }

    /**
     * iOS专用：显示JSON内容供用户复制
     */
    showIOSExportModal(jsonStr) {
        // 创建iOS导出模态框
        let iosModal = document.getElementById('ios-export-modal');
        if (!iosModal) {
            iosModal = document.createElement('div');
            iosModal.id = 'ios-export-modal';
            iosModal.className = 'modal';
            iosModal.style.display = 'none';
            iosModal.innerHTML = `
                <div class="modal-content ios-export-content">
                    <div class="modal-header">
                        <h2>📤 导出反馈</h2>
                        <p class="subtitle">复制以下内容发送到 X</p>
                    </div>
                    <div class="modal-body">
                        <textarea id="ios-export-json" readonly></textarea>
                        <button id="copy-ios-export" class="btn-primary">📋 复制内容</button>
                        <p id="copy-success-msg" class="copy-success" style="display:none;">已复制！请在X私信中粘贴发送</p>
                    </div>
                    <div class="modal-actions">
                        <button id="close-ios-export" class="btn-secondary">关闭</button>
                    </div>
                </div>
            `;
            document.body.appendChild(iosModal);

            // 绑定事件
            document.getElementById('close-ios-export').addEventListener('click', () => {
                iosModal.style.display = 'none';
            });

            document.getElementById('copy-ios-export').addEventListener('click', () => {
                const textarea = document.getElementById('ios-export-json');
                textarea.select();
                document.execCommand('copy');
                document.getElementById('copy-success-msg').style.display = 'block';
                this.showToast('已复制到剪贴板', 'success');
            });

            // 点击外部关闭
            iosModal.addEventListener('click', (e) => {
                if (e.target === iosModal) {
                    iosModal.style.display = 'none';
                }
            });
        }

        // 显示模态框并填充内容
        document.getElementById('ios-export-json').value = jsonStr;
        document.getElementById('copy-success-msg').style.display = 'none';
        iosModal.style.display = 'flex';
    }

    /**
     * 记录浏览词条（每显示一个新词条调用）
     */
    recordWordView() {
        this.feedbackViewCount++;
        console.log(`意见反馈: 已浏览 ${this.feedbackViewCount}/${this.FEEDBACK_THRESHOLD} 个词条`);
        this.checkFeedbackTrigger();
    }

    /**
     * 记录用户操作
     * @param {string} operationType - 操作类型：search, stroke, speech, favorites
     */
    recordOperation(operationType) {
        this.feedbackOperationCount++;
        console.log(`意见反馈: ${operationType}操作，已累计 ${this.feedbackOperationCount}/${this.FEEDBACK_THRESHOLD} 次操作`);
        this.checkFeedbackTrigger();
    }

    /**
     * 检查是否触发反馈模态框
     */
    checkFeedbackTrigger() {
        // 如果已达到阈值，显示反馈模态框
        if (this.feedbackViewCount >= this.FEEDBACK_THRESHOLD || 
            this.feedbackOperationCount >= this.FEEDBACK_THRESHOLD) {
            this.showFeedbackModal();
        }
    }

    /**
     * 显示意见反馈模态框
     */
    showFeedbackModal() {
        const modal = document.getElementById('feedback-modal');
        if (!modal) return;

        // 更新模态框文本为当前语言
        this.updateFeedbackModalText();

        // 更新进度显示
        const totalCount = this.feedbackViewCount + this.feedbackOperationCount;
        const progressText = document.getElementById('feedback-progress-text');
        if (progressText) {
            progressText.textContent = this.getFeedbackText('progress', totalCount);
        }

        // 显示模态框
        modal.style.display = 'flex';

        // 发送到GA4（如果已配置）
        if (typeof gtag !== 'undefined') {
            gtag('event', 'feedback_modal_shown', {
                'view_count': this.feedbackViewCount,
                'operation_count': this.feedbackOperationCount
            });
        }
    }

    /**
     * 关闭意见反馈模态框
     * @param {boolean} isSubmitting - 是否是提交反馈
     */
    closeFeedbackModal(isSubmitting = false) {
        const modal = document.getElementById('feedback-modal');
        if (modal) {
            modal.style.display = 'none';
        }

        // 重置计数器
        this.feedbackViewCount = 0;
        this.feedbackOperationCount = 0;

        // 如果不是提交，清空表单
        if (!isSubmitting) {
            this.clearFeedbackForm();
        }

        console.log('意见反馈模态框已关闭，计数器已重置');
    }

    /**
     * 提交反馈
     */
    submitFeedback() {
        // 收集反馈数据
        const feedbackData = {
            favoriteFeature: document.querySelector('input[name="favorite-feature"]:checked')?.value || '',
            paymentWillingness: document.querySelector('input[name="payment-willingness"]:checked')?.value || '',
            newFeatures: Array.from(document.querySelectorAll('input[name="new-features"]:checked')).map(cb => cb.value),
            suggestion: document.getElementById('feedback-suggestion')?.value || '',
            timestamp: new Date().toISOString(),
            language: this.userLanguage
        };

        console.log('收集到反馈数据:', feedbackData);

        // 保存到 localStorage（实际项目中可发送到服务器）
        this.saveFeedbackData(feedbackData);

        // 发送到GA4
        if (typeof gtag !== 'undefined') {
            gtag('event', 'feedback_submitted', {
                'favorite_feature': feedbackData.favoriteFeature,
                'payment_willingness': feedbackData.paymentWillingness,
                'new_features_count': feedbackData.newFeatures.length,
                'has_suggestion': feedbackData.suggestion.length > 0
            });
        }

        this.showToast(this.getFeedbackText('thankYou'), 'success');
        this.closeFeedbackModal(true);
    }

    /**
     * 保存反馈数据到 localStorage
     * @param {Object} data - 反馈数据
     */
    saveFeedbackData(data) {
        try {
            const existingFeedback = JSON.parse(localStorage.getItem('userFeedback') || '[]');
            existingFeedback.push(data);
            localStorage.setItem('userFeedback', JSON.stringify(existingFeedback));
            console.log('反馈数据已保存到本地存储');
        } catch (error) {
            console.error('保存反馈数据失败:', error);
        }
    }

    /**
     * 清空反馈表单
     */
    clearFeedbackForm() {
        const radioButtons = document.querySelectorAll('#feedback-modal input[type="radio"]');
        radioButtons.forEach(radio => radio.checked = false);

        const checkboxes = document.querySelectorAll('#feedback-modal input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);

        const textarea = document.getElementById('feedback-suggestion');
        if (textarea) textarea.value = '';
    }

    /**
     * 获取反馈模态框的本地化文本
     * @param {string} key - 文本键名
     * @param {number} count - 计数（用于进度文本）
     */
    getFeedbackText(key, count = 0) {
        const lang = this.userLanguage || 'vi';
        const texts = this.getFeedbackTexts(lang);
        
        if (key === 'progress') {
            return texts.progress.replace('{count}', count);
        }
        return texts[key] || texts['title'];
    }

    /**
     * 获取指定语言的反馈文本配置
     * @param {string} lang - 语言代码
     */
    getFeedbackTexts(lang) {
        const feedbackTexts = {
            'vi': {
                title: '📝 Ý kiến phản hồi',
                subtitle: 'Phản hồi của bạn rất quan trọng với chúng tôi',
                favoriteLabel: 'Bạn thích chức năng nào nhất?',
                optStroke: 'Thứ tự nét chữ',
                optSpeech: 'Phát âm',
                optSearch: 'Tìm kiếm',
                optFavorites: 'Từ vựng yêu thích',
                willingnessLabel: 'Bạn có sẵn sàng trả phí cho các chức năng nâng cao không?',
                optYes: 'Có',
                optMaybe: 'Có thể',
                optNo: 'Không',
                featuresLabel: 'Bạn muốn chúng tôi thêm chức năng mới nào?',
                featAI: 'Gia sư AI',
                featLive: 'Lớp học trực tiếp',
                featOCR: 'Nhận dạng ảnh OCR',
                featVocab: 'Nội dung từ vựng khác',
                suggestionLabel: 'Góp ý khác (tùy chọn)',
                suggestionPlaceholder: 'Nhập góp ý của bạn...',
                progress: 'Đã thu thập {count}/50 phản hồi',
                btnSkip: 'Bỏ qua',
                btnSubmit: 'Gửi',
                btnExport: 'Tải file phản hồi',
                exportHint: 'Sau khi tải, gửi qua X DM cho tôi',
                exportSuccess: 'Đã tải file phản hồi!',
                thankYou: 'Cảm ơn bạn đã gửi ý kiến！'
            },
            'en': {
                title: '📝 Feedback',
                subtitle: 'Your feedback is very important to us',
                favoriteLabel: 'What is your favorite feature?',
                optStroke: 'Stroke Order',
                optSpeech: 'Pronunciation',
                optSearch: 'Search',
                optFavorites: 'Favorites',
                willingnessLabel: 'Would you pay for advanced features?',
                optYes: 'Yes',
                optMaybe: 'Maybe',
                optNo: 'No',
                featuresLabel: 'What new features would you like?',
                featAI: 'AI Tutor',
                featLive: 'Live Classes',
                featOCR: 'OCR Scanning',
                featVocab: 'More Vocabulary',
                suggestionLabel: 'Other suggestions (optional)',
                suggestionPlaceholder: 'Enter your suggestions...',
                progress: 'Collected {count}/50 feedback',
                btnSkip: 'Skip',
                btnSubmit: 'Submit',
                btnExport: 'Export Feedback File',
                exportHint: 'Download and send via X DM',
                exportSuccess: 'Feedback exported successfully!',
                thankYou: 'Thank you for your feedback!'
            },
            'id': {
                title: '📝 Umpan Balik',
                subtitle: 'Umpan balik Anda sangat penting bagi kami',
                favoriteLabel: 'Fitur favorit Anda?',
                optStroke: 'Urutan Goresan',
                optSpeech: 'Pengucapan',
                optSearch: 'Pencarian',
                optFavorites: 'Favorit',
                willingnessLabel: 'Apakah Anda bersedia membayar untuk fitur lanjutan?',
                optYes: 'Ya',
                optMaybe: 'Mungkin',
                optNo: 'Tidak',
                featuresLabel: 'Fitur baru apa yang Anda inginkan?',
                featAI: 'Tutor AI',
                featLive: 'Kelas Langsung',
                featOCR: 'Pemindaian OCR',
                featVocab: 'Kosakata Lainnya',
                suggestionLabel: 'Saran lain (opsional)',
                suggestionPlaceholder: 'Masukkan saran Anda...',
                progress: 'Dikumpulkan {count}/50 umpan balik',
                btnSkip: 'Lewati',
                btnSubmit: 'Kirim',
                btnExport: 'Ekspor File Umpan Balik',
                exportHint: 'Unduh dan kirim via X DM',
                exportSuccess: 'File umpan balik berhasil diunduh!',
                thankYou: 'Terima kasih atas umpan balik Anda!'
            },
            'es': {
                title: '📝 Comentarios',
                subtitle: 'Sus comentarios son muy importantes para nosotros',
                favoriteLabel: '¿Cuál es su función favorita?',
                optStroke: 'Orden de trazos',
                optSpeech: 'Pronunciación',
                optSearch: 'Buscar',
                optFavorites: 'Favoritos',
                willingnessLabel: '¿Pagaría por funciones avanzadas?',
                optYes: 'Sí',
                optMaybe: 'Quizás',
                optNo: 'No',
                featuresLabel: '¿Qué funciones nuevas le gustaría?',
                featAI: 'Tutor de IA',
                featLive: 'Clases en vivo',
                featOCR: 'Escaneo OCR',
                featVocab: 'Más vocabulario',
                suggestionLabel: 'Otras sugerencias (opcional)',
                suggestionPlaceholder: 'Ingrese sus sugerencias...',
                progress: 'Recopilado {count}/50 comentarios',
                btnSkip: 'Omitir',
                btnSubmit: 'Enviar',
                btnExport: 'Exportar Archivo de Comentarios',
                exportHint: 'Descargue y envíe por X DM',
                exportSuccess: '¡Archivo de comentarios exportado!',
                thankYou: '¡Gracias por sus comentarios!'
            },
            'de': {
                title: '📝 Feedback',
                subtitle: 'Ihr Feedback ist uns sehr wichtig',
                favoriteLabel: 'Was ist Ihre Lieblingsfunktion?',
                optStroke: 'Strichfolge',
                optSpeech: 'Aussprache',
                optSearch: 'Suche',
                optFavorites: 'Favoriten',
                willingnessLabel: 'Würden Sie für erweiterte Funktionen zahlen?',
                optYes: 'Ja',
                optMaybe: 'Vielleicht',
                optNo: 'Nein',
                featuresLabel: 'Welche neuen Funktionen möchten Sie?',
                featAI: 'KI-Tutor',
                featLive: 'Live-Kurse',
                featOCR: 'OCR-Scannen',
                featVocab: 'Mehr Vokabeln',
                suggestionLabel: 'Andere Vorschläge (optional)',
                suggestionPlaceholder: 'Geben Sie Ihre Vorschläge ein...',
                progress: 'Gesammelt {count}/50 Feedback',
                btnSkip: 'Überspringen',
                btnSubmit: 'Senden',
                btnExport: 'Feedback-Datei exportieren',
                exportHint: 'Herunterladen und per X DM senden',
                exportSuccess: 'Feedback-Datei erfolgreich exportiert!',
                thankYou: 'Vielen Dank für Ihr Feedback!'
            },
            'fr': {
                title: '📝 Commentaires',
                subtitle: 'Vos commentaires sont très importants pour nous',
                favoriteLabel: 'Quelle est votre fonctionnalité préférée?',
                optStroke: 'Ordre des traits',
                optSpeech: 'Prononciation',
                optSearch: 'Recherche',
                optFavorites: 'Favoris',
                willingnessLabel: 'Paieriez-vous pour des fonctionnalités avancées?',
                optYes: 'Oui',
                optMaybe: 'Peut-être',
                optNo: 'Non',
                featuresLabel: 'Quelles nouvelles fonctionnalités souhaiteriez-vous?',
                featAI: 'Tuteur IA',
                featLive: 'Cours en direct',
                featOCR: 'Analyse OCR',
                featVocab: 'Plus de vocabulaire',
                suggestionLabel: 'Autres suggestions (optionnel)',
                suggestionPlaceholder: 'Entrez vos suggestions...',
                progress: 'Collecté {count}/50 commentaires',
                btnSkip: 'Passer',
                btnSubmit: 'Soumettre',
                btnExport: 'Exporter le fichier de commentaires',
                exportHint: 'Télécharger et envoyer par X DM',
                exportSuccess: 'Fichier de commentaires exporté!',
                thankYou: 'Merci pour vos commentaires!'
            },
            'ru': {
                title: '📝 Обратная связь',
                subtitle: 'Ваш отзыв очень важен для нас',
                favoriteLabel: 'Какая функция вам нравится больше всего?',
                optStroke: 'Порядок черт',
                optSpeech: 'Произношение',
                optSearch: 'Поиск',
                optFavorites: 'Избранное',
                willingnessLabel: 'Вы бы заплатили за расширенные функции?',
                optYes: 'Да',
                optMaybe: 'Возможно',
                optNo: 'Нет',
                featuresLabel: 'Какие новые функции вы хотели бы?',
                featAI: 'ИИ-репетитор',
                featLive: 'Онлайн-уроки',
                featOCR: 'OCR-сканирование',
                featVocab: 'Больше слов',
                suggestionLabel: 'Другие предложения (необязательно)',
                suggestionPlaceholder: 'Введите ваши предложения...',
                progress: 'Собрано {count}/50 отзывов',
                btnSkip: 'Пропустить',
                btnSubmit: 'Отправить',
                btnExport: 'Экспорт файла отзыва',
                exportHint: 'Скачайте и отправьте через X DM',
                exportSuccess: 'Файл отзыва успешно экспортирован!',
                thankYou: 'Спасибо за ваш отзыв!'
            },
            'ko': {
                title: '📝 피드백',
                subtitle: '귀하의 피드백은 우리에게 매우 중요합니다',
                favoriteLabel: '가장 좋아하는 기능이 무엇인가요?',
                optStroke: '필순',
                optSpeech: '발음',
                optSearch: '검색',
                optFavorites: '즐겨찾기',
                willingnessLabel: '고급 기능에 대해 지불하시겠습니까?',
                optYes: '예',
                optMaybe: '아마도',
                optNo: '아니오',
                featuresLabel: '어떤 새로운 기능을 원하시나요?',
                featAI: 'AI 튜터',
                featLive: '라이브 클래스',
                featOCR: 'OCR 스캔',
                featVocab: '더 많은 단어',
                suggestionLabel: '기타 제안 (선택사항)',
                suggestionPlaceholder: '제안을 입력하세요...',
                progress: '{count}/50 피드백 수집됨',
                btnSkip: '건너뛰기',
                btnSubmit: '제출',
                btnExport: '피드백 파일 내보내기',
                exportHint: '다운로드 후 X DM으로 보내기',
                exportSuccess: '피드백 파일이 성공적으로 내보내졌습니다!',
                thankYou: '피드백을 보내주셔서 감사합니다!'
            },
            'hi': {
                title: '📝 प्रतिक्रिया',
                subtitle: 'आपकी प्रतिक्रिया हमारे लिए बहुत महत्वपूर्ण है',
                favoriteLabel: 'आपकी पसंदीदा सुविधा कौन सी है?',
                optStroke: 'स्ट्रोक ऑर्डर',
                optSpeech: 'उच्चारण',
                optSearch: 'खोज',
                optFavorites: 'पसंदीदा',
                willingnessLabel: 'क्या आप उन्नत सुविधाओं के लिए भुगतान करेंगे?',
                optYes: 'हाँ',
                optMaybe: 'शायद',
                optNo: 'नहीं',
                featuresLabel: 'आप किन नई सुविधाओं की अपेक्षा करेंगे?',
                featAI: 'AI ट्यूटर',
                featLive: 'लाइव क्लास',
                featOCR: 'OCR स्कैनिंग',
                featVocab: 'अधिक शब्दावली',
                suggestionLabel: 'अन्य सुझाव (वैकल्पिक)',
                suggestionPlaceholder: 'अपने सुझाव दर्ज करें...',
                progress: '{count}/50 प्रतिक्रिया एकत्र की गई',
                btnSkip: 'छोड़ें',
                btnSubmit: 'जमा करें',
                btnExport: 'फ़ाइल निर्यात करें',
                exportHint: 'डाउनलोड करें और X DM भेजें',
                exportSuccess: 'फ़ाइल सफलतापूर्वक निर्यात की गई!',
                thankYou: 'आपकी प्रतिक्रिया के लिए धन्यवाद!'
            },
            'th': {
                title: '📝 ข้อเสนอแนะ',
                subtitle: 'ข้อเสนอแนะของคุณสำคัญมากสำหรับเรา',
                favoriteLabel: 'คุณชอบฟีเจอร์ไหนมากที่สุด?',
                optStroke: 'ลำดับการเขียน',
                optSpeech: 'การออกเสียง',
                optSearch: 'ค้นหา',
                optFavorites: 'รายการโปรด',
                willingnessLabel: 'คุณยินดีจ่ายเงินเพื่อฟีเจอร์ขั้นสูงไหม?',
                optYes: 'ใช่',
                optMaybe: 'อาจจะ',
                optNo: 'ไม่',
                featuresLabel: 'คุณต้องการฟีเจอร์ใหม่อะไร?',
                featAI: 'ครู AI',
                featLive: 'คลาสสด',
                featOCR: 'สแกน OCR',
                featVocab: 'คำศัพท์เพิ่มเติม',
                suggestionLabel: 'ข้อเสนอแนะอื่นๆ (ไม่บังคับ)',
                suggestionPlaceholder: 'ป้อนข้อเสนอแนะของคุณ...',
                progress: 'รวบรวมแล้ว {count}/50 ข้อเสนอแนะ',
                btnSkip: 'ข้าม',
                btnSubmit: 'ส่ง',
                btnExport: 'ส่งออกไฟล์ข้อเสนอแนะ',
                exportHint: 'ดาวน์โหลดแล้วส่งผ่าน X DM',
                exportSuccess: 'ส่งออกไฟล์ข้อเสนอแนะสำเร็จ!',
                thankYou: 'ขอบคุณสำหรับข้อเสนอแนะ!'
            },
            'my': {
                title: '📝 Maklumat Balas',
                subtitle: 'Maklum balas anda sangat penting kepada kami',
                favoriteLabel: 'Fungsi kegemaran anda?',
                optStroke: 'Urutan Coretan',
                optSpeech: 'Pengucapan',
                optSearch: 'Carian',
                optFavorites: 'Kegemaran',
                willingnessLabel: 'Adakah anda mahu membayar untuk ciri lanjutan?',
                optYes: 'Ya',
                optMaybe: 'Mungkin',
                optNo: 'Tidak',
                featuresLabel: 'Apakah ciri baharu yang anda mahu?',
                featAI: 'Tutor AI',
                featLive: 'Kelas Langsung',
                featOCR: 'Pengimbasan OCR',
                featVocab: 'Kosa Kata Lain',
                suggestionLabel: 'Cadangan lain (pilihan)',
                suggestionPlaceholder: 'Masukkan cadangan anda...',
                progress: 'Dikumpul {count}/50 maklum balas',
                btnSkip: 'Langkau',
                btnSubmit: 'Hantar',
                btnExport: 'Eksport Fail Maklum Balas',
                exportHint: 'Muat turun dan hantar melalui X DM',
                exportSuccess: 'Fail maklum balas berjaya dieksport!',
                thankYou: 'Terima kasih atas maklum balas anda!'
            },
            'km': {
                title: '📝 មតិយោបល់',
                subtitle: 'មតិយោបល់របស់អ្នកមានសារៈសំខាន់ណាស់ចំពោះយើង',
                favoriteLabel: 'តើអ្នកចូលចិត្តមុខងារណាមួយ?',
                optStroke: 'លំដាប់សរសេរ',
                optSpeech: 'ការបញ្ចេញសំឡេង',
                optSearch: 'ការស្វែងរក',
                optFavorites: 'ចំណូលចិត្ត',
                willingnessLabel: 'តើអ្នកព្រមចេញថ្លៃសម្រាប់មុខងារកម្រិតខ្ពស់ទេ?',
                optYes: 'ព្រម',
                optMaybe: 'ប្រហែល',
                optNo: 'ទេ',
                featuresLabel: 'តើអ្នកចង់បានមុខងារថ្មីណាមួយ?',
                featAI: 'គ្រូបង្រៀន AI',
                featLive: 'ថ្នាក់ផ្ទាល់',
                featOCR: 'ការស្កែផ្កាល OCR',
                featVocab: 'ពាក្យសម្រាប់បន្ថែម',
                suggestionLabel: 'ការណែនាំផ្សេងទៀត (ជាជំរើស)',
                suggestionPlaceholder: 'បញ្ចូលការណែនាំរបស់អ្នក...',
                progress: 'បានប្រមូល {count}/50 មតិយោបល់',
                btnSkip: 'រំលង',
                btnSubmit: 'ដាក់ស្នើ',
                btnExport: 'ទាញយកឯកសារមតិយោបល់',
                exportHint: 'ទាញយកហើយផ្ញើតាម X DM',
                exportSuccess: 'ឯកសារមតិយោបល់បានទាញយកដោយជោគជ័យ!',
                thankYou: 'អរគុណសម្រាប់មតិយោបល់!'
            },
            'lo': {
                title: '📝 ຄວามคิดเห็น',
                subtitle: 'ความคิดเห็นของคุณสำคัญมากสำหรับเรา',
                favoriteLabel: 'คุณชอบฟีเจอร์ไหนมากที่สุด?',
                optStroke: 'ลำดับการเขียน',
                optSpeech: 'การออกเสียง',
                optSearch: 'ค้นหา',
                optFavorites: 'รายการโปรด',
                willingnessLabel: 'คุณยินดีจ่ายเงินเพื่อฟีเจอร์ขั้นสูงไหม?',
                optYes: 'ใช่',
                optMaybe: 'อาจจะ',
                optNo: 'ไม่',
                featuresLabel: 'คุณต้องการฟีเจอร์ใหม่อะไร?',
                featAI: 'ครู AI',
                featLive: 'คลาสสด',
                featOCR: 'สแกน OCR',
                featVocab: 'คำศัพท์เพิ่มเติม',
                suggestionLabel: 'ข้อเสนอแนะอื่นๆ (ไม่บังคับ)',
                suggestionPlaceholder: 'ป้อนข้อเสนอแนะของคุณ...',
                progress: 'รวบรวมแล้ว {count}/50 ความคิดเห็น',
                btnSkip: 'ข้าม',
                btnSubmit: 'ส่ง',
                btnExport: 'ส่งออกไฟล์ความคิดเห็น',
                exportHint: 'ดาวน์โหลดแล้วส่งผ่าน X DM',
                exportSuccess: 'ส่งออกไฟล์ความคิดเห็นสำเร็จ!',
                thankYou: 'ขอบคุณสำหรับความคิดเห็น!'
            },
            'mya': {
                title: '📝 အကြံပြုချက်',
                subtitle: 'သင့်အကြံပြုချက်သည် ကျွန်ုပ်တို့အတွက် အလွန်အရေးကြီးပါသည်',
                favoriteLabel: 'သင့်အနှစ်သာရရှိသော function ကဘာလဲ?',
                optStroke: 'လက်ရာအစဉ်',
                optSpeech: 'အသံထွက်',
                optSearch: 'ရှာဖွေခြင်း',
                optFavorites: 'အကြိုက်ဆုံး',
                willingnessLabel: 'အဆင့်မြင့် functions အတွက် ငွေပေးမှာလား?',
                optYes: 'မှန်ကန်တယ်',
                optMaybe: 'ဖြစ်နိုင်ပါတယ်',
                optNo: 'မပေးထား',
                featuresLabel: 'ဘယ် functions အသစ်တွေ မျှော်လင့်ထားပါသလဲ?',
                featAI: 'AI သူငယ်ချစ်ရေး',
                featLive: 'Live Classes',
                featOCR: 'OCR Scan',
                featVocab: 'စကားလုံးအများကြီး',
                suggestionLabel: 'အခြားအကြံပြုချက်များ (မဖြစ်မနေ)',
                suggestionPlaceholder: 'သင့်အကြံပြုချက်ရိုက်ထည့်ပါ...',
                progress: '{count}/50 အကြံပြုချက်ကို စုစည်းပြီး',
                btnSkip: 'ကျော်သွားမည်',
                btnSubmit: 'ပေးပို့မည်',
                btnExport: 'အကြံပြုချက်ဖိုင်ထုတ်ခြင်း',
                exportHint: 'ဒီဖိုင်ကိုဒေါင်းလုပ်ပြီး X DM ကနေပေးပို့ပါ',
                exportSuccess: 'အကြံပြုချက်ဖိုင်ထုတ်ခြင်းဇင်းရောင်!',
                thankYou: 'အကြံပြုချက်အတွက် ကျေးဇူးတင်ပါသည်!'
            },
            'bn': {
                title: '📝 মতামত',
                subtitle: 'আপনার মতামত আমাদের কাছে অত্যন্ত গুরুত্বপূর্ণ',
                favoriteLabel: 'আপনার প্রিয় ফিচার কোনটি?',
                optStroke: 'স্ট্রোক অর্ডার',
                optSpeech: 'উচ্চারণ',
                optSearch: 'অনুসন্ধান',
                optFavorites: 'প্রিয়',
                willingnessLabel: 'আপনি কি অ্যাডভান্সড ফিচারের জন্য অর্থ প্রদান করবেন?',
                optYes: 'হ্যাঁ',
                optMaybe: 'হয়তো',
                optNo: 'না',
                featuresLabel: 'আপনি কোন নতুন ফিচার চান?',
                featAI: 'AI টিউটর',
                featLive: 'লাইভ ক্লাস',
                featOCR: 'OCR স্ক্যান',
                featVocab: 'আরও শব্দভাণ্ডার',
                suggestionLabel: 'অন্যান্য পরামর্শ (ঐচ্ছিক)',
                suggestionPlaceholder: 'আপনার পরামর্শ লিখুন...',
                progress: '{count}/50 মতামত সংগ্রহ করা হয়েছে',
                btnSkip: 'এড়িয়ে যান',
                btnSubmit: 'জমা দিন',
                btnExport: 'ফাইল রপ্তানি করুন',
                exportHint: 'ডাউনলোড করে X DM এ পাঠান',
                exportSuccess: 'ফাইল সফলভাবে রপ্তানি হয়েছে!',
                thankYou: 'আপনার মতামতের জন্য ধন্যবাদ!'
            },
            'ja': {
                title: '📝 フィードバック',
                subtitle: '皆様からのフィードバックは私たちにとって非常に重要です',
                favoriteLabel: '最も好きな機能は？',
                optStroke: '筆順',
                optSpeech: '発音',
                optSearch: '検索',
                optFavorites: 'お気に入り',
                willingnessLabel: '高度な機能に対して支払い意愿はありますか？',
                optYes: 'はい',
                optMaybe: 'どちらかといえば',
                optNo: 'いいえ',
                featuresLabel: 'どのような新機能を希望されますか？',
                featAI: 'AI Tutor',
                featLive: 'ライブ授業',
                featOCR: 'OCRスキャン',
                featVocab: '更多の単語',
                suggestionLabel: 'その他のご提案（任意）',
                suggestionPlaceholder: 'ご提案を入力してください...',
                progress: '{count}/50件のフィードバックを収集しました',
                btnSkip: 'スキップ',
                btnSubmit: '送信',
                btnExport: 'フィードバックファイルエクスポート',
                exportHint: 'ダウンロードしてX DMで送信',
                exportSuccess: 'フィードバックファイルをエクスポートしました！',
                thankYou: 'フィードバックありがとうございます！'
            }
        };

        return feedbackTexts[lang] || feedbackTexts['vi'];
    }

    /**
     * 更新反馈模态框文本为当前语言
     */
    updateFeedbackModalText() {
        const lang = this.userLanguage || 'vi';
        const texts = this.getFeedbackTexts(lang);

        const elements = {
            'feedback-title': texts.title,
            'feedback-subtitle': texts.subtitle,
            'feedback-favorite-label': texts.favoriteLabel,
            'feedback-opt-stroke': texts.optStroke,
            'feedback-opt-speech': texts.optSpeech,
            'feedback-opt-search': texts.optSearch,
            'feedback-opt-favorites': texts.optFavorites,
            'feedback-willingness-label': texts.willingnessLabel,
            'feedback-opt-yes': texts.optYes,
            'feedback-opt-maybe': texts.optMaybe,
            'feedback-opt-no': texts.optNo,
            'feedback-features-label': texts.featuresLabel,
            'feedback-feat-ai': texts.featAI,
            'feedback-feat-live': texts.featLive,
            'feedback-feat-ocr': texts.featOCR,
            'feedback-feat-vocab': texts.featVocab,
            'feedback-suggestion-label': texts.suggestionLabel,
            'feedback-suggestion-placeholder': texts.suggestionPlaceholder,
            'feedback-btn-skip': texts.btnSkip,
            'feedback-btn-submit': texts.btnSubmit,
            'feedback-btn-export': texts.btnExport,
            'feedback-export-hint': texts.exportHint
        };

        for (const [id, text] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) {
                if (id === 'feedback-suggestion-placeholder') {
                    el.placeholder = text;
                } else {
                    el.textContent = text;
                }
            }
        }
    }
}
// 当DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 隐藏底部导航链接默认行为
    const hiddenLinks = document.querySelectorAll('.desktop-bottom-links .nav-link[data-href]');
    hiddenLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const url = this.getAttribute('data-href');
            if (url) {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        });
    });

    let appInstance = null;
    let appInitialized = false;

    const startApp = async () => {
        if (appInitialized) return;
        appInitialized = true;
        appInstance = new ChineseVocabApp();
        window.appInstance = appInstance; // 保证全局可获得app
        try {
            await appInstance.init();
        } catch (error) {
            console.error('应用启动失败:', error);
        }
    };

    const userLang = localStorage.getItem('userLanguage');
    if (userLang) {
        startApp();
    } else {
        const onLangSelected = (e) => {
            setTimeout(() => startApp(), 50);
            window.removeEventListener('languageSelected', onLangSelected);
        };
        window.addEventListener('languageSelected', onLangSelected);
    }
});

 
