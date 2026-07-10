import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Home, Mic, Code2, FileText, BarChart3,
  Map, Settings, Zap, User,
  Command, ChevronRight
} from 'lucide-react';

const COMMANDS = [
  {
    group: 'Navigate',
    items: [
      { id: 'dashboard',  label: 'Dashboard',        icon: Home,      shortcut: 'G D', path: '/dashboard' },
      { id: 'lobby',      label: 'AI Interviews',     icon: Mic,       shortcut: 'G I', path: '/lobby' },
      { id: 'coding',     label: 'Coding Arena',      icon: Code2,     shortcut: 'G C', path: '/coding' },
      { id: 'resume',     label: 'Resume Analyzer',   icon: FileText,  shortcut: 'G R', path: '/resume' },
      { id: 'feedback',   label: 'Analytics',         icon: BarChart3, shortcut: 'G A', path: '/feedback' },
      { id: 'roadmap',    label: 'Learning Roadmap',  icon: Map,       shortcut: 'G L', path: '/roadmap' },
      { id: 'settings',   label: 'Settings',          icon: Settings,  shortcut: 'G S', path: '/settings' },
    ]
  },
  {
    group: 'Actions',
    items: [
      { id: 'start-interview', label: 'Start Mock Interview', icon: Zap,       path: '/lobby',  action: true, accent: true },
      { id: 'upload-resume',   label: 'Upload Resume',        icon: FileText,  path: '/resume', action: true },
      { id: 'view-profile',    label: 'View Profile',         icon: User,      path: '/settings', action: true },
    ]
  }
];

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [focusedIdx, setFocusedIdx] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Filter commands
  const filtered = query.trim()
    ? COMMANDS.map(g => ({
        ...g,
        items: g.items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
      })).filter(g => g.items.length > 0)
    : COMMANDS;

  // Flat list for keyboard navigation
  const flat = filtered.flatMap(g => g.items);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSelect = useCallback((item) => {
    navigate(item.path);
    onClose();
  }, [navigate, onClose]);

  useEffect(() => {
    const handler = (e) => {
      if (!open) return;
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIdx(i => Math.min(i + 1, flat.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIdx(i => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && flat[focusedIdx]) {
        handleSelect(flat[focusedIdx]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, flat, focusedIdx, handleSelect, onClose]);

  if (!open) return null;

  let globalIdx = -1;

  return (
    <div className="cmd-backdrop" onClick={onClose}>
      <div className="cmd-panel" onClick={e => e.stopPropagation()}>
        {/* Input */}
        <div className="cmd-input-wrap">
          <Search size={18} className="text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search pages, actions..."
            value={query}
            onChange={e => { setQuery(e.target.value); setFocusedIdx(0); }}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1 rounded border border-white/10">
              Clear
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs text-slate-500 bg-white/5 border border-white/10 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto custom-scrollbar py-1">
          {filtered.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm">
              No results for "{query}"
            </div>
          )}
          {filtered.map((group) => (
            <div key={group.group} className="cmd-result-group">
              <div className="cmd-result-label">{group.group}</div>
              {group.items.map((item) => {
                globalIdx++;
                const idx = globalIdx;
                const Icon = item.icon;
                const isFocused = idx === focusedIdx;
                return (
                  <div
                    key={item.id}
                    className={`cmd-result-item ${isFocused ? 'focused' : ''}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setFocusedIdx(idx)}
                  >
                    <div className={`cmd-icon ${item.accent ? 'bg-violet-500/15 !text-violet-400' : ''}`}>
                      <Icon size={15} />
                    </div>
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && (
                      <span className="text-xs text-slate-600 font-mono hidden sm:block">{item.shortcut}</span>
                    )}
                    {isFocused && (
                      <ChevronRight size={14} className="text-indigo-400 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/5 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white/5 rounded text-[10px]">↑↓</kbd> Navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white/5 rounded text-[10px]">↵</kbd> Select</span>
          </div>
          <div className="flex items-center gap-1 text-slate-700">
            <Command size={10} />
            <span>K to open</span>
          </div>
        </div>
      </div>
    </div>
  );
}
