const DATABASE_NAME = "phonghoc-admin-drafts";
const DATABASE_VERSION = 1;
const STORE_NAME = "product-gallery";
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredDraftFile {
  name: string;
  type: string;
  lastModified: number;
  blob: Blob;
}

interface ProductGalleryDraft {
  key: string;
  updatedAt: number;
  files: StoredDraftFile[];
}

let databasePromise: Promise<IDBDatabase> | null = null;

const openDatabase = () => {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("IndexedDB is not available"));
  }

  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = null;
      reject(request.error || new Error("Unable to open draft database"));
    };
  });

  return databasePromise;
};

const runRequest = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
) => {
  const database = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    let result: T;

    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error || new Error("Draft database request failed"));
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(transaction.error || new Error("Draft database transaction failed"));
  });
};

export const getProductGalleryDraftKey = (productId?: string | number | null) =>
  `product-gallery:${productId || "new"}`;

export const saveProductGalleryDraft = async (key: string, files: File[]) => {
  if (files.length === 0) {
    await clearProductGalleryDraft(key);
    return;
  }

  const draft: ProductGalleryDraft = {
    key,
    updatedAt: Date.now(),
    files: files.map((file) => ({
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
      blob: file.slice(0, file.size, file.type),
    })),
  };

  await runRequest("readwrite", (store) => store.put(draft));
};

export const loadProductGalleryDraft = async (key: string) => {
  const draft = await runRequest<ProductGalleryDraft | undefined>("readonly", (store) => store.get(key));
  if (!draft) return [];

  if (Date.now() - draft.updatedAt > DRAFT_MAX_AGE_MS) {
    await clearProductGalleryDraft(key);
    return [];
  }

  return draft.files.map(
    (file) => new File([file.blob], file.name, { type: file.type, lastModified: file.lastModified })
  );
};

export const clearProductGalleryDraft = async (key: string) => {
  await runRequest("readwrite", (store) => store.delete(key));
};
