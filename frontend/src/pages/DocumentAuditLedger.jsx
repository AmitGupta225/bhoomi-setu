import React, { useEffect, useState } from 'react';
import { fetchDocuments, fetchAuditLogs, registerDocument, fetchProjects } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  FileCheck2, 
  ShieldCheck, 
  Upload, 
  CheckCircle2, 
  FileText,
  Plus,
  GitBranch,
  History,
  FileUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const DocumentAuditLedger = () => {
  const { activeRole, selectedProjectId, addNotification , t } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('docs'); // 'docs' or 'audit'
  const [expandedDocs, setExpandedDocs] = useState({});
  
  // Upload Form Modal State
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('Preliminary Gazette Notification');
  const [targetProject, setTargetProject] = useState(selectedProjectId || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [docVersion, setDocVersion] = useState('v1.0');
  const [uploadSuccess, setUploadSuccess] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const docs = await fetchDocuments(selectedProjectId);
      const logs = await fetchAuditLogs();
      const projs = await fetchProjects();
      setDocuments(docs);
      // Filter audit logs specifically related to Document Audit History and current project
      const docLogs = logs.filter(l => 
        (l.action.toLowerCase().includes('document') || 
         l.action.toLowerCase().includes('gazette') ||
         l.details.toLowerCase().includes('.pdf') ||
         l.action.toLowerCase().includes('proposal')) &&
         (!selectedProjectId || l.details.includes(selectedProjectId))
      );
      setAuditLogs(docLogs.length > 0 ? docLogs : logs.filter(l => !selectedProjectId || l.details.includes(selectedProjectId)));
      setProjects(projs);
      if (projs.length > 0 && !targetProject) {
        setTargetProject(selectedProjectId || projs[0].id);
      }
      setLoading(false);
    }
    loadData();
  }, [selectedProjectId]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    const finalFileName = selectedFile ? selectedFile.name : `${docType.replace(/ /g, '_')}_${Date.now()}.pdf`;
    
    try {
      const res = await registerDocument({
        project_id: targetProject || selectedProjectId,
        title: docTitle || (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, "") : 'Official Document'),
        doc_type: docType,
        file_name: finalFileName,
        uploaded_by: `${activeRole.label}`
      });

      if (res.success) {
        setUploadSuccess(`PDF File "${finalFileName}" (${docVersion}) successfully uploaded and registered.`);
        if (addNotification) {
          const projName = activeProject ? activeProject.name : selectedProjectId;
          addNotification(`[${projName}] New PDF Document Uploaded: "${finalFileName}" (${docVersion})`);
        }
        setShowUploadForm(false);
        setDocTitle('');
        setSelectedFile(null);
        const updatedDocs = await fetchDocuments();
        setDocuments(updatedDocs);
        setTimeout(() => setUploadSuccess(''), 5000);
      }
    } catch (err) {
      alert('Document Upload Error: ' + err.message);
    }
  };
  const toggleDocExpand = (type) => {
    setExpandedDocs(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const groupedDocuments = documents.reduce((acc, doc) => {
    if (!acc[doc.doc_type]) acc[doc.doc_type] = [];
    acc[doc.doc_type].push(doc);
    return acc;
  }, {});

  // Sort each group so the most recent is first
  Object.keys(groupedDocuments).forEach(type => {
    groupedDocuments[type].sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || 0) || b.id.localeCompare(a.id));
  });

  if (loading) {
    return <div className="p-8 animate-pulse text-emerald-400">{t('Loading Document Repository...')}</div>;
  }

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Top Banner Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <FileCheck2 className="w-4 h-4" />
            <span>{t('Digital Repository & E-Signed Verification Vault')}</span>
          </div>
          <h1 className="text-2xl font-extrabold font-heading text-white mt-1">{t('Official Gazette & Document Repository')}</h1>
          <p className="text-xs text-slate-400">{t('Secure PDF document upload repository with version control and document audit history.')}</p>
        </div>

        {/* Action Controls & Tab Toggle */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{t('Upload PDF Document')}</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('docs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'docs' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>{t('Document Repository & Versions')}</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'audit' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{t('Document Audit History')} ({auditLogs.length})</span>
            </button>
          </div>
        </div>
      </div>

      {uploadSuccess && (
        <div className="p-4 bg-emerald-950/90 border border-emerald-500/60 rounded-2xl text-xs font-semibold text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{t(uploadSuccess)}</span>
        </div>
      )}

      {/* PDF Document Upload Form Modal */}
      {showUploadForm && (
        <form onSubmit={handleUploadSubmit} className="bg-slate-900/95 border border-slate-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-5 shadow-2xl animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <FileUp className="w-4 h-4" />
              <span>{t('Upload Official Statutory PDF File')}</span>
            </div>
            <span className="text-xs text-slate-400">{t('PDF Files Only (Max 25MB)')}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-300 font-semibold mb-1 block">{t('Target Infrastructure Project:')}</label>
              <select
                value={targetProject}
                onChange={(e) => setTargetProject(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{t(p.name)} ({p.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold mb-1 block">{t('Document Type / Category:')}</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Initial Proposal Dossier">{t('Initial Proposal Dossier')}</option>
                <option value="Social Impact Study Report">{t('Social Impact Study Report')}</option>
                <option value="Preliminary Gazette Notification">{t('Preliminary Gazette Notification')}</option>
                <option value="Final Acquisition Declaration Gazette">{t('Final Acquisition Declaration Gazette')}</option>
                <option value="Land Valuation & Award Dossier">{t('Land Valuation & Award Dossier')}</option>
                <option value="Rehabilitation Housing Master Plan">{t('Rehabilitation Housing Master Plan')}</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold mb-1 block">{t('Document Version Tag:')}</label>
              <select
                value={docVersion}
                onChange={(e) => setDocVersion(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="v1.0">{t('v1.0 (Initial Official Release)')}</option>
                <option value="v1.1">{t('v1.1 (Minor Correction / Amendment)')}</option>
                <option value="v2.0">{t('v2.0 (Revised Gazette / Re-issued Award)')}</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="text-slate-300 font-semibold mb-1 block">{t('Document Title / Notification Reference:')}</label>
              <input
                type="text"
                required
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder={t('e.g. Gazette Notification No. S.O. 1928(E) dated 15-Feb-2026')}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Native File Upload Area */}
            <div className="md:col-span-3">
              <label className="text-slate-300 font-semibold mb-1 block">{t('Select PDF Document File from Device:')}</label>
              <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-6 bg-slate-950/80 text-center relative group transition cursor-pointer">
                <input
                  type="file"
                  required
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                      if (!docTitle) {
                        setDocTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                      }
                    }
                  }}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                />
                <div className="space-y-2 pointer-events-none">
                  <Upload className="w-8 h-8 text-emerald-400 mx-auto group-hover:scale-110 transition" />
                  {selectedFile ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <span>{selectedFile.name}</span>
                      </p>
                      <span className="text-[10px] text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB • {t('PDF Document Ready for Upload')}</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-300 font-bold">{t('Click here to Select PDF File or Drag & Drop File')}</p>
                      <p className="text-[10px] text-slate-500">{t('Supports PDF format (Max 25 MB)')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowUploadForm(false)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
            >
              {t('Cancel')}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>{t('Upload PDF Document')}</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'docs' ? (
        /* Digital Document Repository & Version Control Table */
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-heading">{t('Official Gazette Notifications & Document Version Vault')}</h2>
            <span className="text-xs text-emerald-400 font-bold">
              {documents.length} {t('File(s) Registered & Digitally Signed')}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-300 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 border-b border-slate-700">{t('Document Title & File')}</th>
                  <th className="py-3.5 px-4 border-b border-slate-700">{t('Version')}</th>
                  <th className="py-3.5 px-4 border-b border-slate-700">{t('Category')}</th>
                  <th className="py-3.5 px-4 border-b border-slate-700">{t('Verification Status')}</th>
                  <th className="py-3.5 px-4 border-b border-slate-700">{t('Uploaded Authority')}</th>
                  <th className="py-3.5 px-4 border-b border-slate-700 text-right">{t('Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {Object.keys(groupedDocuments).map((type, tIdx) => {
                  const docs = groupedDocuments[type];
                  const latestDoc = docs[0];
                  const hasHistory = docs.length > 1;
                  const isExpanded = expandedDocs[type];

                  return (
                    <React.Fragment key={type}>
                      <tr className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div className="flex items-start gap-2">
                            {hasHistory && (
                              <button 
                                onClick={() => toggleDocExpand(type)}
                                className="mt-0.5 p-0.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                            <div>
                              <div>{t(latestDoc.title)}</div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-normal mt-0.5">
                                <FileText className="w-3 h-3 text-slate-500" />
                                <span className="font-mono text-slate-300">{latestDoc.file_name || `Gazette_Document_${latestDoc.id}.pdf`}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                          <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-[10px]">
                            {latestDoc.title.match(/v\d+\.\d+/) ? latestDoc.title.match(/v\d+\.\d+/)[0] : 'v1.0'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded bg-slate-800 text-emerald-300 text-[10px] font-medium">
                            {t(latestDoc.doc_type)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>{t("Verified")}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-medium">
                          {t(latestDoc.uploaded_by)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {hasHistory && !isExpanded && (
                              <button
                                onClick={() => toggleDocExpand(type)}
                                className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700 text-slate-400 text-[11px] font-medium rounded-lg transition border border-slate-700/50"
                              >
                                {docs.length - 1} {t('Previous Versions')}
                              </button>
                            )}
                            <button
                              onClick={() => alert(`Opening verified PDF document file: "${latestDoc.file_name || latestDoc.title}.pdf"\n\nVersion: ${latestDoc.title.match(/v\d+\.\d+/) ? latestDoc.title.match(/v\d+\.\d+/)[0] : 'v1.0'}\ne-Sign Authority: ${t(latestDoc.uploaded_by)}`)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-slate-300 font-bold text-[11px] rounded-lg transition border border-slate-700 flex items-center gap-1.5"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>{t("View PDF")}</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Sub-rows for History */}
                      {isExpanded && hasHistory && docs.slice(1).map((oldDoc, hIdx) => (
                        <tr key={oldDoc.id} className="bg-slate-950/40 hover:bg-slate-800/20 transition">
                          <td className="py-2.5 px-4 pl-12 font-semibold text-slate-400">
                            <div className="flex items-center gap-2">
                              <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                              <div>{t(oldDoc.title)}</div>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-normal mt-0.5 pl-5">
                              <span className="font-mono">{oldDoc.file_name || `Gazette_Document_${oldDoc.id}.pdf`}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-mono font-medium text-slate-400 text-[10px]">
                            {oldDoc.title.match(/v\d+\.\d+/) ? oldDoc.title.match(/v\d+\.\d+/)[0] : 'v1.0'}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="text-slate-500 text-[10px]">{t(oldDoc.doc_type)}</span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="text-slate-500 text-[10px] italic">{t('Archived')}</span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 text-xs">
                            {t(oldDoc.uploaded_by)}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => alert(`Opening archived PDF document file: "${oldDoc.file_name || oldDoc.title}.pdf"\n\nVersion: ${oldDoc.title.match(/v\d+\.\d+/) ? oldDoc.title.match(/v\d+\.\d+/)[0] : 'v1.0'}`)}
                              className="px-2 py-1 bg-slate-900 hover:bg-slate-700 text-slate-400 text-[10px] rounded transition border border-slate-800 flex items-center gap-1.5 ml-auto"
                            >
                              <History className="w-3 h-3" />
                              <span>{t('View Archive')}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>) : (
        /* Document Audit History Log Table */<div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-heading">{t('Document Access & Modification Audit History')}</h2>
            <span className="text-xs text-slate-400">{t('Immutable log of document registrations, verifications & gazette revisions')}</span>
          </div>

          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{t(log.action)}</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-emerald-400 rounded text-[10px] font-mono">
                      {t(log.user_role)}
                    </span>
                  </div>
                  <p className="text-slate-400">{t(log.details)}</p>
                </div>
                <div className="text-right shrink-0 text-slate-500 text-[11px] font-mono">
                  {t(log.user_name)} • {new Date(log.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
