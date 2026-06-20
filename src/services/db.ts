import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SensorReading, HarvestLog } from '@/types';

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
  harvests: {
    key: string;
    value: HarvestLog;
    indexes: {
      'by-node': string;
      'by-timestamp': string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<FertGuardDB>>;

export function getDB() {
  if (typeof window === 'undefined') return null; // Avoid on server
  
  if (!dbPromise) {
    dbPromise = openDB<FertGuardDB>('fertguard-db', 2, {
      upgrade(db, oldVersion, newVersion) {
        if (oldVersion < 1) {
          const readingsStore = db.createObjectStore('readings', { keyPath: ['node_id', 'timestamp'] });
          readingsStore.createIndex('by-node', 'node_id');
          readingsStore.createIndex('by-timestamp', 'timestamp');

          const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
          eventsStore.createIndex('by-timestamp', 'timestamp');

          db.createObjectStore('config', { keyPath: 'id' });
        }
        
        if (oldVersion < 2) {
          const harvestsStore = db.createObjectStore('harvests', { keyPath: 'id' });
          harvestsStore.createIndex('by-node', 'node_id');
          harvestsStore.createIndex('by-timestamp', 'timestamp');
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

export async function saveHarvestLog(log: HarvestLog) {
  const db = await getDB();
  if (db) {
    await db.put('harvests', log);
  }
}

export async function getAllHarvestLogs(): Promise<HarvestLog[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAll('harvests');
}

export async function getHarvestLogsByNode(nodeId: string): Promise<HarvestLog[]> {
  const db = await getDB();
  if (!db) return [];
  const index = db.transaction('harvests', 'readonly').store.index('by-node');
  return index.getAll(IDBKeyRange.only(nodeId));
}
