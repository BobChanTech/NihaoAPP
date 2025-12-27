/**
 * Service Worker - 智能分层缓存策略
 * 
 * 缓存策略说明:
 * - network-first: 首次访问或版本变化时强制网络获取
 * - stale-while-revalidate: 优先使用缓存，后台静默更新
 * - cache-first-network: 优先缓存，定期与网络同步
 * - cache-first: 静态资源，长期缓存
 */

(function() {
    'use strict';

    // ==================== 配置管理 ====================
    const CONFIG = {
        // 缓存版本
        cacheVersion: 'chinese-vocab-v1.0.19',
        
        // 网络超时时间（毫秒）
        networkTimeout: 5000,
        
        // 版本检查间隔（毫秒）
        versionCheckInterval: 3600000, // 1小时
        
        // 是否在首次强制检查更新
        forceUpdateOnFirstVisit: true
    };

    // ==================== 路径处理 ====================
    function getScopePath() {
        const pathname = self.location.pathname;
        return pathname.replace(/\/[^\/]*$/, '') || '/';
    }

    const SCOPE_PATH = getScopePath();

    function buildUrl(relativePath) {
        if (SCOPE_PATH === '/' || SCOPE_PATH === '') {
            return relativePath.startsWith('./') ? relativePath.substring(1) || '/' : relativePath;
        }
        const path = relativePath.startsWith('./') ? relativePath.substring(1) : relativePath;
        return SCOPE_PATH + path;
    }

    function getRelativePath(url) {
        const urlObj = new URL(url, self.location.href);
        return urlObj.pathname;
    }

    // ==================== 版本管理 ====================
    const VersionManager = {
        versionData: null,
        lastCheckTime: 0,
        isFirstVisit: true,

        /**
         * 获取版本数据
         */
        async getVersionData() {
            const now = Date.now();
            
            // 首次访问强制检查更新
            if (this.isFirstVisit && CONFIG.forceUpdateOnFirstVisit) {
                this.isFirstVisit = false;
                return this.fetchVersionData();
            }
            
            // 非首次访问，如果缓存未过期则使用缓存
            if (this.versionData && (now - this.lastCheckTime) < CONFIG.versionCheckInterval) {
                return this.versionData;
            }
            
            return this.fetchVersionData();
        },

        /**
         * 获取版本数据（强制网络请求）
         */
        async fetchVersionData() {
            try {
                const response = await fetch(buildUrl('./src/data/version.json'), {
                    cache: 'no-store',
                    signal: AbortSignal.timeout(CONFIG.networkTimeout)
                });
                
                if (response.ok) {
                    const newData = await response.json();
                    
                    this.versionData = newData;
                    this.lastCheckTime = Date.now();
                    return this.versionData;
                }
            } catch (error) {
                // 静默失败
            }
            
            return this.versionData;
        },

        /**
         * 获取资源的更新策略
         */
        getUpdateStrategy(urlPath) {
            if (!this.versionData?.assets) {
                return 'stale-while-revalidate'; // 默认策略：优先缓存
            }

            for (const [category, data] of Object.entries(this.versionData.assets)) {
                const files = data.files || [];
                const fileInfo = files.find(f => f.path === urlPath || urlPath.endsWith(f.path));
                if (fileInfo) {
                    return data.updateStrategy || 'stale-while-revalidate';
                }
            }
            
            return 'stale-while-revalidate'; // 默认策略：优先缓存
        },

        /**
         * 获取缓存名称
         */
        getCacheName() {
            if (this.versionData?.mappings?.cache_version) {
                return this.versionData.mappings.cache_version;
            }
            return CONFIG.cacheVersion;
        },

        /**
         * 重置首次访问标记（用于测试）
         */
        resetFirstVisit() {
            this.isFirstVisit = true;
        }
    };

    // ==================== 缓存策略实现 ====================
    const CacheStrategies = {
        /**
         * 网络优先策略 (Network-First)
         * 适用于: 需要立即获取最新版本的资源
         * 行为: 先尝试网络，成功后更新缓存；失败回退缓存
         */
        async networkFirst(request) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), CONFIG.networkTimeout);

                const response = await fetch(request, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (response.ok) {
                    const cache = await caches.open(VersionManager.getCacheName());
                    cache.put(request, response.clone());
                    return response;
                }
                
                throw new Error('网络响应异常');
            } catch (error) {
                const cachedResponse = await caches.match(request);
                return cachedResponse || new Response('', { status: 503 });
            }
        },

        /**
         * Stale-While-Revalidate 策略（优化版）
         * 适用于: 大多数资源
         * 行为: 立即返回缓存，后台静默更新
         * 特点: 在线时始终优先使用缓存，只有首次或版本变化时才强制更新
         */
        async staleWhileRevalidate(request) {
            const cache = await caches.open(VersionManager.getCacheName());
            const cachedResponse = await cache.match(request);

            // 后台静默更新缓存
            const updatePromise = (async () => {
                try {
                    const response = await fetch(request, {
                        signal: AbortSignal.timeout(CONFIG.networkTimeout)
                    });
                    
                    if (response.ok) {
                        // 静默更新缓存
                        cache.put(request, response.clone());
                    }
                } catch (error) {
                    // 网络失败，静默忽略（使用缓存即可）
                }
            })();

            // 立即返回缓存，后台静默更新
            if (cachedResponse) {
                return cachedResponse;
            }

            // 没有缓存，等待网络响应
            return updatePromise;
        },

        /**
         * 缓存优先网络同步策略 (Cache-First with Network)
         * 适用于: 数据文件
         * 行为: 优先使用缓存，后台定期同步
         */
        async cacheFirstNetwork(request) {
            const cache = await caches.open(VersionManager.getCacheName());
            const cachedResponse = await cache.match(request);

            // 如果有缓存，直接返回
            if (cachedResponse) {
                // 在后台检查更新（静默）
                fetch(request).then(response => {
                    if (response.ok) {
                        cache.put(request, response.clone());
                    }
                }).catch(() => {});
                return cachedResponse;
            }

            // 没有缓存，从网络获取
            try {
                const response = await fetch(request);
                if (response.ok) {
                    cache.put(request, response.clone());
                }
                return response;
            } catch (error) {
                return new Response('', { status: 503 });
            }
        },

        /**
         * 缓存优先策略 (Cache-First)
         * 适用于: 静态资源（第三方库、字体等）
         * 行为: 长期缓存，很少更新
         */
        async cacheFirst(request) {
            const cache = await caches.open(VersionManager.getCacheName());
            const cachedResponse = await cache.match(request);

            if (cachedResponse) {
                return cachedResponse;
            }

            try {
                const response = await fetch(request);
                if (response.ok) {
                    cache.put(request, response.clone());
                }
                return response;
            } catch (error) {
                return new Response('', { status: 503 });
            }
        },

        /**
         * 智能策略执行
         */
        async execute(request) {
            const urlPath = getRelativePath(request.url);
            const strategy = VersionManager.getUpdateStrategy(urlPath);

            switch (strategy) {
                case 'network-first':
                    return this.networkFirst(request);
                case 'cache-first-network':
                    return this.cacheFirstNetwork(request);
                case 'cache-first':
                    return this.cacheFirst(request);
                case 'stale-while-revalidate':
                default:
                    return this.staleWhileRevalidate(request);
            }
        }
    };

    // ==================== 预缓存列表 ====================
    const PRECACHE_URLS = [
        buildUrl('./'),
        buildUrl('./index.html'),
        buildUrl('./src/css/style.css'),
        buildUrl('./src/js/app.js'),
        buildUrl('./src/js/language.js'),
        buildUrl('./src/js/vocab-db.js'),
        buildUrl('./src/js/theme.js'),
        buildUrl('./src/js/font-loader.js'),
        buildUrl('./src/js/payment.js'),
        buildUrl('./src/js/sw-register.js'),
        buildUrl('./src/js/lib/hanzi-writer.min.js'),
        buildUrl('./src/js/lib/idb.js'),
        buildUrl('./src/js/managers/search-manager.js'),
        buildUrl('./src/js/managers/display-manager.js'),
        buildUrl('./src/js/managers/speech-manager.js'),
        buildUrl('./src/js/managers/stroke-manager.js'),
        buildUrl('./src/js/managers/favorites-manager.js'),
        buildUrl('./src/js/managers/share-manager.js'),
        buildUrl('./src/js/managers/data-manager.js'),
        buildUrl('./src/data/languages.json'),
        buildUrl('./src/data/version.json'),
        buildUrl('./src/data/manifest.json')
    ];

    // ==================== Service Worker 生命周期 ====================

    /**
     * 安装事件
     */
    self.addEventListener('install', event => {
        console.log('[ServiceWorker] 安装中...');

        event.waitUntil(
            (async () => {
                try {
                    await VersionManager.getVersionData();
                    
                    const cacheName = VersionManager.getCacheName();
                    const cache = await caches.open(cacheName);
                    
                    console.log('[ServiceWorker] 开始预缓存资源...');
                    await cache.addAll(PRECACHE_URLS);
                    
                    console.log(`[ServiceWorker] 预缓存完成: ${PRECACHE_URLS.length} 个资源`);
                    
                    await self.skipWaiting();
                } catch (error) {
                    console.error('[ServiceWorker] 预缓存失败:', error);
                    await self.skipWaiting();
                }
            })()
        );
    });

    /**
     * 激活事件
     */
    self.addEventListener('activate', event => {
        console.log('[ServiceWorker] 激活中...');

        event.waitUntil(
            (async () => {
                const currentCacheName = VersionManager.getCacheName();
                const cacheNames = await caches.keys();
                
                // 删除旧版本缓存
                const oldCaches = cacheNames.filter(name => {
                    return name.startsWith('chinese-vocab-') && name !== currentCacheName;
                });

                await Promise.all(
                    oldCaches.map(name => {
                        console.log('[ServiceWorker] 删除旧缓存:', name);
                        return caches.delete(name);
                    })
                );

                await self.clients.claim();
                console.log('[ServiceWorker] 激活完成');
            })()
        );
    });

    /**
     * 抓取事件
     */
    self.addEventListener('fetch', event => {
        const url = new URL(event.request.url);
        
        // 只处理 GET 请求
        if (event.request.method !== 'GET') {
            return;
        }

        // 跨域请求直接转发
        if (url.origin !== location.origin) {
            event.respondWith(CacheStrategies.cacheFirst(event.request));
            return;
        }

        const urlPath = url.pathname;
        
        // 排除 API 和数据库请求
        if (urlPath.includes('/api/') || urlPath.includes('_db_')) {
            return;
        }

        // 排除服务器端文件
        const ext = path.extname(urlPath).toLowerCase();
        const serverSideExts = ['.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.go'];
        if (serverSideExts.includes(ext)) {
            return;
        }

        // 处理页面导航
        if (event.request.mode === 'navigate') {
            event.respondWith(
                (async () => {
                    const cache = await caches.open(VersionManager.getCacheName());
                    const cachedResponse = await cache.match(buildUrl('./index.html'));
                    
                    if (cachedResponse) {
                        // 立即返回缓存，后台检查更新
                        VersionManager.fetchVersionData().catch(() => {});
                        return cachedResponse;
                    }
                    
                    // 无缓存，尝试网络
                    try {
                        const response = await fetch(event.request);
                        if (response.ok) {
                            cache.put(buildUrl('./index.html'), response.clone());
                        }
                        return response;
                    } catch (error) {
                        return new Response('', { status: 503 });
                    }
                })()
            );
            return;
        }

        // 处理静态资源
        event.respondWith(CacheStrategies.execute(event.request));
    });

    /**
     * 消息事件
     */
    self.addEventListener('message', event => {
        const data = event.data;

        if (data?.type === 'SKIP_WAITING') {
            self.skipWaiting();
        }
        else if (data?.type === 'CHECK_UPDATE') {
            // 静默检查更新，不通知客户端
            VersionManager.fetchVersionData().catch(() => {});
        }
        else if (data?.type === 'GET_VERSION') {
            const clients = event.ports;
            if (clients.length > 0) {
                clients[0].postMessage({
                    type: 'VERSION_INFO',
                    cacheVersion: VersionManager.getCacheName(),
                    versionData: VersionManager.versionData
                });
            }
        }
        else if (data?.type === 'CLEAR_DATABASE_CACHE') {
            event.waitUntil(
                (async () => {
                    const cacheNames = await caches.keys();
                    for (const name of cacheNames) {
                        if (name.includes('vocab') || name.includes('db') || name.includes('database')) {
                            await caches.delete(name);
                        }
                    }
                })()
            );
        }
        else if (data?.type === 'RESET_VERSION_CHECK') {
            // 重置版本检查（用于测试）
            VersionManager.resetFirstVisit();
        }
    });

    function extname(path) {
        const match = path.match(/\.([^\.]+)$/);
        return match ? match[1] : '';
    }

    console.log('[ServiceWorker] 加载完成, 版本:', CONFIG.cacheVersion);
})();
