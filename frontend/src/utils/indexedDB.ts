// IndexedDB offline cache manager

const DB_NAME = 'QuickStore_OfflineDB';
const DB_VERSION = 1;

export const initOfflineDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      
      // Store to cache product catalogs for offline searches
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }

      // Store to queue completed offline orders
      if (!db.objectStoreNames.contains('orders')) {
        db.createObjectStore('orders', { keyPath: 'invoiceNumber' });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject('Failed to open offline database.');
    };
  });
};

// Products catalog helper operations
export const saveOfflineProducts = async (products: any[]): Promise<void> => {
  const db = await initOfflineDB();
  const tx = db.transaction('products', 'readwrite');
  const store = tx.objectStore('products');
  store.clear(); // Wipe previous cached records

  products.forEach(p => {
    store.put(p);
  });
};

export const getOfflineProducts = async (): Promise<any[]> => {
  const db = await initOfflineDB();
  return new Promise((resolve) => {
    const tx = db.transaction('products', 'readonly');
    const store = tx.objectStore('products');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve([]);
  });
};

// Orders transaction helpers
export const queueOfflineOrder = async (order: any): Promise<void> => {
  const db = await initOfflineDB();
  const tx = db.transaction('orders', 'readwrite');
  const store = tx.objectStore('orders');
  store.put(order);
};

export const getOfflineOrders = async (): Promise<any[]> => {
  const db = await initOfflineDB();
  return new Promise((resolve) => {
    const tx = db.transaction('orders', 'readonly');
    const store = tx.objectStore('orders');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve([]);
  });
};

export const removeOfflineOrder = async (invoiceNumber: string): Promise<void> => {
  const db = await initOfflineDB();
  const tx = db.transaction('orders', 'readwrite');
  const store = tx.objectStore('orders');
  store.delete(invoiceNumber);
};
