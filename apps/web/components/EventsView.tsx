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
  Layers,
  LayoutGrid,
  ChevronLeft,
  Sparkles,
  ArrowRight,
  Info,
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
  const [inspectingEvent, setInspectingEvent] = useState<any | null>(null);
  const [activeFilter, setActiveFilter] = useState<'UPCOMING' | 'PAST' | 'ALL'>('UPCOMING');
  const [viewMode, setViewMode] = useState<'CARDS' | 'GANTT'>('GANTT');
  const [ganttRangeDays, setGanttRangeDays] = useState<number>(30);
  const [ganttOffsetDays, setGanttOffsetDays] = useState<number>(0);

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
        if (inspectingEvent?.id === editingEvent.id) {
          setInspectingEvent(null);
        }
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
          if (inspectingEvent?.id === eventId) setInspectingEvent(null);
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

  // ---- Accurate Event Active Duration (Fixed: Event stays active until endDate) ----
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const todayEnd = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }, []);

  const isEventOngoing = (e: any) => {
    const start = new Date(e.date).getTime();
    const end = e.endDate ? new Date(e.endDate).setHours(23, 59, 59, 999) : new Date(e.date).setHours(23, 59, 59, 999);
    return start <= todayEnd && end >= todayStart;
  };

  const upcomingEvents = useMemo(() => {
    return events.filter((e) => {
      const effectiveEnd = e.endDate ? new Date(e.endDate).setHours(23, 59, 59, 999) : new Date(e.date).setHours(23, 59, 59, 999);
      return effectiveEnd >= todayStart;
    });
  }, [events, todayStart]);

  const pastEvents = useMemo(() => {
    return events.filter((e) => {
      const effectiveEnd = e.endDate ? new Date(e.endDate).setHours(23, 59, 59, 999) : new Date(e.date).setHours(23, 59, 59, 999);
      return effectiveEnd < todayStart;
    });
  }, [events, todayStart]);

  const displayedEvents = activeFilter === 'UPCOMING' ? upcomingEvents : activeFilter === 'PAST' ? pastEvents : events;

  // ---- Gantt Chart Calculation & Collision-Free Lane Packing Engine ----
  const ganttConfig = useMemo(() => {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + ganttOffsetDays);
    baseDate.setHours(0, 0, 0, 0);

    const rangeStart = baseDate.getTime();
    const rangeEnd = rangeStart + ganttRangeDays * 24 * 60 * 60 * 1000;

    // Generate days in range
    const days: { date: Date; label: string; dayNum: number; isToday: boolean; isWeekend: boolean }[] = [];
    for (let i = 0; i < ganttRangeDays; i++) {
      const d = new Date(rangeStart + i * 24 * 60 * 60 * 1000);
      const isToday = d.setHours(0, 0, 0, 0) === todayStart;
      const dayOfWeek = d.getDay();
      days.push({
        date: d,
        label: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
        dayNum: d.getDate(),
        isToday,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    // Filter events overlapping with this timeline window
    const windowEvents = events
      .map((e) => {
        const start = new Date(e.date).getTime();
        const end = e.endDate ? new Date(e.endDate).setHours(23, 59, 59, 999) : new Date(e.date).setHours(23, 59, 59, 999);
        return { ...e, _start: start, _end: end };
      })
      .filter((e) => e._end >= rangeStart && e._start <= rangeEnd)
      .sort((a, b) => a._start - b._start || (b._end - b._start) - (a._end - a._start));

    // Greedy Interval Scheduling Lane Packing
    const lanes: any[][] = [];
    for (const ev of windowEvents) {
      let placed = false;
      for (const lane of lanes) {
        const lastInLane = lane[lane.length - 1];
        // 12 hours visual buffer between non-overlapping events on same track
        if (ev._start >= lastInLane._end + 12 * 60 * 60 * 1000) {
          lane.push(ev);
          placed = true;
          break;
        }
      }
      if (!placed) {
        lanes.push([ev]);
      }
    }

    // Calculate 'today' indicator percentage
    const nowTime = Date.now();
    const todayPercent = ((nowTime - rangeStart) / (rangeEnd - rangeStart)) * 100;
    const showTodayIndicator = todayPercent >= 0 && todayPercent <= 100;

    return { days, rangeStart, rangeEnd, lanes, showTodayIndicator, todayPercent };
  }, [events, ganttOffsetDays, ganttRangeDays, todayStart]);

  return (
    <div className="space-y-6">
      {/* Header with View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            <span>Events & Schedule</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Architecture reviews, exams, submission dates, conferences, and multi-track calendar milestones.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('GANTT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                viewMode === 'GANTT'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Gantt Timeline</span>
            </button>
            <button
              onClick={() => setViewMode('CARDS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                viewMode === 'CARDS'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>

          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-rose-500/20 transition-all cursor-pointer shrink-0"
          >
            {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showCreate ? 'Close' : 'New Event'}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Timeline Controls Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700/60">
          <button
            onClick={() => setActiveFilter('UPCOMING')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeFilter === 'UPCOMING'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Active & Upcoming ({upcomingEvents.length})
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
            All Events ({events.length})
          </button>
        </div>

        {viewMode === 'GANTT' && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs font-semibold">
              <button
                onClick={() => setGanttOffsetDays((prev) => prev - 7)}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                title="Shift earlier"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setGanttOffsetDays(0)}
                className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700"
              >
                Today
              </button>
              <button
                onClick={() => setGanttOffsetDays((prev) => prev + 7)}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                title="Shift later"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <select
              value={ganttRangeDays}
              onChange={(e) => setGanttRangeDays(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value={14}>14 Days</option>
              <option value={30}>30 Days (Month)</option>
              <option value={60}>60 Days</option>
            </select>
          </div>
        )}
      </div>

      {/* Create Event Form */}
      {showCreate && (
        <form onSubmit={handleCreateEvent} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700/80 shadow-md space-y-4 animate-in fade-in duration-200">
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
            placeholder="Event Title (e.g. System Architecture Review / Hackathon Submission)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-600"
            required
          />
          <textarea
            placeholder="Description, agendas, and preparation items..."
            value={description}
            rows={2}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-600"
          />

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Start Date</label>
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
                  <span>Multi-day (End Date)</span>
                </label>
              </div>
            </div>

            {hasEndDate && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">End Date</label>
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
                placeholder="Google Meet, Discord, or Room 402"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Event URL (Optional)</label>
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
        <form onSubmit={handleUpdateEvent} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-400 dark:border-rose-600 shadow-md space-y-4 animate-in fade-in duration-200">
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

      {/* VIEW MODE 1: GANTT / TIMELINE MULTI-TRACK VIEW */}
      {viewMode === 'GANTT' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                Multi-Track Timeline & Collision Avoidance
              </h3>
            </div>
            <div className="flex items-center space-x-4 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-xs bg-emerald-500 inline-block" />
                <span>Ongoing Active</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-xs bg-rose-500 inline-block" />
                <span>Upcoming</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-xs bg-slate-400 inline-block" />
                <span>Past</span>
              </span>
            </div>
          </div>

          {/* Timeline Scrollable Viewport */}
          <div className="overflow-x-auto pb-4 pt-2">
            <div className="min-w-[760px] relative">
              {/* Day Header Column Bar */}
              <div className="grid grid-flow-col auto-cols-fr border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                {ganttConfig.days.map((day, idx) => (
                  <div
                    key={idx}
                    className={`text-center px-1 py-1 rounded-lg ${
                      day.isToday
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold'
                        : day.isWeekend
                        ? 'text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-800/30'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-mono">{day.label}</div>
                    <div className={`text-xs font-semibold ${day.isToday ? 'text-rose-600 dark:text-rose-400 font-extrabold' : ''}`}>
                      {day.dayNum}
                    </div>
                  </div>
                ))}
              </div>

              {/* Grid Background Lines & Today Indicator */}
              <div className="relative min-h-[160px] space-y-3">
                {ganttConfig.showTodayIndicator && (
                  <div
                    className="absolute top-0 bottom-0 z-10 pointer-events-none flex flex-col items-center"
                    style={{ left: `${ganttConfig.todayPercent}%` }}
                  >
                    <div className="w-2 h-2 rounded-full bg-rose-500 shadow-md shadow-rose-500/50 -mt-1" />
                    <div className="w-0.5 flex-1 bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                  </div>
                )}

                {/* Lanes with Collision-Avoidance Packed Bars */}
                {ganttConfig.lanes.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-1">
                    <p className="text-xs font-semibold">No events falling within this timeline window.</p>
                    <p className="text-[11px]">Click "New Event" or adjust timeline navigation above.</p>
                  </div>
                ) : (
                  ganttConfig.lanes.map((lane, laneIdx) => (
                    <div key={laneIdx} className="h-9 relative bg-slate-50/60 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/40">
                      {lane.map((ev) => {
                        const clampedStart = Math.max(ev._start, ganttConfig.rangeStart);
                        const clampedEnd = Math.min(ev._end, ganttConfig.rangeEnd);
                        const totalDuration = ganttConfig.rangeEnd - ganttConfig.rangeStart;

                        const leftPercent = ((clampedStart - ganttConfig.rangeStart) / totalDuration) * 100;
                        const widthPercent = Math.max(((clampedEnd - clampedStart) / totalDuration) * 100, 3.5);

                        const isOngoing = isEventOngoing(ev);
                        const isPast = ev._end < todayStart;

                        return (
                          <div
                            key={ev.id}
                            onClick={() => setInspectingEvent(ev)}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                            }}
                            className={`absolute top-1 bottom-1 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-between overflow-hidden cursor-pointer shadow-xs transition-all hover:scale-[1.01] hover:z-20 ${
                              isOngoing
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white ring-2 ring-emerald-400/50 shadow-emerald-500/20'
                                : isPast
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 opacity-70'
                                : 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-rose-500/20'
                            }`}
                            title={`${ev.title} (${formatDateRange(ev.date, ev.endDate)})`}
                          >
                            <span className="truncate flex items-center space-x-1.5 min-w-0 pr-1">
                              {isOngoing && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />}
                              <span className="truncate">{ev.title}</span>
                            </span>

                            {ev.startTime && (
                              <span className="text-[10px] font-mono opacity-80 shrink-0 hidden sm:inline">
                                {ev.startTime}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: CARDS GRID VIEW */}
      {viewMode === 'CARDS' && (
        <>
          {displayedEvents.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <Calendar className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {activeFilter === 'UPCOMING' ? 'No active or upcoming events scheduled' : 'No past events found'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Schedule exams, presentation dates, or conference sessions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayedEvents.map((event) => {
                const isOngoing = isEventOngoing(event);
                const isPast = (event.endDate ? new Date(event.endDate).setHours(23, 59, 59, 999) : new Date(event.date).setHours(23, 59, 59, 999)) < todayStart;

                return (
                  <div
                    key={event.id}
                    className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs space-y-4 relative group transition-all ${
                      isOngoing
                        ? 'border-emerald-300 dark:border-emerald-700/80 shadow-emerald-500/5 ring-1 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide inline-flex items-center space-x-1 ${
                            isOngoing
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                              : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                          }`}>
                            <span>📅</span>
                            <span>{formatDateRange(event.date, event.endDate)}</span>
                          </span>

                          {isOngoing && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-white animate-pulse">
                              Active Now
                            </span>
                          )}
                        </div>

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
                        {event.startTime && (
                          <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                            ⏰ {event.startTime} {event.endTime && `- ${event.endTime}`}
                          </span>
                        )}
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
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Inspecting Event Modal Drawer */}
      {inspectingEvent && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide inline-flex items-center space-x-1 ${
                  isEventOngoing(inspectingEvent)
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                }`}>
                  📅 {formatDateRange(inspectingEvent.date, inspectingEvent.endDate)}
                </span>
                <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {inspectingEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setInspectingEvent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inspectingEvent.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                {inspectingEvent.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="block text-[10px] text-slate-400 font-medium">Time Window</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {inspectingEvent.startTime ? `${inspectingEvent.startTime} ${inspectingEvent.endTime ? `- ${inspectingEvent.endTime}` : ''}` : 'All Day'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="block text-[10px] text-slate-400 font-medium">Location</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {inspectingEvent.location || (inspectingEvent.isOnline ? 'Online' : 'Unspecified')}
                </span>
              </div>
            </div>

            {inspectingEvent.url && (
              <a
                href={inspectingEvent.url}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-sm"
              >
                <Globe className="w-4 h-4" />
                <span>Join Event / Meeting Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const ev = inspectingEvent;
                    setInspectingEvent(null);
                    setEditingEvent(ev);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center space-x-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleQuickAddReminder(inspectingEvent)}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-xs font-semibold flex items-center space-x-1"
                >
                  <AlarmClock className="w-3.5 h-3.5" />
                  <span>+ Reminder</span>
                </button>
              </div>

              <button
                onClick={() => handleDeleteEvent(inspectingEvent.id)}
                className="px-3 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
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
