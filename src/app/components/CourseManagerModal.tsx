'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import CourseOverrideModal from './CourseOverrideModal.tsx';

export default function CourseManagerModal({ onClose }: { onClose: () => void }) {
  const [courses, setCourses] = useState<any[]>([]);
  const [isDark, setIsDark] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', max_attendees: 12 });
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedCourseForOverride, setSelectedCourseForOverride] = useState<any>(null);

  useEffect(() => {
    checkTheme();
    fetchCourses();
  }, []);

  useEffect(() => {
    const handleThemeChange = (event: any) => {
      setIsDark(event.detail.isDark);
    };
    
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  function checkTheme() {
    if (typeof window !== 'undefined') {
      const theme = localStorage.getItem('theme');
      const isDarkMode = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDark(isDarkMode);
    }
  }

  async function fetchCourses() {
    const { data } = await supabase.from('courses').select('*').order('name');
    setCourses(data || []);
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (!formData.name.trim()) {
      alert('Course name is required');
      setLoading(false);
      return;
    }

    if (formData.max_attendees < 1) {
      alert('Max attendance must be at least 1');
      setLoading(false);
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase.from('courses').update(formData).eq('id', editingId);
        if (error) throw error;
        setEditingId(null);
      } else {
        const { error } = await supabase.from('courses').insert([formData]);
        if (error) throw error;
      }
      
      setFormData({ name: '', max_attendees: 12 });
      fetchCourses();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (course: any) => {
    setEditingId(course.id);
    setFormData({
      name: course.name,
      max_attendees: course.max_attendees
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ name: '', max_attendees: 12 });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course type? This will remove all associated events and bookings.")) return;
    try {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
      fetchCourses();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleCancelCourse = async (courseId: string, courseName: string) => {
    if (!confirm(`Cancel "${courseName}"? This will remove all participants from all instances of this course and then delete it.`)) return;
    
    try {
      // Get all events for this course
      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('course_id', courseId);
      
      if (events && events.length > 0) {
        const eventIds = events.map(e => e.id);
        
        // Delete all bookings for these events
        const { error: deleteBookingsError } = await supabase
          .from('bookings')
          .delete()
          .in('event_id', eventIds);
        
        if (deleteBookingsError) throw deleteBookingsError;
      }
      
      // Delete all events for this course
      const { error: deleteEventsError } = await supabase
        .from('events')
        .delete()
        .eq('course_id', courseId);
      
      if (deleteEventsError) throw deleteEventsError;
      
      // Finally delete the course
      const { error: deleteCourseError } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);
      
      if (deleteCourseError) throw deleteCourseError;
      
      fetchCourses();
      alert(`Course "${courseName}" has been cancelled and all participants have been removed.`);
    } catch (error: any) {
      alert('Error cancelling course: ' + error.message);
    }
  };

  const handleOpenOverride = (course: any) => {
    setSelectedCourseForOverride(course);
    setShowOverrideModal(true);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1' }} className="rounded-3xl p-8 w-full max-w-2xl shadow-2xl border transition-colors duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="text-2xl font-black uppercase tracking-tight">
            {editingId ? 'Edit Course' : 'Course Catalog'}
          </h2>
          <button onClick={onClose} style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="hover:text-red-500 text-2xl transition-colors">&times;</button>
        </div>

        {/* ADD/EDIT FORM */}
        <form onSubmit={handleAdd} style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-6 rounded-2xl border mb-8">
          <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase mb-4">{editingId ? 'Edit Course Details' : 'Add New Course'}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="md:col-span-2">
              <label style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="block text-[10px] font-black uppercase mb-2">Course Title</label>
              <input 
                type="text" 
                placeholder="e.g. First Aid, Team Teach L2" 
                required 
                style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="block text-[10px] font-black uppercase mb-2">Max Capacity</label>
              <input 
                type="number" 
                min="1"
                required 
                style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f1f5f9' : '#1e293b', borderColor: isDark ? '#334155' : '#cbd5e1' }}
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                value={formData.max_attendees} 
                onChange={e => setFormData({...formData, max_attendees: parseInt(e.target.value) || 1})}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#a855f7' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9333ea'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#a855f7'}
              className="flex-1 text-white py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 hover:scale-105 active:scale-95 duration-200"
            >
              {loading ? 'Processing...' : editingId ? '💾 Save Changes' : '➕ Add Course'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                style={{ backgroundColor: isDark ? '#334155' : '#cbd5e1', color: isDark ? '#f1f5f9' : '#1e293b' }}
                className="px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-md duration-200"
              >
                Cancel ✕
              </button>
            )}
          </div>
        </form>

        {/* COURSES LIST */}
        <div>
          <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase mb-4 tracking-widest">Available Courses</p>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
            {courses.length === 0 ? (
              <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-sm text-center py-8">No courses added yet</p>
            ) : (
              courses.map(course => (
                <div key={course.id} style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }} className="p-4 border rounded-2xl flex justify-between items-center group transition-all hover:border-purple-500">
                  <div className="flex-1">
                    <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} className="font-bold text-lg">{course.name}</p>
                    <p style={{ color: isDark ? '#94a3b8' : '#64748b' }} className="text-[10px] font-black uppercase tracking-widest mt-1">Max Capacity: <span style={{ color: '#a855f7' }} className="font-black">{course.max_attendees} Attendees</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenOverride(course)}
                      style={{ backgroundColor: '#f59e0b' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97706'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
                      className="p-3 text-white rounded-lg font-bold transition-all"
                      title="Set date-specific capacity overrides"
                    >
                      📅
                    </button>
                    <button 
                      onClick={() => handleEdit(course)}
                      style={{ backgroundColor: '#2563eb' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                      className="p-3 text-white rounded-lg font-bold transition-all hover:scale-110 active:scale-95 shadow-md hover:shadow-lg duration-200"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleCancelCourse(course.id, course.name)}
                      style={{ backgroundColor: '#f97316' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ea580c'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f97316'}
                      className="p-3 text-white rounded-lg font-bold transition-all hover:scale-110 active:scale-95 shadow-md hover:shadow-lg duration-200"
                      title="Cancel this course and remove all participants"
                    >
                      ❌
                    </button>
                    <button 
                      onClick={() => handleDelete(course.id)}
                      style={{ backgroundColor: '#dc2626' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                      className="p-3 text-white rounded-lg font-bold transition-all hover:scale-110 active:scale-95 shadow-md hover:shadow-lg duration-200"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* OVERRIDE MODAL */}
      {showOverrideModal && selectedCourseForOverride && (
        <CourseOverrideModal 
          courseId={selectedCourseForOverride.id}
          courseName={selectedCourseForOverride.name}
          onClose={() => {
            setShowOverrideModal(false);
            setSelectedCourseForOverride(null);
          }}
        />
      )}
    </div>
  );
}