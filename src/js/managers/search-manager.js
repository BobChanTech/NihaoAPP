/**
 * 搜索管理器 - 完整重写版本
 * 
 * 设计原则（方案二）：
 * 1. 搜索结果独立存储在 searchResults 中，不影响 app.currentWords
 * 2. 只有字数筛选才会改变 app.currentWords
 * 3. 点击"打开"搜索结果时，只显示单条词条（临时预览模式）
 * 4. 左右滑动时立即恢复原始状态（而不是在搜索结果中切换）
 * 5. 点击其他字数按钮也会先恢复到原始状态，再执行字数筛选
 * 6. 按字数分别记忆位置（2万词条场景优化）
 */
class SearchManager {
    constructor(appInstance = null) {
        this.app = appInstance;
        this.searchResults = [];      // 搜索结果独立存储
        this.savedCurrentWords = [];  // 保存的原始词条列表
        this.savedCurrentIndex = 0;   // 保存的原始索引
        this.currentWordCountFilter = null; // 当前字数筛选条件
        
        // 状态标志
        this.isSearchMode = false;    // 是否正在搜索（显示搜索结果对话框）
        this.isInTempPreview = false;  // 是否正在临时预览搜索结果（点击打开后）
        this.savedPreviewIndex = 0;    // 预览时的索引
        
        // 位置记忆相关
        this.LAST_POSITION_PREFIX = 'vocab_lastPosition_';
        this.LAST_WORDCOUNT_KEY = 'vocab_lastWordCount'; // 最后选中的字数
        
        // DOM 元素
        this.searchModal = null;
        this.searchModalInput = null;
        this.cancelSearchBtn = null;
        this.confirmSearchBtn = null;
        this.wordCountButtons = null;
        
        this.initElements();
        this.initEventListeners();
    }

    /**
     * 判断是否应该隐藏付费内容
     * @returns {boolean} true=只显示免费内容,false=显示全部内容
     */
    shouldHidePremiumContent() {
        // 使用 window.paymentManager 获取付费状态
        const paymentMgr = window.paymentManager;
        if (!paymentMgr || typeof paymentMgr.isPaidUser !== 'function') {
            // 如果 paymentManager 不可用，默认为免费用户（隐藏付费内容）
            return true;
        }
        // 付费用户可以看到全部内容,免费用户只看到免费内容
        return !paymentMgr.isPaidUser();
    }

