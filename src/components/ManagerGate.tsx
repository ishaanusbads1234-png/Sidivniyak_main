/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { Lock, ShieldAlert, Key, Unlock, Info, RefreshCw } from "lucide-react";

interface ManagerGateProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export const ManagerGate: React.FC<ManagerGateProps> = ({
  children,
  title = "Manager Access Required",
  description = "Restocking and item registry functions are protected. Elevated clearance is required."
}) => {
  const { isManagerMode, verifyAndSetManagerMode } = useInventory();
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setAuthError(false);

    setTimeout(() => {
      const isSuccess = verifyAndSetManagerMode(passwordInput);
      setChecking(false);
      if (!isSuccess) {
        setAuthError(true);
      } else {
        setPasswordInput("");
      }
    }, 300);
  };

  if (isManagerMode) {
    return <>{children}</>;
  }

  return (
    <div id="manager-auth-block-overlay" className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center min-h-[160px] flex flex-col justify-center items-center relative overflow-hidden">
      <div className="max-w-xs w-full mx-auto space-y-3 relative z-10">
        <div className="mx-auto w-10 h-10 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
          <Lock className="h-4 w-4" />
        </div>

        <div>
          <h4 className="text-xs font-bold font-mono tracking-wide text-white uppercase text-pink-400">
            {title}
          </h4>
          <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
            {description}
          </p>
        </div>

        <form onSubmit={handleAuthSubmit} className="space-y-2">
          <div className="relative">
            <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              id="manager-gate-password-input"
              type="password"
              placeholder="Enter manager passcode..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-white tracking-widest focus:outline-none focus:border-pink-500 text-center"
              required
            />
          </div>

          {authError && (
            <div id="gate-auth-error-msg" className="text-[9px] text-rose-400 font-mono flex items-center justify-center gap-1">
              <ShieldAlert className="h-3 w-3" /> incorrect password code!
            </div>
          )}

          <button
            id="btn-gate-submit"
            type="submit"
            disabled={checking}
            className="w-full py-1.5 rounded bg-pink-600 hover:bg-pink-500 text-white font-mono text-[10px] font-bold uppercase flex items-center justify-center gap-1 cursor-pointer transition"
          >
            {checking ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" /> VERIFYING...
              </>
            ) : (
              <>
                <Unlock className="h-3 w-3" /> AUTHORIZE FULL CONTROL
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
