import React, { useEffect, useState } from 'react';
import { fetchCompensationRecords, disburseCompensation, putCompensationHold, fetchProjects, updateWorkflowStage, fetchProjectDetail } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  IndianRupee,
  Calculator,
  Send,
  CheckCircle2,
  Lock,
  Clock,
  AlertTriangle,
  PauseCircle
} from 'lucide-react';

export const CompensationDisbursement = () => {
  const { activeRole, selectedProjectId, addNotification , t } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [disbursingId, setDisbursingId] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [stageId, setStageId] = useState(null);

  // Interactive Calculator State
  const [calcArea, setCalcArea] = useState(5.0);
  const [calcMarketRate, setCalcMarketRate] = useState(2000);
  const [calcMultiplier, setCalcMultiplier] = useState(2.0);
  const [calcStructureValue, setCalcStructureValue] = useState(500000);

  const canDisburseRole = activeRole.id === 'pfms_officer' || activeRole.id === 'collector';
  const isStageReady = activeProject && activeProject.current_stage_id >= 6;
  const canDisburse = canDisburseRole && isStageReady;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await fetchCompensationRecords(selectedProjectId);
      const projData = await fetchProjects();
      setRecords(data);
      if (selectedProjectId) {
        const found = projData.find(p => p.id === selectedProjectId) || null;
        setActiveProject(found);
        if (found) {
          const detail = await fetchProjectDetail(selectedProjectId);
          if (detail && detail.stages) {
            const s6 = detail.stages.find(s => s.stage_number === 6);
            if (s6) setStageId(s6.id);
          }
        }
      } else if (projData.length > 0) {
        setActiveProject(projData[0]);
      }
      setLoading(false);
    }
    loadData();
  }, [selectedProjectId]);

  const handleDisburse = async (compensationId) => {
    if (!canDisburse) {
      alert('Role Restriction: Only PFMS Finance Officers or SLAO/Collectors can authorize payouts.');
      return;
    }

    setDisbursingId(compensationId);
    try {
      const res = await disburseCompensation(compensationId);
      if (res.success) {
        setPaymentSuccess({
          msg: res.message,
          ref: res.pfmsReference,
          amount: res.disbursedAmount
        });
        if (addNotification) {
          const projName = activeProject ? activeProject.name : selectedProjectId;
          addNotification(`[${projName}] PFMS DBT Disbursed ₹ ${(res.disbursedAmount / 100000).toFixed(2)} Lakhs (Ref: ${res.pfmsReference})`);
        }
        const data = await fetchCompensationRecords(selectedProjectId);
        setRecords(data);
      }
    } catch (err) {
      alert('PFMS Payment Failed: ' + err.message);
    }
    setDisbursingId(null);
  };

  const handleHold = async (compensationId) => {
    if (!canDisburse) return;
    try {
      const res = await putCompensationHold(compensationId);
      if (res.success) {
        const projName = activeProject ? activeProject.name : selectedProjectId;
        if (addNotification) addNotification(`[${projName}] Payment Held for Verification`);
        const data = await fetchCompensationRecords(selectedProjectId);
        setRecords(data);
      }
    } catch (err) {
      alert('Hold Failed: ' + err.message);
    }
  };

  const handleCompleteStage = async () => {
    if (!stageId) return;
    try {
      const res = await updateWorkflowStage(stageId, {
        status: 'Approved',
        approved_by: activeRole.label,
        comments: 'All PFMS Disbursements Completed Successfully'
      });
      if (res.success) {
        alert('Stage 6 Marked as Completed!');
        const projName = activeProject ? activeProject.name : selectedProjectId;
        if (addNotification) addNotification(`[${projName}] Stage 6 Completed: Compensation Disbursed`);
        const projData = await fetchProjects();
        setActiveProject(projData.find(p => p.id === selectedProjectId));
      }
    } catch (err) {
      alert('Failed to complete stage: ' + err.message);
    }
  };

  // Statutory Calculation Engine (RFCTLARR Act)
  // Statutory Calculation Engine (RFCTLARR Act)
  const baseLandValue = (parseFloat(calcArea) || 0) * 10000 * (parseFloat(calcMarketRate) || 0);
  const multipliedLandValue = baseLandValue * parseFloat(calcMultiplier || 1);
  const solatium100 = multipliedLandValue + (parseFloat(calcStructureValue) || 0);
  const interest12PerAnnum = (multipliedLandValue + solatium100) * 0.12;
  const totalAssessedAward = multipliedLandValue + (parseFloat(calcStructureValue) || 0) + solatium100 + interest12PerAnnum;

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
            <IndianRupee className="w-4 h-4" />
            <span>PFMS API Direct Benefit Transfer (DBT) Portal</span>
          </div>
          <h1 className="text-2xl font-extrabold font-heading text-white mt-1">Statutory Compensation Assessment & Disbursement</h1>
          <p className="text-xs text-slate-400">Section 23 & 38 RFCTLARR Automated Solatium (100%) and Multiplier Engine</p>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl max-w-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-200">
            <strong className="font-bold text-rose-400 block mb-0.5">Section 24 Lapse Warning</strong>Acquisition proceedings shall lapse if compensation is not deposited within 2 years (730 days) of the Award declaration.</div>
        </div>
      </div>

      {canDisburseRole && isStageReady && activeProject.current_stage_id === 6 && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between">
          <div className="text-emerald-300 text-xs">
            <strong className="block font-bold">Stage 6: Compensation Disbursement Active</strong>Once all valid claims are disbursed, mark this stage as complete to proceed to Physical Possession.</div>
          <button 
            onClick={handleCompleteStage}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shrink-0"
          >Mark Stage 6 as Completed</button>
        </div>
      )}

      {!canDisburseRole ? (
        <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-xs text-amber-300 flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <strong className="block font-bold">ReadOnly Access Mode ({activeRole.label})</strong>
            <span>Direct Benefit Transfer execution requires PFMS Finance Nodal Officer or SLAO role. Switch active persona from the top header to disburse payments.</span>
          </div>
        </div>) : !isStageReady ? (<div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center gap-3">
          <Lock className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <strong className="block font-bold">PFMS Gateway Locked (Project Stage Pending)</strong>
            <span>Statutory Award Declaration (Stage 5) must be approved before triggering compensation payouts under RFCTLARR Act Section 19/37.</span>
          </div>
        </div>
      ) : null}

      {paymentSuccess && (
        <div className="p-4 bg-emerald-950/90 border border-emerald-500/60 rounded-2xl text-xs space-y-1 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-emerald-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{paymentSuccess.msg}</span>
          </div>
          <div className="text-slate-300 pl-7">PFMS Reference UTR:<strong className="font-mono text-cyan-400">{paymentSuccess.ref}</strong>• Disbursed Amount:<strong className="text-white">₹ {(paymentSuccess.amount / 100000).toFixed(2)} Lakhs</strong>
          </div>
        </div>
      )}

      {/* Land Valuation Simulator Engine */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6">
        <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
          <Calculator className="w-4 h-4" />
          <span>Land Valuation Calculator</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Land Area (Hectares):</label>
            <input
              type="number"
              value={calcArea}
              onChange={(e) => setCalcArea(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Market Rate per Sqm (₹):</label>
            <input
              type="number"
              value={calcMarketRate}
              onChange={(e) => setCalcMarketRate(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">State Multiplier:</label>
            <select
              value={calcMultiplier}
              onChange={(e) => setCalcMultiplier(parseFloat(e.target.value))}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value={1.5}>1.5x (Urban Area)</option>
              <option value={2.0}>2.0x (Rural Area Mandate)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Structure/Tree Value (₹):</label>
            <input
              type="number"
              value={calcStructureValue}
              onChange={(e) => setCalcStructureValue(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Calculation Result Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
          <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Multiplied Base Value</span>
            <div className="text-base font-bold text-white font-mono mt-1">₹ {(multipliedLandValue / 100000).toFixed(2)} Lakhs</div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">100% Solatium</span>
            <div className="text-base font-bold text-emerald-400 font-mono mt-1">₹ {(solatium100 / 100000).toFixed(2)} Lakhs</div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">12% Interest Per Annum</span>
            <div className="text-base font-bold text-amber-400 font-mono mt-1">₹ {(interest12PerAnnum / 100000).toFixed(2)} Lakhs</div>
          </div>

          <div className="p-4 bg-gradient-to-br from-emerald-950 to-slate-900 rounded-2xl border border-emerald-500/40">
            <span className="text-[11px] text-emerald-300 font-semibold block">Total Award Amount</span>
            <div className="text-lg font-extrabold text-emerald-400 font-mono mt-1">₹ {(totalAssessedAward / 100000).toFixed(2)} Lakhs</div>
          </div>
        </div>
      </div>

      {/* Compensation Ledger & PFMS Disbursement Actions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white font-heading">PFMS Direct Benefit Transfer Disbursement Ledger</h2>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 border-b border-slate-700">Landowner & Village</th>
                <th className="py-3.5 px-4 border-b border-slate-700">Survey No</th>
                <th className="py-3.5 px-4 border-b border-slate-700">Land Value + Assets</th>
                <th className="py-3.5 px-4 border-b border-slate-700">100% Solatium</th>
                <th className="py-3.5 px-4 border-b border-slate-700">Total Assessed Award</th>
                <th className="py-3.5 px-4 border-b border-slate-700">Disbursement Status</th>
                <th className="py-3.5 px-4 border-b border-slate-700 text-right">PFMS Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {records.map((rec) => {
                const isDisbursed = rec.disbursement_status === 'Disbursed';
                const isOnHold = rec.disbursement_status === 'On Hold';
                
                let daysSinceAward = 0;
                let isLapseRisk = false;
                if (rec.award_approval_date) {
                  const awardDate = new Date(rec.award_approval_date);
                  const today = new Date();
                  daysSinceAward = Math.floor((today - awardDate) / (1000 * 60 * 60 * 24));
                  isLapseRisk = daysSinceAward > 730;
                }
                const daysRemaining = 730 - daysSinceAward;

                return (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center gap-1.5">
                        {rec.owner_name}
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400" title="Aadhaar e-KYC Verified">
                          <CheckCircle2 className="w-3 h-3" />
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">{rec.village}, {rec.district}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-400">
                      {rec.survey_number}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      ₹ {(rec.land_value_rs / 100000).toFixed(2)} Lakhs
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-400">
                      ₹ {(rec.solatium_100_percent_rs / 100000).toFixed(2)} Lakhs
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-300">
                      ₹ {(rec.total_assessed_rs / 100000).toFixed(2)} Lakhs
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${isDisbursed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                        {rec.disbursement_status}
                      </span>
                      {rec.pfms_reference_no && (
                        <span className="text-[10px] font-mono text-slate-400 block mt-1">Ref: {rec.pfms_reference_no}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isDisbursed ? (
                        <span className="text-emerald-400 text-[11px] font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Paid</span>
                        </span>
                      ) : (
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleHold(rec.id)}
                              disabled={!canDisburse || disbursingId === rec.id}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-bold rounded-lg text-[10px] transition shadow flex items-center gap-1.5"
                            >
                              <PauseCircle className="w-3 h-3" />Hold</button>
                            <button
                              onClick={() => handleDisburse(rec.id)}
                              disabled={!canDisburse || disbursingId === rec.id}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-xl text-[11px] transition shadow-md inline-flex items-center gap-1.5"
                            >
                              {!canDisburse ? <Lock className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                              <span>{disbursingId === rec.id ? 'Processing...' : 'Initiate DBT Transfer'}</span>
                            </button>
                          </div>
                          {rec.award_approval_date && !isDisbursed && (
                            <span className={`text-[10px] font-bold flex items-center gap-1 ${isLapseRisk ? 'text-rose-400' : 'text-amber-400'}`}>
                              <Clock className="w-3 h-3" />
                              {isLapseRisk ? 'LAPSE RISK: Exceeded 2 Yrs' : `${daysRemaining} days left (Sec 24)`}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
