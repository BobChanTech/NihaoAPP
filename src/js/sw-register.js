// Service Worker 注册器 - 静默升级版
// 功能：后台静默注册和更新，无需用户确认
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
        .then(registration => {
            console.log('Service Worker 注册成功:', registration.scope);

            // 监听Service Worker更新
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Service Worker 更新完成，后台静默激活
                            console.log('Service Worker 已更新，自动激活中...');
                            // 立即激活新的 Service Worker
                            registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                }
            });

            // 监听Service Worker消息（仅用于日志记录，不显示UI）
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'VERSION_CHECK_REQUEST') {
                    if (registration.active) {
                        registration.active.postMessage({ type: 'CHECK_UPDATE' });
                    }
                }

                if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
                    // 静默处理更新，不显示弹窗
                    const newVersion = event.data.newVersion;
                    console.log('发现新版本:', newVersion, '后台静默更新中...');
                    
                    // 立即执行静默更新
                    performSilentUpdate(registration);
                }
            });

            // 发送初始版本检查请求
            if (registration.active) {
                registration.active.postMessage({ type: 'CHECK_UPDATE' });
            }

        })
        .catch(error => {
            console.error('Service Worker 注册失败:', error);
        });
    });
}

/**
 * 静默执行更新（无弹窗，后台自动完成）
 */
async function performSilentUpdate(registration) {
    try {
        console.log('开始静默更新...');

        // 清除本地存储中的缓存标记
        localStorage.removeItem('vocab_last_update');
        localStorage.removeItem('vocab_data_version');
        localStorage.removeItem('vocab_fallback_data');

        // 清除IndexedDB
        if (window.indexedDB && window.indexedDB.databases) {
            try {
                const databases = await window.indexedDB.databases();
                await Promise.all(databases.map(db => {
                    if (db.name) {
                        return window.indexedDB.deleteDatabase(db.name);
                    }
                }));
            } catch (error) {
                console.warn('清除IndexedDB失败:', error);
            }
        }

        // 发送清除缓存请求到Service Worker
        if (registration && registration.active) {
            registration.active.postMessage({ type: 'CLEAR_DATABASE_CACHE' });
        }

        // 通知Service Worker跳过等待并激活
        if (registration && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            
            // 等待Service Worker激活
            await new Promise((resolve) => {
                navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
            });
        }

        console.log('静默更新完成，页面即将刷新...');

        // 延迟刷新页面以确保所有清理完成
        setTimeout(() => {
            window.location.reload();
        }, 1000);

    } catch (error) {
        console.error('静默更新过程中发生错误:', error);
        // 即使出错也尝试刷新页面
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }
}

// 页面可见性变化时检查更新（后台静默进行）
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
    }
});

// 页面卸载前重置更新标志
window.addEventListener('beforeunload', () => {
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'RESET_UPDATE_FLAG' });
    }
});
