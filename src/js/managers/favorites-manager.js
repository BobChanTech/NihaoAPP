/**
 * 词汇本管理器（完整版，IndexedDB+localStorage双存储+健壮事件绑定）
 */
class FavoritesManager {
    constructor(appInstance) {
        this.app = appInstance;
        this._favoritesStorage = new FavoritesStorage();
        this._storageFallbackKey = 'vocab_favorites';
        this._favBtnSelector = '#favorite-btn';
        this._favListBtnSelector = '#favorites-btn';
        this._lastFavBtn = null; // 记录上次已绑定的按钮元素
        this._lastListBtn = null;
    }

    /* ================ 存储核心 ================ */

    /** 获取全部收藏ID数组 */
    async getFavorites() {
        if (!FavoritesStorage.isSupported()) {
            const raw = localStorage.getItem(this._storageFallbackKey);
            return raw ? JSON.parse(raw) : [];
        }
        try {
            const favorites = await this._favoritesStorage.getAllFavorites();
            return favorites.map(fav => fav.word);
        } catch {
            return [];
        }
    }

    /** 检查指定ID是否已收藏 */
    async isFavorite(id) {
        if (!id) return false;
        if (!FavoritesStorage.isSupported()) {
            const list = await this.getFavorites();
            // string/number兼容
            return list.map(String).includes(String(id));
        }
        const favorite = await this._favoritesStorage.getFavorite(String(id));
        return favorite !== null && favorite !== undefined;
    }

    /** 添加收藏 */
    async addFavorite(id) {
        if (!id) return;
        const word = this.app.currentWords && this.app.currentWords[this.app.currentIndex];
        if (!word) return;
        if (!FavoritesStorage.isSupported()) {
            const list = await this.getFavorites();
            if (!list.map(String).includes(String(id))) {
                list.push(id);
                localStorage.setItem(this._storageFallbackKey, JSON.stringify(list));
                this._feedback('已收藏', true);
            }
            return;
        }
        const entry = {
            word: String(id),
            chinese_cn: word.chinese_cn,
            pinyin: word.pinyin,
            english_en: word.english_en,
            translation: (this.app.getTranslationForWord && this.app.getTranslationForWord(word)) || '',
            timestamp: Date.now(),
            tags: []
        };
        await this._favoritesStorage.saveFavorite(entry);
        this._feedback('已收藏', true);
    }

    /** 取消收藏 */
    async removeFavorite(id) {
        if (!id) return;
        if (!FavoritesStorage.isSupported()) {
            const list = await this.getFavorites();
            const newList = list.filter(x => String(x) !== String(id));
            localStorage.setItem(this._storageFallbackKey, JSON.stringify(newList));
            this._feedback('已取消收藏');
            return;
        }
        await this._favoritesStorage.deleteFavorite(String(id));
        this._feedback('已取消收藏');
    }

    /** 操作提示（toast) */
    _feedback(msg, succ) {
        if (this.app && typeof this.app.showToast === 'function') {
            this.app.showToast(msg, succ ? 'success' : 'info');
        }
    }

    /* ================ UI 相关 ================ */

    /** 每次UI或切词后都需刷新按钮状态 */
    async updateFavoriteButtonState(id) {
        let favBtn = document.querySelector(this._favBtnSelector);
        if (!favBtn) return;

        const isFav = await this.isFavorite(id);
        favBtn.textContent = isFav ? '★' : '☆';
        favBtn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
        favBtn.classList.toggle('active', isFav);
        
        // 事件只绑定一次
        this._bindSingleFavoriteBtnHandler(favBtn);
    }

    /** 绑定五角星按钮事件，若页面有DOM结构重建可重复调用，永远只绑定一次 */
    _bindSingleFavoriteBtnHandler(btn) {
        if (!btn) return;
        
        // 检查是否已经绑定了事件
        if (btn.dataset.favoriteEventBound === 'true') {
            return;
        }
        
        // 如果按钮元素发生变化，先处理旧按钮
        if (this._lastFavBtn && this._lastFavBtn !== btn) {
            // 标记旧按钮已解绑
            this._lastFavBtn.dataset.favoriteEventBound = 'false';
        }
        
        // 定义事件处理函数
        const handleClick = async () => {
            const word = this.app.currentWords && this.app.currentWords[this.app.currentIndex];
            const id = word?.ID ?? word?.id;
            if (!id) return;
            if (await this.isFavorite(id)) {
                await this.removeFavorite(id);
            } else {
                await this.addFavorite(id);
            }
            // 状态刷新
            await this.updateFavoriteButtonState(id);
        };
        
        // 绑定事件
        btn.addEventListener('click', handleClick, { passive: true });
        
        // 标记按钮已绑定事件
        btn.dataset.favoriteEventBound = 'true';
        this._lastFavBtn = btn;
    }

    /** 只绑定一次词汇本入口事件 */
    initEventListeners() {
        this._bindFavoriteListBtnHandler();
        this.updateFavoriteButtonState = this.updateFavoriteButtonState.bind(this);
    }

