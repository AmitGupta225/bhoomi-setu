import React, { useState } from 'react';
import { createProject } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FilePlus,
  Send,
  CheckCircle2,
  Building2,
  ArrowRight,
  Plus
} from 'lucide-react';

const INDIAN_STATES_AND_UTS = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi (NCT)', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const PREDEFINED_MINISTRIES = [
  'Ministry of Road Transport and Highways (MoRTH)',
  'Ministry of Railways (MoR)',
  'Ministry of Jal Shakti (Water Resources & River Development)',
  'Ministry of Power & Renewable Energy',
  'Ministry of Ports, Shipping and Waterways',
  'Ministry of Housing and Urban Affairs (MoHUA)',
  'Ministry of Civil Aviation',
  'Ministry of Heavy Industries',
  'Ministry of Environment, Forest and Climate Change (MoEFCC)'
];

const PREDEFINED_AGENCIES = [
  'National Highways Authority of India (NHAI)',
  'Indian Railways (IR / Dedicated Freight Corridor)',
  'National Water Development Agency (NWDA)',
  'NTPC Limited / Power Grid Corporation',
  'Inland Waterways Authority of India (IWAI)',
  'State Road Development Corporation',
  'State Industrial Development Corporation'
];

export const ProposalSubmission = ({ onNavigate }) => {
  const { setSelectedProjectId, addNotification , t } = useAuth();

  const [formData, setFormData] = useState({
    name: 'Mumbai-Nagpur Economic Corridor Phase II',
    ministry: 'Ministry of Road Transport and Highways (MoRTH)',
    customMinistry: '',
    agency: 'National Highways Authority of India (NHAI)',
    customAgency: '',
    state: 'Maharashtra',
    district: 'Thane',
    project_type: 'Expressway & Logistics Corridor',
    total_land_proposed_ha: 850.5,
    estimated_budget_cr: '4200',
    target_completion_date: '2028-12-31',
    project_category: 'Government Project',
    consent_percentage: '100'
  });

  const [isCustomMinistry, setIsCustomMinistry] = useState(false);
  const [isCustomAgency, setIsCustomAgency] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState(null);

  const handleMinistryChange = (val) => {
    if (val === 'CUSTOM') {
      setIsCustomMinistry(true);
      setFormData({ ...formData, ministry: '' });
    } else {
      setIsCustomMinistry(false);
      setFormData({ ...formData, ministry: val, customMinistry: '' });
    }
  };

  const handleAgencyChange = (val) => {
    if (val === 'CUSTOM') {
      setIsCustomAgency(true);
      setFormData({ ...formData, agency: '' });
    } else {
      setIsCustomAgency(false);
      setFormData({ ...formData, agency: val, customAgency: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const finalMinistry = isCustomMinistry ? formData.customMinistry : formData.ministry;
    const finalAgency = isCustomAgency ? formData.customAgency : formData.agency;

    if (!finalMinistry || !finalAgency) {
      alert('Please specify the Ministry and Executing Agency.');
      setLoading(false);
      return;
    }

    try {
      const res = await createProject({
        ...formData,
        ministry: finalMinistry,
        agency: finalAgency
      });
      if (res.success) {
        setSuccessResult(res);
        setSelectedProjectId(res.projectId);
        if (addNotification) {
          addNotification(`New Proposal Created: ${formData.name} (${res.projectId})`, 'collector');
        }
      }
    } catch (err) {
      alert('Error submitting proposal: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-[1200px] mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/30 p-6 rounded-3xl space-y-2 shadow-2xl">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
          <FilePlus className="w-4 h-4" />
          <span>Acquisition Proposal Portal</span>
        </div>
        <h1 className="text-2xl font-extrabold font-heading text-white">Submit New Land Acquisition Proposal</h1>
        <p className="text-xs text-slate-300 max-w-3xl">Initiate new land acquisition dossiers for Central Ministries, State Departments, or Infrastructure Bodies.</p>
      </div>

      {successResult ? (
        <div className="bg-slate-900/90 border border-emerald-500/50 rounded-3xl p-8 space-y-6 text-center shadow-2xl animate-in fade-in">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white font-heading">Land Acquisition Proposal Successfully Created!</h2>
            <p className="text-xs text-slate-400">Project Identifier:<span className="font-mono text-emerald-400 font-bold">{successResult.projectId}</span>
            </p>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl max-w-md mx-auto text-xs space-y-2 text-left text-slate-300">
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-slate-400">Project Title:</span>
              <strong className="text-white">{formData.name}</strong>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-slate-400">Ministry / Agency:</span>
              <strong className="text-slate-200">{isCustomAgency ? formData.customAgency : formData.agency}</strong>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-slate-400">State / District:</span>
              <strong className="text-slate-200">{formData.state}, {formData.district}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Proposed Land:</span>
              <strong className="text-emerald-400">{formData.total_land_proposed_ha} Hectares</strong>
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('workflow')}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-2xl text-xs transition shadow-lg inline-flex items-center gap-2"
            >
              <span>View Project Status</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 space-y-6 shadow-2xl">
          <h2 className="text-base font-bold text-white font-heading border-b border-slate-800 pb-3">Infrastructure Proposal & Official Land Requirements</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Project Title */}
            <div className="md:col-span-2">
              <label className="text-slate-300 font-semibold mb-1.5 block">Project Title / Infrastructure Corridor Name:</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Delhi-Mumbai Industrial Corridor Phase II"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Ministry Select or Create */}
            <div>
              <label className="text-slate-300 font-semibold mb-1.5 block">Government Body / Central or State Ministry:</label>
              <select
                value={isCustomMinistry ? 'CUSTOM' : formData.ministry}
                onChange={(e) => handleMinistryChange(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              >
                {PREDEFINED_MINISTRIES.map((m, idx) => (
                  <option key={idx} value={m}>{m}</option>
                ))}
                <option value="CUSTOM">+ Add Custom Government Body / Ministry</option>
              </select>

              {isCustomMinistry && (
                <input
                  type="text"
                  required
                  placeholder="Enter Government Body / Ministry Name"
                  value={formData.customMinistry}
                  onChange={(e) => setFormData({ ...formData, customMinistry: e.target.value })}
                  className="w-full p-3 mt-2 bg-slate-950 border border-emerald-500/50 rounded-xl text-white focus:outline-none"
                />
              )}
            </div>

            {/* Executing Agency Select or Create */}
            <div>
              <label className="text-slate-300 font-semibold mb-1.5 block">Project Executing Agency / Authority:</label>
              <select
                value={isCustomAgency ? 'CUSTOM' : formData.agency}
                onChange={(e) => handleAgencyChange(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              >
                {PREDEFINED_AGENCIES.map((a, idx) => (
                  <option key={idx} value={a}>{a}</option>
                ))}
                <option value="CUSTOM">+ Add Custom Executing Agency</option>
              </select>

              {isCustomAgency && (
                <input
                  type="text"
                  required
                  placeholder="Enter Executing Agency Name"
                  value={formData.customAgency}
                  onChange={(e) => setFormData({ ...formData, customAgency: e.target.value })}
                  className="w-full p-3 mt-2 bg-slate-950 border border-emerald-500/50 rounded-xl text-white focus:outline-none"
                />
              )}
            </div>

            {/* State Select */}
            <div>
              <label className="text-slate-300 font-semibold mb-1.5 block">State / Union Territory (India):</label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              >
                {INDIAN_STATES_AND_UTS.map((st, idx) => (
                  <option key={idx} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* District */}
            <div>
              <label className="text-slate-300 font-semibold mb-1.5 block">Target District:</label>
              <input
                type="text"
                required
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="e.g. Thane / Palghar / Gautam Buddha Nagar"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Proposed Land Area */}
            <div>
              <label className="text-slate-300 font-semibold mb-1.5 block">Total Estimated Land Requirement (Hectares):</label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.total_land_proposed_ha}
                onChange={(e) => setFormData({ ...formData, total_land_proposed_ha: e.target.value })}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Budget */}
            <div>
              <label className="text-slate-300 font-semibold mb-1.5 block">Estimated Project Budget (₹ Crores):</label>
              <input
                type="number"
                required
                value={formData.estimated_budget_cr}
                onChange={(e) => setFormData({ ...formData, estimated_budget_cr: e.target.value })}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-cyan-400 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Project Category */}
            <div>
              <label className="text-slate-300 font-semibold mb-1.5 block">Project Category:</label>
              <select
                value={formData.project_category}
                onChange={(e) => {
                  const val = e.target.value;
                  let newConsent = formData.consent_percentage;
                  if (val === 'Government Project') newConsent = '100';
                  
                  setFormData({ ...formData, project_category: val, consent_percentage: newConsent });
                }}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Government Project">Government Project</option>
                <option value="Public-Private Partnership (PPP)">Public-Private Partnership (PPP)</option>
                <option value="Private Company Acquisition">Private Company Acquisition</option>
              </select>
              
              {formData.project_category === 'Public-Private Partnership (PPP)' && (
                <p className="text-[10px] text-amber-400 mt-1 font-semibold">Affected family consent: 70% required</p>
              )}
              {formData.project_category === 'Private Company Acquisition' && (
                <p className="text-[10px] text-amber-400 mt-1 font-semibold">Affected family consent: 80% required</p>
              )}
              {formData.project_category === 'Government Project' && (
                <p className="text-[10px] text-emerald-400 mt-1 font-semibold">No consent required</p>
              )}
            </div>

            {/* Consent Status */}
            <div>
              <label className="text-slate-300 font-semibold mb-1.5 block">Affected Family Consent (%):</label>
              <input
                type="number"
                max="100"
                min="0"
                value={formData.consent_percentage}
                onChange={(e) => setFormData({ ...formData, consent_percentage: e.target.value })}
                disabled={formData.project_category === 'Government Project'}
                className={`w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 ${formData.project_category === 'Government Project' ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              {formData.project_category === 'Public-Private Partnership (PPP)' && Number(formData.consent_percentage) < 70 && (
                <p className="text-[10px] text-rose-400 mt-1 font-semibold">WARNING: PPP projects legally require minimum 70% consent.</p>
              )}
              {formData.project_category === 'Private Company Acquisition' && Number(formData.consent_percentage) < 80 && (
                <p className="text-[10px] text-rose-400 mt-1 font-semibold">WARNING: Private Company acquisitions legally require minimum 80% consent.</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-2xl text-xs transition shadow-lg shadow-emerald-950/50 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Submitting Proposal...' : 'Submit Land Acquisition Proposal'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
