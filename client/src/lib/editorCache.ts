import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

export interface CachedDocument {
  content: string;
  updatedAt: string;
}

interface EditorCacheDb extends DBSchema {
  documents: {
    key: string;
    value: CachedDocument;
  };
}

const DB_NAME = 'webnovel-hub-editor';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

let dbPromise: Promise<IDBPDatabase<EditorCacheDb>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<EditorCacheDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }

  return dbPromise;
}

function documentKey(id: string) {
  return `document:${id}`;
}

export async function cacheDocument(
  id: string,
  content: string,
  updatedAt = new Date().toISOString()
): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, { content, updatedAt }, documentKey(id));
}

export async function getCachedDocument(id: string): Promise<CachedDocument | undefined> {
  const db = await getDb();
  return db.get(STORE_NAME, documentKey(id));
}

export async function clearCachedDocument(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, documentKey(id));
}
