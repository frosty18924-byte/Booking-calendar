'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const DESCRIPTORS = [
  'Well tutored', 'Useful', 'Basic', 'Practical', 'Fun',
  'Nothing New', 'Professional', 'Informative', 'Boring', 'Motivating',
  'Too Long', 'Educational', 'Hard to follow', 'Vague', 'Participative',
  'Interactive', 'Disorganised',
];

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

  const [name, setName] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [knowledgeBefore, setKnowledgeBefore] = useState(5);
  const [knowledgeAfter, setKnowledgeAfter] = useState(5);
  const [confidenceBefore, setConfidenceBefore] = useState(5);
  const [confidenceAfter, setConfidenceAfter] = useState(5);
  const [workRoleRelevance, setWorkRoleRelevance] = useState(5);
  const [selectedDescriptors, setSelectedDescriptors] = useState<string[]>([]);
  const [skillsGained, setSkillsGained] = useState<boolean | null>(null);
  const [additionalComments, setAdditionalComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const toggleDescriptor = (d: string) => {
    setSelectedDescriptors(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!sessionTime) { setError('Please select Morning or Afternoon.'); return; }
    if (selectedDescriptors.length < 5) { setError('Please select at least 5 words to describe the session.'); return; }
    if (skillsGained === null) { setError('Please answer whether you gained new skills.'); return; }

    setError('');
    setSubmitting(true);

    // Soft duplicate check — same name + course + date
    if (courseName && eventDate) {
      const { data: existing } = await supabase
        .from('course_feedback')
        .select('id')
        .eq('respondent_name', name.trim())
        .eq('course_name', courseName)
        .eq('event_date', eventDate)
        .limit(1);
      if (existing && existing.length > 0) {
        setError('It looks like you have already submitted feedback for this session. Thank you!');
        setSubmitting(false);
        return;
      }
    }

    const { error: dbError } = await supabase.from('course_feedback').insert({
      event_id: eventId || null,
      course_name: courseName || null,
      event_date: eventDate || null,
      respondent_name: name.trim(),
      session_time: sessionTime,
      knowledge_before: knowledgeBefore,
      knowledge_after: knowledgeAfter,
      confidence_before: confidenceBefore,
      confidence_after: confidenceAfter,
      work_role_relevance: workRoleRelevance,
      session_descriptors: selectedDescriptors,
      skills_gained: skillsGained,
      additional_comments: additionalComments.trim() || null,
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

            {/* Session Time */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Session Time <span className="text-red-400">*</span></label>
              <div className="flex gap-3">
                {['Morning', 'Afternoon', 'All Day'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSessionTime(t)}
                    className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${
                      sessionTime === t
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Knowledge */}
            <div className="bg-slate-700/50 rounded-xl p-4">
              <h3 className="text-sm font-black text-slate-200 uppercase tracking-wide mb-4">Knowledge</h3>
              <ScaleInput label="Before this session" value={knowledgeBefore} onChange={setKnowledgeBefore} />
              <ScaleInput label="After this session" value={knowledgeAfter} onChange={setKnowledgeAfter} />
            </div>

            {/* Confidence */}
            <div className="bg-slate-700/50 rounded-xl p-4">
              <h3 className="text-sm font-black text-slate-200 uppercase tracking-wide mb-4">Confidence</h3>
              <ScaleInput label="Before this session" value={confidenceBefore} onChange={setConfidenceBefore} />
              <ScaleInput label="After this session" value={confidenceAfter} onChange={setConfidenceAfter} />
            </div>

            {/* Work Role Relevance */}
            <div className="bg-slate-700/50 rounded-xl p-4">
              <h3 className="text-sm font-black text-slate-200 uppercase tracking-wide mb-4">Relevance</h3>
              <ScaleInput label="How relevant was this training to your work role?" value={workRoleRelevance} onChange={setWorkRoleRelevance} />
            </div>

            {/* Descriptors */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">
                Describe this session <span className="text-slate-500 font-normal">(select 5 or more)</span>
              </label>
              <p className="text-xs text-slate-500 mb-3">
                {selectedDescriptors.length < 5
                  ? `Select at least ${5 - selectedDescriptors.length} more`
                  : `${selectedDescriptors.length} selected ✓`}
              </p>
              <div className="flex flex-wrap gap-2">
                {DESCRIPTORS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDescriptor(d)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selectedDescriptors.includes(d)
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Skills Gained */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Did you gain new skills? <span className="text-red-400">*</span></label>
              <div className="flex gap-3">
                {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(opt => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setSkillsGained(opt.value)}
                    className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${
                      skillsGained === opt.value
                        ? opt.value ? 'bg-green-600 text-white shadow-md' : 'bg-red-600 text-white shadow-md'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Comments */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Additional Comments</label>
              <textarea
                value={additionalComments}
                onChange={e => setAdditionalComments(e.target.value)}
                rows={3}
                placeholder="Anything else you'd like to share..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

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