    /**
     * 初始化 DOM 元素引用
     */
    initElements() {
        this.searchModal = document.getElementById('search-modal');
        this.searchModalInput = document.getElementById('search-modal-input');
        this.cancelSearchBtn = document.getElementById('cancel-search');
        this.confirmSearchBtn = document.getElementById('confirm-search');
        this.wordCountButtons = document.querySelectorAll('.len-btn');
    }

    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // 搜索按钮
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.openSearchModal();
            });
        }

        // 取消搜索
        if (this.cancelSearchBtn) {
            this.cancelSearchBtn.addEventListener('click', () => this.closeSearchModal());
        }

        // 确认搜索
        if (this.confirmSearchBtn) {
            this.confirmSearchBtn.addEventListener('click', () => this.handleSearch());
        }

        // 回车搜索
        if (this.searchModalInput) {
            this.searchModalInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                }
            });
        }

        // 点击模态框外部关闭
        if (this.searchModal) {
            this.searchModal.addEventListener('click', (e) => {
                if (e.target === this.searchModal) {
                    this.closeSearchModal();
                }
            });
        }

        // ESC 关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSearchModal();
            }
        });

        // 字数按钮
        if (this.wordCountButtons && this.wordCountButtons.length > 0) {
            this.wordCountButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const btn = e.target.closest('.len-btn');
                    const length = btn ? btn.dataset.length : null;
                    if (length) {
                        this.handleWordCountFilter(length);
                    }
                });
            });
        }
    }

    // ==================== 搜索模态框操作 ====================

    /**
     * 打开搜索模态框
     */
    openSearchModal() {
        if (!this.searchModal) return;

        // 保存当前状态
        this.saveCurrentState();

        this.searchModal.style.display = 'flex';
        
        if (this.searchModalInput) {
            this.searchModalInput.value = '';
            this.searchModalInput.focus();
        }
    }

    /**
     * 关闭搜索模态框
     */
    closeSearchModal() {
        if (!this.searchModal) return;
        this.searchModal.style.display = 'none';
    }

    /**
     * 保存当前状态（进入搜索前）
     * 保存完整的原始状态，包括字数筛选
     */
    saveCurrentState() {
        if (this.app) {
            // 复制完整的原始词条列表
            this.savedCurrentWords = this.app.currentWords ? [...this.app.currentWords] : [];
            this.savedCurrentIndex = this.app.currentIndex || 0;
            // 保存原始的字数筛选状态
            this.savedWordCountFilter = this.currentWordCountFilter || null;
            
            this.isSearchMode = true;
            this.isInSearchResults = false;
            
            console.log('[SearchManager] 保存状态:', {
                wordsCount: this.savedCurrentWords.length,
                index: this.savedCurrentIndex,
                wordCountFilter: this.savedWordCountFilter
            });
        }
    }

    /**
     * 执行搜索
     */
    async handleSearch() {
        if (!this.searchModalInput) return;

        const searchText = this.searchModalInput.value.trim();
        if (!searchText) {
            this.showToast('请输入搜索关键词', 'error');
            return;
        }

        console.log('[SearchManager] 执行搜索:', searchText);

        // 执行搜索
        this.searchResults = await this.app.dataManager.searchWords({
            searchText: searchText,
            hskLevel: '',
            wordCount: '',
            hidePremium: this.shouldHidePremiumContent()
        });

        // 如果没有结果，提示用户
        if (!Array.isArray(this.searchResults) || this.searchResults.length === 0) {
            this.showToast('没有找到匹配的词条', 'info');
            return;
        }

        console.log('[SearchManager] 搜索结果:', this.searchResults.length, '条');

        // 关闭搜索模态框
        this.closeSearchModal();

        // 显示搜索结果
        this.showSearchResultsModal();
    }

    // ==================== 搜索结果对话框 ====================

    /**
     * 显示搜索结果对话框（按字数分组）
     */
    showSearchResultsModal() {
        if (!this.searchResults || this.searchResults.length === 0) {
            this.showToast('没有找到匹配的词条', 'info');
            return;
        }

        // 按字数分组
        const groupedResults = {};
        for (let i = 1; i <= 5; i++) {
            groupedResults[i] = this.searchResults.filter(word => 
                (word.word_count || word.wordCount || 1) === i
            );
        }

        // 生成 HTML
        let groupedHTML = '';
        for (let i = 1; i <= 5; i++) {
            const words = groupedResults[i];
            if (words && words.length > 0) {
                groupedHTML += `
                    <div class="search-result-group">
                        <h4 class="group-title">${i}字词 (${words.length}个)</h4>
                        <ul class="search-results-list">
                            ${words.map(word => `
                                <li data-id="${word.ID || word.id}">
                                    <strong>${word.chinese_cn}</strong>
                                    — ${word.pinyin}
                                    <div class="search-result-actions">
                                        <button class="open-word" data-id="${word.ID || word.id}">打开</button>
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            }
        }

        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'modal search-results-modal';
        modal.id = 'search-results-modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:600px;">
                <div class="modal-header">
                    <h2>搜索结果</h2>
                </div>
                <div class="modal-body">
                    <div class="search-results-grouped">
                        ${groupedHTML}
                    </div>
                </div>
                <div class="modal-footer" style="display: flex; justify-content: center;">
                    <button class="btn-primary close-modal-btn">关闭</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 事件监听 - 打开按钮
        const openButtons = modal.querySelectorAll('.open-word');
        openButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const wordId = e.target.dataset.id;
                this.handleOpenWord(wordId);
            });
        });

        // 事件监听 - 关闭按钮
        const closeButton = modal.querySelector('.close-modal-btn');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.closeSearchResults();
            });
        }

        // 点击外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeSearchResults();
            }
        });
    }

    /**
     * 打开搜索结果中的词条（临时预览模式）
     * 方案二：只显示单条词条，左右滑动恢复原始状态
     */
    async handleOpenWord(wordId) {
        try {
            // 查找在搜索结果中的索引
            const searchIndex = this.searchResults.findIndex(word => 
                String(word.ID || word.id) === String(wordId)
            );
            
            if (searchIndex === -1) {
                console.error('[SearchManager] 未找到词条:', wordId);
                return;
            }

            console.log('[SearchManager] 临时预览词条:', {
                wordId: wordId,
                index: searchIndex,
                word: this.searchResults[searchIndex]?.chinese_cn
            });

            // 设置临时预览状态
            this.isInTempPreview = true;
            this.savedPreviewIndex = searchIndex;

            // 获取当前要显示的词条（不在搜索结果中查找，直接从搜索结果取）
            const word = this.searchResults[searchIndex];

            // 关闭搜索结果模态框
            this.closeSearchResultsModalOnly();

            // 显示词条（保持 app.currentWords 不变）
            await this.app.displayManager.renderWord(word);
            this.updateCard2(word);
            
            // 更新收藏按钮状态
            if (this.app.favoritesManager) {
                const id = word.ID || word.id;
                this.app.favoritesManager.updateFavoriteButtonState(id);
            }

        } catch (error) {
            console.error('[SearchManager] 预览词条失败:', error);
            this.showToast('无法预览词条', 'error');
        }
    }

    /**
     * 只关闭搜索结果模态框
     */
    closeSearchResultsModalOnly() {
        const modal = document.getElementById('search-results-modal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * 关闭搜索结果，恢复到原始状态
     * 关键：恢复到原始的字数筛选状态
     */
    closeSearchResults() {
        console.log('[SearchManager] 关闭搜索结果，恢复原始状态');
        
        // 关闭模态框
        this.closeSearchResultsModalOnly();

        // 如果有保存的原始状态，恢复它
        if (this.savedCurrentWords && this.savedCurrentWords.length > 0) {
            this.app.currentWords = this.savedCurrentWords;
            this.app.currentIndex = this.savedCurrentIndex;
            
            // 恢复字数筛选按钮状态
            this.wordCountButtons.forEach(btn => btn.classList.remove('active'));
            
            if (this.savedWordCountFilter) {
                const activeBtn = document.querySelector(`.len-btn[data-length="${this.savedWordCountFilter}"]`);
                if (activeBtn) activeBtn.classList.add('active');
                this.currentWordCountFilter = this.savedWordCountFilter;
            } else {
                this.currentWordCountFilter = null;
            }
            
            // 更新 UI
            const word = this.app.currentWords[this.app.currentIndex];
            if (word) {
                this.app.displayManager.renderWord(word);
                this.updateCard2(word);
                
                // 更新收藏按钮状态
                if (this.app.favoritesManager) {
                    const id = word.ID || word.id;
                    this.app.favoritesManager.updateFavoriteButtonState(id);
                }
            }
            
            console.log('[SearchManager] 已恢复:', {
                wordsCount: this.app.currentWords.length,
                index: this.app.currentIndex,
                wordCountFilter: this.currentWordCountFilter,
                firstWord: this.app.currentWords[0]?.chinese_cn
            });
        }

        // 重置状态
        this.isSearchMode = false;
        this.isInTempPreview = false;
        this.savedCurrentWords = [];
        this.savedCurrentIndex = 0;
        this.savedWordCountFilter = null;
    }

    // ==================== 字数筛选 ====================

    /**
     * 处理字数筛选
     * 注意：字数筛选与搜索功能完全独立
     * 关键：如果用户之前搜索过，先恢复到原始状态，再执行新的字数筛选
     */
    async handleWordCountFilter(length) {
        console.log('[SearchManager] 字数筛选:', length);

        // 如果用户之前搜索过，先恢复到原始状态
        if (this.savedCurrentWords && this.savedCurrentWords.length > 0) {
            console.log('[SearchManager] 检测到之前有搜索，恢复原始状态后再筛选');
            
            // 恢复原始状态
            this.app.currentWords = this.savedCurrentWords;
            this.app.currentIndex = this.savedCurrentIndex;
            
            // 恢复字数筛选状态
            this.wordCountButtons.forEach(btn => btn.classList.remove('active'));
            if (this.savedWordCountFilter) {
                const activeBtn = document.querySelector(`.len-btn[data-length="${this.savedWordCountFilter}"]`);
                if (activeBtn) activeBtn.classList.add('active');
                this.currentWordCountFilter = this.savedWordCountFilter;
            } else {
                this.currentWordCountFilter = null;
            }
            
            // 更新 UI
            const word = this.app.currentWords[this.app.currentIndex];
            if (word) {
                this.app.displayManager.renderWord(word);
                this.updateCard2(word);
                if (this.app.favoritesManager) {
                    const id = word.ID || word.id;
                    this.app.favoritesManager.updateFavoriteButtonState(id);
                }
            }
            
            // 清除搜索状态
            this.savedCurrentWords = [];
            this.savedCurrentIndex = 0;
            this.savedWordCountFilter = null;
            this.isSearchMode = false;
            this.isInTempPreview = false;
            
            console.log('[SearchManager] 已恢复原始状态，继续执行字数筛选');
        }

        // 如果已经选中了这个字数，取消选中
        if (this.currentWordCountFilter === length) {
            this.wordCountButtons.forEach(btn => btn.classList.remove('active'));
            this.currentWordCountFilter = null;
            console.log('[SearchManager] 取消字数筛选');
            return;
        }

        // 选中新的字数
        this.wordCountButtons.forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.len-btn[data-length="${length}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        this.currentWordCountFilter = length;

        // 执行字数筛选（不使用搜索关键字）
        await this.performWordCountFilter(length);
    }

    /**
     * 执行字数筛选
     * 关键：按字数分别记忆位置
     */
    async performWordCountFilter(length) {
        // 清除搜索关键字，确保只按字数筛选
        if (this.searchModalInput) {
            this.searchModalInput.value = '';
        }

        // 搜索所有符合字数条件的词条
        const results = await this.app.dataManager.searchWords({
            searchText: '',
            hskLevel: '',
            wordCount: length,
            hidePremium: this.shouldHidePremiumContent()
        });

        if (Array.isArray(results) && results.length > 0) {
            this.app.currentWords = results;
            
            // 从 localStorage 恢复该字数的上次位置
            const savedIndex = this.getLastPosition(length);
            this.app.currentIndex = Math.min(savedIndex, results.length - 1);
            
            // 保存当前字数到 localStorage
            this.saveLastWordCount(length);
            
            await this.app.showWordAtIndex(this.app.currentIndex);
            console.log('[SearchManager] 字数筛选结果:', results.length, '条, 恢复位置:', this.app.currentIndex);
        } else {
            this.showToast('没有找到该字数的词条', 'info');
        }
    }

    // ==================== 位置记忆方法 ====================

    /**
     * 获取某个字数的最后位置
     */
    getLastPosition(wordCount) {
        try {
            const key = this.LAST_POSITION_PREFIX + wordCount;
            const saved = localStorage.getItem(key);
            if (saved !== null) {
                const index = parseInt(saved, 10);
                return isNaN(index) ? 0 : index;
            }
        } catch (e) {
            console.warn('[SearchManager] 获取位置失败:', e);
        }
        return 0;
    }

    /**
     * 保存某个字数的当前位置
     */
    saveCurrentPosition(wordCount, index) {
        try {
            const key = this.LAST_POSITION_PREFIX + wordCount;
            localStorage.setItem(key, index.toString());
            console.log('[SearchManager] 保存位置:', { wordCount, index });
        } catch (e) {
            console.warn('[SearchManager] 保存位置失败:', e);
        }
    }

    /**
     * 获取最后选中的字数
     */
    getLastWordCount() {
        try {
            const saved = localStorage.getItem(this.LAST_WORDCOUNT_KEY);
            if (saved) {
                const count = parseInt(saved, 10);
                if (count >= 1 && count <= 5) {
                    return count;
                }
            }
        } catch (e) {
            console.warn('[SearchManager] 获取最后字数失败:', e);
        }
        return null; // 返回 null 表示没有记录，首次进入
    }

    /**
     * 保存最后选中的字数
     */
    saveLastWordCount(wordCount) {
        try {
            localStorage.setItem(this.LAST_WORDCOUNT_KEY, wordCount.toString());
        } catch (e) {
            console.warn('[SearchManager] 保存字数失败:', e);
        }
    }

    /**
     * 初始化加载所有词汇（带位置记忆）
     * 由 app.js 在初始化时调用
     */
    async initLoadAllWords() {
        try {
            // 获取最后选中的字数
            const lastWordCount = this.getLastWordCount();
            
            if (lastWordCount) {
                // 有记录，直接加载该字数并恢复位置
                console.log('[SearchManager] 初始化：加载上次字数', lastWordCount);
                this.wordCountButtons.forEach(btn => btn.classList.remove('active'));
                const activeBtn = document.querySelector(`.len-btn[data-length="${lastWordCount}"]`);
                if (activeBtn) activeBtn.classList.add('active');
                this.currentWordCountFilter = lastWordCount;
                await this.performWordCountFilter(lastWordCount);
            } else {
                // 没有记录，加载所有词汇（默认显示第一个词条）
                console.log('[SearchManager] 初始化：首次进入，加载所有词汇');
                const allWords = await this.app.dataManager.searchWords({
                    searchText: '',
                    hskLevel: '',
                    wordCount: '',
                    hidePremium: this.shouldHidePremiumContent()
                });
                
                if (Array.isArray(allWords) && allWords.length > 0) {
                    this.app.currentWords = allWords;
                    this.app.currentIndex = 0;
                    this.currentWordCountFilter = null; // 确保没有字数筛选
                    
                    // 更新UI显示第一个词条
                    const word = allWords[0];
                    if (word) {
                        await this.app.displayManager.renderWord(word);
                        this.updateCard2(word);
                        
                        // 更新收藏按钮状态
                        if (this.app.favoritesManager) {
                            const id = word.ID || word.id;
                            this.app.favoritesManager.updateFavoriteButtonState(id);
                        }
                    }
                    console.log('[SearchManager] 初始化完成：显示第一个词条');
                }
            }
        } catch (error) {
            console.error('[SearchManager] 初始化失败:', error);
            // 失败时使用安全的回退方案
            this.app.currentWords = [{
                ID: 'default-1',
                chinese_cn: '你好',
                pinyin: 'nǐ hǎo',
                pinyin_no_tone: 'ni hao',
                english_en: 'hello',
                hsk_level: 1,
                word_count: 2,
                is_premium: false
            }];
            this.app.currentIndex = 0;
            this.currentWordCountFilter = null;
            
            // 显示默认词条
            const word = this.app.currentWords[0];
            if (word) {
                await this.app.displayManager.renderWord(word);
                this.updateCard2(word);
            }
        }
    }

    // ==================== 导航方法 ====================

    /**
     * 下一个相同字数的词条
     * 关键：如果在临时预览状态，先恢复原始状态
     */
    async nextSameLength() {
        // 如果在临时预览状态，恢复原始状态
        if (this.isInTempPreview && this.savedCurrentWords.length > 0) {
            console.log('[SearchManager] 临时预览结束，恢复原始状态');
            await this.restoreToOriginalState();
            return;
        }

        if (!this.app.currentWords || this.app.currentWords.length === 0) return;

        const cur = this.app.currentWords[this.app.currentIndex];
        if (!cur) return;

        const targetLen = cur.word_count;
        const n = this.app.currentWords.length;

        for (let i = 1; i < n; i++) {
            const idx = (this.app.currentIndex + i) % n;
            if (this.app.currentWords[idx].word_count === targetLen) {
                await this.app.showWordAtIndex(idx);
                // 保存当前位置
                this.saveCurrentPosition(targetLen, idx);
                return;
            }
        }
    }

    /**
     * 上一个相同字数的词条
     * 关键：如果在临时预览状态，先恢复原始状态
     */
    async prevSameLength() {
        // 如果在临时预览状态，恢复原始状态
        if (this.isInTempPreview && this.savedCurrentWords.length > 0) {
            console.log('[SearchManager] 临时预览结束，恢复原始状态');
            await this.restoreToOriginalState();
            return;
        }

        if (!this.app.currentWords || this.app.currentWords.length === 0) return;

        const cur = this.app.currentWords[this.app.currentIndex];
        if (!cur) return;

        const targetLen = cur.word_count;
        const n = this.app.currentWords.length;

        for (let i = 1; i < n; i++) {
            const idx = (this.app.currentIndex - i + n) % n;
            if (this.app.currentWords[idx].word_count === targetLen) {
                await this.app.showWordAtIndex(idx);
                // 保存当前位置
                this.saveCurrentPosition(targetLen, idx);
                return;
            }
        }
    }

    /**
     * 恢复到原始状态（从临时预览模式恢复）
     */
    async restoreToOriginalState() {
        // 清除临时预览状态
        this.isInTempPreview = false;
        this.savedPreviewIndex = 0;

        // 恢复到原始状态
        if (this.savedCurrentWords && this.savedCurrentWords.length > 0) {
            this.app.currentWords = this.savedCurrentWords;
            this.app.currentIndex = this.savedCurrentIndex;
            
            // 恢复字数筛选按钮状态
            this.wordCountButtons.forEach(btn => btn.classList.remove('active'));
            
            if (this.savedWordCountFilter) {
                const activeBtn = document.querySelector(`.len-btn[data-length="${this.savedWordCountFilter}"]`);
                if (activeBtn) activeBtn.classList.add('active');
                this.currentWordCountFilter = this.savedWordCountFilter;
            } else {
                this.currentWordCountFilter = null;
            }
            
            // 更新 UI
            const word = this.app.currentWords[this.app.currentIndex];
            if (word) {
                await this.app.displayManager.renderWord(word);
                this.updateCard2(word);
                
                // 更新收藏按钮状态
                if (this.app.favoritesManager) {
                    const id = word.ID || word.id;
                    this.app.favoritesManager.updateFavoriteButtonState(id);
                }
            }
            
            console.log('[SearchManager] 已恢复到原始状态:', {
                index: this.app.currentIndex,
                word: word?.chinese_cn
            });
        }
    }

    // ==================== 工具方法 ====================

    /**
     * 获取翻译
     */
    getTranslationForWord(word) {
        if (!word) return '';
        const map = {
            'vi': 'vietnamese_vn', 'id': 'indonesian_id', 'es': 'spanish_es',
            'de': 'german_de', 'fr': 'french_fr', 'ru': 'russian_ru',
            'hi': 'hindi_hi', 'en': 'english_en', 'ko': 'korean_kr',
            'ja': 'japanese_ja', 'th': 'thai_th', 'my': 'malay_ms',
            'km': 'khmer_km', 'lo': 'lao_lo', 'mya': 'burmese_my', 'bn': 'bengali_bn'
        };
        const field = map[this.app.userLanguage] || map['en'];
        return word[field] || '';
    }

    /**
     * 更新卡片2
     */
    updateCard2(word) {
        const transEl = document.getElementById('card-2-translation');
        const engEl = document.getElementById('card-2-english');
        const explEl = document.getElementById('card-2-explanation');
        if (!transEl || !explEl || !engEl) return;

        if (word) {
            const primary = this.getTranslationForWord(word) || '';
            const englishTrans = word.english_en || '';
            const secondary = word.example_text || word.example_sentence || word.notes || '';

            transEl.textContent = primary;
            engEl.textContent = englishTrans;
            explEl.textContent = secondary;
        } else {
            transEl.textContent = '';
            engEl.textContent = '';
            explEl.textContent = '';
        }
    }

    /**
     * 显示 Toast
     */
    showToast(message, type = 'info', duration = 1800) {
        if (this.app && typeof this.app.showToast === 'function') {
            this.app.showToast(message, type, duration);
            return;
        }

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
     * 设置数据加载状态（兼容旧版本）
     */
    setDataLoaded(loaded) {
        // 新版本不需要这个方法，保持为空以兼容旧版本调用
        console.log('[SearchManager] setDataLoaded:', loaded);
    }
}

export default SearchManager;
