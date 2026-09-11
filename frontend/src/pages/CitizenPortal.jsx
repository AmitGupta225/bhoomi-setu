import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchParcels, checkULPIN, fetchMyLandRecord, submitGrievance, fetchGrievances, closeGrievance } from '../services/api';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  FileText,
  IndianRupee,
  Send,
  Building,
  Landmark,
  Clock,
  MapPin,
  Scale,
  Layers,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';

export const CitizenPortal = () => {
  const { user , t } = useAuth();
  const [allParcels, setAllParcels] = useState([]);
  const [selectedUlpin, setSelectedUlpin] = useState('');
  const [activeData, setActiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingParcel, setFetchingParcel] = useState(false);
  const [grievanceText, setGrievanceText] = useState('');
  const [grievanceSubmitted, setGrievanceSubmitted] = useState(false);
  const [myGrievances, setMyGrievances] = useState([]);
  const [lang, setLang] = useState('en');

  
  useEffect(() => {
    initPortal();
  }, [user]);

  const initPortal = async () => {
    setLoading(true);
    const isCitizen = user?.roleKey === 'CITIZEN' || user?.roleKey === 'LANDOWNER';

    // Fetch land parcels from backend database
    const parcelsList = await fetchParcels(isCitizen && user?.email ? { owner_email: user.email } : {});

    // Strict Security Filter: Landowners see ONLY their own land parcels
    let userParcels = [];
    if (isCitizen) {
      const userEmail = user?.email?.toLowerCase();
      const userNameClean = user?.name?.split('(')[0]?.trim()?.toLowerCase();

      userParcels = (parcelsList || []).filter(p =>
        (p.owner_email && p.owner_email.toLowerCase() === userEmail) ||
        (p.owner_name && userNameClean && p.owner_name.toLowerCase().includes(userNameClean))
      );
    } else {
      userParcels = parcelsList || [];
    }

    setAllParcels(userParcels);

    // Auto-fetch logged-in user's relational land parcel
    const myRecord = await fetchMyLandRecord(user?.email);
    if (myRecord.success && myRecord.parcel) {
      setActiveData(myRecord);
      setSelectedUlpin(myRecord.parcel.ulpin);
    } else if (userParcels && userParcels.length > 0) {
      setSelectedUlpin(userParcels[0].ulpin);
      const res = await checkULPIN(userParcels[0].ulpin);
      formatAndSetActiveData(res, userParcels[0]);
    } else {
      setActiveData(null);
      setSelectedUlpin('');
    }
    await loadGrievances();
    setLoading(false);
  };

  const handleSelectParcel = async (ulpin) => {
    setSelectedUlpin(ulpin);
    if (!ulpin) return;
    setFetchingParcel(true);

    const res = await checkULPIN(ulpin);
    const matched = allParcels.find(p => p.ulpin === ulpin);
    formatAndSetActiveData(res, matched);

    setFetchingParcel(false);
  };

  const formatAndSetActiveData = (ulpinRes, parcelObj) => {
    if (!ulpinRes || !ulpinRes.verified) return;

    const area = ulpinRes.landDetails?.areaHa || parcelObj?.area_ha || 1.0;
    const rate = parcelObj?.market_rate_sqm || 4800;
    const mult = parcelObj?.statutory_multiplier || 1.5;

    // Dynamic Area-Scaled Compensation Formulas
    const landVal = ulpinRes.disbursementDetails?.landValue || (area * 10000 * rate * mult);
    const solatiumVal = ulpinRes.disbursementDetails?.solatiumAmount || landVal;
    const structVal = ulpinRes.disbursementDetails?.structureAssets || 0;
    const totalAward = ulpinRes.disbursementDetails?.totalAssessed || (landVal + solatiumVal + structVal);

    setActiveData({
      parcel: {
        id: parcelObj?.id || ulpinRes.landDetails?.id || 'PARCEL-01',
        ulpin: ulpinRes.landDetails.ulpin,
        surveyNumber: ulpinRes.landDetails.surveyNumber,
        khataNumber: ulpinRes.landDetails.khataNumber,
        ownerName: ulpinRes.landDetails.owner,
        ownerEmail: parcelObj?.owner_email || user?.email || 'landowner.public@gmail.com',
        village: ulpinRes.landDetails.village,
        tehsil: parcelObj?.tehsil || 'Palghar',
        district: ulpinRes.landDetails.district,
        state: ulpinRes.landDetails.state,
        areaHa: area,
        landType: parcelObj?.land_type || 'Acquired Land Parcel',
        marketRateSqm: rate,
        multiplier: mult,
        status: parcelObj?.status || 'Possessed',
        projectName: parcelObj?.project_name || 'Delhi-Mumbai Expressway Industrial Corridor'
      },
      disbursement: {
        landValue: landVal,
        solatiumAmount: solatiumVal,
        structureAssets: structVal,
        totalAssessed: totalAward,
        totalDisbursed: ulpinRes.disbursementDetails?.totalDisbursed || totalAward,
        disbursementStatus: ulpinRes.disbursementDetails?.disbursementStatus || 'Disbursed',
        pfmsRefNo: ulpinRes.disbursementDetails?.pfmsRefNo || 'PFMS-2026-TXN-680002',
        bankAccountMasked: ulpinRes.disbursementDetails?.bankAccountMasked || 'XXXX-XXXX-4812',
        ifscCode: ulpinRes.disbursementDetails?.ifscCode || 'SBIN0000412',
        paymentDate: ulpinRes.disbursementDetails?.paymentDate || '2026-08-15'
      }
    });
  };

  const loadGrievances = async () => {
    if (user?.email) {
      const res = await fetchGrievances(user.email);
      setMyGrievances(res || []);
    }
  };

  const handleGrievance = async (e) => {
    e.preventDefault();
    if (!grievanceText || !activeData?.parcel) return;

    setGrievanceSubmitted(true);
    const payload = {
      ulpin: activeData.parcel.ulpin,
      owner_name: activeData.parcel.ownerName,
      owner_email: activeData.parcel.ownerEmail,
      description: grievanceText
    };

    const res = await submitGrievance(payload);

    if (res.success) {
      setGrievanceText('');
      await loadGrievances();
      setTimeout(() => setGrievanceSubmitted(false), 5000);
    } else {
      setGrievanceSubmitted(false);
      alert('Failed to submit grievance: ' + res.error);
    }
  };

  const handleCloseGrievance = async (id) => {
    const res = await closeGrievance(id);
    if (res.success) {
      await loadGrievances();
    } else {
      alert('Failed to close grievance: ' + res.error);
    }
  };

  const activeParcel = activeData?.parcel;
  const activeDisbursement = activeData?.disbursement;

  return (
    <div className="px-2.5 sm:px-4 lg:px-8 py-3 sm:py-6 space-y-4 sm:space-y-8 max-w-[1400px] mx-auto font-sans text-slate-100">
      {/* Top Banner with Auto-Authenticated Landowner Identity */}
      <div className="bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-900 border border-purple-500/30 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-3 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
            <Users className="w-4 h-4" />
            <span>{t('Citizen Landowner Acquisition & Compensation Dashboard')}</span>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-white">
            {t('Welcome')}, {t(user?.name) || 'Ramesh Baliram Patil'}
          </h1>
          <p className="text-xs text-slate-300 max-w-3xl">
            {t('Track statutory land acquisition proceedings, view compensation computation under RFCTLARR Act 2013, and inspect PFMS direct bank disbursement.')}
          </p>
        </div>
      </div>

      {/* Dropdown Land Parcel Selection Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 font-heading">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>{user?.roleKey === 'CITIZEN' ? t("Your Registered Land Parcel(s):") : t("Select Project Land Parcel to Inspect:")}</span>
          </label>
          {fetchingParcel && (
            <span className="text-[11px] text-purple-400 font-semibold animate-pulse">{t('Fetching parcel ledger...')}</span>
          )}
        </div>

        <div className="relative">
          <select
            value={selectedUlpin}
            onChange={(e) => handleSelectParcel(e.target.value)}
            className="w-full pl-4 pr-10 py-3.5 bg-slate-950 border border-slate-700 rounded-2xl text-xs text-white appearance-none focus:outline-none focus:border-purple-500 font-medium cursor-pointer shadow-inner"
          >
            {allParcels.map((p) => (
              <option key={p.id} value={p.ulpin} className="bg-slate-900 text-white">
                {p.ulpin} — {t('Owner')}: {t(p.owner_name)} ({t(p.village || p.district)}, {t('Area')}: {p.area_ha} {t('Ha')})
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-4 pointer-events-none" />
        </div>
      </div>

      {/* Relational Land Parcel & Area-Based Compensation Dashboard */}
      {loading ? (
        <div className="p-8 sm:p-12 text-center text-slate-400 text-sm font-semibold bg-slate-900/60 rounded-2xl sm:rounded-3xl border border-slate-800 animate-pulse">{t('Loading your verified land acquisition record from database...')}</div>) : activeParcel && (<div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-5 sm:space-y-6 shadow-2xl animate-in fade-in duration-300">
          {/* Card Header: Owner & Parcel Relational Link */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{t('ULPIN Bhu-Aadhaar:')} <span className="notranslate">{activeParcel.ulpin}</span></span>
              </div>
              <h2 className="text-xl font-bold text-white font-heading">
                {t(activeParcel.ownerName)}
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-400" />
                <span>{t('Survey No.')} {activeParcel.surveyNumber} ({t('Khata')} {activeParcel.khataNumber}), {t(activeParcel.village)}, {t(activeParcel.district)}, {t(activeParcel.state)}</span>
              </p>
            </div>

            <div className="text-right space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t('Infrastructure Project')}</span>
              <span className="px-3 py-1 bg-purple-950/60 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold block">
                {t(activeParcel.projectName)}
              </span>
            </div>
          </div>

          {/* Area & Statutory Multiplier Factor Breakdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-slate-400 font-medium">{t('Acquired Plot Area')}</span>
              <div className="text-lg font-black text-cyan-400">{activeParcel.areaHa} {t('Hectares')}</div>
              <span className="text-[10px] text-slate-500 block">({(activeParcel.areaHa * 10000).toLocaleString('en-IN')} {t('Sq. Meters')})</span>
            </div>

            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-slate-400 font-medium">{t('Land Category & Rate')}</span>
              <div className="text-sm font-bold text-white truncate">{t(activeParcel.landType)}</div>
              <span className="text-[10px] text-emerald-400 block font-mono">₹ {(activeParcel.marketRateSqm || 4800).toLocaleString('en-IN')} / {t('Sqm')}</span>
            </div>

            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-slate-400 font-medium">{t('RFCTLARR Statutory Multiplier')}</span>
              <div className="text-lg font-black text-purple-400">{activeParcel.multiplier || 1.5}x {t('Multiplier')}</div>
              <span className="text-[10px] text-slate-500 block">{t('Rural/Suburban Multiplier Factor')}</span>
            </div>

            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-slate-400 font-medium">{t('Acquisition Status')}</span>
              <div className="text-sm font-bold text-emerald-400 uppercase">{t(activeParcel.status || 'Possessed')}</div>
              <span className="text-[10px] text-slate-500 block">{t('Statutory Section 19 Approved')}</span>
            </div>
          </div>

          {/* Area-Scaled Financial Compensation Breakdown */}
          {activeDisbursement && (
            <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-950 to-emerald-950/30 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white font-heading">{t('Area-Scaled Statutory Compensation Computation')}</h3>
                </div>
                <span className="text-[11px] text-emerald-400 font-medium">{t('Computed dynamically from acquired area')}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-slate-400 font-medium">{t('Calculated Land Value')}</span>
                  <div className="text-base font-extrabold text-white flex items-center gap-0.5">
                    <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                    <span>{Math.round(activeDisbursement.landValue || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{t('Area × Market Rate × Multiplier')}</span>
                </div>

                <div className="p-3 bg-slate-900/60 border border-emerald-500/30 rounded-xl space-y-1">
                  <span className="text-emerald-400 font-bold">{t('100% Solatium Right')}</span>
                  <div className="text-base font-extrabold text-emerald-400 flex items-center gap-0.5">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{Math.round(activeDisbursement.solatiumAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <span className="text-[10px] text-emerald-500">{t('100% Compulsory Bonus')}</span>
                </div>

                <div className="p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-xl space-y-1">
                  <span className="text-white font-black">{t('Net Statutory Award')}</span>
                  <div className="text-lg font-black text-emerald-300 flex items-center gap-0.5">
                    <IndianRupee className="w-4 h-4 text-emerald-400" />
                    <span>{Math.round(activeDisbursement.totalAssessed || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400">{t('Total Compensation Payable')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Grid: Live PFMS Bank Disbursement Status Card & Grievance Form */}
      {activeDisbursement && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Actual Bank Disbursement Status Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white font-heading">{t('Actual Bank Disbursement Status')}</h2>
                  <p className="text-[11px] text-slate-400">{t('PFMS Direct Benefit Transfer (DBT) Treasury Ledger')}</p>
                </div>
              </div>

              <span className={`px-3 py-1 text-xs font-black uppercase rounded-full border ${activeDisbursement.disbursementStatus === 'Disbursed'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : activeDisbursement.disbursementStatus === 'Disputed'
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                }`}>
                {activeDisbursement.disbursementStatus === 'Disbursed' ? `✓ ${t('Disbursed')}` : t(activeDisbursement.disbursementStatus)}
              </span>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-slate-400 font-medium">{t('Total Disbursed to Bank')}</span>
                <div className="text-lg font-black text-white flex items-center gap-0.5">
                  <IndianRupee className="w-4 h-4 text-emerald-400" />
                  <span>{Math.round(activeDisbursement.totalDisbursed || activeDisbursement.totalAssessed || 0).toLocaleString('en-IN')}</span>
                </div>
                <span className="text-[10px] text-slate-500 block">{t('PFMS Treasury Batch Clearance')}</span>
              </div>

              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-slate-400 font-medium">{t('Included Solatium Bonus')}</span>
                <div className="text-lg font-black text-emerald-400 flex items-center gap-0.5">
                  <IndianRupee className="w-4 h-4 text-emerald-400" />
                  <span>{Math.round(activeDisbursement.solatiumAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <span className="text-[10px] text-slate-500 block">{t('Compulsory 100% Solatium Transfer')}</span>
              </div>
            </div>

            {/* PFMS Bank Transfer Details */}
            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-300 border-b border-slate-800/60 pb-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('PFMS Transaction Ref:')}</span>
                </span>
                <span className="font-mono font-bold text-cyan-300">{t(activeDisbursement.pfmsRefNo || 'PFMS-2026-TXN-680002')}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300 border-b border-slate-800/60 pb-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t('Beneficiary Bank Account:')}</span>
                </span>
                <span className="font-mono font-semibold text-slate-200">{activeDisbursement.bankAccountMasked || 'XXXX-XXXX-4812'} ({activeDisbursement.ifscCode || 'SBIN0000412'})</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('DBT Transfer Credit Date:')}</span>
                </span>
                <span className="font-semibold text-emerald-400">{t(activeDisbursement.paymentDate || '2026-08-15')}</span>
              </div>
            </div>
          </div>

          {/* Grievance Redressal Form & Past Petitions */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-5 sm:space-y-6 shadow-2xl flex flex-col">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <MessageSquare className="w-4 h-4" />
                <span>{t('Online Grievance & Appeal Redressal')}</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{t('Have an issue regarding compensation assessment, ownership records, or R&R plot allotment? Submit your petition directly to the District Land Acquisition Authority.')}</p>

              {grievanceSubmitted && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs font-semibold text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{t('Grievance petition registered successfully!')}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleGrievance} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 mb-1 block font-semibold">{t('Petition / Complaint Description:')}</label>
                <textarea
                  rows={4}
                  value={grievanceText}
                  onChange={(e) => setGrievanceText(e.target.value)}
                  placeholder={t('Describe your claim or objection in detail...')}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40"
              >
                <Send className="w-4 h-4" />
                <span>{t('Submit Petition to Collectorate')}</span>
              </button>
            </form>

            {/* My Past Petitions */}
            {myGrievances.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-slate-400" />
                  <span>{t('My Past Petitions')} ({myGrievances.length})</span>
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {myGrievances.map(g => (
                    <div key={g.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">{g.token_no}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${g.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-400' : g.status === 'Official Replied' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                          {t(g.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{t(g.description)}</p>
                      {g.remarks && (
                        <div className="p-2 bg-indigo-950/30 border-l-2 border-indigo-500 text-[11px] text-indigo-300 mt-2">
                          <strong>{t('Collectorate Reply:')}</strong> {t(g.remarks)}
                        </div>
                      )}

                      {g.status === 'Official Replied' && (
                        <div className="pt-2">
                          <button
                            onClick={() => handleCloseGrievance(g.id)}
                            className="w-full py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-400 text-xs font-bold rounded-lg transition"
                          >
                            {t('Mark Issue as Resolved')}
                          </button>
                        </div>
                      )}

                      <div className="text-[9px] text-slate-500 text-right">
                        {t('Submitted:')} {new Date(g.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
