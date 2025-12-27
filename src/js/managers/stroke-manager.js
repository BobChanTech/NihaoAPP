/**
 * 笔顺管理器 - 负责汉字的笔顺显示功能
 */
class StrokeManager {
    constructor(app) {
        this.app = app;
        this.currentChar = '';
        this.userLanguage = localStorage.getItem('userLanguage') || 'vi';
        this.multiCharMode = false;      // 多字模式标志
        this.multiCharWords = [];        // 多字词条的字符数组
        this.currentCharIndex = 0;       // 当前显示的字符索引
        
        // 笔画数据缓存系统
        this.strokeDataCache = new Map();    // 存储已加载的文件数据
        this.loadedFiles = new Set();        // 记录已加载的文件编号
        this.strokesPath = './char-data/';   // 笔画数据路径（相对于HTML文件）
        
        // 绑定事件处理方法
        this._escapeKeyHandler = this._escapeKeyHandler.bind(this);
        this._keyDownHandler = this._keyDownHandler.bind(this);
        
        // 笔顺动画消息映射
        this.strokeMessages = {
            'vi': {
                title: `Hiển thị thứ tự nét chữ`,
                message: (char) => `Đang hiển thị hoạt ảnh thứ tự nét chữ Hán「${char}」...\n\nGợi ý: Tính năng này cần tích hợp thư viện hoạt ảnh thứ tự nét để hiển thị đầy đủ viết chữ/thứ tự nét.`,
                errorNoChar: 'Hiện không hiển thị chữ Hán!',
                errorNoData: 'Không có dữ liệu chữ Hán nào được tải!'
            },
            'id': {
                title: `Menampilkan Urutan Coretan`,
                message: (char) => `Menampilkan animasi urutan coretan karakter Tionghoa「${char}」...\n\nPetunjuk: Fitur ini membutuhkan integrasi pustaka animasi urutan coretan untuk menampilkan tulisan/urutan coretan yang lengkap.`,
                errorNoChar: 'Saat ini tidak ada karakter Tionghoa yang ditampilkan!',
                errorNoData: 'Tidak ada data karakter Tionghoa yang dimuat!'
            },
            'th': {
                title: `แสดงลำดับขีดตัวอักษร`,
                message: (char) => `กำลังแสดงอนิเมชันลำดับขีดของตัวอักษรจีน「${char}」...\n\nข้อแนะนำ: ฟังก์ชันนี้ต้องการการรวมกลุ่มไลบรารีอนิเมชันลำดับขีดเพื่อแสดงการเขียน/ลำดับขีดที่สมบูรณ์`,
                errorNoChar: 'ขณะนี้ไม่มีตัวอักษรจีนแสดงอยู่!',
                errorNoData: 'ไม่มีข้อมูลตัวอักษรจีนถูกโหลด!'
            },
            'km': {
                title: `បង្ហាញលំដាប់ខ្នាត`,
                message: (char) => `កំពុងបង្ហាញអាណីមេិនលំដាប់ខ្នាតរបស់តួអក្សរចិន「${char}」...\n\nការណែនាំ: មុខងារនេះត្រូវការការរួមបញ្ចូលបណ្ណាល័យអាណីមេិនលំដាប់ខ្នាតដើម្បីបង្ហាញការសរសេរ/លំដាប់ខ្នាតពេញលេញ។`,
                errorNoChar: 'បច្ចុប្បន្នមិនមានតួអក្សរចិនបង្ហាញទេ!',
                errorNoData: 'គ្មានទិន្នន័យតួអក្សរចិនត្រូវបានផ្ទុក!'
            },
            'lo': {
                title: `ສະແດງລຳດັບຂີດ`,
                message: (char) => `正ກຳລັງສະແດງແອນິເມຊັນລຳດັບຂີດຂອງຕົວອັກສອນຈີນຫນ້າ「${char}」...\n\nຂໍ້ໃຫ້ເຫັນຂໍ້: ຟັງຊັນນີ້ຕ້ອງການລວມເຂົ້າກຸ່ມຫ້ອງຮຽນລໍ້ສະແດງແອນິເມຊັນລຳດັບຂີດເພື່ອສະແດງການຂຽນ/ລຳດັບຂີດທີ່ສົມບູນແບບ`,
                errorNoChar: 'ປະຈຸບັນບໍ່ມີຕົວອັກສອນຈີນທີ່ສະແດງ!',
                errorNoData: 'ບໍ່ມີຂໍ້ມູນຕົວອັກສອນຈີນທີ່ໂຫຼດ!'
            },
            'my': {
                title: `လိုင်းအမျိုးအစားအနီးမီးရှင်းပြသ`,
                message: (char) => `တရုတ်စာလုံး「${char}」၏ လိုင်းအမျိုးအစားအနီးမီးရှင်းကို ပြသနေသည်...\n\nအကြံ: ဤလုပ်ငန်းဆောင်ချက်သည် ကျောင်းသား/လိုင်းအမျိုးအစားကို ပြသရန်အတွက် လိုင်းအမျိုးအစားအနီးမီးရှင်းစာကြည့်တိုက်များကို ပေါင်းစပ်ရန်လိုအပ်သည်။`,
                errorNoChar: 'လက်ရှိတွင် တရုတ်စာလုံးများ ပြသနေခြင်းမရှိပါ!',
                errorNoData: 'တရုတ်စာလုံးအချက်အလက်များ မတင်ခဲ့ပါ!'
            },
            'ph': {
                title: `Ipakita ang Stroke Order`,
                message: (char) => `Nagpapakita ng animation ng sunod-sunod na stroke ng karakter Tsino「${char}」...\n\nPaalala: Kinakailangan ng feature na ito ng integrasyon ng stroke animation library upang maipakita ang kumpletong pagsusulat/stroke order.`,
                errorNoChar: 'Kasalukuyang walang karakter Tsino na ipinapakita!',
                errorNoData: 'Walang nai-load na data ng karakter Tsino!'
            },
            'ms': {
                title: `Paparkan Susunan Goresan`,
                message: (char) => `Memaparkan animasi susunan goresan aksara Cina「${char}」...\n\nPetunjuk: Ciri ini memerlukan integrasi perpustakaan animasi susunan goresan untuk memaparkan tulisan/susunan goresan yang lengkap.`,
                errorNoChar: 'Pada masa ini tiada aksara Cina yang dipaparkan!',
                errorNoData: 'Tiada data aksara Cina dimuat!'
            },
            'en': {
                title: `Display Stroke Order`,
                message: (char) => `正在显示汉字「${char}」的笔顺动画...\n\n提示：此功能需要集成笔顺动画库来实现完整的写字/笔顺显示。`,
                errorNoChar: '当前没有显示汉字！',
                errorNoData: '没有加载到汉字数据！'
            },
            'default': {
                title: `Display Stroke Order`,
                message: (char) => `正在显示汉字「${char}」的笔顺动画...\n\n提示：此功能需要集成笔顺动画库来实现完整的写字/笔顺显示。`,
                errorNoChar: '当前没有显示汉字！',
                errorNoData: '没有加载到汉字数据！'
            }
        };
    }

