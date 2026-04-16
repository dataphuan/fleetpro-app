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

  const now = new Date();
  const yymm = now.toISOString().slice(2, 4) + now.toISOString().slice(5, 7); // e.g., "2604"

  // Document path: counters/{tenantId}_{collectionName}_{yymm}
  // Including YYMM in the ID ensures the counter resets automatically each month
  const counterDocId = `${tenantId}_${collectionName}_${yymm}`;
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
        month_period: yymm,
        last_value: nextVal,
        updated_at: new Date().toISOString()
      }, { merge: true });

      // Format: PREFIX + YYMM + - + NN (padded to at least 2 digits)
      return `${config.prefix}${yymm}-${String(nextVal).padStart(2, '0')}`;
    });

    return nextId;
  } catch (error) {
    console.error(`ID Counter Failure for ${collectionName}:`, error);
    // Fallback logic
    const yymmStr = now.toISOString().slice(2, 4) + now.toISOString().slice(5, 7);
    return `${config.prefix}${yymmStr}-${Date.now().toString().slice(-4)}`;
  }
};

