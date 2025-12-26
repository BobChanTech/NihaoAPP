/**
 * 数据管理器 - 封装数据获取、存储、更新和维护逻辑
 */
class DataManager {
    constructor(appInstance) {
        this.app = appInstance;
        this._db = appInstance.db;
        this._fallbackDataKey = 'vocab_fallback_data';
        this._lastUpdateKey = 'vocab_last_update';
        this._dataVersionKey = 'vocab_data_version';
        this._defaultDataVersion = '1.0.4';
    }

    /* ================ 数据获取与存储 ================ */

    /**
     * 从远程下载数据并存储到本地数据库
     */
    async downloadAndStoreData() {
        this._updateDataStatus('正在下载数据...', 'loading');
        try {
            const timestamp = Date.now();
            const response = await fetch(`src/data/databasemain.json?_=${timestamp}`, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            const wordsData = await response.json();
            if (!Array.isArray(wordsData) || wordsData.length === 0) {
                throw new Error('数据格式错误或为空');
            }
            const firstWord = wordsData[0];
            if (!firstWord.ID || !firstWord.chinese_cn || !firstWord.english_en) {
                throw new Error('数据格式不正确');
            }
            this._updateDataStatus('正在存储数据...', 'loading');
            const result = await this._db.storeWords(wordsData);
            if (result.failed > 0) {
                console.warn(`${result.failed} 个词汇存储失败`);
            }
            const lastUpdateTime = new Date().toLocaleString();
            localStorage.setItem(this._lastUpdateKey, lastUpdateTime);
            localStorage.setItem(this._dataVersionKey, this.app.dataVersion);
            this._safeSetText(this.app.lastUpdatedElement, lastUpdateTime);
            this._safeSetText(this.app.dataVersionElement, `v${this.app.dataVersion}`);
        } catch (error) {
            console.error('数据下载失败:', error);
            const fallbackData = localStorage.getItem(this._fallbackDataKey);
            if (fallbackData) {
                try {
                    const wordsData = JSON.parse(fallbackData);
                    await this._db.storeWords(wordsData);
                    await this.loadData();
                } catch (fallbackError) {
                    throw error;
                }
            } else {
                throw error;
            }
        }
    }

    /**
     * 初始化数据库
     */
    async init() {
        try {
            return await this._db.init();
        } catch (error) {
            console.error('数据库初始化失败:', error);
            throw error;
        }
    }

    /**
     * 检查数据库中是否有数据
     */
    async hasData() {
        try {
            const stats = await this._db.getStats();
            return stats.total > 0;
        } catch (error) {
            console.error('检查数据是否存在失败:', error);
            return false;
        }
    }

    /**
     * 整合初始化逻辑
     */
    async initialize() {
        try {
            await this.init();
            const hasData = await this.hasData();
            if (!hasData) {
                await this.downloadAndStoreData();
            } else {
                await this.loadData();
            }
            return true;
        } catch (error) {
            console.error('初始化失败:', error);
            throw error;
        }
    }

    /**
     * 根据ID获取单个单词数据
     */
    async getWordById(id) {
        try {
            return await this._db.getWordById(id);
        } catch (error) {
            console.error('获取单词失败:', error);
            return null;
        }
    }

    /**
     * 搜索单词
     */
    async searchWords(options) {
        try {
            return await this._db.searchWords(options);
        } catch (error) {
            console.error('搜索单词失败:', error);
            return [];
        }
    }

    /**
     * 从本地数据库加载数据并更新UI显示
     */
    async loadData() {
        try {
            const stats = await this._db.getStats();
            this._safeSetText(this.app.totalWordsElement, stats.total);
            const lastUpdateTime = localStorage.getItem(this._lastUpdateKey) || '从未更新';
            this._safeSetText(this.app.lastUpdatedElement, lastUpdateTime);
            const dataVersion = localStorage.getItem(this._dataVersionKey) || this._defaultDataVersion;
            this.app.dataVersion = dataVersion;
            this._safeSetText(this.app.dataVersionElement, `v${dataVersion}`);
            
            // 加载所有词汇数据到app.currentWords
            const allWords = await this._db.getAllWords();
            if (allWords && allWords.length > 0) {
                this.app.currentWords = allWords;
            } else {
                // 如果没有数据，设置默认词汇
                this.app.currentWords = [{ 
                    ID: 'default-1', 
                    chinese_cn: '一', 
                    pinyin: 'yī', 
                    english_en: 'one', 
                    example_cn: '一个人', 
                    example_en: 'a person', 
                    category_id: '1', 
                    isFavorite: false, 
                    learned: false
                }];
            }
            
            // 确保语言设置正确应用
            if (typeof this.app.setLearningLanguage === 'function') {
                this.app.setLearningLanguage(this.app.userLanguage);
            }
        } catch (error) {
            console.error('数据加载失败:', error);
            // 加载失败时设置默认词汇
            this.app.currentWords = [{ 
                ID: 'default-1', 
                chinese_cn: '一', 
                pinyin: 'yī', 
                english_en: 'one', 
                example_cn: '一个人', 
                example_en: 'a person', 
                category_id: '1', 
                isFavorite: false, 
                learned: false
            }];
            throw error;
        }
    }

    /**
     * 导出所有数据为JSON文件
     */
    async exportData() {
        try {
            const words = await this._db.getAllWords();
            const blob = new Blob([JSON.stringify(words, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chinese_vocab_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            console.log('数据导出完成');
        } catch (error) {
            console.error('导出数据失败:', error);
            this._showToast('导出数据失败', 'error');
        }
    }

    /**
     * 从JSON文件导入数据
     */
    async importData(file) {
        if (!file) return;
        try {
            const text = await file.text();
            const wordsData = JSON.parse(text);
            if (!Array.isArray(wordsData) || wordsData.length === 0) {
                throw new Error('无效的数据格式');
            }
            const firstWord = wordsData[0];
            if (!firstWord.ID || !firstWord.chinese_cn || !firstWord.english_en) {
                throw new Error('数据格式不正确，缺少必要字段');
            }
            this._updateDataStatus('正在导入数据...', 'loading');
            await this._db.storeWords(wordsData);
            localStorage.setItem(this._fallbackDataKey, text);
            await this.loadData();
            this._showToast('数据导入成功！', 'success');
        } catch (error) {
            console.error('导入数据失败:', error);
            this._showToast(`导入失败: ${error.message}`, 'error');
        }
    }

    /**
     * 清除所有本地数据并重新下载
     */
    async clearData() {
        try {
            this._updateDataStatus('正在清除数据...', 'loading');
            await this.clearLocalDatabase();
            this.clearLocalStorage();
            this._safeSetText(this.app.totalWordsElement, '0');
            this._safeSetText(this.app.displayCountElement, '0');
            this._safeSetText(this.app.lastUpdatedElement, '从未更新');
            this._safeSetText(this.app.dataVersionElement, `v${this._defaultDataVersion}`);
            await this.downloadAndStoreData();
            this._showToast('数据已清除并重新下载', 'success');
        } catch (error) {
            console.error('清除数据失败:', error);
            this._showToast('清除数据失败', 'error');
        }
    }

    /**
     * 清除本地数据库
     */
    async clearLocalDatabase() {
        try {
            await this._db.clearAllData();
        } catch (error) {
            console.warn('DataManager: 清除本地数据库失败:', error);
        }
    }

    /**
     * 清除本地存储中的数据
     */
    clearLocalStorage() {
        const keysToRemove = [
            this._lastUpdateKey,
            this._dataVersionKey,
            this._fallbackDataKey
        ];
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
    }

    /* ================ 辅助方法 ================ */

    /**
     * 更新数据状态显示
     */
    _updateDataStatus(message, type) {
        if (this.app.updateDataStatus) {
            this.app.updateDataStatus(message, type);
        }
    }

    /**
     * 安全设置文本内容
     */
    _safeSetText(element, text) {
        if (this.app.safeSetText) {
            this.app.safeSetText(element, text);
        } else if (element) {
            element.textContent = text;
        }
    }

    /**
     * 安全设置显示状态
     */
    _safeSetDisplay(element, display) {
        if (this.app.safeSetDisplay) {
            this.app.safeSetDisplay(element, display);
        } else if (element) {
            element.style.display = display;
        }
    }

    /**
     * 显示提示信息
     */
    _showToast(message, type = 'info') {
        if (this.app.showToast) {
            this.app.showToast(message, type);
        }
    }
}

export default DataManager;