    /**
     * 更新用户语言设置
     */
    updateUserLanguage(language) {
        this.userLanguage = language;
    }

    /**
     * 获取当前用户语言的笔顺消息
     */
    getStrokeMessage(char) {
        const lang = this.userLanguage || 'default';
        const messages = this.strokeMessages[lang] || this.strokeMessages['default'];
        return messages.message(char);
    }

    /**
     * 获取错误消息
     */
    getErrorMessage(type) {
        const lang = this.userLanguage || 'default';
        const messages = this.strokeMessages[lang] || this.strokeMessages['default'];
        return messages[type] || '';
    }

    /**
     * 显示汉字笔顺功能
     * 支持单字和多字词条
     * 支持搜索结果预览模式（优先从DOM获取当前显示的汉字）
     */
    async showStrokeOrder(word = null) {
        try {
            let currentWord = word;
            
            // 优先从DOM获取当前显示的内容（支持搜索结果预览模式）
            const chineseEl = document.getElementById('chinese');
            if (chineseEl && chineseEl.textContent) {
                console.log('Stroke Order - Using text from DOM:', chineseEl.textContent);
                // 创建一个临时的word对象用于笔画显示
                currentWord = {
                    chinese_cn: chineseEl.textContent.trim()
                };
            }
            
            // 如果DOM中没有内容，且没有传入word，则从app获取
            if (!currentWord) {
                currentWord = this.app.currentWords && this.app.currentWords[this.app.currentIndex];
            }
            
            if (!currentWord || !currentWord.chinese_cn) {
                const errorMsg = this.getErrorMessage('errorNoData');
                if (this.app.showToast) {
                    this.app.showToast(errorMsg, 'error');
                }
                return { success: false, error: errorMsg };
            }
            
            const chineseChar = currentWord.chinese_cn || '';
            
            if (chineseChar) {
                // 检查字符数量
                if (chineseChar.length === 1) {
                    // 单字模式 - 使用原有逻辑
                    return await this.showSingleCharStrokeOrder(chineseChar);
                } else if (chineseChar.length >= 2 && chineseChar.length <= 5) {
                    // 多字模式 - 新增功能
                    return await this.showMultiCharStrokeOrder(currentWord);
                } else {
                    // 超过5个字符，提示错误
                    const errorMsg = '词条字符数超过限制（最多5个字符）';
                    if (this.app.showToast) {
                        this.app.showToast(errorMsg, 'error');
                    }
                    return { success: false, error: errorMsg };
                }
            } else {
                const errorMsg = this.getErrorMessage('errorNoChar');
                if (this.app.showToast) {
                    this.app.showToast(errorMsg, 'error');
                }
                return { success: false, error: errorMsg };
            }
        } catch (error) {
            console.error('Stroke Order Error:', error);
            const errorMsg = error.message || this.getErrorMessage('errorUnexpected');
            if (this.app.showToast) {
                this.app.showToast(errorMsg, 'error');
            }
            return { success: false, error: errorMsg };
        }
    }

    /**
     * 显示单字笔顺动画（原有逻辑）
     */
    async showSingleCharStrokeOrder(char) {
        this.multiCharMode = false;
        this.currentChar = char;
        
        // 显示笔顺动画模态框
        const result = await this.showStrokeOrderModal(char);
        
        // 返回成功结果
        return {
            success: true,
            char: char,
            mode: 'single',
            message: `正在显示汉字「${char}」的笔顺动画`,
            library: 'hanzi-writer',
            ...result
        };
    }

    /**
     * 显示多字词条的笔顺功能
     */
    async showMultiCharStrokeOrder(word) {
        const chineseChars = word.chinese_cn.split('');
        
        // 设置多字模式状态
        this.multiCharMode = true;
        this.multiCharWords = chineseChars;
        this.currentCharIndex = 0;
        this.currentChar = chineseChars[0];
        
        console.log(`[StrokeManager] 进入多字模式: ${word.chinese_cn}, 字符数: ${chineseChars.length}`);
        
        // 显示多字笔顺模态框
        const result = await this.showMultiCharStrokeOrderModal(word, chineseChars);
        
        return {
            success: true,
            word: word,
            mode: 'multi',
            message: `正在显示词条「${word.chinese_cn}」中「${this.currentChar}」的笔顺动画`,
            library: 'hanzi-writer',
            ...result
        };
    }

