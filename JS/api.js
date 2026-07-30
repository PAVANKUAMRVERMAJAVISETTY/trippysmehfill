// ==========================================================
// JS/api.js - CENTRAL FIRESTORE API WRAPPER
// ==========================================================
import { 
  db, collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, setDoc, query, onSnapshot, orderBy, serverTimestamp 
} from "./firebase.js";

export const API = {
  // --- ORDERS API ---
  orders: {
    async getAll() {
      try {
        const q = query(collection(db, "orders"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            firebaseId: d.id,
            ...data,
            amount: Number(data.amount || data.total || 0)
          };
        });
      } catch (err) {
        console.error("API GET Orders Error:", err);
        return [];
      }
    },

    async create(orderData) {
      try {
        const docRef = await addDoc(collection(db, "orders"), {
          ...orderData,
          amount: Number(orderData.amount || orderData.total || 0),
          status: "PENDING", 
          timestamp: serverTimestamp(),
          createdAt: new Date().toISOString()
        });
        return docRef.id;
      } catch (err) {
        console.error("API CREATE Order Error:", err);
        throw err;
      }
    },

    async update(orderId, updateFields) {
      try {
        const ref = doc(db, "orders", orderId);
        await updateDoc(ref, updateFields);
      } catch (err) {
        console.error("API UPDATE Order Error:", err);
        throw err;
      }
    },

    async delete(orderId) {
      try {
        await deleteDoc(doc(db, "orders", orderId));
      } catch (err) {
        console.error("API DELETE Order Error:", err);
        throw err;
      }
    },

    subscribe(callback) {
      const q = query(collection(db, "orders"), orderBy("timestamp", "desc"));
      return onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            firebaseId: d.id,
            ...data,
            amount: Number(data.amount || data.total || 0)
          };
        });
        callback(orders);
      });
    }
  },

  // --- MENU API ---
  menu: {
    async getAll() {
      try {
        const snapshot = await getDocs(collection(db, "menu"));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.error("API GET Menu Error:", err);
        return [];
      }
    },

    async save(itemId, itemData) {
      try {
        const menuDocRef = itemId ? doc(db, "menu", itemId) : doc(collection(db, "menu"));
        await setDoc(menuDocRef, {
          name: itemData.name,
          price: Number(itemData.price),
          desc: itemData.desc,
          category: itemData.category,
          isEnabled: itemData.isEnabled !== false,
          isSpecial: itemData.isSpecial || false,
          updatedAt: serverTimestamp()
        }, { merge: true }); 
      } catch (err) {
        console.error("API SAVE Menu Item Error:", err);
        throw err;
      }
    },

    async delete(itemId) {
      try {
        await deleteDoc(doc(db, "menu", itemId));
      } catch (err) {
        console.error("API DELETE Menu Item Error:", err);
        throw err;
      }
    }
  },

  // --- STAFF & DRIVERS API ---
  staff: {
    async getAll() {
      try {
        const snapshot = await getDocs(collection(db, "staff"));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.error("API GET Staff Error:", err);
        return [];
      }
    },

    async saveProfile(staffId, staffData) {
      try {
        await setDoc(doc(db, "staff", staffId), {
          ...staffData,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.error("API SAVE Staff Profile Error:", err);
        throw err;
      }
    },

    async delete(staffId) {
      try {
        await deleteDoc(doc(db, "staff", staffId));
      } catch (err) {
        console.error("API DELETE Staff Error:", err);
        throw err;
      }
    }
  },

  // --- SPECIAL DISH BANNER API ---
  specialDish: {
    async get() {
      try {
        const ref = doc(db, "settings", "specialDish");
        const snap = await getDoc(ref);
        return snap.exists() ? snap.data() : { title: "Special Dum Biryani & Keema Combo", desc: "Freshly Cooked Saffron Rice" };
      } catch (err) {
        console.error("API GET Special Dish Error:", err);
        return { title: "Special Dum Biryani", desc: "Saffron Rice" };
      }
    },
    async update(data) {
      try {
        await setDoc(doc(db, "settings", "specialDish"), data, { merge: true });
      } catch (err) {
        console.error("API UPDATE Special Dish Error:", err);
        throw err;
      }
    }
  },

  // --- FEEDBACK API ---
  feedback: {
    async getAll() {
      try {
        const snapshot = await getDocs(collection(db, "feedback"));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.error("API GET Feedback Error:", err);
        return [];
      }
    },
    async create(feedbackData) {
      try {
        return await addDoc(collection(db, "feedback"), {
          ...feedbackData,
          submittedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("API CREATE Feedback Error:", err);
        throw err;
      }
    }
  }
};
