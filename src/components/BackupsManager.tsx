/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { ArrowUpFromLine, CloudDownload, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

export const BackupsManager: React.FC = () => {
  const { exportDatabaseBackup, importDatabaseBackup } = useInventory();
  const [feedback, setFeedback] = useState("");
  const [errorText, setErrorText] = useState("");
  const [restoring, setRestoring] = useState(false);

  const handleDownloadBackup = () => {
    try {
      const dataStr = exportDatabaseBackup();
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

      const exportFileDefaultName = `SIDIVNIYAK_LEDGER_BACKUP_${new Date().toISOString().substring(0, 10)}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      setFeedback("✓ Secure ledger JSON backup generated & downloaded successfully!");
      setTimeout(() => setFeedback(""), 4050);
    } catch (e: any) {
      setErrorText("Error constructing backup file: " + e.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoring(true);
    setFeedback("");
    setErrorText("");

    fileReader.onload = (event) => {
      try {
        const textStr = event.target?.result as string;
        const res = importDatabaseBackup(textStr, "Manager Restore Console");

        if (res.success) {
          setFeedback("✓ Ledger database restored successfully! Cloud sync complete.");
        } else {
          setErrorText(res.error || "Restoration failure");
        }
      } catch (err: any) {
        setErrorText("File read error: " + err.message);
      } finally {
        setRestoring(false);
      }
    };

    fileReader.readAsText(file);
  };

  return (
    <div className="space-y-4 font-mono text-[9px] uppercase">
      {/* EXPLAINER SEED */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 leading-relaxed text-slate-400">
        <span className="text-pink-400 font-extrabold text-[9.5px] block">🔒 Master Backup and Disaster Recovery Engine</span>
        <p>
          Generate offline encryptions of your full beauty shop registry catalog, historical invoice books, ledger passbooks, returns ledger, and audit registers. Or import an old backup file to restore complete operational status.
        </p>
      </div>

      {/* EXPORT PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3 text-center">
        <span className="block text-left text-[8.5px] text-slate-400 tracking-wider font-extrabold pb-1.5 border-b border-slate-850">
          📥 Offline Serialization Download
        </span>

        <p className="text-[7.5px] text-slate-500 text-left">
          Generates a single self-contained JSON schema database document containing all store state variables.
        </p>

        <button
          onClick={handleDownloadBackup}
          className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded cursor-pointer transition flex items-center justify-center gap-1.5 shadow"
        >
          <CloudDownload className="h-4 w-4" /> DOWNLOAD FULL LEDGER BACKUP (JSON)
        </button>
      </div>

      {/* IMPORT PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
        <span className="block text-[8.5px] text-slate-400 tracking-wider font-extrabold pb-1.5 border-b border-slate-850">
          📤 Disaster Recovery JSON Import
        </span>

        <p className="text-[7.5px] text-slate-500">
          Selecting a valid backup file will completely overwrite all local memory states and instantly dispatch transactional writes to our Firebase Firestore cloud cluster.
        </p>

        <div className="relative border-2 border-dashed border-slate-800 hover:border-pink-500/50 rounded-xl p-4 text-center cursor-pointer transition">
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            id="backup-file-picker"
          />
          
          <div className="space-y-1 text-slate-400">
            <ArrowUpFromLine className="mx-auto h-5 w-5 text-pink-500 animate-bounce" />
            <p className="font-bold">CHOOSE BACKUP JSON DOCUMENT</p>
            <p className="text-[7px] text-slate-500">Only .json files are accepted</p>
          </div>
        </div>
      </div>

      {/* STATUS OVERLAY */}
      {restoring && (
        <div className="p-2 bg-slate-950 border border-indigo-500/35 rounded-lg flex items-center gap-2 text-indigo-400 font-bold animate-pulse">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>RESTORING RECORDS & OVERWRITING SCHEMAS... PLEASE STAND BY</span>
        </div>
      )}

      {feedback && (
        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 rounded-lg font-bold flex items-center gap-1.5 leading-normal">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>{feedback}</span>
        </div>
      )}

      {errorText && (
        <div className="p-2 bg-rose-500/15 border border-rose-500/20 text-rose-400 rounded-lg font-bold flex items-center gap-1.5 leading-normal">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{errorText}</span>
        </div>
      )}
    </div>
  );
};