    /**
     * 显示多字笔顺动画模态框
     */
    async showMultiCharStrokeOrderModal(word, chars) {
        // 获取模态框元素
        const modal = document.getElementById('stroke-order-modal');
        const container = document.getElementById('stroke-animation-container');
        const title = document.getElementById('stroke-modal-title');
        
        if (!modal || !container || !title) {
            console.error('笔顺模态框元素未找到');
            return { success: false, error: '笔顺模态框元素未找到' };
        }
        
        // 设置模态框标题 - 显示当前是第几个字
        const currentCharNum = this.currentCharIndex + 1;
        const totalChars = chars.length;
        title.textContent = `汉字「${this.currentChar}」笔顺 (${currentCharNum}/${totalChars})`;
        
        // 清空容器
        container.innerHTML = '';
        
        // 显示模态框
        modal.classList.add('show');
        modal.style.display = 'flex';
        
        // 绑定事件
        this.bindStrokeModalEvents();
        
        // 创建字符导航按钮
        this.createCharNavigation(container);
        
        // 创建HanziWriter实例
        return await this.createHanziWriterInstance(container, this.currentChar);
    }

    /**
     * 创建统一控制栏导航按钮
     */
    createCharNavigation(container) {
        // 获取stroke-controls容器
        const controlsContainer = document.querySelector('.stroke-controls');
        if (!controlsContainer) {
            console.error('找不到stroke-controls容器');
            return;
        }
        
        // 清空现有内容，只保留播放和练习按钮
        const playBtn = controlsContainer.querySelector('#play-stroke');
        const practiceBtn = controlsContainer.querySelector('#practice-stroke');
        controlsContainer.innerHTML = '';
        
        // 按顺序添加按钮：左箭头 + 播放 + 练习 + 右箭头
        const leftBtn = this.createNavigationButton('←', '上一个字符', () => this.showPrevChar());
        leftBtn.disabled = this.currentCharIndex === 0;
        
        // 重新创建播放和练习按钮，确保它们存在
        if (!playBtn) {
            const newPlayBtn = document.createElement('button');
            newPlayBtn.id = 'play-stroke';
            newPlayBtn.className = 'btn-primary';
            newPlayBtn.innerHTML = '▶';
            newPlayBtn.title = '播放笔顺动画';
            newPlayBtn.onclick = () => {
                if (this.hanziWriter) {
                    this.hanziWriter.animateCharacter();
                }
            };
            controlsContainer.appendChild(newPlayBtn);
        } else {
            controlsContainer.appendChild(playBtn);
        }
        
        if (!practiceBtn) {
            const newPracticeBtn = document.createElement('button');
            newPracticeBtn.id = 'practice-stroke';
            newPracticeBtn.className = 'btn-secondary';
            newPracticeBtn.innerHTML = '👆';
            newPracticeBtn.title = '练习书写';
            newPracticeBtn.onclick = () => {
                if (this.hanziWriter) {
                    // 获取当前主题
                    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
                    const isDarkTheme = currentTheme === 'dark';
                    
                    // 根据主题设置练习模式颜色
                    const quizHighlightColor = isDarkTheme ? '#4CAF50' : '#4CAF50';
                    const quizErrorColor = isDarkTheme ? '#f44336' : '#f44336';
                    
                    this.hanziWriter.quiz({
                        onComplete: (stats) => {
                            console.log('练习完成:', stats);
                            if (this.app.showToast) {
                                const accuracy = Math.round((stats.correctStrokes / stats.totalStrokes) * 100);
                                this.app.showToast(`练习完成！正确率: ${accuracy}%`, 'success');
                            }
                        },
                        onError: (strokeIndex, error) => {
                            console.log(`笔画 ${strokeIndex + 1} 错误:`, error);
                        },
                        onHint: (strokeIndex) => {
                            console.log(`笔画 ${strokeIndex + 1} 提示`);
                        },
                        showOutline: true,
                        highlightColor: quizHighlightColor,
                        showCorrectStroke: true,
                        errorColor: quizErrorColor,
                        hints: true
                    });
                }
            };
            controlsContainer.appendChild(newPracticeBtn);
        } else {
            controlsContainer.appendChild(practiceBtn);
        }
        
        const rightBtn = this.createNavigationButton('→', '下一个字符', () => this.showNextChar());
        rightBtn.disabled = this.currentCharIndex === this.multiCharWords.length - 1;
        
        // 按顺序添加所有按钮
        controlsContainer.appendChild(leftBtn);
        controlsContainer.appendChild(playBtn);
        controlsContainer.appendChild(practiceBtn);
        controlsContainer.appendChild(rightBtn);
        
        console.log('创建统一控制栏布局');
    }
    
    /**
     * 创建导航按钮
     */
    createNavigationButton(icon, title, onClick) {
        const button = document.createElement('button');
        button.className = 'char-nav-btn';
        button.innerHTML = icon;
        button.title = title;
        button.onclick = onClick;
        return button;
    }

