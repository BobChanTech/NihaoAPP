// Service Worker - 纯Cache-First缓存策略版本
// 处理资源缓存和离线功能
// 缓存策略：优先使用缓存，缓存不存在时才从网络获取
// 这种策略可以最大化离线可用性和加载速度

// 获取部署路径前缀（如 /NihaoAPP/ 或 /）
const SCOPE_PATH = self.location.pathname.replace(/\/[^/]*$/, '') || '';

// 统一版本号：应用版本与缓存版本保持一致
const APP_VERSION = '1.0.5';
const CACHE_NAME = `chinese-vocab-${APP_VERSION}`;

// 缓存列表（使用相对路径，自动适配部署路径）
const urlsToCache = [
    './',
    './index.html',
    './src/css/style.css',
    './src/data/manifest.json',
    './src/data/languages.json',
    // JavaScript files
    './src/js/app.js',
    './src/js/font-loader.js',
    './src/js/idb.js',
    './src/js/language.js',
    './src/js/payment.js',
    './src/js/sw-register.js',
    './src/js/theme.js',
    './src/js/vocab-db.js',
    // Manager files
    './src/js/managers/favorites-manager.js',
    './src/js/managers/search-manager.js',
    './src/js/managers/share-manager.js',
    './src/js/managers/speech-manager.js',
    './src/js/managers/stroke-manager.js'
];

// 安装事件
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('打开缓存:', CACHE_NAME);
                // 添加所有资源到缓存
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                // 安装完成后立即激活，不等待页面关闭
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('缓存安装失败:', error);
                // 即使部分资源缓存失败也继续
                return self.skipWaiting();
            })
    );
});

// 激活事件：清理旧版本缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // 删除不属于当前版本的缓存
                    if (cacheName !== CACHE_NAME && cacheName.startsWith('chinese-vocab-')) {
                        console.log('删除旧缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // 立即控制所有页面
            return self.clients.claim();
        })
    );
});

// 拦截网络请求 - 混合缓存策略
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // 只处理GET请求
    if (event.request.method !== 'GET') {
        return;
    }
    
    // 对于跨域请求，直接转发不做处理
    if (url.origin !== location.origin) {
        return;
    }
    
    // 数据库文件使用 NetworkFirst（确保数据最新）
    if (url.pathname.includes('databasemain.json') || url.pathname.includes('version.json')) {
        event.respondWith(networkFirstStrategy(event.request));
        return;
    }
    
    // 其他文件使用 CacheFirst（代码、CSS等静态资源）
    event.respondWith(cacheFirstStrategy(event.request));
});

/**
 * 纯Cache-First策略（适用于代码文件）
 * 优先使用缓存，最大化离线可用性和加载速度
 */
async function cacheFirstStrategy(request) {
    try {
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, responseToCache);
        }
        
        return networkResponse;
        
    } catch (error) {
        return new Response('离线 - 请检查网络连接', { 
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain; charset=utf-8'
            })
        });
    }
}

/**
 * NetworkFirst策略（适用于数据库文件）
 * 始终先检查网络，网络不好时用缓存
 * 适合东南亚/拉美等网络不稳定地区
 */
async function networkFirstStrategy(request) {
    try {
        // 1. 先尝试网络请求
        const networkResponse = await fetch(request);
        
        // 2. 网络成功，缓存并返回
        if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, responseToCache);
            console.log('网络获取成功，已缓存:', request.url);
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('网络请求失败，使用缓存:', request.url);
        
        // 3. 网络失败，使用缓存
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            console.log('使用缓存数据:', request.url);
            return cachedResponse;
        }
        
        // 4. 连缓存都没有，返回离线提示
        console.log('缓存也没有:', request.url);
        return new Response('离线 - 无法加载数据', { 
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain; charset=utf-8'
            })
        });
    }
}

// 消息事件（用于强制更新）
self.addEventListener('message', event => {
    if (event.data) {
        switch (event.data.type) {
            case 'SKIP_WAITING':
                // 立即激活等待中的Service Worker
                self.skipWaiting();
                break;
            case 'CHECK_UPDATE':
                // 收到版本检查请求，检查是否有更新
                checkForUpdates();
                break;
            case 'CLEAR_DATABASE_CACHE':
                // 清除数据库缓存
                clearDatabaseCache();
                break;
            case 'RESET_UPDATE_FLAG':
                // 重置更新标志
                resetUpdateFlag();
                break;
        }
    }
});

/**
 * 检查版本更新
 */
async function checkForUpdates() {
    try {
        const response = await fetch('./src/data/version.json');
        if (response.ok) {
            const versionInfo = await response.json();
            const serverVersion = versionInfo.version || '1.0.5';
            
            // 比较版本
            const currentVersion = APP_VERSION;
            if (serverVersion !== currentVersion) {
                console.log('发现新版本:', serverVersion);
                
                // 通知客户端有新版本
                const clients = await self.clients.matchAll();
                clients.forEach(client => {
                    client.postMessage({
                        type: 'UPDATE_AVAILABLE',
                        newVersion: serverVersion,
                        updateInfo: versionInfo
                    });
                });
            }
        }
    } catch (error) {
        console.error('检查更新失败:', error);
    }
}

/**
 * 清除数据库缓存
 */
async function clearDatabaseCache() {
    try {
        // 清除所有以 chinese-vocab- 开头的缓存
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames
                .filter(name => name.startsWith('chinese-vocab-'))
                .map(name => caches.delete(name))
        );
        console.log('数据库缓存已清除');
    } catch (error) {
        console.error('清除缓存失败:', error);
    }
}

/**
 * 重置更新标志
 */
function resetUpdateFlag() {
    // 预留用于重置任何更新相关的状态
    console.log('更新标志已重置');
}
