import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SensorReading } from '@/types';

interface FertGuardDB extends DBSchema {
  readings: {
    key: [string, string]; // [node_id, timestamp]
    value: SensorReading;
    indexes: { 
      'by-node': string; 
      'by-timestamp': string; 
    };
  };
  events: {
    key: string;
    value: { id: string; type: string; timestamp: string; details: any };
    indexes: { 'by-timestamp': string };
  };
  config: {
    key: string;
    value: any;
  };
}

let dbPromise: Promise<IDBPDatabase<FertGuardDB>>;

export function getDB() {
  if (typeof window === 'undefined') return null; // Avoid on server
  
  if (!dbPromise) {
    dbPromise = openDB<FertGuardDB>('fertguard-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('readings')) {
          const store = db.createObjectStore('readings', { keyPath: ['node_id', 'timestamp'] });
          store.createIndex('by-node', 'node_id');
          store.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('events')) {
          const store = db.createObjectStore('events', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveReadingLocal(reading: SensorReading) {
  const db = await getDB();
  if (db) {
    await db.put('readings', reading);
  }
}

export async function getRecentReadingsByNode(nodeId: string, count: number = 20): Promise<SensorReading[]> {
  const db = await getDB();
  if (!db) return [];
  
  const tx = db.transaction('readings', 'readonly');
  const index = tx.store.index('by-node');
  
  let cursor = await index.openCursor(IDBKeyRange.only(nodeId), 'prev');
  const results: SensorReading[] = [];
  
  while (cursor && results.length < count) {
    results.push(cursor.value);
    cursor = await cursor.continue();
  }
  
  return results.reverse(); // Return in chronological order
}