    /**
     * 显示下一个字符的笔顺
     */
    async showNextChar() {
        if (this.currentCharIndex < this.multiCharWords.length - 1) {
            console.log(`[StrokeManager] 切换到下一个字符，当前: ${this.currentCharIndex + 1}/${this.multiCharWords.length}`);
            
            this.currentCharIndex++;
            this.currentChar = this.multiCharWords[this.currentCharIndex];
            
            console.log(`[StrokeManager] 新字符: ${this.currentChar}`);
            
            // 更新标题
            const title = document.getElementById('stroke-modal-title');
            const currentCharNum = this.currentCharIndex + 1;
            const totalChars = this.multiCharWords.length;
            title.textContent = `汉字「${this.currentChar}」笔顺 (${currentCharNum}/${totalChars})`;
            
            // 重新创建HanziWriter实例
            const container = document.getElementById('stroke-animation-container');
            console.log(`[StrokeManager] 清空容器，准备加载: ${this.currentChar}`);
            container.innerHTML = '';
            
            // 清理旧的HanziWriter实例
            if (this.hanziWriter) {
                console.log('[StrokeManager] 清理旧的HanziWriter实例');
                // 使用HanziWriter内置的清理机制：直接设置新字符会自动清理
                // this.hanziWriter._hanziWriterRenderer.destroy();  // 不需要手动调用
                this.hanziWriter = null;
            }
            
            try {
                // 创建新的HanziWriter实例
                console.log(`[StrokeManager] 开始创建HanziWriter实例: ${this.currentChar}`);
                const result = await this.createHanziWriterInstance(container, this.currentChar);
                console.log(`[StrokeManager] HanziWriter实例创建完成:`, result);
            } catch (error) {
                console.error(`[StrokeManager] HanziWriter实例创建失败:`, error);
                // 显示错误信息
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <p>无法加载字符「${this.currentChar}」的笔顺数据</p>
                        <p style="font-size: 14px; color: #999;">错误: ${error.message}</p>
                    </div>
                `;
            }
            
            // 更新导航按钮状态
            this.updateNavigationButtons();
            
            console.log(`[StrokeManager] 切换完成到字符 ${this.currentCharIndex + 1}/${this.multiCharWords.length}: ${this.currentChar}`);
        }
    }

    /**
     * 显示上一个字符的笔顺
     */
    async showPrevChar() {
        if (this.currentCharIndex > 0) {
            console.log(`[StrokeManager] 切换到上一个字符，当前: ${this.currentCharIndex + 1}/${this.multiCharWords.length}`);
            
            this.currentCharIndex--;
            this.currentChar = this.multiCharWords[this.currentCharIndex];
            
            console.log(`[StrokeManager] 新字符: ${this.currentChar}`);
            
            // 更新标题
            const title = document.getElementById('stroke-modal-title');
            const currentCharNum = this.currentCharIndex + 1;
            const totalChars = this.multiCharWords.length;
            title.textContent = `汉字「${this.currentChar}」笔顺 (${currentCharNum}/${totalChars})`;
            
            // 重新创建HanziWriter实例
            const container = document.getElementById('stroke-animation-container');
            console.log(`[StrokeManager] 清空容器，准备加载: ${this.currentChar}`);
            container.innerHTML = '';
            
            // 清理旧的HanziWriter实例
            if (this.hanziWriter) {
                console.log('[StrokeManager] 清理旧的HanziWriter实例');
                // 使用HanziWriter内置的清理机制：直接设置新字符会自动清理
                // this.hanziWriter._hanziWriterRenderer.destroy();  // 不需要手动调用
                this.hanziWriter = null;
            }
            
            try {
                // 创建新的HanziWriter实例
                console.log(`[StrokeManager] 开始创建HanziWriter实例: ${this.currentChar}`);
                const result = await this.createHanziWriterInstance(container, this.currentChar);
                console.log(`[StrokeManager] HanziWriter实例创建完成:`, result);
            } catch (error) {
                console.error(`[StrokeManager] HanziWriter实例创建失败:`, error);
                // 显示错误信息
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <p>无法加载字符「${this.currentChar}」的笔顺数据</p>
                        <p style="font-size: 14px; color: #999;">错误: ${error.message}</p>
                    </div>
                `;
            }
            
            // 更新导航按钮状态
            this.updateNavigationButtons();
            
            console.log(`[StrokeManager] 切换完成到字符 ${this.currentCharIndex + 1}/${this.multiCharWords.length}: ${this.currentChar}`);
        }
    }

    /**
     * 更新统一控制栏按钮状态
     */
    updateNavigationButtons() {
        const controlsContainer = document.querySelector('.stroke-controls');
        if (!controlsContainer) return;
        
        const buttons = controlsContainer.querySelectorAll('.char-nav-btn');
        
        // 第一个导航按钮是“上一个”，最后一个是“下一个”
        if (buttons.length >= 2) {
            const prevBtn = buttons[0];  // 左箭头
            const nextBtn = buttons[buttons.length - 1];  // 右箭头
            
            if (prevBtn) {
                prevBtn.disabled = this.currentCharIndex === 0;
            }
            
            if (nextBtn) {
                nextBtn.disabled = this.currentCharIndex === this.multiCharWords.length - 1;
            }
        }
    }

    /**
     * 初始化笔画数据缓存
     * 用于存储已加载的合并文件数据
     */
    initStrokeDataCache() {
        this.strokeDataCache = new Map();  // 存储已加载的文件数据
        this.loadedFiles = new Set();      // 记录已加载的文件编号
        this.strokesPath = './char-data/'; // 笔画数据路径（相对于HTML文件）
    }

    /**
     * 根据字符获取对应的文件编号
     * 将字符均匀分配到35个文件中
     * @param {string} char - 中文字符
     * @returns {number} 文件编号 (1-35)
     */
    getFileNumberForChar(char) {
        // 获取字符的Unicode码点
        const codePoint = char.codePointAt(0);
        // 使用哈希算法将字符映射到1-35的文件编号
        // 基于Unicode码点的分布，确保同一声旁或相似字符尽量分配到不同文件
        const hash = ((codePoint << 7) ^ (codePoint >> 3)) & 0x7FFFFFFF;
        return (hash % 35) + 1;
    }

