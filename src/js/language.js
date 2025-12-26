class LanguageManager {
    constructor() {
        this.userLanguage = localStorage.getItem('userLanguage') || null;
        this.supportedLanguages = [];
        this.currentLanguage = null;
        this.selectedLanguage = null;
        // 添加语言显示元素的引用
        this.languageDisplayElements = {
            switcher: null,
            flag: null,
            code: null
        };
    }

    async init() {
        // 加载支持的语言列表
        await this.loadLanguages();
        
        // 设置当前语言
        if (this.userLanguage) {
            this.setCurrentLanguage(this.userLanguage);
            this.hideLanguageSelector();
            this.showMainApp();
            // 确保语言显示元素正确隐藏
            this.updateLanguageDisplayVisibility();
        } else {
            this.showLanguageSelector();
        }
        
        return this.currentLanguage;
    }

    async loadLanguages() {
        try {
            const response = await fetch('src/data/languages.json');
            const data = await response.json();
            this.supportedLanguages = data.supportedLanguages.filter(lang => lang.code !== 'en');
        } catch (error) {
            console.error('加载语言配置失败:', error);
            // 默认语言（不包含英语）
            this.supportedLanguages = [
                { code: 'vi', name: 'Tiếng Việt', englishName: 'Vietnamese', icon: '🇻🇳' }
            ];
        }
    }

    showLanguageSelector() {
        const modal = document.getElementById('language-modal');
        const grid = document.getElementById('language-grid');
        const confirmBtn = document.getElementById('confirm-language');
        
        if (!grid) return;
        
        // 清空并生成语言选项（扁平列表，不显示地区分组标题）
        grid.innerHTML = '';

        // helper: 转换 emoji 字符为 twemoji 的 codepoint 表示如 '1f1ef-1f1f5'
        function emojiToCodePoint(input) {
            if (!input) return '';
            const codePoints = [];
            for (const ch of Array.from(input)) {
                codePoints.push(ch.codePointAt(0).toString(16));
            }
            return codePoints.join('-');
        }

        // 以平铺方式生成所有语言选项
        this.supportedLanguages.forEach(language => {
            const option = document.createElement('div');
            option.className = 'language-option';
            option.dataset.code = language.code;

            const iconContainer = document.createElement('div');
            iconContainer.className = 'language-icon';
            iconContainer.style.marginBottom = '0px'; 
            iconContainer.style.lineHeight   = '1';

            const emoji = language.icon || '';
            const img = document.createElement('img');
            img.alt = language.code;
            img.width = 28;
            img.height = 18;

            const codePoint = emojiToCodePoint(emoji);
            if (codePoint) {
                img.src = `https://twemoji.maxcdn.com/v/latest/svg/${codePoint}.svg`;
            } else {
                img.src = '';
            }

            img.addEventListener('error', () => {
                // Hide broken image and show a simple textual fallback (country code)
                img.style.display = 'none';
                // Avoid adding duplicate fallback nodes
                if (iconContainer.querySelector('.language-icon-text')) return;
                const txt = document.createElement('span');
                txt.className = 'language-icon-text';
                // use a plain text fallback instead of injecting raw SVG to avoid layout issues
                txt.textContent = (language.countryCode || language.code || '').toUpperCase();
                txt.setAttribute('aria-hidden', 'true');
                iconContainer.appendChild(txt);
            });

            iconContainer.appendChild(img);

            const nameDiv = document.createElement('div');
            nameDiv.className = 'language-name';
            nameDiv.textContent = language.name;

            // ↓↓↓ 移除了英文部分的创建 ↓↓↓
            //const engDiv = document.createElement('div');
            //engDiv.className = 'language-english';
            //engDiv.textContent = language.englishName;

            option.appendChild(iconContainer);
            option.appendChild(nameDiv);
            // ↓↓↓ 移除了英文div的追加 ↓↓↓
            //option.appendChild(engDiv);

            option.addEventListener('click', () => this.selectLanguage(option, language.code));
            grid.appendChild(option);

            try {
                if (window.twemoji && typeof window.twemoji.parse === 'function') {
                    window.twemoji.parse(iconContainer, { folder: 'svg', ext: '.svg' });
                }
            } catch (e) {
                console.warn('twemoji parse error', e);
            }
        });
        
        // 确认按钮事件（使用 onclick 避免重复绑定多个监听器）
        if (confirmBtn) {
            confirmBtn.onclick = () => this.confirmLanguageSelection();
            // 默认禁用，直到用户选择一种语言
            confirmBtn.disabled = true;
        }
        
        // 显示模态框 (reset inline display in case it was set to none)
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 100);
    }

    selectLanguage(element, languageCode) {
        // 移除所有选中状态
        document.querySelectorAll('.language-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // 添加选中状态
        element.classList.add('selected');
        
        // 启用确认按钮
        document.getElementById('confirm-language').disabled = false;
        
        // 临时保存选择
        this.selectedLanguage = languageCode;
    }

    confirmLanguageSelection() {
        if (!this.selectedLanguage) return;
        
        this.setLanguage(this.selectedLanguage);
        
        // 隐藏模态框
        this.hideLanguageSelector();
        // Debugging info: log any stray icon text / language option nodes in document
        console.log('language.confirm:', this.selectedLanguage,
            'fallbackCount:', document.querySelectorAll('.language-icon-text').length,
            'optionsCount:', document.querySelectorAll('.language-option').length,
            'orphanOptions:', Array.from(document.querySelectorAll('.language-option')).filter(o => !document.getElementById('language-modal')?.contains(o)).length
        );
        // Ensure no leftover textual fallbacks remain (defensive cleanup)
        document.querySelectorAll('.language-icon-text').forEach(el => el.remove());
        
        // 显示主应用
        this.showMainApp();
        
        // 动态加载选中语言对应的字体
        if (typeof fontLoader !== 'undefined') {
            fontLoader.loadFontByLanguage(this.selectedLanguage).catch(err => {
                console.error(`加载语言 ${this.selectedLanguage} 的字体失败:`, err);
            });
        }
        
        // 触发语言选择事件
        window.dispatchEvent(new CustomEvent('languageSelected', {
            detail: { language: this.selectedLanguage }
        }));
    }

    setLanguage(languageCode) {
        const language = this.supportedLanguages.find(lang => lang.code === languageCode);
        if (!language) return;
        
        this.setCurrentLanguage(languageCode);
        
        // 更新语言切换器显示
        this.updateLanguageSwitcher();
        
        // 保存语言选择时间
        localStorage.setItem('languageSelectedAt', Date.now());
    }

    setCurrentLanguage(languageCode) {
        const language = this.supportedLanguages.find(lang => lang.code === languageCode);
        if (language) {
            this.currentLanguage = language;
            this.userLanguage = languageCode;
            localStorage.setItem('userLanguage', languageCode);
        }
    }

    updateLanguageSwitcher() {
        const switcher = document.getElementById('language-switcher');
        const flag = document.getElementById('current-language-flag');
        const code = document.getElementById('current-language-code');
        
        if (switcher && this.currentLanguage) {
            flag.textContent = this.currentLanguage.icon;
            code.textContent = this.currentLanguage.code.toUpperCase();
            switcher.style.display = 'flex';
        }
    }

    updateLanguageDisplayVisibility() {
        // 确保语言显示元素正确隐藏或显示
        const switcher = document.getElementById('language-switcher');
        if (switcher) {
            // 如果已经显示主应用，隐藏语言切换器
            const app = document.getElementById('app');
            if (app && app.style.display === 'block') {
                switcher.style.display = 'none';
            } else {
                switcher.style.display = 'flex';
            }
        }
    }

    hideLanguageSelector() {
        const modal = document.getElementById('language-modal');
        if (modal) {
            console.log('隐藏语言选择模态框')
            modal.classList.remove('show');
            // Remove any appended textual fallbacks to avoid leftover nodes appearing outside modal
            modal.querySelectorAll('.language-icon-text').forEach(el => el.remove());
            // Remove selected class on options
            modal.querySelectorAll('.language-option.selected').forEach(opt => opt.classList.remove('selected'));
            // Clear language grid to remove transient nodes completely
            const grid = document.getElementById('language-grid');
            if (grid) grid.innerHTML = '';
            // Ensure confirm button is disabled
            const confirmBtn = document.getElementById('confirm-language');
            if (confirmBtn) confirmBtn.disabled = true;
            // Force hide (protect against CSS race/transition issues)
            modal.style.display = 'none';
            // Defensive: remove any language-option/fallback nodes that may have been moved outside modal
            document.querySelectorAll('.language-option').forEach(opt => {
                const modalRoot = document.getElementById('language-modal');
                if (!modalRoot || !modalRoot.contains(opt)) {
                    try { opt.remove(); } catch (e) {}
                }
            });
        }
        
        // 隐藏语言显示元素
        this.updateLanguageDisplayVisibility();
    }

    showMainApp() {
        const app = document.getElementById('app');
        if (app) {
            app.style.display = 'block';
            // 隐藏语言切换器
            const switcher = document.getElementById('language-switcher');
            if (switcher) {
                switcher.style.display = 'none';
            }
        }
    }

    // 切换语言
    switchLanguage() {
        this.selectedLanguage = null;
        this.showLanguageSelector();
        document.getElementById('confirm-language').disabled = true;
        
        // 隐藏主应用
        const app = document.getElementById('app');
        if (app) {
            app.style.display = 'none';
        }
    }
    
    // 获取翻译
    getTranslation(languageCode, key) {
        const language = this.supportedLanguages.find(lang => lang.code === languageCode);
        if (language && language[key]) {
            return language[key];
        }
        // 返回默认翻译
        const defaultLanguage = this.supportedLanguages.find(lang => lang.isDefault);
        if (defaultLanguage && defaultLanguage[key]) {
            return defaultLanguage[key];
        }
        // 如果都没有找到，返回键名
        return key;
    }
}

// 创建全局实例
const languageManager = new LanguageManager();