    _bindFavoriteListBtnHandler() {
        let listBtn = document.querySelector(this._favListBtnSelector);
        if (!listBtn) return;
        if (this._lastListBtn && this._lastListBtn !== listBtn) {
            this._lastListBtn.replaceWith(this._lastListBtn.cloneNode(true));
            listBtn = document.querySelector(this._favListBtnSelector);
        }
        listBtn.addEventListener('click', () => this.showFavoritesModal());
        this._lastListBtn = listBtn;
    }

    /**
     * 显示词汇本列表弹窗（简洁分页可选，直接全部展示）
     */
    async showFavoritesModal() {
        let words = [];
        try {
            if (!FavoritesStorage.isSupported()) {
                const ids = await this.getFavorites();
                for (const id of ids) {
                    const w = await this.app.dataManager.getWordById(Number(id));
                    if (w) words.push(w);
                }
            } else {
                const favorites = await this._favoritesStorage.getAllFavorites();
                for (const fav of favorites) {
                    const w = await this.app.dataManager.getWordById(Number(fav.word));
                    if (w) words.push(w);
                }
            }
        } catch (error) {
            console.error('获取收藏列表失败:', error);
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:600px;">
                <div class="modal-header">
                    <h2>词汇本  Vocabulary Log</h2>
                </div>
                <div class="modal-body">
                    ${words.length === 0 ? '<p>词汇本为空。</p>' :
                        '<ul class="favorites-list">' + words.map(w => `
                            <li data-id="${w.ID}">
                                <strong>${w.chinese_cn}</strong>
                                 — ${(this.app.getTranslationForWord && this.app.getTranslationForWord(w)) || w.english_en}
                                <div class="fav-actions">
                                    <button class="open-word" data-id="${w.ID}">打开</button>
                                    <button class="remove-fav" data-id="${w.ID}">移除</button>
                                </div>
                            </li>
                        `).join('') + '</ul>'
                    }
                </div>
                <div class="modal-footer" style="display: flex; justify-content: center;">
                    <button class="btn-primary close-modal-btn">关闭</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelectorAll('.close-modal-btn').forEach(btn =>
            btn.addEventListener('click', () => modal.remove())
        );
        modal.querySelectorAll('.open-word').forEach(btn => {
            btn.addEventListener('click', async e => {
                // 打开词条
                const id = Number(btn.dataset.id);
                if (id && this.app.showWordById) await this.app.showWordById(id);
                modal.remove();
            });
        });
        modal.querySelectorAll('.remove-fav').forEach(btn => {
            btn.addEventListener('click', async e => {
                const id = Number(btn.dataset.id);
                await this.removeFavorite(id);
                btn.closest('li').remove();
            });
        });
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    }
}

/**
 * IndexedDB 存储层
 */
class FavoritesStorage {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.DB_NAME = 'VocabFavoritesDB';
        this.DB_VERSION = 1;
        this.STORE_NAME = 'favorites';
    }

    async init() {
        if (this.isInitialized) return;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onerror = () => {
                console.error('FavoritesStorage: IndexedDB打开失败:', request.error);
                reject(request.error);
            };
            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'word' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
                }
            };
        });
    }
    async getDB() {
        if (!this.isInitialized) await this.init();
        return this.db;
    }
    async transaction(mode, cb) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([this.STORE_NAME], mode);
            const store = tx.objectStore(this.STORE_NAME);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            cb(store, resolve, reject);
        });
    }
    async saveFavorite(entry) {
        await this.transaction('readwrite', (store, resolve, reject) => {
            const req = store.put({ ...entry, timestamp: entry.timestamp || Date.now() });
            req.onsuccess = resolve;
            req.onerror = () => reject(req.error);
        });
    }
    async getFavorite(wordID) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.transaction('readonly', (store, _, rejectTx) => {
                    const req = store.get(wordID);
                    req.onsuccess = () => resolve(req.result || null);
                    req.onerror = () => rejectTx(req.error);
                });
            } catch (e) { reject(e); }
        });
    }
    async getAllFavorites() {
        return new Promise(async (resolve, reject) => {
            try {
                await this.transaction('readonly', (store, resolveTx, rejectTx) => {
                    const idx = store.index('timestamp');
                    const req = idx.openCursor(null, 'prev');
                    const favs = [];
                    req.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            favs.push(cursor.value);
                            cursor.continue();
                        } else resolve(favs);
                    };
                    req.onerror = () => rejectTx(req.error);
                });
            } catch (e) { reject(e); }
        });
    }
    async deleteFavorite(wordID) {
        await this.transaction('readwrite', (store, resolve, reject) => {
            const req = store.delete(wordID);
            req.onsuccess = resolve;
            req.onerror = () => reject(req.error);
        });
    }
    static isSupported() {
        return typeof indexedDB !== 'undefined';
    }
}

export default FavoritesManager;