    /**
     * 加载指定文件的笔画数据
     * @param {number} fileNumber - 文件编号 (1-35)
     * @returns {Promise<Object>} 文件数据
     */
    async loadStrokeFile(fileNumber) {
        // 如果文件已在缓存中，直接返回
        if (this.strokeDataCache.has(fileNumber)) {
            return this.strokeDataCache.get(fileNumber);
        }

        const fileName = `common-strokes-${String(fileNumber).padStart(2, '0')}.json`;
        const fileUrl = `${this.strokesPath}${fileName}`;

        try {
            console.log(`[StrokeManager] 加载笔画数据文件: ${fileUrl}`);
            const response = await fetch(fileUrl);

            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`[StrokeManager] 文件 ${fileName} 加载成功，包含 ${Object.keys(data).length} 个字符`);

            // 缓存数据
            this.strokeDataCache.set(fileNumber, data);
            this.loadedFiles.add(fileNumber);

            return data;
        } catch (error) {
            console.error(`[StrokeManager] 加载文件 ${fileName} 失败:`, error);
            throw error;
        }
    }

    /**
     * 从合并文件中获取指定字符的笔画数据
     * @param {string} char - 中文字符
     * @returns {Promise<Object|null>} 字符的笔画数据，如果未找到则返回null
     */
    async getCharData(char) {
        try {
            // 计算字符所在的文件编号
            const fileNumber = this.getFileNumberForChar(char);
            console.log(`[StrokeManager] 字符「${char}」位于文件 ${fileNumber}`);

            // 加载文件
            const fileData = await this.loadStrokeFile(fileNumber);

            // 从字典中获取字符数据
            const charData = fileData[char];

            if (charData) {
                console.log(`[StrokeManager] 找到字符「${char}」的笔画数据`);
                // 返回HanziWriter需要的数据格式
                return {
                    strokes: charData.strokes,
                    medians: charData.medians
                };
            } else {
                console.log(`[StrokeManager] 字符「${char}」在文件 ${fileNumber} 中未找到`);
                return null;
            }
        } catch (error) {
            console.error(`[StrokeManager] 获取字符「${char}」数据失败:`, error);
            return null;
        }
    }

    /**
     * 预加载指定文件的笔画数据（用于预缓存）
     * @param {number} fileNumber - 文件编号 (1-35)
     */
    async preloadStrokeFile(fileNumber) {
        if (!this.loadedFiles.has(fileNumber)) {
            try {
                await this.loadStrokeFile(fileNumber);
                console.log(`[StrokeManager] 预加载文件 ${fileNumber} 成功`);
            } catch (error) {
                console.warn(`[StrokeManager] 预加载文件 ${fileNumber} 失败:`, error.message);
            }
        }
    }

    /**
     * 清空笔画数据缓存
     */
    clearStrokeDataCache() {
        this.strokeDataCache.clear();
        this.loadedFiles.clear();
        console.log('[StrokeManager] 笔画数据缓存已清空');
    }

    /**
     * 获取缓存状态
     * @returns {Object} 缓存状态信息
     */
    getCacheStatus() {
        return {
            loadedFiles: Array.from(this.loadedFiles),
            cacheSize: this.strokeDataCache.size,
            memoryUsage: `${(this.strokeDataCache.size * 300).toFixed(2)} KB (估算)`
        };
    }

    /**
     * 创建HanziWriter实例（共享方法）
     */
    async createHanziWriterInstance(container, char) {
        try {
            // 获取当前主题
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const isDarkTheme = currentTheme === 'dark';
            
            // 根据主题设置颜色
            const strokeColor = isDarkTheme ? '#ffffff' : '#333333';
            const outlineColor = isDarkTheme ? '#444444' : '#e0e0e0';
            const highlightColor = isDarkTheme ? '#888888' : '#ff6b6b';
            
            // 使用闭包确保charDataLoader使用正确的字符
            const targetChar = char;
            const charDataLoader = async (charParam) => {
                try {
                    // 使用传入的charParam而不是闭包中的char
                    const targetCharacter = charParam || targetChar;
                    console.log(`[StrokeManager] 加载字符数据: ${targetCharacter}`);
                    
                    // 优先从本地合并文件加载
                    const localCharData = await this.getCharData(targetCharacter);
                    
                    if (localCharData) {
                        console.log(`[StrokeManager] 本地合并文件数据加载成功: ${targetCharacter}`);
                        console.log(`[StrokeManager] 数据内容:`, localCharData);
                        return localCharData;
                    }
                    
                    console.log(`[StrokeManager] 本地数据未找到，尝试远程数据源`);
                    
                    // 如果本地加载失败，尝试使用远程数据源
                    const remoteUrl = `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/zh/${targetCharacter}.json`;
                    console.log(`[StrokeManager] 尝试从远程加载汉字数据: ${remoteUrl}`);
                    
                    try {
                        const remoteResponse = await fetch(remoteUrl);
                        console.log(`[StrokeManager] 远程请求状态: ${remoteResponse.status}, ${remoteResponse.statusText}`);
                        
                        if (remoteResponse.ok) {
                            const remoteData = await remoteResponse.json();
                            console.log(`[StrokeManager] 远程数据加载成功: ${targetCharacter}`);
                            console.log(`[StrokeManager] 远程数据内容:`, remoteData);
                            return remoteData;
                        } else {
                            console.log(`[StrokeManager] 远程数据加载失败，状态: ${remoteResponse.status}`);
                            
                            // 检查Response内容
                            const errorText = await remoteResponse.text();
                            console.log(`[StrokeManager] 远程错误响应内容:`, errorText);
                            throw new Error(`无法加载汉字数据 (远程): ${remoteResponse.status} ${remoteResponse.statusText}`);
                        }
                    } catch (error) {
                        console.error(`[StrokeManager] 远程fetch请求失败:`, error);
                        console.log(`[StrokeManager] 错误类型: ${error.name}`);
                        console.log(`[StrokeManager] 错误信息: ${error.message}`);
                        throw new Error(`无法加载汉字数据 (本地和远程都失败): ${targetCharacter} - ${error.message}`);
                    }
                } catch (error) {
                    console.error(`[StrokeManager] 加载汉字数据失败: ${targetCharacter}`, error);
                    throw error;
                }
            };
            
            // 使用HanziWriter创建笔顺动画
            const hanziWriterInstance = HanziWriter.create(container, char, {
                // 基础配置
                width: 300,
                height: 300,
                padding: 20,
                scale: 1,
                
                // 自定义数据源加载函数
                charDataLoader: charDataLoader,
                
                // 动画配置
                strokeAnimationSpeed: 1.5,  // 笔画动画速度
                delayBetweenStrokes: 200,   // 笔画间延迟
                strokeWidth: 10,           // 笔画宽度
                strokeColor: strokeColor,  // 笔画颜色（根据主题动态调整）
                radicalColor: strokeColor, // 部首颜色（与笔画颜色一致）
                highlightColor: highlightColor, // 高亮颜色
                outlineColor: outlineColor,   // 轮廓颜色（根据主题动态调整）
                
                // 显示选项
                showOutline: true,         // 显示轮廓
                showRadical: false,        // 显示部首
                outlineDash: [5, 5],       // 轮廓虚线样式
                
                // 事件处理
                onLoadSuccess: () => {
                    console.log(`HanziWriter 加载成功: ${char}`);
                },
                onLoadError: (error) => {
                    console.error(`HanziWriter 加载失败: ${char}`, error);
                    // 显示更详细的错误信息，便于调试
                    container.innerHTML = `
                        <p class="stroke-error">笔顺动画加载失败</p>
                        <p class="stroke-error-details">错误信息: ${error.message || '未知错误'}</p>
                        <p class="stroke-error-details">错误类型: ${error.name || '未知类型'}</p>
                        <p class="stroke-error-details">
                            请检查浏览器控制台获取更多详细信息。
                            <br>建议检查: 
                            1. 网络连接
                            2. 文件路径是否正确
                            3. 服务器配置
                            4. 汉字数据文件是否存在
                        </p>
                    `;
                },
                onAnimateComplete: () => {
                    console.log(`HanziWriter 动画完成: ${char}`);
                },
                onStrokeComplete: (strokeIndex, totalStrokes) => {
                    console.log(`完成笔画 ${strokeIndex + 1}/${totalStrokes}`);
                }
            });

            // 保存 HanziWriter 实例引用
            this.hanziWriter = hanziWriterInstance;

            console.log(`[StrokeManager] HanziWriter 实例已创建:`, this.hanziWriter);
            console.log(`[StrokeManager] 字符: ${char}, 实例类型:`, typeof this.hanziWriter);
            console.log(`[StrokeManager] 可用方法:`, Object.keys(this.hanziWriter).filter(key => typeof this.hanziWriter[key] === 'function'));
            
            // 验证实例是否正确创建
            if (this.hanziWriter && typeof this.hanziWriter === 'object') {
                console.log(`[StrokeManager] HanziWriter 实例验证成功: ${char}`);
                console.log(`[StrokeManager] 实例属性:`, Object.keys(this.hanziWriter));
                console.log(`[StrokeManager] 可用方法:`, Object.getOwnPropertyNames(this.hanziWriter).filter(name => typeof this.hanziWriter[name] === 'function'));
            } else {
                console.error(`[StrokeManager] HanziWriter 实例验证失败: ${char}`);
            }

            return { success: true, message: `正在显示汉字「${char}」的笔顺动画`, char: char };

        } catch (error) {
            console.error('HanziWriter 初始化错误:', error);
            container.innerHTML = `
                <p class="stroke-error">笔顺动画加载失败</p>
                <p class="stroke-error-details">初始化错误: ${error.message || '未知错误'}</p>
            `;
            return { success: false, error: `初始化失败: ${error.message}` };
        }
    }

    /**
     * 显示笔顺动画模态框（单字符）
     */
    async showStrokeOrderModal(char) {
        
        // 获取模态框元素
        const modal = document.getElementById('stroke-order-modal');
        const container = document.getElementById('stroke-animation-container');
        const title = document.getElementById('stroke-modal-title');
        
        if (!modal || !container || !title) {
            console.error('笔顺模态框元素未找到');
            return { success: false, error: '笔顺模态框元素未找到' };
        }
        
        // 设置模态框标题
        title.textContent = `汉字「${char}」笔顺`;
        
        // 清空容器
        container.innerHTML = '';
        
        // 显示模态框
        modal.classList.add('show');
        modal.style.display = 'flex';
        
        // 绑定事件
        this.bindStrokeModalEvents();
        
        // 创建HanziWriter实例
        return await this.createHanziWriterInstance(container, char);
    }
    
    /**
     * 绑定笔顺模态框事件
     */
    bindStrokeModalEvents() {
        // 播放按钮 - 播放完整动画
        const playBtn = document.getElementById('play-stroke');
        if (playBtn) {
            playBtn.onclick = () => {
                if (this.hanziWriter) {
                    this.hanziWriter.animateCharacter();
                }
            };
        }
        
        // 练习按钮 - 交互式练习
        const practiceBtn = document.getElementById('practice-stroke');
        if (practiceBtn) {
            practiceBtn.onclick = () => {
                if (this.hanziWriter) {
                    // 获取当前主题
                    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
                    const isDarkTheme = currentTheme === 'dark';
                    
                    // 根据主题设置练习模式颜色
                    const quizHighlightColor = isDarkTheme ? '#4CAF50' : '#4CAF50'; // 绿色保持不变
                    const quizErrorColor = isDarkTheme ? '#f44336' : '#f44336';     // 红色保持不变
                    
                    // 设置练习模式标志
                    this.hanziWriter.quizActive = true;
                    
                    this.hanziWriter.quiz({
                        onComplete: (stats) => {
                            console.log('练习完成:', stats);
                            // 清除练习模式标志
                            this.hanziWriter.quizActive = false;
                            
                            if (this.app.showToast) {
                                const accuracy = Math.round((stats.correctStrokes / stats.totalStrokes) * 100);
                                this.app.showToast(`练习完成！正确率: ${accuracy}%`, 'success');
                            }
                        },
                        onError: (strokeIndex, error) => {
                            console.log(`笔画 ${strokeIndex + 1} 错误:`, error);
                        },
                        onHint: (strokeIndex) => {
                            console.log(`笔画 ${strokeIndex + 1} 提示`);
                        },
                        onStart: () => {
                            console.log('练习模式已启动');
                            this.hanziWriter.quizActive = true;
                        },
                        onCancel: () => {
                            console.log('练习模式已取消');
                            this.hanziWriter.quizActive = false;
                        },
                        showOutline: true,
                        highlightColor: quizHighlightColor,
                        showCorrectStroke: true,
                        errorColor: quizErrorColor,
                        hints: true
                    });
                }
            };
        }
        
        // 关闭按钮
        const closeBtn = document.getElementById('close-stroke-modal');
        if (closeBtn) {
            closeBtn.onclick = () => {
                this.closeStrokeOrderModal();
            };
        }
        
        // 点击模态框背景关闭
        const modal = document.getElementById('stroke-order-modal');
        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) {
                    this.closeStrokeOrderModal();
                }
            };
        }
        
        // 添加触摸滑动支持（移动端）
        this.addTouchEvents();
        
        // ESC键关闭和方向键切换字符
        document.addEventListener('keydown', this._keyDownHandler);
    }

    /**
     * 键盘事件处理方法
     */
    _keyDownHandler(event) {
        if (event.key === 'Escape') {
            this.closeStrokeOrderModal();
        } else if (this.multiCharMode) {
            // 在多字模式下支持方向键切换字符
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                this.showPrevChar();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                this.showNextChar();
            }
        }
    }
    
    /**
     * ESC键处理方法
     */
    _escapeKeyHandler(event) {
        if (event.key === 'Escape') {
            this.closeStrokeOrderModal();
        }
    }

    /**
     * 关闭笔顺动画模态框
     */
    closeStrokeOrderModal() {
        const modal = document.getElementById('stroke-order-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // 清理触摸滑动事件
        this.removeTouchEvents();
        
        // 移除事件监听器
        document.removeEventListener('keydown', this._escapeKeyHandler);
        document.removeEventListener('keydown', this._keyDownHandler);
        
        // 清理HanziWriter实例
        if (this.hanziWriter) {
            this.hanziWriter = null;
        }
        
        // 重置多字模式状态
        this.multiCharMode = false;
        this.multiCharWords = [];
        this.currentCharIndex = 0;
        this.currentChar = '';
    }

    /**
     * 初始化笔顺功能（如果需要）
     */
    init() {
        console.log('笔顺管理器初始化完成');
        
        // 监听语言切换事件
        window.addEventListener('languageSelected', (e) => {
            const code = e?.detail?.language;
            if (code) {
                this.updateUserLanguage(code);
                console.log(`笔顺管理器更新语言: ${code}`);
            }
        });
        
        return Promise.resolve();
    }

    /**
     * 添加触摸滑动支持
     */
    addTouchEvents() {
        const container = document.getElementById('stroke-animation-container');
        if (!container) return;
        
        // 检查是否为移动设备
        const isMobile = window.innerWidth <= 768;
        if (!isMobile) return;
        
        let startX = 0;
        let startY = 0;
        let startTime = 0;
        let touchStartPoint = null;
        let isInPracticeMode = false;
        
        const handleTouchStart = (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startTime = Date.now();
            touchStartPoint = { x: startX, y: startY };
            
            // 检测是否在练习模式（通过检查HanziWriter是否处于quiz状态）
            isInPracticeMode = this.isInPracticeMode();
        };
        
        const handleTouchEnd = (e) => {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const endTime = Date.now();
            
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            const deltaTime = endTime - startTime;
            
            // 计算滑动角度和距离
            const swipeAngle = Math.atan2(Math.abs(deltaY), Math.abs(deltaX)) * 180 / Math.PI;
            const swipeDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const velocity = swipeDistance / deltaTime * 1000; // px/s
            
            // 获取当前屏幕尺寸
            const screenWidth = window.innerWidth;
            const containerRect = container.getBoundingClientRect();
            const isStartNearEdge = touchStartPoint && 
                (touchStartPoint.x < containerRect.left + 40 || 
                 touchStartPoint.x > containerRect.right - 40);
            
            // 严格防误触逻辑 - 练习模式下使用更严格的阈值
            const isQuickSwipe = deltaTime < 800; // 800ms内（更宽松的时间）
            const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 1.5; // 水平位移必须大于垂直位移1.5倍
            
            let minSwipeDistance;
            if (isInPracticeMode) {
                // 练习模式：需要跨越大半个屏幕才能触发切换
                minSwipeDistance = Math.max(120, screenWidth * 0.40); // 40%屏幕宽度或120px
            } else {
                // 浏览模式：保持相对敏感
                minSwipeDistance = Math.max(50, screenWidth * 0.25); // 25%屏幕宽度或50px
            }
            
            // 额外检查：如果起始点不在边缘，练习模式下要求更严格的阈值
            if (isInPracticeMode && !isStartNearEdge) {
                minSwipeDistance = Math.max(150, screenWidth * 0.45); // 45%屏幕宽度或150px
            }
            
            // 检查是否为有意切换（满足所有条件）
            const isIntentionalSwipe = isQuickSwipe && 
                isHorizontalSwipe && 
                Math.abs(deltaX) > minSwipeDistance &&
                swipeAngle < 25; // 滑动角度必须接近水平（小于25度）
            
            if (isIntentionalSwipe) {
                // 显示切换提示（仅在达到阈值但未松手时）
                if (Math.abs(deltaX) > minSwipeDistance * 0.8) {
                    this.showSwipeHint(deltaX > 0 ? 'right' : 'left');
                }
                
                // 执行切换
                if (deltaX > 0) {
                    // 向右滑动 - 上一个字符
                    this.showPrevChar();
                    this.animateSwipe('right');
                } else {
                    // 向左滑动 - 下一个字符
                    this.showNextChar();
                    this.animateSwipe('left');
                }
            } else if (isInPracticeMode && Math.abs(deltaX) > minSwipeDistance * 0.6) {
                // 在练习模式下提供视觉反馈，表明需要更大滑动距离
                this.showSwipeResistance(deltaX > 0 ? 'right' : 'left', minSwipeDistance);
            }
        };
        
        // 添加事件监听器
        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        // 保存引用以便清理
        this._touchHandlers = { handleTouchStart, handleTouchEnd };
        
        // 添加视觉反馈
        container.classList.add('swipe-enabled');
        
        // 如果在练习模式下，添加特殊样式
        if (isInPracticeMode) {
            container.classList.add('practice-active');
            container.parentElement.classList.add('practice-mode');
        }
    }
    
    /**
     * 移除触摸滑动支持
     */
    removeTouchEvents() {
        const container = document.getElementById('stroke-animation-container');
        if (!container || !this._touchHandlers) return;
        
        container.removeEventListener('touchstart', this._touchHandlers.handleTouchStart);
        container.removeEventListener('touchend', this._touchHandlers.handleTouchEnd);
        
        container.classList.remove('swipe-enabled', 'practice-active');
        const parentElement = container.parentElement;
        if (parentElement) {
            parentElement.classList.remove('practice-mode');
        }
        this._touchHandlers = null;
    }
    
    /**
     * 滑动动画反馈
     */
    animateSwipe(direction) {
        const container = document.getElementById('stroke-animation-container');
        if (!container) return;
        
        // 添加滑动动画类
        if (direction === 'left') {
            container.classList.add('sliding-left');
        } else {
            container.classList.add('sliding-right');
        }
        
        // 移除动画类
        setTimeout(() => {
            container.classList.remove('sliding-left', 'sliding-right');
        }, 300);
    }
    
    /**
     * 增强键盘导航支持
     */
    _keyDownHandler(event) {
        // 防止在输入框中触发
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (event.key) {
            case 'Escape':
                event.preventDefault();
                this.closeStrokeOrderModal();
                break;
                
            case 'ArrowLeft':
                if (this.multiCharMode) {
                    event.preventDefault();
                    this.showPrevChar();
                }
                break;
                
            case 'ArrowRight':
                if (this.multiCharMode) {
                    event.preventDefault();
                    this.showNextChar();
                }
                break;
                
            case ' ':
            case 'Spacebar':
                event.preventDefault();
                // 触发播放按钮
                const playBtn = document.getElementById('play-stroke');
                if (playBtn && this.hanziWriter) {
                    this.hanziWriter.animateCharacter();
                }
                break;
        }
    }
    
    /**
     * 检测是否在练习模式
     */
    isInPracticeMode() {
        // 通过检查HanziWriter实例是否处于quiz状态来判断
        if (this.hanziWriter && this.hanziWriter.quizActive) {
            return true;
        }
        
        // 或者检查是否有练习相关的DOM元素
        const practiceElements = document.querySelectorAll('.quiz-character, .quiz-stroke');
        return practiceElements.length > 0;
    }
    
    /**
     * 显示滑动提示
     */
    showSwipeHint(direction) {
        const container = document.getElementById('stroke-animation-container');
        if (!container) return;
        
        // 创建提示元素
        const hint = document.createElement('div');
        hint.className = 'swipe-hint';
        hint.style.cssText = `
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            ${direction === 'right' ? 'left: 20px;' : 'right: 20px;'}
            background: rgba(76, 175, 80, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            z-index: 1001;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        `;
        
        hint.textContent = direction === 'right' ? '← 上一个' : '下一个 →';
        container.appendChild(hint);
        
        // 显示提示
        setTimeout(() => {
            hint.style.opacity = '1';
        }, 50);
        
        // 1秒后自动隐藏
        setTimeout(() => {
            hint.style.opacity = '0';
            setTimeout(() => {
                if (hint.parentNode) {
                    hint.parentNode.removeChild(hint);
                }
            }, 300);
        }, 1000);
    }
    
    /**
     * 显示滑动阻力反馈
     */
    showSwipeResistance(direction, requiredDistance) {
        const container = document.getElementById('stroke-animation-container');
        if (!container) return;
        
        // 创建阻力提示
        const resistance = document.createElement('div');
        resistance.className = 'swipe-resistance';
        resistance.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 193, 7, 0.95);
            color: #333;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            z-index: 1001;
            opacity: 0;
            transition: all 0.3s ease;
            pointer-events: none;
            max-width: 80%;
            text-align: center;
        `;
        
        resistance.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>✋</span>
                <span>需要更大滑动距离</span>
            </div>
        `;
        container.appendChild(resistance);
        
        // 显示阻力提示
        setTimeout(() => {
            resistance.style.opacity = '1';
            resistance.style.transform = 'translateX(-50%) translateY(-10px)';
        }, 50);
        
        // 2秒后自动隐藏
        setTimeout(() => {
            resistance.style.opacity = '0';
            resistance.style.transform = 'translateX(-50%) translateY(0)';
            setTimeout(() => {
                if (resistance.parentNode) {
                    resistance.parentNode.removeChild(resistance);
                }
            }, 300);
        }, 2000);
    }
    
    /**
     * 清理资源（如果需要）
     */
    cleanup() {
        this.currentChar = '';
        this.multiCharMode = false;
        this.multiCharWords = [];
        this.currentCharIndex = 0;
        
        // 清理触摸事件
        this.removeTouchEvents();
    }
}

export default StrokeManager;
