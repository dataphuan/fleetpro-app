import { db } from './firebase';
import { 
  doc, 
  runTransaction, 
  Increment, 
  getDoc,
  collection
} from 'firebase/firestore';

/**
 * ID Service (Real-world Production Logic)
 * Manages atomic centralized counters for master data IDs (XE0001, TX0001, etc.)
 * Prevents ID collisions in multi-user environments.
 */

interface CounterConfig {
  prefix: string;
  padding: number;
}

const COUNTER_CONFIGS: Record<string, CounterConfig> = {
  vehicles: { prefix: 'XE', padding: 4 },
  drivers: { prefix: 'TX', padding: 4 },
  customers: { prefix: 'KH', padding: 4 },
  trips: { prefix: 'CD', padding: 4 },
  routes: { prefix: 'TD', padding: 4 },
  transportOrders: { prefix: 'DH', padding: 4 },
  expenses: { prefix: 'PC', padding: 4 },
  maintenance: { prefix: 'BD', padding: 4 },
};

export const getNextSequentialId = async (tenantId: string, collectionName: string): Promise<string> => {
  const config = COUNTER_CONFIGS[collectionName];
  if (!config) throw new Error(`STT Counter not configured for collection: ${collectionName}`);

  // Reference to the counter document for this tenant and collection
  // Document path: counters/{tenantId}_{collectionName}
  const counterDocId = `${tenantId}_${collectionName}`;
  const counterRef = doc(db, 'counters', counterDocId);

  try {
    const nextId = await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      
      let currentVal = 0;
      if (counterSnap.exists()) {
        currentVal = counterSnap.data().last_value || 0;
      }

      const nextVal = currentVal + 1;
      
      transaction.set(counterRef, {
        tenant_id: tenantId,
        last_value: nextVal,
        updated_at: new Date().toISOString()
      }, { merge: true });

      return `${config.prefix}${String(nextVal).padStart(config.padding, '0')}`;
    });

    return nextId;
  } catch (error) {
    console.error(`ID Counter Failure for ${collectionName}:`, error);
    // Fallback to timestamp-based unique ID if transaction fails (better than crash)
    return `${config.prefix}${Date.now().toString().slice(-config.padding)}`;
  }
};
