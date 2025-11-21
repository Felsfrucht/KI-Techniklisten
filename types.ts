export enum EventType {
  REGULAR = 'REGULAR',
  SETUP = 'SETUP', // Auf-Abbau
  TECH = 'TECH', // Technik related
  CLEANING = 'CLEANING'
}

export interface ExtractedEvent {
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  bookingName: string; // e.g. 1119 Sportangebot...
  eventName: string;   // Anlassname
  seating: string;
  pax: number;
  notes: string;
  source: 'seating' | 'media';
  // Specific to Media List
  client?: string;
  contact?: string;
  mediaItems?: string[];
  isSetupOrTech?: boolean;
}

export interface MergedEvent extends ExtractedEvent {
  id: string;
  mediaItems: string[];
  warnings?: string[]; // e.g. "Seating change from previous event"
  prevEvent?: MergedEvent | null; // Linked list for comparison
}

export interface ProcessingStatus {
  step: 'idle' | 'extracting_text' | 'analyzing_seating' | 'analyzing_media' | 'merging' | 'complete' | 'error';
  message?: string;
}

// Global augmentation for PDF.js loaded via CDN
declare global {
  interface Window {
    pdfjsLib: any;
  }
}