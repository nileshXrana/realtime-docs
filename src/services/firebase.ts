import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";
import { getDatabase, ref, update, set, push, get, query, orderByChild, equalTo, onValue } from "firebase/database";

export interface DocData {
  docId: string;
  ownerId: string;
  title: string;
  content: string;
  createdAt: number;
  collaborators?: { [userId: string]: boolean };
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "mock-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mock-auth-domain",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://mock-db.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mock-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mock-storage-bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "mock-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "mock-app-id"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getDatabase(app);

const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logout() {
  await signOut(auth);
}

export function subscribeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function saveUser(uid: string, name: string | null, email: string | null, photoURL: string | null) {
  const userRef = ref(db, `users/${uid}`);
  await set(userRef, { uid, name, email, photoURL });
}

export async function createDocument(ownerId: string, title: string = "Untitled Document") {
  const docsRef = ref(db, "docs");
  const newDocRef = push(docsRef);
  const docId = newDocRef.key;
  if (!docId) throw new Error("Failed to generate document ID");
  await set(newDocRef, {
    docId,
    ownerId,
    title,
    content: "",
    createdAt: Date.now()
  });
  return docId;
}

export function subscribeUserDocs(ownerId: string, callback: (docs: DocData[]) => void) {
  const docsRef = ref(db, "docs");
  const q = query(docsRef, orderByChild("ownerId"), equalTo(ownerId));
  return onValue(q, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    const docs = Object.values(data) as DocData[];
    callback(docs);
  });
}

export async function getDocument(docId: string): Promise<DocData | null> {
  const docRef = ref(db, `docs/${docId}`);
  const snapshot = await get(docRef);
  return snapshot.val();
}

export async function saveDocumentTitle(docId: string, title: string) {
  const titleRef = ref(db, `docs/${docId}/title`);
  await set(titleRef, title);
}

export async function getDocumentContent(docId: string): Promise<string> {
  const contentRef = ref(db, `docs/${docId}/content`);
  const snapshot = await get(contentRef);
  return snapshot.val() || "";
}

export async function saveDocumentContent(docId: string, content: string) {
  const contentRef = ref(db, `docs/${docId}/content`);
  await set(contentRef, content);
}

// collaborators

// 1.public link sharing
export async function enableLinkSharing(docId: string) {
  const updates: { [key: string]: boolean } = {};
  updates[`/docs/${docId}/isPublicShared`] = true;
  return update(ref(db), updates);
}

// 2. add user as collaborator
export async function joinAsCollaborator(docId: string, userId: string) {
  const docRef = ref(db, `docs/${docId}`);
  const snapshot = await get(docRef);
  
  if (!snapshot.exists()) throw new Error("Document not found");
  const docData = snapshot.val();

  // if alread owner or collaborator, do nothing
  if (docData.ownerId === userId || (docData.collaborators && docData.collaborators[userId])) {
    return;
  }

  const updates: { [key: string]: boolean } = {};
  updates[`/docs/${docId}/collaborators/${userId}`] = true;
  updates[`/sharedDocs/${userId}/${docId}`] = true;

  return update(ref(db), updates);
}

// 3. Live listen to collaboration list for UI display
export function subscribeCollaborators(docId: string, callback: (collaborators: string[]) => void) {
  const collaboratorsRef = ref(db, `docs/${docId}/collaborators`);
  return onValue(collaboratorsRef, (snapshot) => {
    const list = snapshot.exists() ? Object.keys(snapshot.val()) : [];
    callback(list);
  });
}

// 4. get user details by id
export async function getUserById(userId: string): Promise<{ uid: string; name: string | null; email: string | null } | null> {
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  return snapshot.exists() ? snapshot.val() : null;
}

