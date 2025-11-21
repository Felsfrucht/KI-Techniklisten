import React, { useState } from 'react';
import { MergedEvent } from '../types';
import { 
  Clock, 
  MapPin, 
  Users, 
  Layout, 
  Monitor, 
  User, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle,
  Hammer,
  CheckCircle,
  Circle,
  Pin,
  MessageSquare,
  Save
} from 'lucide-react';

interface EventCardProps {
  event: MergedEvent;
  compact?: boolean;
  isCompleted: boolean;
  isPinned: boolean;
  userNote: string;
  onToggleComplete: () => void;
  onTogglePin: () => void;
  onUpdateNote: (text: string) => void;
  // Optional click handler for tiles
  onClick?: () => void;
}

export const EventCard: React.FC<EventCardProps> = ({ 
  event, 
  isCompleted,
  isPinned,
  userNote,
  onToggleComplete,
  onTogglePin,
  onUpdateNote
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasWarnings = event.warnings && event.warnings.length > 0;
  
  // Comparison Logic
  const prevSeating = event.prevEvent?.seating;
  const currentSeating = event.seating;
  const seatingChanged = prevSeating && currentSeating && prevSeating !== currentSeating;

  // Border color logic
  let borderColor = event.isSetupOrTech 
    ? 'border-l-amber-500' 
    : seatingChanged 
      ? 'border-l-red-500'
      : 'border-l-primary';
  
  // Overwrite border if completed
  if (isCompleted) {
    borderColor = 'border-l-zinc-300 dark:border-l-zinc-600';
  }

  // Container styles based on state
  const containerClass = `
    bg-white dark:bg-zinc-900 rounded-lg shadow-sm border-l-4 mb-3 overflow-hidden transition-all duration-200
    ${borderColor}
    ${isCompleted ? 'opacity-60 grayscale bg-zinc-50 dark:bg-zinc-950' : ''}
    ${isPinned ? 'ring-2 ring-indigo-400 ring-offset-2 dark:ring-offset-zinc-900' : ''}
  `.trim();

  return (
    <div className={containerClass}>
      {/* Header / Overview */}
      <div className="relative">
        {/* Action Buttons (Absolute positioned top right) */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-0">
          <button 
            onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
            className={`p-1.5 rounded-full transition-colors ${isPinned ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300' : 'text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400'}`}
          >
            <Pin className={`w-4 h-4 ${isPinned ? 'fill-indigo-600 dark:fill-indigo-300' : ''}`} />
          </button>
        </div>

        <div 
          className="p-4 pb-2 cursor-pointer active:bg-zinc-50/50 dark:active:bg-zinc-800/50"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-start gap-3 pr-8">
            {/* Checkbox */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
              className={`mt-1 shrink-0 transition-colors ${isCompleted ? 'text-green-500 dark:text-green-600' : 'text-zinc-300 hover:text-primary dark:text-zinc-600 dark:hover:text-sky-400'}`}
            >
              {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-bold text-lg font-mono ${isCompleted ? 'text-zinc-500 line-through dark:text-zinc-600' : 'text-zinc-800 dark:text-zinc-100'}`}>
                  {event.startTime} - {event.endTime}
                </span>
                {event.isSetupOrTech && <Hammer className="w-4 h-4 text-amber-600 dark:text-amber-500" />}
                {seatingChanged && <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />}
                {userNote && <MessageSquare className="w-3 h-3 text-blue-400 fill-blue-400" />}
              </div>

              <div className="flex items-center gap-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                 <MapPin className="w-3 h-3" /> {event.room}
              </div>

              <h3 className={`text-md font-bold leading-tight ${isCompleted ? 'text-zinc-500 dark:text-zinc-500' : 'text-zinc-900 dark:text-white'}`}>
                {event.bookingName}
              </h3>
              {event.eventName && event.eventName !== event.bookingName && (
                 <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">{event.eventName}</p>
              )}
            </div>
          </div>

          {/* Quick info tags */}
          <div className="flex flex-wrap gap-3 mt-3 text-sm text-zinc-600 dark:text-zinc-400 pl-9">
            <div className="flex items-center gap-1">
              <Layout className="w-4 h-4" />
              <span className={`${seatingChanged && !isCompleted ? 'text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20 px-1 rounded' : ''}`}>
                {event.seating || 'Keine Angabe'}
              </span>
            </div>
            
            {event.pax > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{event.pax} Pers.</span>
              </div>
            )}

            {/* Visual indicator badge for media */}
            {event.mediaItems.length > 0 && (
               <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded text-xs font-bold border border-indigo-100 dark:border-indigo-800/50">
                 <Monitor className="w-3 h-3" />
                 <span>Medien</span>
               </div>
            )}
          </div>
          
          <div className="flex justify-center mt-2 text-zinc-300 dark:text-zinc-600">
             {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Detail View */}
      {isExpanded && (
        <div className="bg-zinc-50 dark:bg-zinc-900/50 px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-700">
          
          {/* Comparison Warning */}
          {seatingChanged && !isCompleted && (
             <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm p-2 rounded mb-3 flex items-start gap-2 border border-red-200 dark:border-red-800/50">
               <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
               <div>
                 <strong>Umbau notwendig!</strong>
                 <p className="text-xs opacity-90">Vorher: {event.prevEvent?.bookingName} ({prevSeating})</p>
               </div>
             </div>
          )}

          <div className="grid grid-cols-1 gap-3">
             {/* User Note Section */}
             <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-100 dark:border-blue-800/50">
                <div className="flex items-center gap-2 mb-2 text-blue-800 dark:text-blue-300 text-xs font-bold uppercase">
                  <MessageSquare className="w-3 h-3" /> Eigene Notiz
                </div>
                <textarea 
                  value={userNote}
                  onChange={(e) => onUpdateNote(e.target.value)}
                  placeholder="Notiz hinzufügen..."
                  className="w-full text-sm p-2 rounded border border-blue-200 dark:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/50 dark:bg-zinc-800/50 dark:text-zinc-200 min-h-[60px]"
                />
             </div>

            {/* Media List - Visible only when expanded */}
            {event.mediaItems.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500 mb-1 flex items-center gap-1">
                  <Monitor className="w-3 h-3" /> Technik & Medien
                </h4>
                <ul className="text-sm space-y-1">
                  {event.mediaItems.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
                       <span className="text-indigo-500 dark:text-indigo-400">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Contact Info */}
            {(event.client || event.contact) && (
              <div className="bg-white dark:bg-zinc-800 p-3 rounded border border-zinc-200 dark:border-zinc-700">
                 <h4 className="text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500 mb-2 flex items-center gap-1">
                  <User className="w-3 h-3" /> Kontakt
                </h4>
                {event.client && <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">{event.client}</p>}
                {event.contact && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Vor Ort: {event.contact}</p>}
              </div>
            )}

            {/* Parsed Notes */}
            {event.notes && event.notes !== 'Keine' && (
              <div className="text-sm text-zinc-600 dark:text-zinc-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-100 dark:border-yellow-800/50">
                <div className="font-semibold flex items-center gap-1 text-yellow-700 dark:text-yellow-500">
                   <Info className="w-3 h-3" /> Info aus Plan
                </div>
                {event.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Minimalist Tile Component for Grid View
export const EventTile: React.FC<EventCardProps & { onClick: () => void }> = ({
  event,
  isCompleted,
  isPinned,
  onClick
}) => {
  
  let bgColor = 'bg-white dark:bg-zinc-800';
  let textColor = 'text-zinc-800 dark:text-zinc-200';
  
  if (isCompleted) {
    bgColor = 'bg-zinc-100 dark:bg-zinc-900';
    textColor = 'text-zinc-400 dark:text-zinc-600 line-through';
  } else if (event.isSetupOrTech) {
    bgColor = 'bg-amber-50 dark:bg-amber-900/20';
    textColor = 'text-amber-900 dark:text-amber-200';
  }

  return (
    <div 
      onClick={onClick}
      className={`${bgColor} ${isPinned ? 'ring-2 ring-indigo-400 ring-inset' : 'border border-zinc-200 dark:border-zinc-700'} rounded-lg p-3 shadow-sm hover:shadow-md cursor-pointer transition-all h-24 flex flex-col justify-between relative`}
    >
      <div className="flex justify-between items-start">
        <span className={`font-bold text-sm leading-tight line-clamp-2 ${textColor}`}>
          {event.room}
        </span>
        {isPinned && <Pin className="w-3 h-3 text-indigo-500 fill-indigo-500 shrink-0" />}
      </div>
      
      <div className="flex items-end justify-between mt-1">
        <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{event.startTime}</span>
        <div className="flex gap-1">
           {event.mediaItems.length > 0 && <div className="w-2 h-2 rounded-full bg-indigo-400"></div>}
           {event.isSetupOrTech && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
        </div>
      </div>
    </div>
  );
};