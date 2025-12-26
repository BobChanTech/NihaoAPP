// Service Worker - 强制JavaScript重新获取版本
// 处理资源缓存和离线功能

const CACHE_NAME = 'chinese-vocab-v1.0.16';
const urlsToCache = [
    '/',
    '/index.html',
    '/src/css/style.css',
    '/src/data/manifest.json',
    '/src/data/languages.json',
    // JavaScript files
    '/src/js/app.js',
    '/src/js/font-loader.js',
    '/src/js/idb.js',
    '/src/js/language.js',
    '/src/js/payment.js',
    '/src/js/sw-register.js',
    '/src/js/theme.js',
    '/src/js/vocab-db.js',
    // Manager files
    '/src/js/managers/favorites-manager.js',
    '/src/js/managers/search-manager.js',
    '/src/js/managers/share-manager.js',
    '/src/js/managers/speech-manager.js',
    '/src/js/managers/stroke-manager.js'
];

// 安装事件
self.addEventListener('install', event => {
    console.log('Service Worker: 开始安装');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: 开始缓存资源');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service Worker: 缓存完成，跳过等待');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: 缓存失败:', error);
            })
    );
});

// 激活事件
self.addEventListener('activate', event => {
    console.log('Service Worker: 开始激活');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: 删除旧缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: 激活完成');
            return self.clients.claim();
        })
    );
});

// 拦截网络请求
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    console.log('Service Worker: 拦截请求:', event.request.method, url.pathname);
    
    // 只处理GET请求
    if (event.request.method !== 'GET') {
        return;
    }
    
    // 强制重新获取JavaScript文件（跳过缓存）
    if (url.pathname.endsWith('.js') && url.pathname.includes('/src/js/')) {
        console.log('Service Worker: 跳过缓存，重新获取:', url.pathname);
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (response && response.status === 200) {
                        // 缓存新的JavaScript文件
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    }
                    return response;
                })
                .catch(error => {
                    console.error('Service Worker: 网络获取失败:', error);
                    // 如果网络失败，返回缓存的版本
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    // 对于非JavaScript文件，使用缓存优先策略
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 如果缓存中有响应，直接返回
                if (response) {
                    console.log('Service Worker: 缓存命中:', url.pathname);
                    return response;
                }
                
                // 否则从网络获取
                console.log('Service Worker: 网络获取:', url.pathname);
                return fetch(event.request)
                    .then(response => {
                        // 检查响应是否有效
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // 克隆响应（重要！）
                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                console.log('Service Worker: 缓存新资源:', url.pathname);
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(error => {
                        console.error('Service Worker: 网络获取失败:', error);
                        // 可以返回离线页面或其他处理
                        return new Response('离线状态，请检查网络连接', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// 消息事件（用于强制更新）
self.addEventListener('message', event => {
    console.log('Service Worker: 收到消息:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('Service Worker: 强制更新');
        self.skipWaiting();
    }
});