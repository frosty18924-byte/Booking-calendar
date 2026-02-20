'use client';

import { useState, useEffect } from 'react';
import UniformButton from './UniformButton';

interface ImportResult {
  success: boolean;
  summary: {
    processed: number;
    updated: number;
    created: number;
    changes: number;
    ignored?: number;
    errors: number;
  };
  changes: Array<{
    staff: string;
    locations: string;
    course: string;
    oldDate: string;
    newDate: string;
    action?: 'updated' | 'created';
  }>;
  updatedRecords?: Array<{
    staff: string;
    locations: string;
    course: string;
    oldDate: string;
    newDate: string;
  }>;
  createdRecords?: Array<{
    staff: string;
    locations: string;
    course: string;
    oldDate: string;
    newDate: string;
  }>;
  ignoredStaff?: string[];
  errors: Array<{
    row?: number;
    name?: string;
    course?: string;
    error: string;
  }>;
}

export default function AtlasImportModal({ onClose }: { onClose?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const theme = localStorage.getItem('theme');
      const isDarkMode = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDark(isDarkMode);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/atlas/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        setResult({
          success: false,
          summary: { processed: 0, updated: 0, created: 0, changes: 0, errors: 1 },
          changes: [],
          errors: [{ error: `Upload failed: HTTP ${response.status} - ${response.statusText}` }],
        });
        setShowResult(true);
        return;
      }

      const data = await response.json();
      console.log('Import result:', data);
      setResult(data);
      setShowResult(true);
    } catch (error) {
      console.error('Upload error:', error);
      setResult({
        success: false,
        summary: { processed: 0, updated: 0, created: 0, changes: 0, errors: 1 },
        changes: [],
        errors: [{ error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      });
      setShowResult(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f1f5f9' : '#000000', padding: '24px', borderRadius: '8px', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
      <h2 style={{ marginTop: 0, fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Import Atlas Careskills Data</h2>

      {!showResult ? (
        <div>
          <div style={{ border: `2px dashed ${isDark ? '#475569' : '#cbd5e1'}`, borderRadius: '8px', padding: '32px', textAlign: 'center', marginBottom: '16px', cursor: 'pointer', backgroundColor: isDark ? '#0f172a' : '#f8fafc', transition: 'all 0.2s' }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const droppedFile = e.dataTransfer.files?.[0]; if (droppedFile) { setFile(droppedFile); setResult(null); } }}>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} id="file-input" />
            <label htmlFor="file-input" style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>📁</div>
              <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '4px' }}>{file ? `Selected: ${file.name}` : 'Drop your Atlas Excel file here'}</div>
              <div style={{ fontSize: '14px', color: isDark ? '#94a3b8' : '#64748b' }}>or click to browse</div>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <UniformButton
              variant="secondary"
              className="px-5 py-2 rounded-lg font-bold"
              style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#f1f5f9' : '#000000' }}
              onClick={() => { setFile(null); setResult(null); }}
            >
              Clear
            </UniformButton>
            <UniformButton
              variant="primary"
              className="px-5 py-2 rounded-lg font-bold"
              style={{ backgroundColor: file && !loading ? '#10b981' : '#9ca3af', color: '#ffffff', cursor: file && !loading ? 'pointer' : 'not-allowed' }}
              onClick={handleImport}
              disabled={!file || loading}
            >
              {loading ? '🔄 Importing...' : '✅ Import Data'}
            </UniformButton>
          </div>
        </div>
      ) : result ? (
        <div>
          <div style={{ backgroundColor: result.success ? '#d1fae5' : '#fee2e2', color: result.success ? '#065f46' : '#7f1d1d', padding: '16px', borderRadius: '6px', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600 }}>{result.success ? '✅ Import Successful' : '❌ Import Failed'}</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              {result.success
                ? `Updated ${result.summary.updated} records and created ${result.summary.created} new records.`
                : result.errors[0]?.error}
            </p>
          </div>

          {(result.updatedRecords && result.updatedRecords.length > 0) && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                Updated Records ({result.updatedRecords.length}):
              </h3>
              <div style={{ maxHeight: '220px', overflowY: 'auto', backgroundColor: isDark ? '#0f172a' : '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '12px' }}>
                {result.updatedRecords.map((change, idx) => (
                  <div key={idx} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                    <div><strong>{change.staff}</strong> ({change.locations}) - {change.course}</div>
                    <div style={{ color: isDark ? '#94a3b8' : '#64748b', marginTop: '2px' }}>{change.oldDate} → {change.newDate}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(result.createdRecords && result.createdRecords.length > 0) && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                Created Records ({result.createdRecords.length}):
              </h3>
              <div style={{ maxHeight: '220px', overflowY: 'auto', backgroundColor: isDark ? '#0f172a' : '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '12px' }}>
                {result.createdRecords.map((change, idx) => (
                  <div key={idx} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                    <div><strong>{change.staff}</strong> ({change.locations}) - {change.course}</div>
                    <div style={{ color: isDark ? '#94a3b8' : '#64748b', marginTop: '2px' }}>{change.oldDate} → {change.newDate}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!result.updatedRecords && !result.createdRecords && result.summary.changes > 0) && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Changes Made ({result.summary.changes}):</h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto', backgroundColor: isDark ? '#0f172a' : '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '12px' }}>
                {result.changes.map((change, idx) => (
                  <div key={idx} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                    <div><strong>{change.staff}</strong> ({change.locations}) - {change.course}</div>
                    <div style={{ color: isDark ? '#94a3b8' : '#64748b', marginTop: '2px' }}>{change.oldDate} → {change.newDate}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.summary.errors > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#ef4444' }}>Errors ({result.summary.errors}):</h3>
              <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: isDark ? '#0f172a' : '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#ef4444' }}>
                {result.errors.map((error, idx) => (
                  <div key={idx} style={{ marginBottom: '4px' }}>{error.name || error.course}: {error.error}</div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <UniformButton
              variant="primary"
              className="px-5 py-2 rounded-lg font-bold"
              style={{ backgroundColor: '#10b981', color: '#ffffff' }}
              onClick={() => {
                setFile(null);
                setResult(null);
                setShowResult(false);
                onClose?.();
              }}
            >
              ✅ Done
            </UniformButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
