import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { Plus, Trash, Check, Landmark, ShieldAlert } from "lucide-react";

export const ExpenseSheet: React.FC = () => {
  const { expenses, addExpense, deleteExpense, isManagerMode } = useInventory();

  // New Expense fields
  const [expDesc, setExpDesc] = useState("");
  const [expAmt, setExpAmt] = useState("");
  const [expCategory, setExpCategory] = useState("Supplier Pay");
  const [expOperator, setExpOperator] = useState("Staff Register Desk");
  const [expDate, setExpDate] = useState(new Date().toISOString().substring(0, 10));

  const [feedback, setFeedback] = useState("");

  const EXPENSE_CATEGORIES = ["Supplier Pay", "Rent", "Utility", "Transport", "Salary", "Other"];

  const handleCreateExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amtNum = parseFloat(expAmt);
    if (isNaN(amtNum) || amtNum <= 0) {
      setFeedback("Error: Please specify a valid expense amount!");
      return;
    }

    if (!expDesc.trim()) {
      setFeedback("Error: Expense description is required.");
      return;
    }

    addExpense({
      description: expDesc.trim(),
      amount: amtNum,
      category: expCategory,
      date: expDate,
      operator: expOperator
    }, expOperator);

    setFeedback("✓ Expense entry logged successfully.");
    setExpDesc("");
    setExpAmt("");
    setTimeout(() => {
      setFeedback("");
    }, 3000);
  };

  // Grouping & Filtering Calculations for Daily/Monthly reports
  const todayStr = new Date().toISOString().substring(0, 10);
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM

  const todayExpensesSum = expenses
    .filter((e) => e.date === todayStr)
    .reduce((sum, e) => sum + e.amount, 0);

  const monthExpensesSum = expenses
    .filter((e) => e.date.substring(0, 7) === currentMonthStr)
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-4 font-mono text-[9px]">
      
      {/* SUMMARIZED KPIS */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
          <span className="text-slate-500 block text-[7.5px] uppercase">Today's Shop Expenses</span>
          <span className="text-rose-400 font-bold block text-sm">₹{todayExpensesSum.toLocaleString()}</span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
          <span className="text-slate-500 block text-[7.5px] uppercase">This Month's Sum</span>
          <span className="text-rose-450 font-bold block text-sm">₹{monthExpensesSum.toLocaleString()}</span>
        </div>
      </div>

      {/* CREATE EXPENSE FORM */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
        <h4 className="text-xs font-black text-pink-400 font-mono tracking-wider uppercase pb-1 border-b border-slate-800 flex items-center gap-1">
          <Landmark className="h-3.5 w-3.5 text-pink-500 shrink-0" /> Log Shop operational expense
        </h4>

        <form onSubmit={handleCreateExpenseSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-[8.5px]">
            <div>
              <label className="text-slate-500 block mb-0.5 font-bold uppercase">Clerk initials</label>
              <input
                type="text"
                value={expOperator}
                onChange={(e) => setExpOperator(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-slate-100"
                required
              />
            </div>

            <div>
              <label className="text-slate-500 block mb-0.5 font-bold uppercase">Expense Date</label>
              <input
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-slate-100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[8.5px] pt-1">
            <div>
              <label className="text-slate-500 block mb-0.5 font-bold uppercase">Expense Category</label>
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-0.5 text-slate-205 font-sans"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-500 block mb-0.5 font-bold uppercase">Amount (INR ₹) *</label>
              <input
                type="number"
                min="1"
                placeholder="₹ Amount"
                value={expAmt}
                onChange={(e) => setExpAmt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-0.5 font-bold text-slate-200"
                required
              />
            </div>
          </div>

          <div className="pt-1">
            <label className="text-slate-500 block mb-0.5 font-bold uppercase font-sans text-[7.5px]">Description details *</label>
            <input
              type="text"
              placeholder="e.g. Paid cash for electricity bill, supplier logistics..."
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 text-[9px] font-sans"
              required
            />
          </div>

          {feedback && (
            <div className={`p-1.5 rounded text-[8.5px] text-center leading-normal ${feedback.startsWith("Error") ? 'bg-rose-500/15 border border-rose-500/20 text-rose-450' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
              {feedback}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-1.5 bg-pink-650 hover:bg-pink-500 text-white font-mono text-[9.5px] font-bold rounded-lg cursor-pointer transition uppercase"
          >
            Create Expense Row
          </button>
        </form>
      </div>

      {/* CHRONOLOGICAL EXPENSE LIST */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
        <span className="block text-[8.5px] font-mono text-slate-400 uppercase tracking-widest font-bold">
          🧾 Chronological Expenditure Passbook
        </span>

        <div className="space-y-1.5">
          {expenses.length === 0 ? (
            <span className="block text-slate-500 font-mono py-2 text-center border border-slate-850 border-dashed rounded text-[8px]">
              No expenses recorded.
            </span>
          ) : (
            expenses.slice().reverse().map((e) => (
              <div key={e.id} className="p-2 bg-slate-950 border border-slate-850 rounded hover:border-slate-800 transition flex justify-between items-center gap-1.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[7px] font-bold px-1 rounded bg-slate-900 border border-slate-800 text-slate-400 uppercase tracking-wide shrink-0">
                      {e.category}
                    </span>
                    <strong className="text-slate-200 truncate block text-[9px] font-sans">{e.description}</strong>
                  </div>
                  <span className="text-[7px] text-slate-500 block leading-none mt-1">
                    On: {e.date} • Operator Initials: {e.operator}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono shrink-0">
                  <span className="text-rose-450 font-black text-[9.5px]">₹{e.amount}</span>
                  {isManagerMode ? (
                    <button
                      onClick={() => {
                        if (window.confirm("Delete this expense record from bookkeeping?")) {
                          deleteExpense(e.id, "Manager billing user");
                        }
                      }}
                      className="p-1 hover:text-white text-rose-450 bg-rose-500/10 hover:bg-rose-500/20 rounded cursor-pointer shrink-0"
                      title="Delete expense"
                      type="button"
                    >
                      <Trash className="h-3 w-3" />
                    </button>
                  ) : (
                    <span 
                      className="text-slate-705 cursor-not-allowed select-none p-1 opacity-20" 
                      title="Manager approval required to delete"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
