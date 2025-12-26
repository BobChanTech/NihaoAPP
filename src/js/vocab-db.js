// vocab-db.js
class VocabDB {
    constructor() {
        this.dbName = 'ChineseVocabDB';
        this.version = 2;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                
                if (db.objectStoreNames.contains('words')) {
                    db.deleteObjectStore('words');
                }
                
                const store = db.createObjectStore('words', { keyPath: 'ID' });
                
                store.createIndex('hsk_level', 'hsk_level');
                store.createIndex('word_count', 'word_count');
                store.createIndex('is_premium', 'is_premium');
                store.createIndex('chinese_cn', 'chinese_cn');
                store.createIndex('pinyin', 'pinyin');
                store.createIndex('pinyin_no_tone', 'pinyin_no_tone');
            };
        });
    }

    async hasData() {
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(['words'], 'readonly');
                const store = tx.objectStore('words');
                const req = store.count();
                req.onsuccess = () => resolve(req.result > 0);
                req.onerror = () => resolve(false);
            } catch (e) {
                resolve(false);
            }
        });
    }

    async storeWords(words) {
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(['words'], 'readwrite');
                const store = tx.objectStore('words');
                let success = 0, failed = 0;

                for (const word of words) {
                    try {
                        const req = store.put(word);
                        req.onsuccess = () => { success++; };
                        req.onerror = () => { failed++; };
                    } catch (e) {
                        console.warn('存储失败:', word.ID, e);
                        failed++;
                    }
                }

                tx.oncomplete = () => resolve({ success, failed });
                tx.onerror = () => reject(tx.error || new Error('Transaction failed'));
            } catch (e) {
                reject(e);
            }
        });
    }

    async getStats() {
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(['words'], 'readonly');
                const store = tx.objectStore('words');
                const req = store.count();
                req.onsuccess = () => resolve({ total: req.result });
                req.onerror = () => resolve({ total: 0 });
            } catch (e) {
                resolve({ total: 0 });
            }
        });
    }

    async searchWords(options) {
        const { searchText, hskLevel, wordCount, hidePremium } = options;
        
        if (!searchText || searchText.trim() === '') {
            return this.searchWithoutText({ hskLevel, wordCount, hidePremium });
        }
        
        return new Promise((resolve, reject) => {
            try {
                const searchTerm = searchText.trim();
                const searchTermLower = searchTerm.toLowerCase();
                
                // 判断搜索类型
                const isChinese = /[\u4e00-\u9fff]/.test(searchTerm);
                const isPinyin = /^[a-z\s']+$/i.test(searchTermLower) && !isChinese;
                const isDigitsOnly = /^\d+$/.test(searchTerm);
                
                // 数字转中文映射（用于搜索数字1-10）
                const digitToChinese = {
                    '0': '零', '1': '一', '2': '二', '3': '三', '4': '四',
                    '5': '五', '6': '六', '7': '七', '8': '八', '9': '九', '10': '十'
                };
                
                // 如果搜索的是纯数字，转换为中文数字搜索
                let chineseSearchTerm = null;
                if (isDigitsOnly && digitToChinese[searchTerm]) {
                    chineseSearchTerm = digitToChinese[searchTerm];
                    console.log(`数字搜索: "${searchTerm}" 转换为中文 "${chineseSearchTerm}"`);
                }
                
                const tx = this.db.transaction(['words'], 'readonly');
                const store = tx.objectStore('words');
                const req = store.getAll();
                
                req.onsuccess = () => {
                    const allWords = req.result || [];
                    const results = [];

                    for (const word of allWords) {
                        if (hskLevel && hskLevel !== 'all' && word.hsk_level != hskLevel) continue;
                        if (wordCount && wordCount !== 'all' && word.word_count != wordCount) continue;
                        if (hidePremium && word.is_premium) continue;

                        let match = false;
                        
                        // 0. 数字搜索（数字转中文匹配）
                        if (chineseSearchTerm && word.chinese_cn) {
                            if (word.chinese_cn === chineseSearchTerm || word.chinese_cn.includes(chineseSearchTerm)) {
                                match = true;
                                results.push(word);
                                continue;
                            }
                        }
                        
                        // 1. 中文搜索
                        if (isChinese && word.chinese_cn) {
                            if (word.chinese_cn === searchTerm || word.chinese_cn.includes(searchTerm)) {
                                match = true;
                                results.push(word);
                                continue;
                            }
                        }
                        
                        // 2. 拼音搜索 - 改进的多音节匹配
                        if (!match && isPinyin) {
                            // 准备搜索词拼音数组
                            const searchPinyinArray = searchTermLower.split(' ')
                                .filter(s => s.length > 0)
                                .map(s => s.replace(/[1-5]/g, '')); // 移除声调数字
                            
                            // 检查带声调的拼音
                            if (word.pinyin) {
                                const wordPinyinLower = word.pinyin.toLowerCase();
                                const wordPinyinArray = wordPinyinLower.split(' ')
                                    .filter(s => s.length > 0)
                                    .map(s => s.replace(/[1-5]/g, ''));
                                
                                // 判断是否匹配
                                if (this.isPinyinMatch(searchPinyinArray, wordPinyinArray)) {
                                    match = true;
                                }
                            }
                            
                            // 检查无调拼音
                            if (!match && word.pinyin_no_tone) {
                                const wordPinyinNoToneLower = word.pinyin_no_tone.toLowerCase();
                                const wordPinyinNoToneArray = wordPinyinNoToneLower.split(' ')
                                    .filter(s => s.length > 0);
                                
                                if (this.isPinyinMatch(searchPinyinArray, wordPinyinNoToneArray)) {
                                    match = true;
                                }
                            }
                        }
                        
                        // 3. 英文和其他语言搜索
                        if (!match) {
                            const fieldsToSearch = [
                                'english_en',
                                'vietnamese_vn', 
                                'spanish_es',
                                'hindi_hi',
                                'korean_kr',
                                'japanese_ja',
                                'german_de',
                                'french_fr',
                                'russian_ru',
                                'thai_th',
                                'malay_my',
                                'indonesian_id'
                            ];
                            
                            for (const field of fieldsToSearch) {
                                const value = word[field];
                                if (value && typeof value === 'string') {
                                    // 使用单词边界正则表达式，确保只匹配完整单词
                                    const regex = new RegExp(`\\b${searchTermLower}\\b`, 'i');
                                    if (regex.test(value)) {
                                        match = true;
                                        break;
                                    }
                                }
                            }
                        }
                        
                        if (!match) continue;
                        
                        results.push(word);
                    }

                    console.log(`搜索 "${searchText}" 找到 ${results.length} 个结果`, {
                        isChinese,
                        isPinyin,
                        results: results.map(w => ({ 
                            id: w.ID,
                            chinese: w.chinese_cn, 
                            pinyin: w.pinyin
                        }))
                    });
                    resolve(results);
                };

                req.onerror = () => {
                    console.error('搜索失败:', req.error);
                    resolve([]);
                };
            } catch (e) {
                console.error('搜索异常:', e);
                resolve([]);
            }
        });
    }

    // 拼音匹配逻辑
    isPinyinMatch(searchArray, wordArray) {
        // 如果搜索词是单个音节，检查是否在词条拼音数组中
        if (searchArray.length === 1) {
            const searchSyllable = searchArray[0];
            return wordArray.some(syllable => syllable === searchSyllable);
        }
        
        // 如果搜索词是多音节，检查是否是词条拼音的开头部分
        if (searchArray.length > 1) {
            // 检查搜索词是否是词条拼音的前缀
            if (searchArray.length <= wordArray.length) {
                for (let i = 0; i < searchArray.length; i++) {
                    if (searchArray[i] !== wordArray[i]) {
                        return false;
                    }
                }
                return true;
            }
        }
        
        return false;
    }

    async searchWithoutText(options) {
        const { hskLevel, wordCount, hidePremium } = options;
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(['words'], 'readonly');
                const store = tx.objectStore('words');
                const req = store.getAll();
                
                req.onsuccess = () => {
                    const allWords = req.result || [];
                    const results = [];

                    for (const word of allWords) {
                        if (hskLevel && hskLevel !== 'all' && word.hsk_level != hskLevel) continue;
                        if (wordCount && wordCount !== 'all' && word.word_count != wordCount) continue;
                        if (hidePremium && word.is_premium) continue;
                        
                        results.push(word);
                    }

                    resolve(results);
                };

                req.onerror = () => resolve([]);
            } catch (e) {
                resolve([]);
            }
        });
    }

    async getWordById(id) {
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(['words'], 'readonly');
                const store = tx.objectStore('words');
                const req = store.get(id);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            } catch (e) {
                resolve(null);
            }
        });
    }

    async getWordsByIds(ids) {
        if (!ids || ids.length === 0) return [];
        
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction(['words'], 'readonly');
                const store = tx.objectStore('words');
                
                // 去重，避免重复查询
                const uniqueIds = [...new Set(ids)];
                const resultMap = {};
                let completed = 0;
                
                uniqueIds.forEach(id => {
                    const request = store.get(id);
                    
                    request.onsuccess = (event) => {
                        if (event.target.result) {
                            resultMap[id] = event.target.result;
                        }
                        completed++;
                        
                        if (completed === uniqueIds.length) {
                            // 按原始顺序返回
                            const sortedResults = ids
                                .map(id => resultMap[id])
                                .filter(Boolean);
                            resolve(sortedResults);
                        }
                    };
                    
                    request.onerror = (event) => {
                        console.warn(`查询ID ${id} 失败:`, event.target.error);
                        completed++;
                        
                        if (completed === uniqueIds.length) {
                            const sortedResults = ids
                                .map(id => resultMap[id])
                                .filter(Boolean);
                            resolve(sortedResults);
                        }
                    };
                });
                
                tx.onerror = (event) => {
                    console.error('事务失败:', event.target.error);
                    resolve([]);
                };
                
            } catch (e) {
                console.error('批量查询异常:', e);
                resolve([]);
            }
        });
    }



    async getAllWords() {
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(['words'], 'readonly');
                const store = tx.objectStore('words');
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            } catch (e) {
                resolve([]);
            }
        });
    }

    async clearAllData() {
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(['words'], 'readwrite');
                const store = tx.objectStore('words');
                const req = store.clear();
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error || new Error('clear failed'));
            } catch (e) {
                reject(e);
            }
        });
    }

    async debugSearchChinese(character) {
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(['words'], 'readonly');
                const store = tx.objectStore('words');
                const req = store.getAll();
                
                req.onsuccess = () => {
                    const allWords = req.result || [];
                    const matches = allWords.filter(word => 
                        word.chinese_cn && word.chinese_cn.includes(character)
                    );
                    console.log(`调试中文搜索 "${character}":`, {
                        totalWords: allWords.length,
                        matches: matches.length,
                        matchesDetails: matches.map(w => ({ 
                            id: w.ID, 
                            chinese: w.chinese_cn,
                            pinyin: w.pinyin
                        }))
                    });
                    resolve(matches);
                };
                
                req.onerror = () => {
                    console.error('调试搜索失败');
                    resolve([]);
                };
            } catch (e) {
                console.error('调试搜索异常:', e);
                resolve([]);
            }
        });
    }

    async debugSearchPinyin(pinyin) {
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(['words'], 'readonly');
                const store = tx.objectStore('words');
                const req = store.getAll();
                
                req.onsuccess = () => {
                    const allWords = req.result || [];
                    const searchTermLower = pinyin.toLowerCase();
                    const searchArray = searchTermLower.split(' ')
                        .filter(s => s.length > 0)
                        .map(s => s.replace(/[1-5]/g, ''));
                    
                    const matches = [];
                    
                    for (const word of allWords) {
                        let match = false;
                        
                        // 检查带声调的拼音
                        if (word.pinyin) {
                            const wordPinyinLower = word.pinyin.toLowerCase();
                            const wordArray = wordPinyinLower.split(' ')
                                .filter(s => s.length > 0)
                                .map(s => s.replace(/[1-5]/g, ''));
                            
                            if (this.isPinyinMatch(searchArray, wordArray)) {
                                match = true;
                            }
                        }
                        
                        // 检查无调拼音
                        if (!match && word.pinyin_no_tone) {
                            const wordPinyinNoToneLower = word.pinyin_no_tone.toLowerCase();
                            const wordArray = wordPinyinNoToneLower.split(' ')
                                .filter(s => s.length > 0);
                            
                            if (this.isPinyinMatch(searchArray, wordArray)) {
                                match = true;
                            }
                        }
                        
                        if (match) {
                            matches.push(word);
                        }
                    }
                    
                    console.log(`调试拼音搜索 "${pinyin}":`, {
                        searchArray,
                        totalWords: allWords.length,
                        matches: matches.length,
                        matchesDetails: matches.map(w => ({ 
                            id: w.ID, 
                            chinese: w.chinese_cn,
                            pinyin: w.pinyin,
                            pinyin_no_tone: w.pinyin_no_tone
                        }))
                    });
                    resolve(matches);
                };
                
                req.onerror = () => {
                    console.error('调试搜索失败');
                    resolve([]);
                };
            } catch (e) {
                console.error('调试搜索异常:', e);
                resolve([]);
            }
        });
    }
}

export default VocabDB;
