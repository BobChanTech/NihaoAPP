/**
 * 收费模式管理器
 * 处理免费使用限制和收费弹窗
 * 集成多层安全防护：
 * 1. localStorage 多字段交叉验证
 * 2. 定时随机检查
 * 3. 操作时随机检查
 * 
 * 测试模式说明：
 * 在浏览器控制台执行以下命令进行测试：
 * - paymentManager.setTestMode(true);  // 开启测试模式
 * - paymentManager.setPaidUser(true);  // 模拟付费用户
 * - paymentManager.setPaidUser(false); // 模拟免费用户
 * - paymentManager.resetTestMode();    // 重置为正常模式
 */
class PaymentManager {
    constructor() {
        // 测试模式状态
        this.isTestMode = false;
        this.testPaidStatus = null;

        // 安全检查相关属性
        this.pageLoadTime = Date.now(); // 页面加载时间
        this.checkCount = 0; // 检查次数统计
        this.isSecurityCheckRunning = false; // 是否正在运行安全检查
        this.suspiciousDetected = false; // 是否检测到可疑行为

        // localStorage 存储的字段名（用于多字段验证）
        this.storageKeys = {
            status: 'paymentStatus',        // 主状态字段: 'premium'
            type: 'userType',               // 用户类型字段: 'pro'
            timestamp: 'paymentTimestamp',  // 付费时间戳
            token: 'paymentToken'           // 验证令牌
        };

        // ========================================
        // 扩展字段（预留，支持未来多种付费模式）
        // 当前未启用，仅预留字段名和注释
        // ========================================
        this.extensionKeys = {
            /**
             * 订阅制模块有效期
             * 用途：存储各模块的到期时间戳（毫秒）
             * 适用场景：按月/年订阅的模块，如"历史深度文章"、"AI辅导月度会员"
             * 存储格式：JSON对象
             * 示例: { "history": 1735689600000, "aiChat": 1746278400000 }
             * 含义: 历史模块有效期至2025-01-01，AI辅导有效期至2025-05-03
             */
            moduleExpires: 'moduleExpires',

            /**
             * 按次付费模块剩余次数
             * 用途：存储各模块的剩余使用次数
             * 适用场景：按次购买的功能，如"真人直播课程"、"OCR扫描识字"
             * 存储格式：JSON对象
             * 示例: { "liveClass": 5, "aiChat": 10, "ocr": 20 }
             * 含义: 剩余5节直播课、10次AI辅导、20次OCR扫描
             */
            usageCounts: 'usageCounts',

            /**
             * 订阅的模块列表
             * 用途：记录用户已订阅的模块名称（逗号分隔）
             * 适用场景：区分用户订阅了哪些模块，配合moduleExpires使用
             * 存储格式: 逗号分隔的字符串
             * 示例: "history,advancedGrammar"
             * 含义: 用户订阅了"历史"和"高级语法"模块
             */
            subscribedModules: 'subscribedModules'
        };

        // ========================================
        // 扩展功能验证方法（预留，未来需要时实现）
        // ========================================
        // 
        // 未来可实现的验证方法：
        //
        // 1. 检查按次付费模块是否有剩余次数
        //    hasUsageCount(moduleName) {
        //        const counts = JSON.parse(localStorage.getItem(this.extensionKeys.usageCounts) || '{}');
        //        return (counts[moduleName] || 0) > 0;
        //    }
        //
        // 2. 检查订阅模块是否在有效期内
        //    hasSubscription(moduleName) {
        //        const subs = (localStorage.getItem(this.extensionKeys.subscribedModules) || '').split(',');
        //        const expires = JSON.parse(localStorage.getItem(this.extensionKeys.moduleExpires) || '{}');
        //        return subs.includes(moduleName) && (!expires[moduleName] || Date.now() < expires[moduleName]);
        //    }
        //
        // 3. 使用次数（扣减）
        //    consumeUsage(moduleName) {
        //        const counts = JSON.parse(localStorage.getItem(this.extensionKeys.usageCounts) || '{}');
        //        if (counts[moduleName] > 0) {
        //            counts[moduleName]--;
        //            localStorage.setItem(this.extensionKeys.usageCounts, JSON.stringify(counts));
        //            return true;
        //        }
        //        return false;
        //    }
        //
        // ========================================

        // 免费查看限制：[字数]: [次数]
        this.freeViewLimits = {
            1: 20,  // 一个字免费20条
            2: 10,  // 两个字免费10条
            3: 8,   // 三个字免费8条
            4: 6,   // 四字6条
            5: 5    // 五字5条
        };
        
        // 收费链接
        this.paymentLink = "https://example.com/payment";
        
        // 多语言提示文本
        this.languageTexts = {
            'vi': {
                title: 'Thanh toán',
                message: 'Bạn đã đạt giới hạn sử dụng miễn phí. Vui lòng thanh toán để tiếp tục sử dụng tính năng tìm kiếm và yêu thích.',
                browser: 'Vui lòng thanh toán trong CHROME, SAFARI hoặc FIREFOX',
                paymentLink: 'Liên kết thanh toán:',
                copy: 'Sao chép',
                copied: 'Đã sao chép!'
            },
            'en': {
                title: 'Payment Required',
                message: 'You have reached the free usage limit. Please make a payment to continue using the search and favorites features.',
                browser: 'Please pay in CHROME, SAFARI or FIREFOX',
                paymentLink: 'Payment link:',
                copy: 'Copy',
                copied: 'Copied!'
            },
            'es': {
                title: 'Pago Requerido',
                message: 'Ha alcanzado el límite de uso gratuito. Por favor, realice un pago para continuar usando las funciones de búsqueda y favoritos.',
                browser: 'Por favor, pague en CHROME, SAFARI o FIREFOX',
                paymentLink: 'Enlace de pago:',
                copy: 'Copiar',
                copied: '¡Copiado!'
            },
            'hi': {
                title: 'भुगतान आवश्यक',
                message: 'आपने मुफ्त उपयोग सीमा तक पहुंच चुके हैं। खोज और पसंदीदा सुविधाओं का उपयोग जारी रखने के लिए कृपया भुगतान करें।',
                browser: 'कृपया CHROME, SAFARI या FIREFOX में भुगतान करें',
                paymentLink: 'भुगतान लिंक:',
                copy: 'कॉपी',
                copied: 'कॉपी हो गया!'
            },
            // 默认使用英文
            'default': {
                title: 'Payment Required',
                message: 'You have reached the free usage limit. Please make a payment to continue using the search and favorites features.',
                browser: 'Please pay in CHROME, SAFARI or FIREFOX',
                paymentLink: 'Payment link:',
                copy: 'Copy',
                copied: 'Copied!'
            }
        };

        // 初始化时检查是否为测试模式
        this.initTestMode();
        
        // 初始化信任状态（在页面加载时记录用户是付费还是免费）
        this.initTrustStatus();
        
        // 注意：暂不启动定时检查，避免干扰免费用户
        // 定时检查仅在检测到可疑行为后才启用
        // this.startSecurityCheck(); // 已注释
    }

