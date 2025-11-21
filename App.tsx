import React, { useState, useMemo, useEffect } from 'react';
import { extractTextFromPDF } from './services/pdfService';
import { parseSeatingList, parseMediaList } from './services/geminiService';
import { MergedEvent, ProcessingStatus } from './types';
import { EventCard, EventTile } from './components/EventCard';
import { 
  UploadCloud, 
  FileText, 
  Filter, 
  Calendar, 
  Search,
  RefreshCw,
  Hammer,
  Monitor,
  Clock,
  MapPin,
  ArrowUpDown,
  ClipboardList,
  Moon,
  Sun,
  LayoutGrid,
  List,
  X
} from 'lucide-react';

export default function App() {
  const [seatingFile, setSeatingFile] = useState<File | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>({ step: 'idle' });
  const [mergedData, setMergedData] = useState<MergedEvent[]>([]);
  
  const [activeTab, setActiveTab] = useState<'all' | 'setup'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'time' | 'room'>('time');
  
  // Initialize State from LocalStorage
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('em_darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [viewMode, setViewMode] = useState<'list' | 'tiles'>(() => {
    const saved = localStorage.getItem('em_viewMode');
    return saved === 'tiles' ? 'tiles' : 'list';
  });

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // User Interaction State with Persistence
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('em_completedIds');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('em_pinnedIds');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [userNotes, setUserNotes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('em_userNotes');
    return saved ? JSON.parse(saved) : {};
  });

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('em_darkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('em_viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('em_completedIds', JSON.stringify(Array.from(completedIds)));
  }, [completedIds]);

  useEffect(() => {
    localStorage.setItem('em_pinnedIds', JSON.stringify(Array.from(pinnedIds)));
  }, [pinnedIds]);

  useEffect(() => {
    localStorage.setItem('em_userNotes', JSON.stringify(userNotes));
  }, [userNotes]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'seating' | 'media') => {
    if (e.target.files && e.target.files[0]) {
      if (type === 'seating') setSeatingFile(e.target.files[0]);
      else setMediaFile(e.target.files[0]);
    }
  };

  const processFiles = async () => {
    if (!seatingFile || !mediaFile) return;

    try {
      setStatus({ step: 'extracting_text', message: 'Lese PDF Inhalte...' });
      const seatingText = await extractTextFromPDF(seatingFile);
      const mediaText = await extractTextFromPDF(mediaFile);

      setStatus({ step: 'analyzing_seating', message: 'Analysiere Raumplanung mit KI...' });
      const seatingEvents = await parseSeatingList(seatingText);

      setStatus({ step: 'analyzing_media', message: 'Analysiere Medientechnik mit KI...' });
      const mediaEvents = await parseMediaList(mediaText);

      setStatus({ step: 'merging', message: 'Führe Daten zusammen...' });
      
      // MERGING LOGIC
      // Filter out invalid rooms ("vor dem Raum") before merging
      const validSeatingEvents = seatingEvents.filter(e => {
          const r = e.room.toLowerCase().trim();
          // Filter specific bad OCR/Context reads
          return !r.includes('vor dem raum') && !r.includes('in dem raum');
      });

      // Create a base map from Seating events (primary source of truth for Room/Time)
      const merged: MergedEvent[] = validSeatingEvents.map((sEvent, index) => {
        // Find matching media entries.
        // Match criteria: Same Room AND Time overlaps.
        const sStart = parseInt(sEvent.startTime.replace(':', ''));
        
        const matchedMedia = mediaEvents.filter(mEvent => {
           // Normalize Room Names roughly
           const roomMatch = mEvent.room.toLowerCase().includes(sEvent.room.toLowerCase()) || sEvent.room.toLowerCase().includes(mEvent.room.toLowerCase());
           if (!roomMatch) return false;
           
           const mStart = parseInt(mEvent.startTime.replace(':', ''));
           // Allow a small buffer in time matching or exact match
           return Math.abs(mStart - sStart) < 50; // within 30 mins diff representation
        });

        const mediaItems = matchedMedia.flatMap(m => m.mediaItems || []);
        const client = matchedMedia.find(m => m.client)?.client;
        const contact = matchedMedia.find(m => m.contact)?.contact;

        return {
          ...sEvent,
          id: `evt-${index}`,
          mediaItems: Array.from(new Set(mediaItems)), // Deduplicate
          client: client,
          contact: contact,
          isSetupOrTech: sEvent.isSetupOrTech || matchedMedia.some(m => m.isSetupOrTech)
        };
      });

      // Initial Sort by Room then Time to allow comparison logic (prevEvent)
      merged.sort((a, b) => {
        if (a.room === b.room) {
           return a.startTime.localeCompare(b.startTime);
        }
        return a.room.localeCompare(b.room, undefined, { numeric: true });
      });

      // Link previous events for comparison logic
      for (let i = 1; i < merged.length; i++) {
        if (merged[i].room === merged[i-1].room) {
          merged[i].prevEvent = merged[i-1];
        }
      }

      setMergedData(merged);
      setStatus({ step: 'complete' });
    } catch (error) {
      console.error(error);
      setStatus({ step: 'error', message: 'Fehler bei der Verarbeitung.' });
    }
  };

  // Interaction Handlers
  const toggleComplete = (id: string) => {
    const newSet = new Set(completedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setCompletedIds(newSet);
  };

  const togglePin = (id: string) => {
    const newSet = new Set(pinnedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setPinnedIds(newSet);
  };

  const updateNote = (id: string, text: string) => {
    setUserNotes(prev => ({ ...prev, [id]: text }));
  };

  // Clear function now needs to handle storage carefully
  const clearAllData = () => {
      if(confirm("Wirklich alles zurücksetzen? Ihre Notizen und Abhakungen gehen verloren.")) {
          setMergedData([]); 
          setStatus({step: 'idle'}); 
          setCompletedIds(new Set());
          setPinnedIds(new Set());
          setUserNotes({});
          setSelectedEventId(null);
          // Optional: Clear LocalStorage
          localStorage.removeItem('em_completedIds');
          localStorage.removeItem('em_pinnedIds');
          localStorage.removeItem('em_userNotes');
      }
  };

  const filteredEvents = useMemo(() => {
    let events = [...mergedData]; // Create a shallow copy

    // 1. Tab Filter
    if (activeTab === 'setup') {
      events = events.filter(e => 
        e.isSetupOrTech || 
        e.bookingName.toLowerCase().includes('aufbau') || 
        e.bookingName.toLowerCase().includes('abbau') ||
        e.mediaItems.some(m => m.toLowerCase().includes('einweisung'))
      );
    }

    // 2. Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      events = events.filter(e => 
        e.room.toLowerCase().includes(q) ||
        e.bookingName.toLowerCase().includes(q) ||
        e.mediaItems.some(m => m.toLowerCase().includes(q)) ||
        (userNotes[e.id] || '').toLowerCase().includes(q)
      );
    }

    // 3. Sorting & Grouping
    // Groups: Pinned -> Active -> Completed
    // Within groups: Apply 'sortBy' logic
    events.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      const aDone = completedIds.has(a.id);
      const bDone = completedIds.has(b.id);

      // Priority 1: Pinned (Top)
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      // Priority 2: Completion (Bottom)
      // Only matters if both are pinned or both are not pinned
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;

      // Priority 3: Selected Sort (Time or Room)
      if (sortBy === 'time') {
        const timeDiff = a.startTime.localeCompare(b.startTime);
        if (timeDiff !== 0) return timeDiff;
        return a.room.localeCompare(b.room, undefined, { numeric: true });
      } else {
        // Room Sort: Group by Room, then by Time
        const roomDiff = a.room.localeCompare(b.room, undefined, { numeric: true });
        if (roomDiff !== 0) return roomDiff;
        return a.startTime.localeCompare(b.startTime);
      }
    });

    return events;
  }, [mergedData, activeTab, searchQuery, sortBy, completedIds, pinnedIds, userNotes]);

  const selectedEvent = useMemo(() => 
    mergedData.find(e => e.id === selectedEventId), 
    [mergedData, selectedEventId]
  );

  // Determine Date from first event
  const displayDate = mergedData.length > 0 ? mergedData[0].date : 'Datum';
  
  // Get day of week (simple logic assuming DD.MM.YY)
  const getDayOfWeek = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('.');
    if(parts.length !== 3) return '';
    // Assume 20xx
    const date = new Date(2000 + parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    return date.toLocaleDateString('de-DE', { weekday: 'long' });
  };

  return (
    <div className="min-h-screen pb-20 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      
      {/* Top Bar - Sticky with higher Z-index */}
      <header className="bg-white dark:bg-zinc-900 shadow-md sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 transition-colors">
        <div className="max-w-md mx-auto px-4 py-3">
           <div className="flex justify-between items-center">
             <div>
               <h1 className="text-xl font-black text-zinc-800 dark:text-white tracking-tight flex items-center gap-2">
                 <Calendar className="text-primary" /> EventMaster
               </h1>
               {mergedData.length > 0 && (
                 <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                   {getDayOfWeek(displayDate)}, {displayDate}
                 </p>
               )}
             </div>
             
             <div className="flex gap-2">
               {/* Dark Mode Toggle */}
               <button 
                 onClick={() => setIsDarkMode(!isDarkMode)}
                 className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-600 dark:text-amber-400 transition-colors"
               >
                 {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
               </button>

               {status.step === 'complete' && (
                  <button onClick={clearAllData} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                    <RefreshCw className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                  </button>
               )}
             </div>
           </div>

           {/* Controls if data loaded */}
           {status.step === 'complete' && (
             <div className="mt-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Suche in Raum, Name, Notiz..." 
                    className="w-full bg-zinc-100 dark:bg-zinc-800 dark:text-white pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-sky-600 transition-colors"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setActiveTab('all')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                      activeTab === 'all' 
                      ? 'bg-zinc-800 text-white dark:bg-zinc-700' 
                      : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Alle Buchungen
                  </button>
                  <button 
                    onClick={() => setActiveTab('setup')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-1 ${
                      activeTab === 'setup' 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Hammer className="w-3 h-3" /> Technik/Aufbau
                  </button>
                </div>
                
                {/* Sorting & View Mode Controls */}
                <div className="flex items-center justify-between pt-1">
                  
                  {/* Sort */}
                  <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                      <ArrowUpDown className="w-3 h-3" /> Sort:
                    </span>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 gap-1">
                      <button 
                        onClick={() => setSortBy('time')}
                        className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                          sortBy === 'time' 
                          ? 'bg-white dark:bg-zinc-700 shadow text-primary dark:text-sky-400 ring-1 ring-black/5 dark:ring-white/10' 
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                        }`}
                      >
                        Zeit
                      </button>
                      <button 
                        onClick={() => setSortBy('room')}
                        className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                          sortBy === 'room' 
                          ? 'bg-white dark:bg-zinc-700 shadow text-primary dark:text-sky-400 ring-1 ring-black/5 dark:ring-white/10' 
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                        }`}
                      >
                        Raum
                      </button>
                    </div>
                  </div>

                  {/* View Toggle & Stats */}
                  <div className="flex items-center gap-2">
                    {pinnedIds.size > 0 && (
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-full">
                        <ClipboardList className="w-3 h-3" /> {pinnedIds.size}
                      </span>
                    )}
                    
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 gap-1">
                      <button 
                        onClick={() => setViewMode('list')}
                        className={`p-1 rounded-md transition-all ${
                          viewMode === 'list' 
                          ? 'bg-white dark:bg-zinc-700 shadow text-primary dark:text-sky-400' 
                          : 'text-zinc-400 hover:text-zinc-600'
                        }`}
                      >
                        <List className="w-4 h-4" />
                      </button>
                      <button 
                         onClick={() => setViewMode('tiles')}
                         className={`p-1 rounded-md transition-all ${
                           viewMode === 'tiles' 
                           ? 'bg-white dark:bg-zinc-700 shadow text-primary dark:text-sky-400' 
                           : 'text-zinc-400 hover:text-zinc-600'
                         }`}
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
             </div>
           )}
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 relative z-0">
        
        {/* Upload Section */}
        {status.step !== 'complete' && (
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg border border-zinc-100 dark:border-zinc-700 mt-4 transition-colors">
            <h2 className="text-lg font-bold text-zinc-800 dark:text-white mb-4">Dateien hochladen</h2>
            
            <div className="space-y-4">
              <div className={`border-2 border-dashed rounded-lg p-4 flex items-center gap-3 transition-colors ${seatingFile ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600' : 'border-zinc-300 dark:border-zinc-600'}`}>
                <FileText className={seatingFile ? 'text-green-600 dark:text-green-400' : 'text-zinc-400'} />
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Bestuhlungsliste</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{seatingFile ? seatingFile.name : 'Gebuchte Räume PDF'}</p>
                </div>
                <label className="bg-zinc-800 dark:bg-zinc-700 text-white text-xs px-3 py-2 rounded cursor-pointer hover:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors">
                  Wählen
                  <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileChange(e, 'seating')} />
                </label>
              </div>

              <div className={`border-2 border-dashed rounded-lg p-4 flex items-center gap-3 transition-colors ${mediaFile ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600' : 'border-zinc-300 dark:border-zinc-600'}`}>
                <Monitor className={mediaFile ? 'text-green-600 dark:text-green-400' : 'text-zinc-400'} />
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Medienliste</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{mediaFile ? mediaFile.name : 'Gebuchte Artikel PDF'}</p>
                </div>
                <label className="bg-zinc-800 dark:bg-zinc-700 text-white text-xs px-3 py-2 rounded cursor-pointer hover:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors">
                  Wählen
                  <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileChange(e, 'media')} />
                </label>
              </div>

              <button 
                onClick={processFiles}
                disabled={!seatingFile || !mediaFile || status.step !== 'idle'}
                className="w-full bg-primary hover:bg-sky-600 dark:hover:bg-sky-400 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary/30 disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2 transition-all"
              >
                {status.step === 'idle' ? (
                  <> <UploadCloud className="w-5 h-5" /> Zusammenführen </>
                ) : (
                  <> <RefreshCw className="w-5 h-5 animate-spin" /> {status.message} </>
                )}
              </button>

              {status.step === 'error' && (
                <p className="text-red-500 text-sm text-center">{status.message}</p>
              )}
            </div>

            <div className="mt-6 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded text-xs text-zinc-500 dark:text-zinc-400">
              <p className="font-bold mb-1">So funktioniert's:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Lade die "Gebuchte Räume" PDF hoch.</li>
                <li>Lade die "Gebuchte Artikel" PDF hoch.</li>
                <li>Die App analysiert beide Dateien mit KI, extrahiert Räume, Zeiten, Technik und Kundeninfos und kombiniert sie zu einer Übersicht.</li>
              </ol>
            </div>
          </div>
        )}

        {/* Results List */}
        {status.step === 'complete' && (
          <div className="mt-2 space-y-3">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-10 text-zinc-400">
                <Filter className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>Keine Einträge für diesen Filter gefunden.</p>
              </div>
            ) : (
              // List View
              viewMode === 'list' ? (
                <>
                  {filteredEvents.map((event) => (
                    <EventCard 
                      key={event.id} 
                      event={event}
                      isCompleted={completedIds.has(event.id)}
                      isPinned={pinnedIds.has(event.id)}
                      userNote={userNotes[event.id] || ''}
                      onToggleComplete={() => toggleComplete(event.id)}
                      onTogglePin={() => togglePin(event.id)}
                      onUpdateNote={(text) => updateNote(event.id, text)}
                    />
                  ))}
                </>
              ) : (
                // Grid/Tile View
                <div className="grid grid-cols-3 gap-2">
                  {filteredEvents.map((event) => (
                     <EventTile 
                       key={event.id}
                       event={event}
                       isCompleted={completedIds.has(event.id)}
                       isPinned={pinnedIds.has(event.id)}
                       userNote={userNotes[event.id] || ''}
                       onToggleComplete={() => toggleComplete(event.id)}
                       onTogglePin={() => togglePin(event.id)}
                       onUpdateNote={(text) => updateNote(event.id, text)}
                       onClick={() => setSelectedEventId(event.id)}
                     />
                  ))}
                </div>
              )
            )}
            
            {/* Separator for done items in List view */}
            {viewMode === 'list' && completedIds.size > 0 && filteredEvents.some(e => completedIds.has(e.id)) && filteredEvents.some(e => !completedIds.has(e.id)) && (
               <div className="flex items-center gap-2 text-zinc-300 dark:text-zinc-600 py-2">
                 <div className="h-px bg-zinc-200 dark:bg-zinc-700 flex-1"></div>
                 <span className="text-xs font-bold uppercase">Abgehakt</span>
                 <div className="h-px bg-zinc-200 dark:bg-zinc-700 flex-1"></div>
               </div>
            )}
          </div>
        )}
      </main>

      {/* Detail Modal for Tile View */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
           {/* Backdrop */}
           <div 
             className="absolute inset-0 bg-black/50 backdrop-blur-sm"
             onClick={() => setSelectedEventId(null)}
           ></div>
           
           {/* Modal Content */}
           <div className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl shadow-2xl max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
              <button 
                onClick={() => setSelectedEventId(null)}
                className="absolute top-2 right-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 z-20 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="p-4 pt-10">
                <EventCard 
                    event={selectedEvent}
                    isCompleted={completedIds.has(selectedEvent.id)}
                    isPinned={pinnedIds.has(selectedEvent.id)}
                    userNote={userNotes[selectedEvent.id] || ''}
                    onToggleComplete={() => toggleComplete(selectedEvent.id)}
                    onTogglePin={() => togglePin(selectedEvent.id)}
                    onUpdateNote={(text) => updateNote(selectedEvent.id, text)}
                  />
              </div>
           </div>
        </div>
      )}

    </div>
  );
}