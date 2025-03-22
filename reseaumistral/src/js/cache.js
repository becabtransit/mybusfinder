// Système de cache optimisé
class GTFSCache {
    constructor() {
        this.dbName = 'GTFSOptimizedCache';
        this.version = 1;
        this.store = 'gtfsData';
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.store)) {
                    const store = db.createObjectStore(this.store, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp');
                    store.createIndex('type', 'type');
                }
            };
        });
    }

    async saveCompressedData(key, data) {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.store, 'readwrite');
            const store = transaction.objectStore(this.store);
            
            const compressedData = {
                id: key,
                data: data,
                timestamp: Date.now(),
                type: 'gtfs'
            };

            const request = store.put(compressedData);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getCompressedData(key) {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.store, 'readonly');
            const store = transaction.objectStore(this.store);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result?.data || null);
            request.onerror = () => reject(request.error);
        });
    }

    async clearOldCache() {
        const db = await this.initDB();
        const yesterday = Date.now() - (24 * 60 * 60 * 1000);

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.store, 'readwrite');
            const store = transaction.objectStore(this.store);
            const index = store.index('timestamp');

            const request = index.openCursor(IDBKeyRange.upperBound(yesterday));
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    store.delete(cursor.primaryKey);
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }
}