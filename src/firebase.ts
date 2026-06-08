/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import config from "./firebase-applet-config.json";

// Safe, resilient verification of provisioned credentials
export const isFirebaseActive = !!(config && config.apiKey && config.projectId);

const app = isFirebaseActive ? initializeApp(config) : null;
export const db = isFirebaseActive ? getFirestore(app!, config.projectId || "(default)") : null;
export const auth = isFirebaseActive ? getAuth(app!) : null;

// Validate Firestore connection if active
if (db) {
  const testConnection = async () => {
    try {
      await getDocFromServer(doc(db, "test", "connection"));
    } catch (error) {
      if (error instanceof Error && error.message.includes("offline")) {
        console.error("Firestore client is offline. Verify connection.");
      }
    }
  };
  testConnection();
}
