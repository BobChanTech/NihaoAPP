class FontLoader {
    constructor() {
        this.loadedFonts = new Set();
        this.fontMap = {};
        this.languagesData = null;
    }

    // 加载语言配置文件以获取字体映射
    async loadLanguageConfig() {
        if (this.languagesData) {
            return this.languagesData;
        }

        try {
            const response = await fetch('/src/data/languages.json');
            this.languagesData = await response.json();
            
            // 从languageInfo中构建字体映射
            if (this.languagesData.languageInfo) {
                Object.keys(this.languagesData.languageInfo).forEach(langCode => {
                    const langInfo = this.languagesData.languageInfo[langCode];
                    if (langInfo.googleFont) {
                        this.fontMap[langCode] = langInfo.googleFont;
                    }
                });
            }
            
            console.log('字体映射已从languages.json加载:', this.fontMap);
            return this.languagesData;
        } catch (error) {
            console.error('加载语言配置失败:', error);
            // 如果加载失败，使用默认字体映射
            this.fontMap = {
                'hi': 'Noto Sans Devanagari',
                'th': 'Noto Sans Thai',
                'km': 'Noto Sans Khmer',
                'lo': 'Noto Sans Lao',
                'mya': 'Noto Sans Myanmar',
                'bn': 'Noto Sans Bengali',
                'ru': 'Noto Sans Cyrillic',
                'ko': 'Noto Sans KR',
                'ja': 'Noto Sans JP'
            };
            return null;
        }
    }

    // 根据语言代码加载对应的字体
    async loadFontByLanguage(languageCode) {
        // 检查是否已经加载过该字体
        if (this.loadedFonts.has(languageCode)) {
            console.log(`字体已加载: ${languageCode}`);
            return true;
        }

        // 确保语言配置已加载
        await this.loadLanguageConfig();

        // 获取该语言需要的字体
        const fontName = this.fontMap[languageCode];
        if (!fontName) {
            // 如果没有对应的字体，则使用核心字体
            console.log(`没有找到语言 ${languageCode} 对应的特定字体，使用核心字体`);
            return true;
        }

        try {
            // 动态加载Google Fonts
            await this.loadGoogleFont(fontName);
            // 标记为已加载
            this.loadedFonts.add(languageCode);
            console.log(`成功加载语言 ${languageCode} 的字体: ${fontName}`);
            return true;
        } catch (error) {
            console.error(`加载语言 ${languageCode} 的字体失败: ${error}`);
            return false;
        }
    }

    // 加载Google Fonts
    async loadGoogleFont(fontName) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@300;400;500;600;700&display=swap`;
            link.rel = 'stylesheet';
            link.crossOrigin = 'anonymous';
            
            link.onload = () => resolve();
            link.onerror = () => reject(new Error(`Failed to load font: ${fontName}`));
            
            document.head.appendChild(link);
        });
    }

    // 预加载所有支持的语言字体（可选）
    // 注意：仅在需要时调用此方法，否则会加载所有字体影响性能
    async preloadAllFonts() {
        console.warn('不建议预加载所有字体，这会影响性能。请考虑按需加载。');
        await this.loadLanguageConfig();
        
        const fontLoadPromises = Object.keys(this.fontMap).map(languageCode => 
            this.loadFontByLanguage(languageCode)
        );
        
        await Promise.allSettled(fontLoadPromises);
        console.log('所有语言字体加载完成');
    }

    // 获取语言对应的字体名称
    getFontNameByLanguage(languageCode) {
        // 如果字体映射未初始化，尝试同步获取默认值
        if (Object.keys(this.fontMap).length === 0) {
            // 提供默认的字体映射作为回退
            const defaultFontMap = {
                'hi': 'Noto Sans Devanagari',
                'th': 'Noto Sans Thai',
                'km': 'Noto Sans Khmer',
                'lo': 'Noto Sans Lao',
                'mya': 'Noto Sans Myanmar',
                'bn': 'Noto Sans Bengali',
                'ru': 'Noto Sans Cyrillic',
                'ko': 'Noto Sans KR',
                'ja': 'Noto Sans JP'
            };
            return defaultFontMap[languageCode] || 'Noto Sans';
        }
        return this.fontMap[languageCode] || 'Noto Sans';
    }
}

// 创建全局实例
const fontLoader = new FontLoader();