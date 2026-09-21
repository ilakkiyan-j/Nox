import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  MapPin,
  ExternalLink,
  Globe,
  Edit2,
  Trash2,
  X,
  Save,
  CheckSquare,
  AlarmClock,
  Clock,
  ChevronRight,
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { API_BASE_URL, fetchWithUser } from '../lib/api';

interface EventsViewProps {
  events: any[];
  onRefresh: () => void;
  onNavigate?: (tab: any) => void;
}

export default function EventsView({ events, onRefresh, onNavigate }: EventsViewProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [activeFilter, setActiveFilter] = useState<'UPCOMING' | 'PAST' | 'ALL'>('UPCOMING');

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [url, setUrl] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          date,
          endDate: hasEndDate && endDate ? endDate : null,
          startTime,
          endTime,
          location,
          url,
          isOnline,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setTitle('');
        setDescription('');
        setDate('');
        setHasEndDate(false);
        setEndDate('');
        setStartTime('');
        setEndTime('');
        setLocation('');
        setUrl('');
        setShowCreate(false);
        onRefresh();
      } else {
        alert(data.error?.message || 'Failed to create event. Please check inputs.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/events/${editingEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingEvent.title,
          description: editingEvent.description,
          date: editingEvent.date,
          endDate: editingEvent.endDate || null,
          startTime: editingEvent.startTime,
          endTime: editingEvent.endTime,
          location: editingEvent.location,
          url: editingEvent.url,
          isOnline: editingEvent.isOnline,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setEditingEvent(null);
        onRefresh();
      } else {
        alert(data.error?.message || 'Failed to update event details.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Event',
      message: 'Are you sure you want to delete this Event?',
      onConfirm: async () => {
        try {
          await fetchWithUser(`${API_BASE_URL}/api/v1/events/${eventId}`, { method: 'DELETE' });
          onRefresh();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleQuickAddReminder = async (event: any) => {
    try {
      const d = new Date(event.date);
      let hours = 9;
      let minutes = 0;
      if (event.startTime) {
        const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(event.startTime.trim());
        if (match) {
          let h = parseInt(match[1], 10);
          const m = parseInt(match[2], 10);
          const ampm = (match[3] || '').toUpperCase();
          if (ampm === 'PM' && h < 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          hours = h;
          minutes = m;
        }
      }
      d.setHours(hours, minutes, 0, 0);

      await fetchWithUser(`${API_BASE_URL}/api/v1/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Reminder: ${event.title}`,
          remindAt: d.toISOString(),
          entityType: 'EVENT',
          entityId: event.id,
        }),
      });
      onRefresh();
      if (onNavigate) onNavigate('reminders');
    } catch (err) {
      console.error(err);
    }
  };

  const formatDateForInput = (val?: string | Date | null) => {
    if (!val) return '';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const formatDateRange = (startDateStr: string, endDateStr?: string) => {
    const start = new Date(startDateStr);
    const startFormatted = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    if (!endDateStr) return startFormatted;
    const end = new Date(endDateStr);
    const endFormatted = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${startFormatted} – ${endFormatted}`;
  };

  // Filter Upcoming vs Past
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const upcomingEvents = useMemo(() => {
    return events.filter((e) => new Date(e.date).getTime() >= todayStart);
  }, [events, todayStart]);

  const pastEvents = useMemo(() => {
    return events.filter((e) => new Date(e.date).getTime() < todayStart);
  }, [events, todayStart]);

  const displayedEvents = activeFilter === 'UPCOMING' ? upcomingEvents : activeFilter === 'PAST' ? pastEvents : events;

  return (
    <div className="space-y-6">
      {/* Header with Mobile Responsive Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            <span>Events & Schedule</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Architecture reviews, exams, submission dates, conferences, and key calendar milestones.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm shadow-rose-500/20 transition-all cursor-pointer shrink-0"
        >
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showCreate ? 'Close Form' : 'New Event'}</span>
        </button>
      </div>

      {/* Filter Tabs Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveFilter('UPCOMING')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeFilter === 'UPCOMING'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Upcoming ({upcomingEvents.length})
          </button>
          <button
            onClick={() => setActiveFilter('PAST')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeFilter === 'PAST'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Past Events ({pastEvents.length})
          </button>
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All ({events.length})
          </button>
        </div>
      </div>

      {/* Create Event Form */}
      {showCreate && (
        <form onSubmit={handleCreateEvent} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700/80 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
              <Plus className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Schedule New Event</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            placeholder="Event Title (e.g. System Architecture Review / Final Submission)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-600"
            required
          />
          <textarea
            placeholder="Description and preparation items..."
            value={description}
            rows={2}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-600"
          />

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">From Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Start Time</label>
                <input
                  type="text"
                  placeholder="10:00 AM"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">End Time</label>
                <input
                  type="text"
                  placeholder="11:30 AM"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={hasEndDate}
                    onChange={(e) => setHasEndDate(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-rose-600 focus:ring-rose-500"
                  />
                  <span>Specify End Date</span>
                </label>
              </div>
            </div>

            {hasEndDate && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Location / Platform</label>
              <input
                type="text"
                placeholder="Google Meet or Room 302"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Meeting URL (Optional)</label>
              <input
                type="url"
                placeholder="https://meet.google.com/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              Schedule Event
            </button>
          </div>
        </form>
      )}

      {/* Edit Form */}
      {editingEvent && (
        <form onSubmit={handleUpdateEvent} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-400 dark:border-rose-600 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
              <Edit2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Edit Event Details</span>
            </h3>
            <button type="button" onClick={() => setEditingEvent(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            value={editingEvent.title}
            onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
            required
          />

          <textarea
            value={editingEvent.description || ''}
            onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
            rows={2}
          />

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">From Date</label>
                <input
                  type="date"
                  value={formatDateForInput(editingEvent.date)}
                  onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">To Date (Optional)</label>
                <input
                  type="date"
                  value={formatDateForInput(editingEvent.endDate)}
                  onChange={(e) => setEditingEvent({ ...editingEvent, endDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Start Time</label>
                <input
                  type="text"
                  placeholder="10:00 AM"
                  value={editingEvent.startTime || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, startTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">End Time</label>
                <input
                  type="text"
                  placeholder="11:30 AM"
                  value={editingEvent.endTime || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, endTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Location / Platform</label>
                <input
                  type="text"
                  placeholder="Google Meet or Room 302"
                  value={editingEvent.location || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Event URL</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={editingEvent.url || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setEditingEvent(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-xs cursor-pointer">
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      )}

      {/* Events Grid */}
      {displayedEvents.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <Calendar className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {activeFilter === 'UPCOMING' ? 'No upcoming events scheduled' : 'No past events found'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Schedule exams, presentation dates, or conference sessions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedEvents.map((event) => (
            <div key={event.id} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 relative group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 uppercase tracking-wide inline-flex items-center space-x-1">
                    <span>📅</span>
                    <span>{formatDateRange(event.date, event.endDate)}</span>
                  </span>
                  <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100 mt-1.5">{event.title}</h3>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setEditingEvent(event)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                    title="Edit Event"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                    title="Delete Event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {event.description && <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{event.description}</p>}

              {/* Time and Location Meta */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center space-x-3">
                  {event.startTime && <span className="font-mono font-medium text-slate-700 dark:text-slate-300">⏰ {event.startTime} {event.endTime && `- ${event.endTime}`}</span>}
                  {event.location && (
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{event.location}</span>
                    </span>
                  )}
                </div>

                {event.url && (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 font-semibold"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Join Event</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Cross-entity Shortcuts: + Task, + Reminder */}
              <div className="pt-2 border-t border-dashed border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      if (onNavigate) onNavigate('tasks');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition-all"
                    title="View or create tasks linked to this event"
                  >
                    <CheckSquare className="w-3 h-3" />
                    <span>Tasks</span>
                  </button>

                  <button
                    onClick={() => handleQuickAddReminder(event)}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition-all"
                    title="Set a reminder linked to this event date"
                  >
                    <AlarmClock className="w-3 h-3" />
                    <span>+ Reminder</span>
                  </button>
                </div>

                {event.tasks && event.tasks.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    {event.tasks.length} action items
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
      />
    </div>
  );
}
