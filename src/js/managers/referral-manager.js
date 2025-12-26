/**
 * Referral Program管理器
 * 处理用户唯一标识码生成、referral链接和奖励系统
 */
class ReferralManager {
    constructor() {
        this.storageKey = 'userReferralCode';
        this.shareKey = 'shareCount';
    }

    /**
     * 生成用户唯一referral码
     * 格式：8位字母数字混合码，不可重复
     */
    generateReferralCode() {
        const existingCodes = this.getAllStoredCodes();
        let newCode;
        let attempts = 0;
        const maxAttempts = 1000;

        do {
            // 生成8位编码：2位字母 + 3位数字 + 3位字母数字混合
            const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 排除易混淆字母 I,O
            const numbers = '23456789'; // 排除易混淆数字 0,1
            const mixed = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            
            const part1 = letters.charAt(Math.floor(Math.random() * letters.length)) +
                         letters.charAt(Math.floor(Math.random() * letters.length));
            const part2 = numbers.charAt(Math.floor(Math.random() * numbers.length)) +
                         numbers.charAt(Math.floor(Math.random() * numbers.length)) +
                         numbers.charAt(Math.floor(Math.random() * numbers.length));
            const part3 = mixed.charAt(Math.floor(Math.random() * mixed.length)) +
                         mixed.charAt(Math.floor(Math.random() * mixed.length)) +
                         mixed.charAt(Math.floor(Math.random() * mixed.length));
            
            newCode = part1 + part2 + part3;
            attempts++;
        } while (existingCodes.includes(newCode) && attempts < maxAttempts);

        // 如果尝试次数过多，添加时间戳确保唯一性
        if (attempts >= maxAttempts) {
            const timestamp = Date.now().toString().slice(-4);
            newCode = newCode.slice(0, 4) + timestamp;
        }

        return newCode;
    }

    /**
     * 获取用户referral码
     */
    getUserReferralCode() {
        let code = localStorage.getItem(this.storageKey);
        if (!code) {
            code = this.generateReferralCode();
            localStorage.setItem(this.storageKey, code);
        }
        return code;
    }

    /**
     * 生成referral分享链接
     */
    generateReferralLink() {
        const baseUrl = window.location.origin;
        const referralCode = this.getUserReferralCode();
        return `${baseUrl}?ref=${referralCode}`;
    }

    /**
     * 获取referral分享文本
     */
    getReferralShareText() {
        const userLanguage = localStorage.getItem('userLanguage') || 'vi';
        const referralCode = this.getUserReferralCode();
        const referralLink = this.generateReferralLink();
        
        const shareTexts = {
            'vi': `🚀 Học tiếng Trung cùng tôi! Dùng mã này "${referralCode}" để nhận phần thưởng: ${referralLink}`,
            'id': `🚀 Belajar bahasa Cina bersama saya! Gunakan kode ini "${referralCode}" untuk mendapat hadiah: ${referralLink}`,
            'es': `🚀 ¡Aprende chino conmigo! Usa este código "${referralCode}" para recibir recompensas: ${referralLink}`,
            'de': `🚀 Lerne Chinesisch mit mir! Verwende diesen Code "${referralCode}" für Belohnungen: ${referralLink}`,
            'fr': `🚀 Apprends le chinois avec moi ! Utilise ce code "${referralCode}" pour recevoir des récompenses : ${referralLink}`,
            'ru': `🚀 Изучайте китайский вместе со мной! Используйте этот код "${referralCode}" для получения наград: ${referralLink}`,
            'ko': `🚀 중국어를 함께 공부하세요! 보상을 받으려면 이 코드 "${referralCode}"를 사용하세요: ${referralLink}`,
            'hi': `🚀 चीनी मुझसे सीखें! इनाम पाने के लिए इस कोड "${referralCode}" का उपयोग करें: ${referralLink}`,
            'th': `🚀 เรียนภาษาจีนกับฉัน! ใช้รหัสนี้ "${referralCode}" เพื่อรับรางวัล: ${referralLink}`,
            'my': `🚀 Belajar bahasa Cina dengan saya! Gunakan kod ini "${referralCode}" untuk dapat ganjaran: ${referralLink}`,
            'km': `🚀 រៀនភាសាចិនជាមួយខ្ញុំ! ប្រើលេខកូដនេះ "${referralCode}" ដើម្បីទទួលបានរង្វាន់: ${referralLink}`,
            'lo': `🚀 ຮຽນພາສາຈີນກັບຂ້ອຍ! ໃຊ້ລະຫັດນີ້ "${referralCode}" ເພື່ອຮັບລາງວັນ: ${referralLink}`,
            'mya': `🚀 တရုတ်ဘာသာစကား ကျွန်ုပ်နှင့်လေ့လာပါ! ဆုလာဘ်ရရှိရန် ဤကုဒ် "${referralCode}" ကိုအသုံးပြုပါ: ${referralLink}`,
            'bn': `🚀 চীনা ভাষা আমার সাথে শিখুন! পুরস্কার পেতে এই কোড "${referralCode}" ব্যবহার করুন: ${referralLink}`,
            'default': `🚀 和我一起学中文！使用这个码 "${referralCode}" 获取奖励: ${referralLink}`
        };
        
        return shareTexts[userLanguage] || shareTexts['default'];
    }

