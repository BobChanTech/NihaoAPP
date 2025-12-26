/**
 * 简化版发音管理器 - 占位版本
 * 将来会替换为完整的音频播放功能
 */
class SimpleSpeechManager {
    constructor(appInstance = null) {
        this.app = appInstance;
        this.userInteraction = false; // 添加用户交互标志，用于iOS兼容性
        this.init();
    }

    /**
     * 初始化
     */
    init() {
        console.log('发音管理器初始化（简化版）');
        this.bindSpeechButton();
        // 添加用户交互监听，用于iOS音频播放
        document.addEventListener('touchstart', () => {
            this.userInteraction = true;
        }, { once: true });
        document.addEventListener('click', () => {
            this.userInteraction = true;
        }, { once: true });
    }

    /**
     * 绑定发音按钮事件
     */
    bindSpeechButton() {
        const speechBtn = document.getElementById('speech-btn');
        if (speechBtn) {
            speechBtn.addEventListener('click', () => {
                this.userInteraction = true; // 标记用户已交互
                this.playCurrentWord();
            });
        }
    }

    /**
     * 播放当前词汇发音
     */
    async playCurrentWord() {
        try {
            let chineseText = '';
            let pinyinText = '';
            
            // 优先从DOM获取当前显示的内容，避免依赖currentWords数组
            const chineseEl = document.getElementById('chinese');
            if (chineseEl && chineseEl.textContent) {
                chineseText = chineseEl.textContent;
            }
            
            const pinyinEl = document.getElementById('pinyin');
            if (pinyinEl && pinyinEl.textContent) {
                pinyinText = pinyinEl.textContent;
            }
            
            // 如果DOM中没有内容，再尝试从currentWords获取
            if (!chineseText && this.app && this.app.currentWords && this.app.currentWords.length > 0) {
                const currentWord = this.app.currentWords[this.app.currentIndex];
                if (currentWord && currentWord.chinese_cn) {
                    chineseText = currentWord.chinese_cn;
                    pinyinText = currentWord.pinyin || '';
                }
            }
            
            if (!chineseText) {
                this.showMessage('没有可发音的词汇', 'warning');
                return;
            }
            
            // 直接使用浏览器TTS
            await this.speakWithTTS({ chinese_cn: chineseText, pinyin: pinyinText });
            
        } catch (error) {
            console.warn('发音功能:', error.message);
            // 添加详细的错误信息以便调试
            this.showMessage(`播放失败: ${error.message}`, 'error');

        }
    }





    /**
     * 使用浏览器TTS发音（主方案）
     */
    async speakWithTTS(word) {
        console.log('[SpeechManager] 尝试使用TTS播放:', word.chinese_cn);
        
        if (!('speechSynthesis' in window)) {
            const errorMsg = '浏览器不支持语音合成';
            console.error('[SpeechManager]', errorMsg);
            throw new Error(errorMsg);
        }
        
        // 确保语音合成API已经加载完成
        if (speechSynthesis.speaking) {
            console.log('[SpeechManager] TTS正在播放中，取消当前播放');
            speechSynthesis.cancel();
        }
        
        return new Promise((resolve, reject) => {
            // 创建语音
            const utterance = new SpeechSynthesisUtterance(word.chinese_cn);
            
            // 设置中文普通话发音
            utterance.lang = 'zh-CN';
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            // 获取语音列表并设置合适的语音
            const setVoice = () => {
                const voices = speechSynthesis.getVoices();
                console.log('[SpeechManager] 可用语音列表:', voices.map(v => ({
                    name: v.name,
                    lang: v.lang,
                    localService: v.localService,
                    default: v.default
                })));
                
                // 优先选择中文本地服务语音
                let selectedVoice = voices.find(voice => 
                    voice.lang.includes('zh') && voice.localService
                );
                
                // 如果没有找到本地中文语音，查找任何中文语音
                if (!selectedVoice) {
                    selectedVoice = voices.find(voice => 
                        voice.lang.includes('zh')
                    );
                }
                
                // 如果还是没有找到，使用默认语音
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                    console.log('[SpeechManager] 选择的语音:', {
                        name: selectedVoice.name,
                        lang: selectedVoice.lang,
                        localService: selectedVoice.localService
                    });
                } else {
                    console.warn('[SpeechManager] 未找到合适的中文语音，将使用默认语音');
                }
            };
            
            // 处理语音列表异步加载的情况
            if (speechSynthesis.getVoices().length > 0) {
                setVoice();
            } else {
                console.log('[SpeechManager] 等待语音列表加载...');
                speechSynthesis.onvoiceschanged = () => {
                    console.log('[SpeechManager] 语音列表已更新');
                    setVoice();
                    speechSynthesis.onvoiceschanged = null;
                };
                
                // 设置超时以防事件永不触发
                setTimeout(() => {
                    if (!utterance.voice) {
                        console.warn('[SpeechManager] 语音列表加载超时，使用默认语音');
                        setVoice();
                    }
                }, 3000);
            }
            
            // 播放完成回调
            utterance.onend = () => {
                console.log('TTS播放完成:', word.chinese_cn);
                resolve();
            };
            
            utterance.onerror = (event) => {
                console.error('TTS播放错误:', event.error, event);
                // 在某些情况下，即使触发了onerror，TTS也可能实际播放成功
                // 所以我们延迟解决Promise以避免重复调用
                setTimeout(() => {
                    resolve();
                }, 1000);
            };
            
            utterance.onstart = () => {
                console.log('[SpeechManager] TTS开始播放:', word.chinese_cn);
            };
            
            // 开始播放
            console.log('[SpeechManager] 调用speechSynthesis.speak()');
            speechSynthesis.speak(utterance);
            
            // 添加超时机制确保Promise最终会被解决
            setTimeout(() => {
                if (speechSynthesis.speaking) {
                    console.log('[SpeechManager] TTS播放超时，强制结束');
                    speechSynthesis.cancel();
                }
                resolve();
            }, 5000); // 5秒超时
        });
    }

    /**
     * 播放指定词汇
     */
    async playWord(wordId) {
        try {
            if (!this.app?.dataManager) {
                throw new Error('数据管理器未初始化');
            }
            
            const word = await this.app.dataManager.getWordById(wordId);
            if (!word) {
                throw new Error('未找到词汇');
            }
            
            await this.playCurrentWord();
            
        } catch (error) {
            console.warn('播放词汇失败:', error.message);
            this.showMessage('无法播放发音', 'warning');
        }
    }

    /**
     * 显示消息
     */
    showMessage(message, type = 'info') {
        // 使用主应用的toast
        if (this.app && typeof this.app.showToast === 'function') {
            this.app.showToast(message, type);
            return;
        }
        
        // 简单控制台输出
        console.log(`[发音] ${type}: ${message}`);
    }

    /**
     * 测试发音功能
     */
    test() {
        console.log('发音功能测试');
        this.showMessage('发音功能测试成功', 'success');
    }
}

// 全局导出
if (typeof window !== 'undefined') {
    window.SimpleSpeechManager = SimpleSpeechManager;
}

export default SimpleSpeechManager;