    // ========================================
    // 第一层防护：localStorage 多字段交叉验证
    // ========================================

    /**
     * 设置付费状态（使用多字段存储）
     * @param {boolean} isPaid - 是否为付费用户
     */
    setPaidStatus(isPaid) {
        if (isPaid) {
            const timestamp = Date.now().toString();
            // 生成简单的验证令牌
            const token = btoa('premium_' + timestamp + '_' + Math.random().toString(36).substr(2, 9));
            
            // 同时存储多个字段
            localStorage.setItem(this.storageKeys.status, 'premium');
            localStorage.setItem(this.storageKeys.type, 'pro');
            localStorage.setItem(this.storageKeys.timestamp, timestamp);
            localStorage.setItem(this.storageKeys.token, token);
        } else {
            // 清除所有付费相关字段
            Object.values(this.storageKeys).forEach(key => {
                localStorage.removeItem(key);
            });
        }
    }

    /**
     * 多字段交叉验证付费状态
     * @returns {boolean} true=付费用户, false=免费用户
     */
    validatePaymentStatus() {
        // 测试模式优先
        if (this.isTestMode && this.testPaidStatus !== null) {
            return this.testPaidStatus;
        }

        // 获取所有字段
        const status = localStorage.getItem(this.storageKeys.status);
        const type = localStorage.getItem(this.storageKeys.type);
        const timestamp = localStorage.getItem(this.storageKeys.timestamp);
        const token = localStorage.getItem(this.storageKeys.token);

        // 验证令牌（简单验证）
        let isTokenValid = false;
        if (token && timestamp) {
            try {
                const decoded = atob(token);
                isTokenValid = decoded.startsWith('premium_' + timestamp);
            } catch (e) {
                isTokenValid = false;
            }
        }

        // 必须所有字段都符合才认为是付费用户
        const isValid = status === 'premium' 
            && type === 'pro' 
            && timestamp !== null 
            && isTokenValid;

        return isValid;
    }

