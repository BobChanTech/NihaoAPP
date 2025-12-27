// Service Worker - 纯Cache-First缓存策略版本
// 处理资源缓存和离线功能
// 缓存策略：优先使用缓存，缓存不存在时才从网络获取
// 这种策略可以最大化离线可用性和加载速度

// 获取部署路径前缀（如 /NihaoAPP/ 或 /）
const SCOPE_PATH = self.location.pathname.replace(/\/[^/]*$/, '') || '';

// 统一版本号：应用版本与缓存版本保持一致
const APP_VERSION = '1.0.4';
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

// 拦截网络请求 - 纯Cache-First策略
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
    
    // 使用纯Cache-First策略
    event.respondWith(cacheFirstStrategy(event.request));
});

/**
 * 纯Cache-First策略
 * 1. 优先检查缓存是否存在
 * 2. 如果缓存存在，直接返回缓存
 * 3. 如果缓存不存在，从网络获取
 * 4. 将网络响应缓存起来（如果成功）
 * 5. 如果网络也失败，返回离线兜底响应
 */
async function cacheFirstStrategy(request) {
    try {
        // 1. 首先检查缓存
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            console.log('缓存命中:', request.url);
            return cachedResponse;
        }
        
        console.log('缓存未命中，从网络获取:', request.url);
        
        // 2. 缓存不存在，从网络获取
        const networkResponse = await fetch(request);
        
        // 3. 只有成功响应才缓存
        if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, responseToCache);
            console.log('已缓存:', request.url);
        }
        
        return networkResponse;
        
    } catch (error) {
        console.error('获取失败:', request.url, error);
        
        // 4. 网络失败，返回离线兜底
        return new Response('离线 - 请检查网络连接', { 
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
            const serverVersion = versionInfo.version || '1.0.4';
            
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
