/**
 * 分享管理器 - 独立模块
 * 处理应用的分享功能，显示自适应全屏窗口
 * 集成Referral Program功能
 */

// 简化的Referral Manager实现，避免循环依赖
class SimpleReferralManager {
    constructor() {
        this.storageKey = 'userReferralCode';
        this.shareKey = 'shareCount';
    }

    generateReferralCode() {
        const existingCodes = this.getAllStoredCodes();
        let newCode;
        let attempts = 0;
        const maxAttempts = 1000;

        do {
            const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
            const numbers = '23456789';
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

        if (attempts >= maxAttempts) {
            const timestamp = Date.now().toString().slice(-4);
            newCode = newCode.slice(0, 4) + timestamp;
        }

        return newCode;
    }

    getUserReferralCode() {
        let code = localStorage.getItem(this.storageKey);
        if (!code) {
            code = this.generateReferralCode();
            localStorage.setItem(this.storageKey, code);
        }
        return code;
    }

    generateReferralLink() {
        const baseUrl = window.location.origin;
        const referralCode = this.getUserReferralCode();
        return `${baseUrl}?ref=${referralCode}`;
    }

    getReferralShareText() {
        const userLanguage = localStorage.getItem('userLanguage') || 'vi';
        const referralCode = this.getUserReferralCode();
        const referralLink = this.generateReferralLink();
        
        const shareTexts = {
            'vi': `🚀 Học tiếng Trung cùng tôi! ${referralLink}`,
            'id': `🚀 Belajar bahasa Cina bersama saya! ${referralLink}`,
            'es': `🚀 ¡Aprende chino conmigo! ${referralLink}`,
            'de': `🚀 Lerne Chinesisch mit mir! ${referralLink}`,
            'fr': `🚀 Apprends le chinois avec moi ! ${referralLink}`,
            'ru': `🚀 Изучайте китайский вместе со мной! ${referralLink}`,
            'ko': `🚀 중국어를 함께 공부하세요! ${referralLink}`,
            'hi': `🚀 चीनी मुझसे सीखें! ${referralLink}`,
            'th': `🚀 เรียนภาษาจีนกับฉัน! ${referralLink}`,
            'my': `🚀 Belajar bahasa Cina dengan saya! ${referralLink}`,
            'km': `🚀 រៀនភាសាចិនជាមួយខ្ញុំ! ${referralLink}`,
            'lo': `🚀 ຮຽນພາສາຈີນກັບຂ້ອຍ! ${referralLink}`,
            'mya': `🚀 တရုတ်ဘာသာစကား ကျွန်ုပ်နှင့်လေ့လာပါ! ${referralLink}`,
            'bn': `🚀 চীনা ভাষা আমার সাথে শিখুন! ${referralLink}`,
            'default': `🚀 和我一起学中文！${referralLink}`
        };
        
        return shareTexts[userLanguage] || shareTexts['default'];
    }

    showReferralModal() {
        const referralCode = this.getUserReferralCode();
        const referralLink = this.generateReferralLink();
        const shareText = this.getReferralShareText();
        const userLanguage = localStorage.getItem('userLanguage') || 'vi';
        
        // 获取当前主题
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        const bgColor = isDarkTheme ? '#2d2d2d' : '#ffffff';
        const textColor = isDarkTheme ? '#ffffff' : '#333333';
        const borderColor = isDarkTheme ? '#404040' : '#e0e0e0';
        const modalBgColor = isDarkTheme ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.8)';
        
        // 本地化文本
        const texts = this.getLocalizedTexts(userLanguage);
        
        // 创建模态框
        const modal = document.createElement('div');
        modal.id = 'referral-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: ${modalBgColor};
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
            background-color: ${bgColor};
            color: ${textColor};
            border: 1px solid ${borderColor};
            border-radius: 16px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        `;
        
        // 创建标题
        const title = document.createElement('h2');
        title.textContent = texts.referralTitle;
        title.style.cssText = `
            margin: 0 0 20px 0;
            color: ${textColor};
            font-size: 24px;
        `;
        
        // 创建说明
        const description = document.createElement('p');
        description.innerHTML = texts.referralDescription;
        description.style.cssText = `
            margin-bottom: 25px;
            color: ${isDarkTheme ? '#cccccc' : '#666666'};
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
            margin-bottom: 15px;
            font-family: 'Courier New', monospace;
        `;
        codeDisplay.textContent = referralCode;
        
        // 创建积分奖励说明subtitle
        const subtitleElement = document.createElement('p');
        subtitleElement.innerHTML = texts.referralSubtitle;
        subtitleElement.style.cssText = `
            font-size: 13px;
            color: ${isDarkTheme ? '#aaaaaa' : '#888888'};
            margin: 0 0 15px 0;
            line-height: 1.5;
        `;
        
        // 创建复制和分享按钮（合并为一个按钮）
        const copyShareButton = document.createElement('button');
        copyShareButton.innerHTML = texts.copyAndShare;
        copyShareButton.style.cssText = `
            padding: 12px 24px;
            font-size: 16px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 10px;
            width: 100%;
        `;
        
        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = texts.close;
        closeButton.style.cssText = `
            padding: 10px 20px;
            font-size: 14px;
            background-color: #9E9E9E;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s;
            width: 100%;
        `;
        
        // 复制码和分享功能
        copyShareButton.addEventListener('click', async () => {
            // 复制到剪贴板
            try {
                await navigator.clipboard.writeText(shareText);
                // 显示成功消息
                const successMsg = document.createElement('div');
                successMsg.textContent = texts.copySuccess;
                successMsg.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background-color: #4CAF50;
                    color: white;
                    padding: 15px 25px;
                    border-radius: 8px;
                    font-size: 16px;
                    z-index: 10000;
                    animation: fadeInOut 2s ease-in-out;
                `;
                document.body.appendChild(successMsg);
                
                this.incrementShareCount();
                
                // 尝试调用原生分享API（如果在支持的环境）
                if (navigator.share) {
                    try {
                        const referralCode = this.getUserReferralCode();
                        const referralLink = this.generateReferralLink();
                        const userLanguage = localStorage.getItem('userLanguage') || 'vi';
                        
                        // 准备分享数据
                        const shareData = {
                            title: userLanguage === 'default' ? '一起学中文！' : 'Học tiếng Trung cùng tôi!',
                            text: shareText,
                            url: referralLink
                        };
                        
                        // 检查是否支持分享
                        if (navigator.canShare && navigator.canShare(shareData)) {
                            await navigator.share(shareData);
                            // 用户完成分享后关闭模态框
                            setTimeout(() => {
                                document.body.removeChild(successMsg);
                                document.body.removeChild(modal);
                            }, 500);
                            return;
                        }
                    } catch (shareErr) {
                        // 用户取消分享或其他错误，继续显示成功消息
                        if (shareErr.name !== 'AbortError') {
                            console.log('原生分享失败:', shareErr.message);
                        }
                    }
                }
                
                // 2秒后关闭
                setTimeout(() => {
                    document.body.removeChild(successMsg);
                    document.body.removeChild(modal);
                }, 2000);
            } catch (err) {
                // 备用复制方法
                const textArea = document.createElement('textarea');
                textArea.value = shareText;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                // 显示成功消息
                const successMsg = document.createElement('div');
                successMsg.textContent = texts.copySuccess;
                successMsg.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background-color: #4CAF50;
                    color: white;
                    padding: 15px 25px;
                    border-radius: 8px;
                    font-size: 16px;
                    z-index: 10000;
                `;
                document.body.appendChild(successMsg);
                
                setTimeout(() => {
                    document.body.removeChild(successMsg);
                    document.body.removeChild(modal);
                }, 2000);
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
        contentContainer.appendChild(title);
        contentContainer.appendChild(description);
        contentContainer.appendChild(codeDisplay);
        contentContainer.appendChild(subtitleElement);
        contentContainer.appendChild(copyShareButton);
        contentContainer.appendChild(closeButton);
        modal.appendChild(contentContainer);
        
        // 添加到页面
        document.body.appendChild(modal);
        
        this.incrementReferralViews();
    }
    
    getLocalizedTexts(language) {
        const texts = {
            'vi': {
                referralTitle: '🎁 Chương trình thưởng giới thiệu',
                referralDescription: 'Chia sẻ với bạn bè, sau đó tìm tôi trên X để đăng ký mã giới thiệu của bạn và tích lũy điểm:',
                referralInvite: '🎁 Giới thiệu có thưởng',
                referralSubtitle: 'Nếu bạn bè đăng ký qua liên kết của bạn, bạn sẽ nhận được điểm thưởng. Tích đủ điểm có thể đổi phần thưởng trên website.',
                copyAndShare: '📋 Sao chép mã và chia sẻ',
                close: '❌ Đóng',
                copySuccess: '✅ Đã sao chép và chia sẻ!'
            },
            'id': {
                referralTitle: '🎁 Program Hadiah Referral',
                referralDescription: 'Bagikan dengan teman, kemudian cari saya di X untuk mendaftarkan kode referral Anda dan mengakumulasi poin:',
                referralInvite: '🎁 Referral Berhadiah',
                referralSubtitle: 'Jika teman Anda mendaftar melalui link Anda, Anda akan mendapat poin hadiah. Kumpulkan poin yang cukup untuk menukar hadiah di website.',
                copyAndShare: '📋 Salin kode dan bagikan',
                close: '❌ Tutup',
                copySuccess: '✅ Kode telah disalin dan dibagikan!'
            },
            'es': {
                referralTitle: '🎁 Programa de recompensas de referido',
                referralDescription: 'Comparte con amigos, luego encuéntrame en X para registrar tu código de referido y acumular puntos:',
                referralInvite: '🎁 Referencias con recompensas',
                referralSubtitle: 'Si tus amigos se registran a través de tu enlace, recibirás puntos de recompensa. Acumula suficientes puntos para canjear premios en el sitio web.',
                copyAndShare: '📋 Copiar código y compartir',
                close: '❌ Cerrar',
                copySuccess: '¡✅ Código copiado y compartido!'
            },
            'de': {
                referralTitle: '🎁 Referral-Belohnungsprogramm',
                referralDescription: 'Teile mit Freunden, finde mich dann auf X, um deinen Referral-Code zu registrieren und Punkte zu sammeln:',
                referralInvite: '🎁 Empfehlungen mit Belohnungen',
                referralSubtitle: 'Wenn sich deine Freunde über deinen Link anmelden, erhältst du Belohnungspunkte. Sammle genug Punkte, um Preise auf der Website einzulösen.',
                copyAndShare: '📋 Code kopieren und teilen',
                close: '❌ Schließen',
                copySuccess: '✅ Code kopiert und geteilt!'
            },
            'fr': {
                referralTitle: '🎁 Programme de récompenses de parrainage',
                referralDescription: 'Partage avec des amis, puis trouve-moi sur X pour enregistrer ton code de parrainage et accumuler des points:',
                referralInvite: '🎁 Parrainages avec récompenses',
                referralSubtitle: 'Si tes amis s\'inscrivent via ton lien, tu recevras des points de récompense. Accumule suffisamment de points pour échanger des prix sur le site.',
                copyAndShare: '📋 Copier le code et partager',
                close: '❌ Fermer',
                copySuccess: '✅ Code copié et partagé !'
            },
            'ru': {
                referralTitle: '🎁 Программа вознаграждения за реферала',
                referralDescription: 'Поделитесь с друзьями, затем найдите меня в X, чтобы зарегистрировать ваш реферальный код и накопить баллы:',
                referralInvite: '🎁 Рефералы с наградами',
                referralSubtitle: 'Если ваши друзья регистрируются по вашей ссылке, вы получаете баллы-награды. Накопите достаточно баллов, чтобы обменять призы на сайте.',
                copyAndShare: '📋 Скопировать код и поделиться',
                close: '❌ Закрыть',
                copySuccess: '✅ Код скопирован и отправлен!'
            },
            'ko': {
                referralTitle: '🎁 추천인 보상 프로그램',
                referralDescription: '친구와 공유한 후 X에서 제 계정을 찾아 추천 코드를 등록하고 포인트를 적립하세요:',
                referralInvite: '🎁 추천 적립',
                referralSubtitle: '친구가 내 링크를 통해 등록하면 보상 포인트를 받습니다. 충분한 포인트를 모으면 웹사이트에서 상품으로 교환할 수 있습니다.',
                copyAndShare: '📋 코드 복사 및 공유',
                close: '❌ 닫기',
                copySuccess: '✅ 코드가 복사되고 공유되었습니다!'
            },
            'hi': {
                referralTitle: '🎁 रेफरल इनाम कार्यक्रम',
                referralDescription: 'दोस्तों के साथ साझा करें, फिर X पर मुझे खोजें अपना रेफरल कोड रजिस्टर करने और अंक जमा करने के लिए:',
                referralInvite: '🎁 रेफरल से अंक',
                referralSubtitle: 'यदि आपके दोस्त आपके लिंक के माध्यम से पंजीकरण करते हैं, तो आपको इनाम अंक मिलेंगे। पर्याप्त अंक जमा करें और वेबसाइट पर इनाम प्राप्त करें।',
                copyAndShare: '📋 कोड कॉपी करें और साझा करें',
                close: '❌ बंद करें',
                copySuccess: '✅ कोड कॉपी और साझा किया गया!'
            },
            'th': {
                referralTitle: '🎁 โปรแกรมรางวัลแนะนำเพื่อน',
                referralDescription: 'แบ่งปันกับเพื่อน จากนั้นหาฉันบน X เพื่อลงทะเบียนรหัสแนะนำเพื่อนของคุณและสะสมคะแนน:',
                referralInvite: '🎁 แนะนำได้คะแนน',
                referralSubtitle: 'หากเพื่อนของคุณลงทะเบียนผ่านลิงก์ของคุณ คุณจะได้รับคะแนนรางวัล สะสมคะแนนให้เพียงพอแลกรางวัลบนเว็บไซต์ได้',
                copyAndShare: '📋 คัดลอกรหัสและแชร์',
                close: '❌ ปิด',
                copySuccess: '✅ คัดลอกและแชร์รหัสแล้ว!'
            },
            'my': {
                referralTitle: '🎁 Program Hadiah Referral',
                referralDescription: 'Berikan kepada kawan, kemudian cari saya di X untuk mendaftarkan kod referral anda dan mengumpul mata:',
                referralInvite: '🎁 Rujukan mendapat mata',
                referralSubtitle: 'Jika kawan anda mendaftar melalui pautan anda, anda akan mendapat mata hadiah. Kumpul mata yang mencukupi untuk menukar hadiah di laman web.',
                copyAndShare: '📋 Salin kod dan berikan',
                close: '❌ Tutup',
                copySuccess: '✅ Kod telah disalin dan diberikan!'
            },
            'km': {
                referralTitle: '🎁 កម្មវិធីរង្វាន់ referral',
                referralDescription: 'ចែករំលែកជាមួយមិត្តភ័ណ្ឌ បន្ទាប់មករកខ្ញុំនៅលើ X ដើម្បីចុចលេខ referral របស់អ្នក និងប្រមូលពិន្ទុ:',
                referralInvite: '🎁 referral ទទួលពិន្ទុ',
                referralSubtitle: 'ប្រសិនបើមិត្តភ័ណ្ឌរបស់អ្នកចុះឈ្មោះតាមតំណភ្ជាប់របស់អ្នក អ្នកនឹងទទួលបានពិន្ទុរង្វាន់ ។ ប្រមូលពិន្ទុគ្រប់គ្រាន់ដើម្បីប្តូររង្វាន់នៅលើគេហទំព័រ ។',
                copyAndShare: '📋 ចម្លងលេខកូដនិងចែករំលែក',
                close: '❌ បិទ',
                copySuccess: '✅ លេខកូដបានចម្លងនិងចែករំលែក!'
            },
            'lo': {
                referralTitle: '🎁 ເຄรื่องมือລາງວັນ referral',
                referralDescription: 'ແບ່ງປັນໃຫ້ຟຣູຉ បັງການບອກຂ້ອຍຢູ່ X ເ�ื่อລົງທะเบียนລະຫັດ referral ຂອງເຈົ້າແລ້ວມຸມຸນົດ:',
                referralInvite: '🎁 referral ການແກ້ວນ',
                referralSubtitle: 'ຖ້າຟຣູຉຂອງເຈົ້າລົງທะเบียนຜ່ານລິงก์ຂອງເຈົ້າ ເຈົ້າຓឹ຀ຈະດຶງນຳຖືກັນ Ễດ້ນ້ຳກຳລານ ມາດຕາມບໍ່ຂດ ເພื่ຜ່ານລາງວັນຂ້ອຍແລ້ວ ຢູ່ເວ็บ ທີ່ຮ້ອງງານ',
                copyAndShare: '📋 ຅ម្លងលេກកូដនិង share',
                close: '❌ ດັບ',
                copySuccess: '✅ ປេກកូដຖືກ copy และ share แล้ว!'
            },
            'mya': {
                referralTitle: '🎁 referral ဆုလာဘ်အစီအစဉ်',
                referralDescription: 'မိတ်ဆွေတို့နှင့် မျှဝေပါ၊ ထို့နောက် X တွင် ကျွန်ုပ်ကို ရှာပြီး သင့် referral code ကို မှတ်ပုံတင်ပြီး အမှတ်များကို စုဆောင်းပါ:',
                referralInvite: '🎁 referral အမှတ်ရ',
                referralSubtitle: 'သင့်မိတ်ဆွေများသည် သင့် link မှတစ်ဆင့် မှတ်ပုံတင်ပါက သင့်ထံ ဆုလာဘ်အမှတ်များ ရရှိမည်ဖြစ်ပါသည်။ လုံလောက်သော အမှတ်များ စုဆောင်းပြီးလျှင် website တွင် ဆုလာဘ်လဲလှယ်နိုင်ပါသည်။',
                copyAndShare: '📋 ကော်ပီကြည့်နှင့် share',
                close: '❌ ပိတ်',
                copySuccess: '✅ ကော်ပီကြည့်ပြီး share လိုက်ပြီ!'
            },
            'bn': {
                referralTitle: '🎁 রেফারেল পুরস্কার প্রোগ্রাম',
                referralDescription: 'বন্ধুদের সাথে শেয়ার করুন, তারপর X-এ আমাকে খুঁজুন আপনার রেফারেল কোড নিবন্ধন করতে এবং পয়েন্ট জমা করতে:',
                referralInvite: '🎁 রেফারেলে পয়েন্ট',
                referralSubtitle: 'আপনার বন্ধুরা যদি আপনার লিংকের মাধ্যমে নিবন্ধন করে, আপনি পুরস্কার পয়েন্ট পাবেন। পর্যাপ্ত পয়েন্ট জমা করে ওয়েবসাইটে পুরস্কার লাভ করুন।',
                copyAndShare: '📋 কোড কপি এবং শেয়ার',
                close: '❌ বন্ধ করুন',
                copySuccess: '✅ কোড কপি এবং শেয়ার হয়েছে!'
            },
            'default': {
                referralTitle: '🎁 推荐有奖计划',
                referralDescription: '分享给朋友，然后在X上找我注册你的推荐码，以便积累积分：',
                referralInvite: '🎁 推荐有奖',
                referralSubtitle: '如果你的朋友通过你的链接注册，你将获得积分奖励，达到一定数额后可以在网站兑换奖励',
                copyAndShare: '📋 复制码并分享',
                close: '❌ 关闭',
                copySuccess: '✅ 推荐码已复制并分享！'
            }
        };
        
        return texts[language] || texts['default'];
    }
    
    incrementShareCount() {
        const count = parseInt(localStorage.getItem(this.shareKey) || '0') + 1;
        localStorage.setItem(this.shareKey, count.toString());
    }
    
    getShareCount() {
        return parseInt(localStorage.getItem(this.shareKey) || '0');
    }
    
    incrementReferralViews() {
        const viewsKey = 'referralViews';
        const views = parseInt(localStorage.getItem(viewsKey) || '0') + 1;
        localStorage.setItem(viewsKey, views.toString());
    }
    
    getReferralViews() {
        return parseInt(localStorage.getItem('referralViews') || '0');
    }
    
    getAllStoredCodes() {
        const codes = [];
        for (let key in localStorage) {
            if (key.startsWith('userRef_')) {
                codes.push(localStorage.getItem(key));
            }
        }
        return codes;
    }
    
    handleReferralVisit() {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        
        if (refCode) {
            localStorage.setItem('referrer', refCode);
            console.log('Referral visit detected:', refCode);
        }
    }
}

class ShareManager {
    constructor() {
        // 初始化referral管理器
        this.referralManager = new SimpleReferralManager();
        this.shareTexts = {
            'vi': `Đây là một trang web hay để học tiếng Trung, tôi chia sẻ cho bạn: {url}`,
            'id': `Ini adalah situs web yang bagus untuk belajar bahasa Cina, saya bagikan kepada Anda: {url}`,
            'es': `Esta es una buena página web para aprender chino, se la comparto: {url}`,
            'de': `Dies ist eine gute Website zum Erlernen von Chinesisch, ich teile sie mit Ihnen: {url}`,
            'fr': `C'est un bon site web pour apprendre le chinois, je vous le partage : {url}`,
            'ru': `Это хороший сайт для изучения китайского языка, я поделюсь им с вами: {url}`,
            'ko': `이것은 중국어를 배우는 좋은 웹사이트입니다. 당신과 공유합니다: {url}`,
            'hi': `यह चीनी सीखने के लिए एक अच्छी वेबसाइट है, मैं इसे आपके साथ साझा कर रहा हूं: {url}`,
            'th': `นี่คือเว็บไซต์ที่ดีสำหรับเรียนภาษาจีน แบ่งปันให้คุณ: {url}`,
            'my': `Ini adalah laman web yang bagus untuk belajar bahasa Cina, saya kongsi dengan anda: {url}`,
            'km': `នេះជាវែបសាយល្អសម្រាប់សិក្សាភាសាចិន ខ្ញុំចែករំលែកជាមួយអ្នក: {url}`,
            'lo': `ນີ້ແມ່ນເວັບໄຊທ໌ທີ່ເປັນປະໂຫຍດສຳລັບຮຽນພາສາຈີນ, ຂ້ອຍແບ່ງປັນໃຫ້ທ່ານ: {url}`,
            'mya': `ဒါဟာ တရုတ်ဘာသာစကားလေ့လာရန် ကောင်းသောဝက်ဘ်ဆိုက်ဖြစ်သည်၊ ကျွန်ုပ် မင်းနှင့်မျှဝေပါသည်: {url}`,
            'bn': `এটি চীনা ভাষা শেখার জন্য একটি ভাল ওয়েবসাইট, আমি এটি আপনার সাথে ভাগ করছি: {url}`,
            'default': `这是个学习汉语的好网站，分享给你：{url}`
        };
    }

    /**
     * 获取用户当前语言
     */
    getUserLanguage() {
        return localStorage.getItem('userLanguage') || 'vi';
    }

    /**
     * 生成分享URL
     * @param {Object} currentWord - 当前显示的词汇对象
     * @returns {string} 分享URL
     */
    generateShareUrl(currentWord) {
        let shareUrl = window.location.origin;
        
        if (currentWord && currentWord.chinese_cn) {
            const char = currentWord.chinese_cn || '';
            const lang = this.getUserLanguage();
            
            // 生成公开的、不依赖本地缓存或登录状态的URL
            shareUrl = `${window.location.origin}/card?char=${encodeURIComponent(char)}&lang=${encodeURIComponent(lang)}`;
        }
        
        return shareUrl;
    }

    /**
     * 生成分享文本
     * @param {string} shareUrl - 分享的URL
     * @param {string} userLanguage - 用户语言代码
     * @returns {string} 本地化的分享文本
     */
    generateShareText(shareUrl, userLanguage = null) {
        const lang = userLanguage || this.getUserLanguage();
        const shareTemplate = this.shareTexts[lang] || this.shareTexts['default'];
        
        return shareTemplate.replace('{url}', shareUrl);
    }

    /**
     * 获取本地化文本
     * @param {string} language - 语言代码
     * @returns {Object} 本地化文本对象
     */
    getLocalizedTexts(language) {
        const texts = {
            'vi': {
                shareOptionsTitle: '📤 Chọn cách chia sẻ',
                shareCurrentWord: '📚 Chia sẻ từ vựng hiện tại',
                referralInvite: '🎁 Lời mời giới thiệu',
                cancel: '❌ Hủy',
                shareSuccess: '✅ Chia sẻ thành công!',
                shareFailed: '❌ Chia sẻ thất bại',
                longPressTip: '💡 Mẹo: Nhấn giữ ảnh để lưu vào thư viện',
                share: '📤 Chia sẻ'
            },
            'id': {
                shareOptionsTitle: '📤 Pilih cara berbagi',
                shareCurrentWord: '📚 Bagikan kata saat ini',
                referralInvite: '🎁 Undangan referral',
                cancel: '❌ Batal',
                shareSuccess: '✅ Berhasil dibagikan!',
                shareFailed: '❌ Gagal dibagikan',
                longPressTip: '💡 Tips: Tekan lama gambar untuk menyimpan ke galeri',
                share: '📤 Bagikan'
            },
            'es': {
                shareOptionsTitle: '📤 Elige cómo compartir',
                shareCurrentWord: '📚 Compartir palabra actual',
                referralInvite: '🎁 Invitación de referido',
                cancel: '❌ Cancelar',
                shareSuccess: '¡✅ Compartido con éxito!',
                shareFailed: '❌ Error al compartir',
                longPressTip: '💡 Consejo: Mantén presionada la imagen para guardar en la galería',
                share: '📤 Compartir'
            },
            'de': {
                shareOptionsTitle: '📤 Wählen Sie, wie Sie teilen möchten',
                shareCurrentWord: '📚 Aktuelles Wort teilen',
                referralInvite: '🎁 Referral-Einladung',
                cancel: '❌ Abbrechen',
                shareSuccess: '✅ Erfolgreich geteilt!',
                shareFailed: '❌ Teilen fehlgeschlagen',
                longPressTip: '💡 Tipp: Bild lange drücken, um es in der Galerie zu speichern',
                share: '📤 Teilen'
            },
            'fr': {
                shareOptionsTitle: '📤 Choisissez comment partager',
                shareCurrentWord: '📚 Partager le mot actuel',
                referralInvite: '🎁 Invitation de parrainage',
                cancel: '❌ Annuler',
                shareSuccess: '✅ Partagé avec succès !',
                shareFailed: '❌ Échec du partage',
                longPressTip: '💡 Astuce : Maintenez l\'image appuyée pour l\'enregistrer dans la galerie',
                share: '📤 Partager'
            },
            'ru': {
                shareOptionsTitle: '📤 Выберите способ поделиться',
                shareCurrentWord: '📚 Поделиться текущим словом',
                referralInvite: '🎁 Приглашение реферала',
                cancel: '❌ Отмена',
                shareSuccess: '✅ Успешно поделились!',
                shareFailed: '❌ Ошибка при поделиться',
                longPressTip: '💡 Совет: Нажмите и удерживайте изображение, чтобы сохранить в галерею',
                share: '📤 Поделиться'
            },
            'ko': {
                shareOptionsTitle: '📤 공유 방법 선택',
                shareCurrentWord: '📚 현재 단어 공유',
                referralInvite: '🎁 추천인 초대',
                cancel: '❌ 취소',
                shareSuccess: '✅ 성공적으로 공유되었습니다!',
                shareFailed: '❌ 공유 실패',
                longPressTip: '💡 팁: 이미지를 길게 눌러 갤러리에 저장하세요',
                share: '📤 공유'
            },
            'hi': {
                shareOptionsTitle: '📤 साझा करने का तरीका चुनें',
                shareCurrentWord: '📚 वर्तमान शब्द साझा करें',
                referralInvite: '🎁 रेफरल निमंत्रण',
                cancel: '❌ रद्द करें',
                shareSuccess: '✅ सफलतापूर्वक साझा किया गया!',
                shareFailed: '❌ साझा करने में त्रुटि',
                longPressTip: '💡 सुझाव: गैलरी में सहेजने के लिए छवि को देर तक दबाए रखें',
                share: '📤 साझा करें'
            },
            'th': {
                shareOptionsTitle: '📤 เลือกวิธีแชร์',
                shareCurrentWord: '📚 แชร์คำปัจจุบัน',
                referralInvite: '🎁 เชิญแนะนำเพื่อน',
                cancel: '❌ ยกเลิก',
                shareSuccess: '✅ แชร์สำเร็จ!',
                shareFailed: '❌ แชร์ไม่สำเร็จ',
                longPressTip: '💡 เคล็ดลับ: กดค้างรูปภาพเพื่อบันทึกลงในแกลเลอรี',
                share: '📤 แชร์'
            },
            'my': {
                shareOptionsTitle: '📤 Pilih cara berkongsi',
                shareCurrentWord: '📚 Kongsi perkataan semasa',
                referralInvite: '🎁 Undangan referral',
                cancel: '❌ Batal',
                shareSuccess: '✅ Berjaya dikongsi!',
                shareFailed: '❌ Gagal dikongsi',
                longPressTip: '💡 Tips: Tekan lama gambar untuk simpan dalam galeri',
                share: '📤 Kongsi'
            },
            'km': {
                shareOptionsTitle: '📤 ជ្រើសរើសរបៀបចែករំលែក',
                shareCurrentWord: '📚 ចែករំលែកពាក្យបច្ចុប្បន្ន',
                referralInvite: '🎁 ការអញ្ជើញ referral',
                cancel: '❌ បោះបង់',
                shareSuccess: '✅ ចែករំលែកបានជោគជ័យ!',
                shareFailed: '❌ ចែករំលែកបានបរាជ័យ',
                longPressTip: '💡 គន្លឹះ: ចុចរូបភាពឲ្យយូរដើម្បីរក្សាទុកក្នុងវិចិត្រសារ',
                share: '📤 ចែករំលែក'
            },
            'lo': {
                shareOptionsTitle: '📤 ເລືỈອງເລືỈອງການແບ່ງປັບ',
                shareCurrentWord: '📚 ແບ່ງປັບຖຶ​ດາວດາວນີ້',
                referralInvite: '🎁 ການណែនាំ referral',
                cancel: '❌ ຍกเลิก',
                shareSuccess: '✅ ແບ່ງលັບបានជោគជ័ນ!',
                shareFailed: '❌ ແບ່ງលັບបានបរាជ័យ',
                longPressTip: '💡 គន្លឹះ: ចុចរូបភាពឲ្យយូរដើម្បីរក្សាទុកក្នុងវិចិត្រសារ'
            },
            'mya': {
                shareOptionsTitle: '📤 မျှဝေရန်နည်းလမ်းရွေးပါ',
                shareCurrentWord: '📚 လက်ရှိစကားလုံးမျှဝေပါ',
                referralInvite: '🎁 အကြံပြုသူဖိတ်ကြားခြင်း',
                cancel: '❌ မလုပ်တော့ပါ',
                shareSuccess: '✅ မျှဝေမှုအောင်မြင်ပါသည်!',
                shareFailed: '❌ မျှဝေမှုမအောင်မြင်ပါ',
                longPressTip: '💡 အကြံပြုချက်- ဓာတ်ပုံကို ဓာတ်ပုံပြခန်းတွင်သိမ်းဆည်းရန် ကြာရန်နှိပ်ပါ'
            },
            'bn': {
                shareOptionsTitle: '📤 শেয়ার করার উপায় বেছে নিন',
                shareCurrentWord: '📚 বর্তমান শব্দটি শেয়ার করুন',
                referralInvite: '🎁 রেফারেল আমন্ত্রণ',
                cancel: '❌ বাতিল করুন',
                shareSuccess: '✅ সফলভাবে শেয়ার করা হয়েছে!',
                shareFailed: '❌ শেয়ার করতে ব্যর্থ',
                longPressTip: '💡 টিপস: গ্যালারিতে সেভ করতে ছবিটি দীর্ঘক্ষণ চাপুন'
            },
            'default': {
                shareOptionsTitle: '📤 选择分享方式',
                shareCurrentWord: '📚 分享当前词条',
                referralInvite: '🎁 推荐邀请',
                cancel: '❌ 取消',
                shareSuccess: '✅ 分享成功！',
                shareFailed: '❌ 分享失败',
                longPressTip: '💡 提示：长按图片可保存到相册',
                share: '📤 转发'
            }
        };
        
        return texts[language] || texts['default'];
    }

    /**
     * 创建并显示分享窗口
     * @param {Object} currentWord - 当前显示的词汇对象
     */
    showShareWindow(currentWord) {
        // 生成分享内容
        const shareUrl = this.generateShareUrl(currentWord);
        const userLanguage = this.getUserLanguage();
        const shareText = this.generateShareText(shareUrl, userLanguage);
        
        // 获取当前主题
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        const bgColor = isDarkTheme ? '#2d2d2d' : '#ffffff';
        const textColor = isDarkTheme ? '#ffffff' : '#333333';
        const borderColor = isDarkTheme ? '#404040' : '#e0e0e0';
        const modalBgColor = isDarkTheme ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.8)';
        
        // 创建全屏模态窗口
        const modal = document.createElement('div');
        modal.id = 'share-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: ${modalBgColor};
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: Arial, sans-serif;
        `;
        
        // 创建内容容器
        const contentContainer = document.createElement('div');
        contentContainer.style.cssText = `
            background-color: ${bgColor};
            color: ${textColor};
            border: 1px solid ${borderColor};
            border-radius: 12px;
            padding: 30px;
            max-width: 90%;
            max-height: 90%;
            overflow-y: auto;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;
        
        // 创建分享文本
        const shareTextElement = document.createElement('p');
        shareTextElement.textContent = shareText;
        shareTextElement.style.cssText = `
            font-size: 18px;
            line-height: 1.6;
            margin-bottom: 30px;
            color: ${textColor};
            word-break: break-word;
        `;
        
        // 创建确定按钮
        const confirmButton = document.createElement('button');
        confirmButton.textContent = '确定';
        confirmButton.style.cssText = `
            padding: 12px 30px;
            font-size: 16px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.3s;
            min-width: 120px;
        `;
        
        // 添加按钮悬停效果
        confirmButton.addEventListener('mouseenter', () => {
            confirmButton.style.backgroundColor = '#45a049';
        });
        confirmButton.addEventListener('mouseleave', () => {
            confirmButton.style.backgroundColor = '#4CAF50';
        });
        
        // 添加按钮点击事件
        confirmButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // 组装组件
        contentContainer.appendChild(shareTextElement);
        contentContainer.appendChild(confirmButton);
        modal.appendChild(contentContainer);
        
        // 添加到页面
        document.body.appendChild(modal);
    }

    /**
     * 创建预设样式的分享图片
     * @param {Object} currentWord - 当前显示的词汇对象
     * @returns {Promise<HTMLCanvasElement>} 生成的画布
     */
    async createShareCardImage(currentWord) {
        const userLanguage = this.getUserLanguage();
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        
        // 预设样式配置
        const config = {
            width: 600,
            height: 400,
            padding: 40,
            bgColor: isDarkTheme ? '#1a1a2e' : '#f8f9fa',
            cardBgColor: isDarkTheme ? '#16213e' : '#ffffff',
            accentColor: '#667eea',
            textColor: isDarkTheme ? '#ffffff' : '#333333',
            secondaryTextColor: isDarkTheme ? '#a0aec0' : '#666666'
        };
        
        // 创建画布
        const canvas = document.createElement('canvas');
        canvas.width = config.width;
        canvas.height = config.height;
        const ctx = canvas.getContext('2d');
        
        // 绘制背景
        ctx.fillStyle = config.bgColor;
        ctx.fillRect(0, 0, config.width, config.height);
        
        // 绘制装饰性渐变
        const gradient = ctx.createLinearGradient(0, 0, config.width, config.height);
        gradient.addColorStop(0, 'rgba(102, 126, 234, 0.1)');
        gradient.addColorStop(1, 'rgba(118, 75, 162, 0.1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, config.width, config.height);
        
        // 绘制卡片背景
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 10;
        ctx.fillStyle = config.cardBgColor;
        this.roundRect(ctx, config.padding, config.padding, config.width - config.padding * 2, config.height - config.padding * 2, 16);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        
        // 绘制标题
        ctx.fillStyle = config.secondaryTextColor;
        ctx.font = '16px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('学中文 | Learn Chinese', config.width / 2, config.padding + 40);
        
        // 绘制拼音（紧贴中文字上方，与每个汉字一一对应）
        // 将拼音按空格分割成音节，每个音节对应一个汉字
        const pinyinText = currentWord.pinyin || 'hǎo hǎo';
        const pinyinSyllables = pinyinText.split(' ').filter(s => s.length > 0);
        const chineseText = currentWord.chinese_cn || '好好';
        const charCount = chineseText.length;
        
        ctx.fillStyle = config.textColor;
        ctx.font = '28px "Courier New", Arial, sans-serif';
        ctx.textAlign = 'center';
        
        // 计算每个音节的宽度和位置
        const charSpacing = 60; // 字符间距
        const totalWidth = charCount * charSpacing;
        const startX = (config.width - totalWidth) / 2 + charSpacing / 2;
        
        // 绘制每个音节，对应到每个汉字上方（增加行距）
        pinyinSyllables.forEach((syllable, index) => {
            if (index < charCount) {
                const x = startX + index * charSpacing;
                ctx.fillText(syllable, x, config.height / 2 - 55);
            }
        });
        
        // 绘制中文字
        ctx.fillStyle = config.textColor;
        ctx.font = 'bold 72px "AR PL UKai", "Noto Sans CJK SC", sans-serif';
        ctx.fillText(chineseText, config.width / 2, config.height / 2 + 15);
        
        // 绘制翻译
        ctx.fillStyle = config.secondaryTextColor;
        ctx.font = '18px Arial, sans-serif';
        
        // 语言代码映射到数据库字段
        const langToField = {
            'vi': 'vietnamese_vn',
            'id': 'indonesian_id',
            'es': 'spanish_es',
            'de': 'german_de',
            'fr': 'french_fr',
            'ru': 'russian_ru',
            'ko': 'korean_kr',
            'hi': 'hindi_hi',
            'th': 'thai_th',
            'my': 'malay_my',
            'km': 'khmer_km',
            'lo': 'lao_lo',
            'mya': 'burmese_mya',
            'bn': 'bengali_bn',
            'default': 'english_en'
        };
        
        // 获取用户语言对应的翻译
        let nativeTranslation = '';
        const nativeField = langToField[userLanguage] || langToField['default'];
        if (currentWord[nativeField]) {
            nativeTranslation = currentWord[nativeField];
        }
        
        // 获取英文翻译（如果有）
        let englishTranslation = '';
        if (currentWord.english_en) {
            englishTranslation = currentWord.english_en;
        }
        
        // 绘制母语翻译
        if (nativeTranslation) {
            ctx.fillText(nativeTranslation, config.width / 2, config.height / 2 + 75);
        }
        
        // 绘制英文翻译（如果有）- 使用斜体和强调色
        if (englishTranslation) {
            ctx.fillStyle = config.accentColor;
            ctx.font = 'italic 16px Arial, sans-serif';
            ctx.fillText(englishTranslation, config.width / 2, config.height / 2 + 105);
        }
        
        // 绘制网站域名（在底部）
        ctx.fillStyle = config.secondaryTextColor;
        ctx.font = '14px Arial, sans-serif';
        ctx.fillText(window.location.host, config.width / 2, config.height - config.padding + 15);
        
        return canvas;
    }
    
    
    /**
     * 字符串哈希函数（保留供其他功能使用）
     */
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    
    /**
     * 分享预设样式图片
     * @param {Object} currentWord - 当前显示的词汇对象
     */
    async shareDesignedCard(currentWord) {
        try {
            console.log('开始生成分享卡片...');
            console.log('currentWord:', currentWord ? currentWord.chinese_cn : 'undefined');
            
            // 生成预设样式图片
            const canvas = await this.createShareCardImage(currentWord);
            console.log('卡片生成成功，canvas尺寸:', canvas.width, 'x', canvas.height);
            
            // 直接显示图片模态框，简化流程
            console.log('显示图片模态框...');
            const dataUrl = canvas.toDataURL('image/png');
            console.log('dataUrl长度:', dataUrl.length);
            this.showImageInModal(dataUrl, currentWord);
            
            // 尝试复制到剪贴板
            canvas.toBlob(async (blob) => {
                if (blob) {
                    console.log('Blob创建成功，大小:', blob.size);
                    try {
                        if (typeof ClipboardItem !== 'undefined') {
                            const clipboardItem = new ClipboardItem({ 'image/png': blob });
                            await navigator.clipboard.write([clipboardItem]);
                            console.log('✓ 图片复制到剪贴板成功');
                            this.showToast('图片已复制到剪贴板！');
                        }
                    } catch (e) {
                        console.log('剪贴板复制失败:', e.message);
                    }
                }
            }, 'image/png');
            
            this.recordShare();
            return { success: true, method: 'modal' };
            
        } catch (error) {
            console.error('分享卡片失败:', error);
            // 发生错误时回退到文本分享
            await this.shareAsText(currentWord);
        }
    }
    
    /**
     * 在模态框中显示图片
     * @param {string} dataUrl - 图片的data URL
     * @param {Object} currentWord - 当前词条对象（用于复制文本时使用）
     */
    showImageInModal(dataUrl, currentWord = null) {
        // 保存this引用，用于事件处理器
        const self = this;
        
        const userLanguage = this.getUserLanguage();
        const texts = this.getLocalizedTexts(userLanguage);
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        const bgColor = isDarkTheme ? '#2d2d2d' : '#ffffff';
        const textColor = isDarkTheme ? '#ffffff' : '#333333';
        const modalBgColor = isDarkTheme ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.8)';
        
        // 创建模态框
        const modal = document.createElement('div');
        modal.id = 'image-preview-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: ${modalBgColor};
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
            background-color: ${bgColor};
            color: ${textColor};
            border-radius: 16px;
            padding: 20px;
            max-width: 90%;
            max-height: 90%;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            align-items: center;
        `;
        
        // 创建图片元素
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.cssText = `
            max-width: 100%;
            max-height: 60vh;
            border-radius: 8px;
            margin-bottom: 15px;
        `;
        
        // 创建提示文本（移动端长按保存）
        const tipText = document.createElement('div');
        tipText.textContent = texts.longPressTip || '💡 提示：长按图片可保存到相册';
        tipText.style.cssText = `
            font-size: 12px;
            color: ${isDarkTheme ? '#aaaaaa' : '#888888'};
            margin-bottom: 15px;
        `;
        
        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = texts.share || '转发';
        closeButton.style.cssText = `
            padding: 10px 30px;
            font-size: 16px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            display: block;
            margin: 15px auto 0 auto;
        `;
        
        // 关闭按钮功能：复制图片到剪贴板并调用原生分享
        closeButton.addEventListener('click', async () => {
            // 保存dataUrl到闭包变量，确保在复制时可用
            const urlToCopy = dataUrl;
            
            try {
                console.log('开始处理图片...');
                console.log('dataUrl是否存在:', !!urlToCopy);
                
                // 将dataUrl转换为blob（使用base64解码）
                if (urlToCopy && urlToCopy.includes(',')) {
                    const base64Data = urlToCopy.split(',')[1];
                    const binaryData = atob(base64Data);
                    const bytes = new Uint8Array(binaryData.length);
                    for (let i = 0; i < binaryData.length; i++) {
                        bytes[i] = binaryData.charCodeAt(i);
                    }
                    const blob = new Blob([bytes], { type: 'image/png' });
                    console.log('Blob创建成功，大小:', blob.size);
                    
                    const file = new File([blob], 'chinese-word-card.png', { type: 'image/png' });
                    const chineseWord = currentWord?.chinese_cn || '好好学中文';
                    
                    // 检测是否为移动设备
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    
                    // 优先尝试：如果是移动设备，直接弹出分享菜单
                    if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                        try {
                            await navigator.share({
                                title: '学中文',
                                text: `学习中文：${chineseWord}`,
                                files: [file]
                            });
                            document.body.removeChild(modal);
                            return;
                        } catch (shareErr) {
                            if (shareErr.name !== 'AbortError') {
                                console.log('移动端分享失败:', shareErr.message);
                            }
                        }
                    }
                    
                    // 移动端：尝试原生分享（不带文件）
                    if (isMobile && navigator.share) {
                        try {
                            await navigator.share({
                                title: '学中文',
                                text: `学习中文：${chineseWord} - ${window.location.href}`
                            });
                            document.body.removeChild(modal);
                            return;
                        } catch (shareErr) {
                            if (shareErr.name !== 'AbortError') {
                                console.log('移动端分享失败:', shareErr.message);
                            }
                        }
                    }
                    
                    // 非移动端或移动端不支持分享：尝试复制图片到剪贴板
                    let copiedImage = false;
                    if (typeof ClipboardItem !== 'undefined') {
                        try {
                            const clipboardItem = new ClipboardItem({ 'image/png': blob });
                            await navigator.clipboard.write([clipboardItem]);
                            console.log('✓ 图片复制到剪贴板成功');
                            self.showToast('图片已复制到剪贴板！');
                            copiedImage = true;
                        } catch (clipErr) {
                            console.log('剪贴板复制图片失败:', clipErr.message);
                        }
                    }
                    
                    // 如果图片复制失败，尝试复制文本链接
                    if (!copiedImage) {
                        try {
                            await navigator.clipboard.writeText(`学习中文：${chineseWord} - ${window.location.href}`);
                            self.showToast('链接已复制');
                        } catch (textErr) {
                            console.log('剪贴板复制文本失败:', textErr.message);
                        }
                    }
                    
                    // 尝试调用原生分享API（作为备选，非移动设备）
                    if (!isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                        try {
                            await navigator.share({
                                title: '学中文',
                                text: `学习中文：${chineseWord}`,
                                files: [file]
                            });
                        } catch (shareErr) {
                            if (shareErr.name !== 'AbortError') {
                                console.log('原生分享失败:', shareErr.message);
                            }
                        }
                    }
                } else {
                    console.log('dataUrl无效');
                    // 回退：复制文本链接
                    const chineseWord = currentWord?.chinese_cn || '好好学中文';
                    try {
                        await navigator.clipboard.writeText(`学习中文：${chineseWord} - ${window.location.href}`);
                        self.showToast('链接已复制');
                    } catch (e) {
                        console.log('复制失败:', e.message);
                    }
                }
            } catch (error) {
                console.error('处理失败:', error.message);
            }
            
            // 关闭模态框
            document.body.removeChild(modal);
        });
        
        // 点击外部关闭（仅关闭，不执行复制分享）
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        contentContainer.appendChild(img);
        contentContainer.appendChild(tipText);
        contentContainer.appendChild(closeButton);
        modal.appendChild(contentContainer);
        document.body.appendChild(modal);
    }
    
    /**
     * 辅助函数：绘制圆角矩形
     */
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
    
    /**
     * 显示Toast提示
     * @param {string} message - 提示消息
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #333;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            z-index: 10000;
            animation: fadeInOut 2s ease-in-out;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 2000);
    }
    
    /**
     * 截屏并分享当前词条
     * @param {Object} currentWord - 当前显示的词汇对象
     */
    async shareCurrentWordAsImage(currentWord) {
        // 使用预设样式图片分享（替代截屏）
        await this.shareDesignedCard(currentWord);
    }
    
    /**
     * 文本分享（回退方案）
     */
    async shareAsText(currentWord) {
        const shareUrl = this.generateShareUrl(currentWord);
        const userLanguage = this.getUserLanguage();
        const shareText = this.generateShareText(shareUrl, userLanguage);
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: '一起学中文！',
                    text: shareText,
                    url: shareUrl
                });
                this.recordShare();
                return { success: true };
            } catch (err) {
                // 用户取消分享
                return { success: false, cancelled: true };
            }
        } else {
            // 复制到剪贴板
            try {
                await navigator.clipboard.writeText(shareText);
                this.recordShare();
                return { success: true, copied: true };
            } catch (err) {
                // 复制失败，显示分享窗口
                this.showShareWindow(currentWord);
                return { success: true, fallback: true };
            }
        }
    }

    /**
     * 显示分享选择菜单
     * @param {Object} currentWord - 当前显示的词汇对象
     */
    showShareOptions(currentWord) {
        // 保存this引用，用于事件处理器
        const self = this;
        
        const userLanguage = this.getUserLanguage();
        const texts = this.getLocalizedTexts(userLanguage);
        
        // 获取当前主题
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        const bgColor = isDarkTheme ? '#2d2d2d' : '#ffffff';
        const textColor = isDarkTheme ? '#ffffff' : '#333333';
        const borderColor = isDarkTheme ? '#404040' : '#e0e0e0';
        const modalBgColor = isDarkTheme ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.8)';
        
        // 创建分享选择模态框
        const modal = document.createElement('div');
        modal.id = 'share-options-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: ${modalBgColor};
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: Arial, sans-serif;
        `;
        
        // 创建内容容器
        const contentContainer = document.createElement('div');
        contentContainer.style.cssText = `
            background-color: ${bgColor};
            color: ${textColor};
            border: 1px solid ${borderColor};
            border-radius: 16px;
            padding: 40px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        `;
        
        // 创建标题
        const title = document.createElement('h2');
        title.textContent = texts.shareOptionsTitle;
        title.style.cssText = `
            margin: 0 0 30px 0;
            color: ${textColor};
            font-size: 24px;
        `;
        
        // 创建分享词条按钮
        const shareWordButton = document.createElement('button');
        shareWordButton.innerHTML = texts.shareCurrentWord;
        shareWordButton.style.cssText = `
            width: 100%;
            padding: 15px 20px;
            font-size: 16px;
            background-color: #2196F3;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 15px;
        `;
        
        // 创建推荐邀请按钮
        const referralButton = document.createElement('button');
        referralButton.innerHTML = texts.referralInvite;
        referralButton.style.cssText = `
            width: 100%;
            padding: 15px 20px;
            font-size: 16px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 25px;
        `;
        
        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = texts.cancel;
        closeButton.style.cssText = `
            width: 100%;
            padding: 10px 20px;
            font-size: 14px;
            background-color: #9E9E9E;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s;
        `;
        
        // 添加按钮悬停效果
        const addHoverEffect = (button, hoverColor) => {
            button.addEventListener('mouseenter', () => {
                button.style.backgroundColor = hoverColor;
            });
            button.addEventListener('mouseleave', () => {
                if (button === shareWordButton) {
                    button.style.backgroundColor = '#2196F3';
                } else if (button === referralButton) {
                    button.style.backgroundColor = '#4CAF50';
                } else {
                    button.style.backgroundColor = '#9E9E9E';
                }
            });
        };
        
        addHoverEffect(shareWordButton, '#1976D2');
        addHoverEffect(referralButton, '#45a049');
        addHoverEffect(closeButton, '#757575');
        
        // 分享词条功能
        shareWordButton.addEventListener('click', async () => {
            // 移除选择菜单
            document.body.removeChild(modal);
            // 截屏并分享
            await self.shareCurrentWordAsImage(currentWord);
        });
        
        // 推荐邀请功能
        referralButton.addEventListener('click', () => {
            // 移除选择菜单
            document.body.removeChild(modal);
            // 显示推荐码
            this.referralManager.showReferralModal();
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
        contentContainer.appendChild(title);
        contentContainer.appendChild(shareWordButton);
        contentContainer.appendChild(referralButton);
        contentContainer.appendChild(closeButton);
        modal.appendChild(contentContainer);
        
        // 添加到页面
        document.body.appendChild(modal);
    }

    /**
     * 主分享方法 - 显示选择菜单
     * @param {Object} currentWord - 当前显示的词汇对象
     * @param {Function} showToast - 显示Toast提示的回调函数
     * @returns {Promise<Object>}
     */
    async share(currentWord, showToast = null) {
        // 处理referral链接访问
        this.referralManager.handleReferralVisit();
        
        // 显示选择菜单
        this.showShareOptions(currentWord);
        
        // 返回成功结果
        return {
            success: true,
            message: 'Share options displayed'
        };
    }
    
    /**
     * 记录分享次数
     */
    recordShare() {
        const shareKey = 'totalShares';
        const count = parseInt(localStorage.getItem(shareKey) || '0') + 1;
        localStorage.setItem(shareKey, count.toString());
    }
    
    /**
     * 获取分享统计
     */
    getShareStats() {
        return {
            totalShares: parseInt(localStorage.getItem('totalShares') || '0'),
            referralShares: this.referralManager.getShareCount(),
            referralViews: this.referralManager.getReferralViews()
        };
    }
}

// 导出模块
export default ShareManager;