    // ========================================
    // 第二层防护：定时随机检查
    // ========================================

    /**
     * 启动定时随机安全检查
     */
    startSecurityCheck() {
        if (this.isSecurityCheckRunning) return;
        
        this.isSecurityCheckRunning = true;
        this.scheduleNextCheck();
    }

    /**
     * 安排下一次安全检查（30-120秒之间随机）
     */
    scheduleNextCheck() {
        if (!this.isSecurityCheckRunning) return;

        const delay = Math.random() * 90000 + 30000; // 30-120秒随机

        setTimeout(() => {
            if (!this.isSecurityCheckRunning) return;
            
            this.performSecurityCheck('timer');
            this.scheduleNextCheck(); // 安排下一次
        }, delay);
    }

    /**
     * 执行安全检查
     * @param {string} context - 检查来源（用于调试）
     */
    performSecurityCheck(context = 'unknown') {
        this.checkCount++;
        
        // 验证付费状态
        const isValid = this.validatePaymentStatus();
        
        // 如果已经是付费用户且状态正常，无需处理
        if (isValid) {
            return;
        }
        
        // 如果之前已经检测到可疑行为，不再重复处理
        if (this.suspiciousDetected) {
            return;
        }
        
        // 检查用户是否曾经是付费用户
        // 如果从未付费（免费用户），这是正常情况，不触发警告
        const wasEverPaid = this.wasEverPaidUser();
        
        if (!wasEverPaid) {
            // 免费用户（从未付费）是正常的，不做任何处理
            return;
        }
        
        // 用户曾经是付费用户，但现在状态异常 → 可疑行为
        this.suspiciousDetected = true;
        console.warn(`[Payment Security] 检测到付费状态异常 (${context}, 检查 #${this.checkCount})`);
        this.handleSuspiciousActivity();
    }
    
    /**
     * 检查用户是否曾经是付费用户
     * @returns {boolean} true=曾经付费过, false=从未付费
     */
    wasEverPaidUser() {
        // 检查是否有任何付费相关的字段存在
        // 即使字段值不完整或不正确，只要有历史记录就认为是"曾经付费"
        const status = localStorage.getItem(this.storageKeys.status);
        const type = localStorage.getItem(this.storageKeys.type);
        const timestamp = localStorage.getItem(this.storageKeys.timestamp);
        const token = localStorage.getItem(this.storageKeys.token);
        
        // 只要有任何付费相关的字段存在，就认为是曾经付费的用户
        return !!(status || type || timestamp || token);
    }

    /**
     * 处理可疑活动
     */
    handleSuspiciousActivity() {
        // 选项1：清空所有付费相关数据
        Object.values(this.storageKeys).forEach(key => {
            localStorage.removeItem(key);
        });

        // 选项2：清空用户的收藏夹（作为惩罚）
        try {
            localStorage.removeItem('favorites');
            localStorage.removeItem('wordViewCounts');
        } catch (e) {
            console.error('清空数据失败:', e);
        }

        // 选项3：显示警告提示
        this.showSecurityWarning();

        // 选项4：移除付费用户样式
        document.documentElement.classList.remove('is-paid-user');

        // 选项5：刷新页面或跳转到首页
        // setTimeout(() => {
        //     window.location.href = '/';
        // }, 2000);
    }

