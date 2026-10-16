import React from 'react';
import {
  ShieldCheck,
  Cpu,
  Database,
  BookOpen
} from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-8 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-blue-300 border border-white/10">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Smart Lab Safety System</h1>
            <p className="text-xs text-blue-200 mt-1">
              AI-Powered Laboratory Safety Monitoring & PPE Compliance Detection Architecture
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-300 mt-4 max-w-3xl leading-relaxed">
          Smart Lab Safety provides automated computer vision monitoring to ensure personal protective equipment (PPE) compliance, rapid hazardous spill detection, risk evaluation, incident tracking, and instant RAG-grounded safety procedures for academic and industrial research laboratories.
        </p>
      </div>

      {/* Grid: 3 Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">YOLOv8 Computer Vision</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Multi-class object detection recognizing 5 critical classes: <code>person</code>, <code>lab_coat</code>, <code>gloves</code>, <code>safety_goggles</code>, and <code>mask</code>.
          </p>
          <div className="text-[11px] text-slate-500 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
            Target: backend/models/best.pt
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">RAG Safety Assistant</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Grounded vector retrieval across standard operating procedures (chemical spill response, PASS fire protocols, gas leak procedures, and OSHA 1910.132 PPE mandates).
          </p>
          <div className="text-[11px] text-slate-500 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
            Path: backend/data/safety_documents/
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Unified SQLite & SQLAlchemy</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Synchronized relational persistence storing vision detections, alerts, incident investigations, risk history, and configurable safety policy parameters.
          </p>
          <div className="text-[11px] text-slate-500 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
            smart_lab_safety.db
          </div>
        </div>
      </div>

    </div>
  );
};
