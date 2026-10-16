import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Download,
  Search,
  Shield,
  Flame,
  AlertTriangle,
  Wind,
  LifeBuoy,
  FileText,
  Copy,
  Check
} from 'lucide-react';
import { SafetyDocument } from '../../types';
import { api } from '../../services/api';

export const SafetyProceduresView: React.FC = () => {
  const [docs, setDocs] = useState<SafetyDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<SafetyDocument | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      const res = await api.getSafetyDocs();
      setDocs(res);
      if (res.length > 0) setSelectedDoc(res[0]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyContent = () => {
    if (!selectedDoc) return;
    navigator.clipboard.writeText(selectedDoc.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDocIcon = (filename: string) => {
    if (filename.includes('chem')) return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    if (filename.includes('fire')) return <Flame className="w-4 h-4 text-rose-600" />;
    if (filename.includes('gas')) return <Wind className="w-4 h-4 text-cyan-600" />;
    return <Shield className="w-4 h-4 text-blue-600" />;
  };

  const filteredDocs = docs.filter(d =>
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Laboratory Safety Operating Procedures (SOP)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Authoritative regulatory guidelines for PPE requirements, chemical spill mitigation, gas leaks, and fire emergencies.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search procedures..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main Layout: Document List on Left, Document Viewer on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Selector Column */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-700 block px-1">Standard Operating Documents:</span>
          {filteredDocs.map(doc => {
            const isSelected = selectedDoc?.filename === doc.filename;
            return (
              <button
                key={doc.filename}
                onClick={() => setSelectedDoc(doc)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-300 shadow-xs'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    {getDocIcon(doc.filename)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{doc.title}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span>{doc.document_id}</span>
                      <span>·</span>
                      <span>Rev {doc.revision}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Document Content View */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          {selectedDoc ? (
            <div>
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedDoc.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>Document ID: <strong className="text-slate-700">{selectedDoc.document_id}</strong></span>
                    <span>·</span>
                    <span>Revision: <strong className="text-slate-700">{selectedDoc.revision}</strong></span>
                    <span>·</span>
                    <span>Class: <strong className="text-slate-700">{selectedDoc.classification}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyContent}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Text'}</span>
                  </button>
                </div>
              </div>

              {/* Formatted Content */}
              <div className="mt-6 text-xs text-slate-700 leading-relaxed font-sans max-h-[550px] overflow-y-auto pr-2 space-y-3 whitespace-pre-wrap">
                {selectedDoc.content}
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-medium">Select a safety procedure to view full standard operating guidelines.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