    /**
     * 显示referral分享模态框
     */
    showReferralModal() {
        const referralCode = this.getUserReferralCode();
        const referralLink = this.generateReferralLink();
        const shareText = this.getReferralShareText();
        
        // 创建模态框
        const modal = document.createElement('div');
        modal.id = 'referral-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: Arial, sans-serif;
            padding: 20px;
        `;
        
        // 创建内容容器
        const contentContainer = document.createElement('div');
        contentContainer.style.cssText = `
            background-color: white;
            border-radius: 16px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        `;
        
        // 创建标题
        const title = document.createElement('h2');
        title.textContent = '🎁 Referral 奖励计划';
        title.style.cssText = `
            margin: 0 0 20px 0;
            color: #333;
            font-size: 24px;
        `;
        
        // 创建说明
        const description = document.createElement('p');
        description.innerHTML = `
            分享给朋友，双方都可获得奖励！<br>
            请保存您的专属推荐码：
        `;
        description.style.cssText = `
            margin-bottom: 25px;
            color: #666;
            font-size: 16px;
            line-height: 1.5;
        `;
        
        // 创建码显示区域
        const codeDisplay = document.createElement('div');
        codeDisplay.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            font-size: 28px;
            font-weight: bold;
            letter-spacing: 3px;
            margin-bottom: 25px;
            font-family: 'Courier New', monospace;
        `;
        codeDisplay.textContent = referralCode;
        
        // 创建复制按钮
        const copyButton = document.createElement('button');
        copyButton.textContent = '📋 复制推荐码';
        copyButton.style.cssText = `
            padding: 12px 24px;
            font-size: 16px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            margin-right: 10px;
            margin-bottom: 10px;
        `;
        
        // 创建分享按钮
        const shareButton = document.createElement('button');
        shareButton.textContent = '📤 分享链接';
        shareButton.style.cssText = `
            padding: 12px 24px;
            font-size: 16px;
            background-color: #2196F3;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            margin-left: 10px;
            margin-bottom: 10px;
        `;
        
        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = '❌ 关闭';
        closeButton.style.cssText = `
            padding: 10px 20px;
            font-size: 14px;
            background-color: #9E9E9E;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 15px;
        `;
        
        // 复制码功能
        copyButton.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(referralCode);
                this.showToast('✅ 推荐码已复制到剪贴板！');
            } catch (err) {
                // 降级方案
                const textArea = document.createElement('textarea');
                textArea.value = referralCode;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showToast('✅ 推荐码已复制到剪贴板！');
            }
        });
        
        // 分享功能
        shareButton.addEventListener('click', async () => {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: '一起学中文！',
                        text: shareText,
                        url: referralLink
                    });
                    this.incrementShareCount();
                    this.showToast('🎉 分享成功！');
                } catch (err) {
                    // 用户取消分享
                }
            } else {
                // 降级到复制链接
                try {
                    await navigator.clipboard.writeText(shareText);
                    this.showToast('✅ 分享文本已复制到剪贴板！');
                } catch (err) {
                    this.showToast('❌ 复制失败，请手动复制');
                }
            }
        });
        
        // 关闭功能
        closeButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // 点击外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        // 组装组件
        const buttonContainer = document.createElement('div');
        buttonContainer.appendChild(copyButton);
        buttonContainer.appendChild(shareButton);
        
        contentContainer.appendChild(title);
        contentContainer.appendChild(description);
        contentContainer.appendChild(codeDisplay);
        contentContainer.appendChild(buttonContainer);
        contentContainer.appendChild(closeButton);
        modal.appendChild(contentContainer);
        
        // 添加到页面
        document.body.appendChild(modal);
        
        // 增加referral展示次数
        this.incrementReferralViews();
    }
    
    /**
     * 显示提示消息
     */
    showToast(message) {
        // 创建toast元素
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 16px;
            z-index: 10000;
            pointer-events: none;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // 2秒后移除
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 2000);
    }
    
    /**
     * 增加分享次数
     */
    incrementShareCount() {
        const count = parseInt(localStorage.getItem(this.shareKey) || '0') + 1;
        localStorage.setItem(this.shareKey, count.toString());
    }
    
    /**
     * 获取分享次数
     */
    getShareCount() {
        return parseInt(localStorage.getItem(this.shareKey) || '0');
    }
    
    /**
     * 增加referral展示次数
     */
    incrementReferralViews() {
        const viewsKey = 'referralViews';
        const views = parseInt(localStorage.getItem(viewsKey) || '0') + 1;
        localStorage.setItem(viewsKey, views.toString());
    }
    
    /**
     * 获取referral展示次数
     */
    getReferralViews() {
        return parseInt(localStorage.getItem('referralViews') || '0');
    }
    
    /**
     * 获取所有已存储的码（用于去重）
     */
    getAllStoredCodes() {
        const codes = [];
        for (let key in localStorage) {
            if (key.startsWith('userRef_')) {
                codes.push(localStorage.getItem(key));
            }
        }
        return codes;
    }
    
    /**
     * 处理referral链接访问
     */
    handleReferralVisit() {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        
        if (refCode) {
            // 存储referrer信息（这里可以进一步处理统计）
            localStorage.setItem('referrer', refCode);
            
            // 可以在这里添加奖励逻辑
            console.log('Referral visit detected:', refCode);
        }
    }
    
    /**
     * 重置所有数据（用于测试）
     */
    resetAll() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.shareKey);
        localStorage.removeItem('referralViews');
        localStorage.removeItem('referrer');
        console.log('Referral data reset');
    }
}

// 导出模块
export default ReferralManager;