    /**
     * 显示安全警告
     */
    showSecurityWarning() {
        // 检查是否已经有警告弹窗
        if (document.getElementById('security-warning-modal')) {
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'security-warning-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 100000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: #fff;
            color: #333;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            max-width: 400px;
            margin: 20px;
        `;

        content.innerHTML = `
            <h2 style="color: #f44336; margin-bottom: 15px;">⚠️ 安全警告</h2>
            <p style="margin-bottom: 20px;">检测到异常操作，请刷新页面重新登录。</p>
            <button onclick="location.reload()" style="
                background: #4CAF50;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-size: 16px;
                cursor: pointer;
            ">刷新页面</button>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    // ========================================
    // 第三层防护：操作时检查（带信任状态机制）
    // ========================================

    /**
     * 页面加载时初始化信任状态
     * 记录用户首次进入页面时的付费状态，作为后续检查的基准
     */
    initTrustStatus() {
        // 信任状态：'paid' = 信任为付费用户, 'free' = 信任为免费用户
        this.trustStatus = localStorage.getItem('paymentStatus') === 'premium' ? 'paid' : 'free';
        console.log(`[Payment Security] 信任状态: ${this.trustStatus}`);
    }

    /**
     * 操作前检查（在搜索、收藏、播放语音等操作前调用）
     * @param {string} operation - 操作名称
     * @returns {boolean} true=通过, false=不通过
     */
    checkBeforeOperation(operation) {
        // 获取当前状态
        const currentStatus = this.validatePaymentStatus();
        
        // 根据信任状态和当前状态判断是否异常
        let isSuspicious = false;
        let reason = '';
        
        if (this.trustStatus === 'paid') {
            // 信任为付费用户
            if (!currentStatus) {
                // 付费用户变成免费状态 → 可疑
                isSuspicious = true;
                reason = '付费用户状态被修改';
            }
        } else {
            // 信任为免费用户
            if (currentStatus) {
                // 免费用户变成付费状态 → 可疑（作弊）
                isSuspicious = true;
                reason = '免费用户非法获得付费状态';
            }
        }
        
        // 如果检测到可疑行为，触发警告
        if (isSuspicious) {
            console.warn(`[Payment Security] ${reason} (操作: ${operation})`);
            this.handleSuspiciousActivity();
            return false;
        }
        
        // 状态正常，但需要检查是否需要显示付费弹窗
        if (!currentStatus) {
            // 免费用户，显示付费弹窗（但不是警告）
            this.showPaymentModal();
            return false;
        }
        
        // 付费用户，操作通过
        return true;
    }

    /**
     * 绑定操作检查到DOM元素
     * 应该在页面加载完成后调用
     */
    bindOperationChecks() {
        // 搜索按钮检查
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                return this.checkBeforeOperation('search');
            });
        }

