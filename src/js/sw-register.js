// Service Worker 注册器
// 功能：注册并管理 Service Worker

if ('serviceWorker' in navigator) {
    console.log('页面: 开始注册Service Worker');

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker 注册成功:', registration.scope);

                // 监听Service Worker更新
                registration.addEventListener('updatefound', () => {
                    console.log('页面: 发现Service Worker更新');
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            console.log('页面: Service Worker状态变化:', newWorker.state);
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('页面: Service Worker更新完成，刷新页面');
                                window.location.reload();
                            }
                        });
                    }
                });
            })
            .catch(error => {
                console.error('Service Worker 注册失败:', error);
            });
    });
}
