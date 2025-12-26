// idb.js - 基于 Jake Archibald 的 idb 库的简化封装

/**
 * 打开数据库连接
 * @param {string} name - 数据库名称
 * @param {number} version - 数据库版本
 * @param {Object} options - 配置选项
 * @returns {Promise<IDBDatabase>} - 数据库连接实例
 */
export async function openDB(name, version, options = {}) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(name, version);
        
        // 数据库升级事件
        if (options.upgrade) {
            request.onupgradeneeded = event => {
                options.upgrade(event.target.result, event.oldVersion, event.newVersion);
            };
        }
        
        // 成功打开数据库
        request.onsuccess = event => {
            resolve(event.target.result);
        };
        
        // 打开数据库失败
        request.onerror = event => {
            reject(event.target.error);
        };
    });
}

/**
 * 从对象存储中获取单个记录
 * @param {IDBDatabase} db - 数据库连接实例
 * @param {string} storeName - 对象存储名称
 * @param {*} key - 记录的键值
 * @returns {Promise<*>} - 获取的记录
 */
export async function get(db, storeName, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(key);
        
        request.onsuccess = event => {
            resolve(event.target.result);
        };
        
        request.onerror = event => {
            reject(event.target.error);
        };
    });
}

/**
 * 保存或更新记录
 * @param {IDBDatabase} db - 数据库连接实例
 * @param {string} storeName - 对象存储名称
 * @param {*} value - 要保存的记录值
 * @returns {Promise<*>} - 保存的记录的键值
 */
export async function put(db, storeName, value) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(value);
        
        request.onsuccess = event => {
            resolve(event.target.result);
        };
        
        request.onerror = event => {
            reject(event.target.error);
        };
    });
}

/**
 * 删除记录
 * @param {IDBDatabase} db - 数据库连接实例
 * @param {string} storeName - 对象存储名称
 * @param {*} key - 要删除的记录的键值
 * @returns {Promise<void>}
 */
export async function del(db, storeName, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(key);
        
        request.onsuccess = () => {
            resolve();
        };
        
        request.onerror = event => {
            reject(event.target.error);
        };
    });
}

/**
 * 获取对象存储中的所有记录
 * @param {IDBDatabase} db - 数据库连接实例
 * @param {string} storeName - 对象存储名称
 * @param {IDBIndex} index - 可选的索引
 * @param {IDBKeyRange} query - 可选的查询范围
 * @returns {Promise<Array>} - 所有记录的数组
 */
export async function getAll(db, storeName, index = null, query = null) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        let request;
        
        if (index) {
            const idx = store.index(index);
            request = query ? idx.getAll(query) : idx.getAll();
        } else {
            request = query ? store.getAll(query) : store.getAll();
        }
        
        request.onsuccess = event => {
            resolve(event.target.result);
        };
        
        request.onerror = event => {
            reject(event.target.error);
        };
    });
}

/**
 * 获取对象存储中的记录数量
 * @param {IDBDatabase} db - 数据库连接实例
 * @param {string} storeName - 对象存储名称
 * @param {IDBKeyRange} query - 可选的查询范围
 * @returns {Promise<number>} - 记录数量
 */
export async function count(db, storeName, query = null) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = query ? store.count(query) : store.count();
        
        request.onsuccess = event => {
            resolve(event.target.result);
        };
        
        request.onerror = event => {
            reject(event.target.error);
        };
    });
}