        // 收藏按钮检查
        const favoriteBtn = document.getElementById('favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', () => {
                return this.checkBeforeOperation('favorite');
            });
        }

        // 语音按钮检查
        const speechBtn = document.getElementById('speech-btn');
        if (speechBtn) {
            speechBtn.addEventListener('click', () => {
                return this.checkBeforeOperation('speech');
            });
        }

        // 收藏夹按钮检查
        const favoritesBtn = document.getElementById('favorites-btn');
        if (favoritesBtn) {
            favoritesBtn.addEventListener('click', () => {
                return this.checkBeforeOperation('favorites');
            });
        }
    }

    // ========================================
    // 统一的付费状态检查方法
    // ========================================

    /**
     * 获取当前付费状态（统一入口）
     * @returns {boolean} true=付费用户, false=免费用户
     */
    isPaidUser() {
        return this.validatePaymentStatus();
    }

    // ========================================
    // 测试模式方法（开发阶段使用）
    // ========================================

    /**
     * 初始化测试模式
     */
    initTestMode() {
        try {
            const testMode = localStorage.getItem('paymentTestMode');
            if (testMode === 'enabled') {
                this.isTestMode = true;
                const paidStatus = localStorage.getItem('testPaidStatus');
                this.testPaidStatus = paidStatus === 'true' ? true : (paidStatus === 'false' ? false : null);
                console.log('%c[Payment Manager] 测试模式已启用', 'color: #4CAF50; font-weight: bold;');
                console.log('%c[Payment Manager] 当前状态: ' + (this.testPaidStatus === null ? '正常模式' : (this.testPaidStatus ? '付费用户' : '免费用户')), 'color: #4CAF50;');
                console.log('%c[Payment Manager] 使用方法: paymentManager.setPaidUser(true/false) 切换状态', 'color: #2196F3;');
            }
        } catch (error) {
            console.error('初始化测试模式失败:', error);
        }
    }

    /**
     * 开启测试模式
     */
    setTestMode(enabled) {
        this.isTestMode = enabled;
        if (enabled) {
            localStorage.setItem('paymentTestMode', 'enabled');
            console.log('%c[Payment Manager] 测试模式已开启', 'color: #4CAF50; font-weight: bold;');
            console.log('%c[Payment Manager] 当前为正常模式', 'color: #4CAF50;');
            console.log('%c[Payment Manager] 执行 paymentManager.setPaidUser(true) 切换到付费用户', 'color: #2196F3;');
        } else {
            this.resetTestMode();
        }
    }

    /**
     * 设置测试模式的付费状态
     * @param {boolean} isPaid - true=付费用户, false=免费用户, null=正常模式
     */
    setPaidUser(isPaid) {
        if (!this.isTestMode) {
            console.warn('[Payment Manager] 请先执行 paymentManager.setTestMode(true) 开启测试模式');
            return;
        }

        this.testPaidStatus = isPaid;
        localStorage.setItem('testPaidStatus', String(isPaid));
        
        // 同时更新多字段存储（方便测试）
        if (isPaid === true) {
            this.setPaidStatus(true);
            this.trustStatus = 'paid'; // 更新信任状态
        } else if (isPaid === false) {
            this.setPaidStatus(false);
            this.trustStatus = 'free'; // 更新信任状态
        }
        
        const statusText = isPaid === null ? '正常模式' : (isPaid ? '付费用户' : '免费用户');
        console.log('%c[Payment Manager] 已切换为: ' + statusText, 'color: ' + (isPaid ? '#4CAF50' : '#FF9800') + '; font-weight: bold;');
        
        // 显示提示
        this.showTestModeToast(statusText);
    }

    /**
     * 重置测试模式
     */
    resetTestMode() {
        this.isTestMode = false;
        this.testPaidStatus = null;
        localStorage.removeItem('paymentTestMode');
        localStorage.removeItem('testPaidStatus');
        console.log('%c[Payment Manager] 测试模式已重置', 'color: #9E9E9E;');
    }

    /**
     * 显示测试模式状态提示
     */
    showTestModeToast(status) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${status === '付费用户' ? '#4CAF50' : '#FF9800'};
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            font-size: 18px;
            font-weight: bold;
            z-index: 100000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            animation: fadeInOut 2s ease-in-out;
        `;
        toast.textContent = '测试模式: ' + status;
        document.body.appendChild(toast);

        setTimeout(() => {
            document.body.removeChild(toast);
        }, 2000);
    }

    /**
     * 暴露到全局，方便控制台调用
     */
    exposeToGlobal() {
        window.paymentManager = this;
        console.log('%c[Payment Manager] 已暴露到 window.paymentManager', 'color: #2196F3;');
        console.log('可用方法:');
        console.log('  - paymentManager.setTestMode(true)   开启测试模式');
        console.log('  - paymentManager.setPaidUser(true)   模拟付费用户');
        console.log('  - paymentManager.setPaidUser(false)  模拟免费用户');
        console.log('  - paymentManager.resetTestMode()     重置测试模式');
        console.log('  - paymentManager.isPaidUser()        查看当前状态');
        console.log('  - paymentManager.clearViewCounts()   清空浏览次数');
        console.log('  - paymentManager.bindOperationChecks() 绑定操作检查');
    }
    
    /**
     * 获取当前用户的查看次数
     */
    getViewCounts() {
        try {
            const counts = localStorage.getItem('wordViewCounts');
            return counts ? JSON.parse(counts) : {};
        } catch (error) {
            console.error('获取查看次数失败:', error);
            return {};
        }
    }
    
    /**
     * 保存查看次数
     */
    saveViewCounts(counts) {
        try {
            localStorage.setItem('wordViewCounts', JSON.stringify(counts));
        } catch (error) {
            console.error('保存查看次数失败:', error);
        }
    }
    
    /**
     * 增加指定字数的查看次数
     */
    incrementViewCount(wordCount) {
        const counts = this.getViewCounts();
        counts[wordCount] = (counts[wordCount] || 0) + 1;
        this.saveViewCounts(counts);
        return counts[wordCount];
    }
    
    /**
     * 检查是否达到了指定字数的免费查看限制
     */
    shouldShowPaymentModal(wordCount) {
        const counts = this.getViewCounts();
        const count = counts[wordCount] || 0;
        const limit = this.freeViewLimits[wordCount] || 0;
        return count >= limit;
    }
    
    /**
     * 检查搜索功能是否需要显示收费弹窗
     */
    shouldShowPaymentForSearch() {
        // 搜索功能总是触发收费检查
        return true;
    }
    
    /**
     * 检查收藏夹功能是否需要显示收费弹窗
     */
    shouldShowPaymentForFavorites() {
        // 收藏夹功能总是触发收费检查
        return true;
    }
    
    /**
     * 获取当前用户语言的文本
     */
    getLanguageText() {
        const userLanguage = localStorage.getItem('userLanguage') || 'en';
        return this.languageTexts[userLanguage] || this.languageTexts['default'];
    }
    
    /**
     * 显示收费弹窗
     */
    showPaymentModal() {
        // 检查是否已经有弹窗存在
        if (document.getElementById('payment-modal')) {
            return;
        }
        
        const texts = this.getLanguageText();
        
        // 创建弹窗元素
        const modal = document.createElement('div');
        modal.id = 'payment-modal';
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${texts.title}</h2>
                    <button class="close-modal" id="close-payment-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <p>${texts.message}</p>
                    <p class="browser-hint">${texts.browser}</p>
                    <div class="payment-link-container">
                        <label>${texts.paymentLink}</label>
                        <div class="link-copy">
                            <input type="text" value="${this.paymentLink}" readonly id="payment-link-input">
                            <button class="copy-btn" id="copy-payment-link">${texts.copy}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.appendChild(modal);
        
        // 添加关闭事件
        const closeBtn = document.getElementById('close-payment-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }
        
        // 添加复制链接事件
        const copyBtn = document.getElementById('copy-payment-link');
        const linkInput = document.getElementById('payment-link-input');
        
        if (copyBtn && linkInput) {
            copyBtn.addEventListener('click', () => {
                linkInput.select();
                document.execCommand('copy');
                
                // 显示复制成功提示
                const originalText = copyBtn.textContent;
                copyBtn.textContent = texts.copied;
                
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 1500);
            });
        }
        
        // 点击蒙层关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * 清空浏览次数（测试用）
     */
    clearViewCounts() {
        localStorage.removeItem('wordViewCounts');
        console.log('%c[Payment Manager] 已清空浏览次数', 'color: #4CAF50;');
    }

    /**
     * 获取免费限额（支持测试模式）
     */
    getFreeLimit(wordCount) {
        // 测试模式下付费用户没有限制
        if (this.isTestMode && this.testPaidStatus === true) {
            return 999999;
        }
        return this.freeViewLimits[wordCount] || 0;
    }

    /**
     * 检查是否应该显示广告（支持测试模式）
     */
    shouldShowAd() {
        // 付费用户不显示广告
        if (this.isPaidUser()) {
            return false;
        }
        
        // 继续检查其他条件
        const lastAdTime = localStorage.getItem('lastAdTime');
        const adCooldown = 5 * 60 * 1000; // 5分钟冷却时间
        
        if (lastAdTime && Date.now() - lastAdTime < adCooldown) {
            return false;
        }
        
        const viewedCount = this.getViewCountSinceLastAd();
        const adInterval = 15; // 每15个词条
        
        return viewedCount >= adInterval;
    }

    /**
     * 获取上次广告后的浏览次数
     */
    getViewCountSinceLastAd() {
        const lastAdTime = localStorage.getItem('lastAdTime');
        if (!lastAdTime) {
            return this.getTotalViewCount();
        }
        
        // 这里简化处理，实际应该记录每次浏览的时间戳
        return this.getTotalViewCount();
    }

    /**
     * 获取总浏览次数
     */
    getTotalViewCount() {
        const counts = this.getViewCounts();
        let total = 0;
        for (const key in counts) {
            total += counts[key];
        }
        return total;
    }

    /**
     * 停止安全检查（在页面卸载时调用）
     */
    stopSecurityCheck() {
        this.isSecurityCheckRunning = false;
    }
}

// 导出单例实例
const paymentManager = new PaymentManager();

// 始终暴露到全局，方便其他模块和测试使用
window.paymentManager = paymentManager;

// 在开发环境下打印测试方法提示
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.search.includes('test=true')) {
    paymentManager.exposeToGlobal();
}

// 页面卸载时停止安全检查
window.addEventListener('beforeunload', () => {
    if (window.paymentManager) {
        window.paymentManager.stopSecurityCheck();
    }
});

export default paymentManager;
