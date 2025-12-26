/**
 * 显示管理器
 * 负责应用的单词显示逻辑，包括主界面单词渲染和显示状态管理
 */
class DisplayManager {
    constructor(appInstance) {
        this.app = appInstance;
        this._pinyinEl = null;
        this._chineseEl = null;
        this._chineseContainer = null;
        this._favBtn = null;
        
        this.initElements();
    }
    
    /**
     * 初始化DOM元素引用
     */
    initElements() {
        this._pinyinEl = document.getElementById('pinyin');
        this._chineseEl = document.getElementById('chinese');
        this._chineseContainer = this._chineseEl;
        this._favBtn = document.getElementById('favorite-btn');
    }
    
    /**
     * 渲染单词显示
     * @param {Object} word - 要显示的单词对象
     */
    async renderWord(word) {
        if (!word) return;
        
        // 确保元素引用是最新的
        this.initElements();
        
        // 清空元素内容
        if (this._pinyinEl) this._pinyinEl.innerHTML = '';
        if (this._chineseEl) this._chineseEl.innerHTML = '';
        
        // 更新拼音显示
        if (word.pinyin && this._pinyinEl) {
            this._pinyinEl.innerHTML = word.pinyin.split(' ').map(p => `<span class="pinyin-item">${p}</span>`).join('');
        }
        
        // 更新汉字显示和样式
        if (word.chinese_cn && this._chineseEl && this._chineseContainer) {
            this._chineseEl.innerHTML = word.chinese_cn.split('').map(c => `<span class="chinese-item">${c}</span>`).join('');
            if (word.chinese_cn.length === 1) this._chineseContainer.classList.add('single-char');
            else this._chineseContainer.classList.remove('single-char');
            this._chineseContainer.setAttribute('data-chars', word.chinese_cn.length);
        }
        
        // 设置收藏按钮状态
        if (this._favBtn) this._favBtn.style.display = 'inline-block';
        await this.app.favoritesManager.updateFavoriteButtonState(word.ID || word.id);
        
        // 更新卡片
        this.app.searchManager.updateCard2(word);
    }
    
    /**
     * 清空单词显示
     */
    clearWordDisplay() {
        // 确保元素引用是最新的
        this.initElements();
        
        if (this._pinyinEl) this._pinyinEl.innerHTML = '';
        if (this._chineseEl) this._chineseEl.innerHTML = '';
        if (this._favBtn) this._favBtn.style.display = 'none';
        if (this._chineseContainer) this._chineseContainer.classList.remove('single-char');
        
        this.app.searchManager.updateCard2(null);
    }
}

// 导出模块
export default DisplayManager;