'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';


function ScaleInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-semibold text-slate-300">{label}</label>
        <span className="text-lg font-bold text-blue-400 w-6 text-right">{value}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-blue-500 cursor-pointer"
      />
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>Not very (1)</span>
        <span>Very much (10)</span>
      </div>
    </div>
  );
}

function FeedbackForm() {
  const searchParams = useSearchParams();
  const courseName = searchParams?.get('course') || '';
  const eventDate = searchParams?.get('date') || '';
  const eventId = searchParams?.get('event') || '';

  const [fields, setFields] = useState<any[]>([]);
  const [formResponses, setFormResponses] = useState<Record<string, any>>({});
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadConfig() {
      const { data } = await supabase.from('feedback_settings').select('config').eq('key', 'default_form').single();
      if (data?.config?.fields) {
        setFields(data.config.fields);
        // Initialize responses
        const initial: any = {};
        data.config.fields.forEach((f: any) => {
          if (f.type === 'scale') {
            initial[`${f.id}_before`] = 5;
            initial[`${f.id}_after`] = 5;
          } else if (f.type === 'multi-select' || f.type === 'descriptors') {
            initial[f.id] = [];
          } else {
            initial[f.id] = '';
          }
        });
        setFormResponses(initial);
      }
    }
    loadConfig();
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter your name.'); return; }
    
    // Check required fields
    for (const field of fields) {
      if (field.required) {
        const val = formResponses[field.id];
        if (field.type === 'descriptors' && (val?.length || 0) < 5) {
          setError(`Please select at least 5 words for: ${field.label}`);
          return;
        }
        if (!val && field.type !== 'scale' && field.type !== 'descriptors') {
          setError(`Please complete the field: ${field.label}`);
          return;
        }
      }
    }

    setError('');
    setSubmitting(true);

    const { error: dbError } = await supabase.from('course_feedback').insert({
      event_id: eventId || null,
      course_name: courseName || null,
      event_date: eventDate || null,
      respondent_name: name.trim(),
      responses: formResponses,
      // Legacy columns for backward compatibility / results page
      session_time: formResponses['session_time'] || 'All Day',
      knowledge_before: formResponses['knowledge_before'] || 5,
      knowledge_after: formResponses['knowledge_after'] || 5,
      confidence_before: formResponses['confidence_before'] || 5,
      confidence_after: formResponses['confidence_after'] || 5,
      work_role_relevance: formResponses['relevance'] || 5,
      session_descriptors: formResponses['descriptors'] || [],
      additional_comments: formResponses['comments'] || null
    });

    setSubmitting(false);
    if (dbError) {
      setError('Something went wrong submitting your feedback. Please try again.');
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-black text-white mb-2 uppercase">Thank You!</h2>
          <p className="text-slate-400">Your feedback has been submitted. We appreciate you taking the time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-800 rounded-2xl overflow-hidden shadow-2xl">

          {/* Header */}
          <div className="bg-blue-700 px-6 py-6">
            <h1 className="text-xl font-black text-white uppercase tracking-tight">Training Feedback</h1>
            {courseName && <p className="text-blue-200 font-semibold mt-1">{courseName}</p>}
            {eventDate && (
              <p className="text-blue-300 text-sm mt-0.5">
                {new Date(eventDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Your Name <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Dynamic Rendering of Fields */}
            {fields.map((field) => (
              <div key={field.id} className="space-y-4">
                
                {field.type === 'scale' ? (
                  <div className="bg-slate-700/50 rounded-xl p-4">
                    <h3 className="text-sm font-black text-slate-200 uppercase tracking-wide mb-4">{field.label}</h3>
                    {field.before_label && (
                      <ScaleInput 
                        label={field.before_label} 
                        value={formResponses[`${field.id}_before`] || 5} 
                        onChange={v => setFormResponses({...formResponses, [`${field.id}_before`]: v})} 
                      />
                    )}
                    {field.after_label && (
                      <ScaleInput 
                        label={field.after_label} 
                        value={formResponses[`${field.id}_after`] || 5} 
                        onChange={v => setFormResponses({...formResponses, [`${field.id}_after`]: v})} 
                      />
                    )}
                    {!field.before_label && !field.after_label && (
                       <ScaleInput 
                         label={field.label} 
                         value={formResponses[field.id] || 5} 
                         onChange={v => setFormResponses({...formResponses, [field.id]: v})} 
                       />
                    )}
                  </div>
                ) : field.type === 'descriptors' || field.type === 'multi-select' ? (
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">{field.label}</label>
                    <div className="flex flex-wrap gap-2">
                      {(field.options || []).map((opt: string) => {
                        const isSelected = (formResponses[field.id] || []).includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              const current = formResponses[field.id] || [];
                              const next = isSelected ? current.filter((x: string) => x !== opt) : [...current, opt];
                              setFormResponses({...formResponses, [field.id]: next});
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                              isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : field.type === 'select' ? (
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">{field.label}</label>
                    <select 
                      value={formResponses[field.id]}
                      onChange={e => setFormResponses({...formResponses, [field.id]: e.target.value})}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                    >
                      <option value="">Select an option...</option>
                      {(field.options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                ) : field.type === 'radio' ? (
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">{field.label}</label>
                    <div className="flex flex-wrap gap-3">
                      {(field.options || []).map((opt: string) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setFormResponses({...formResponses, [field.id]: opt})}
                          className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
                            formResponses[field.id] === opt
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">{field.label}</label>
                    {field.type === 'text' ? (
                      <textarea
                        value={formResponses[field.id]}
                        onChange={e => setFormResponses({...formResponses, [field.id]: e.target.value})}
                        rows={3}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={formResponses[field.id]}
                        onChange={e => setFormResponses({...formResponses, [field.id]: e.target.value})}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      />
                    )}
                  </div>
                )}
              </div>
            ))}

            {error && (
              <p className="text-red-400 text-sm font-semibold bg-red-400/10 px-4 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-black rounded-xl text-base uppercase tracking-wide transition-all shadow-lg"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    }>
      <FeedbackForm />
    </Suspense>
  );
}
