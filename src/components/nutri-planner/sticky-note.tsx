'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { StickyNote as StickyNoteIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StickyNoteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StickyNote({ isOpen, onClose }: StickyNoteProps) {
  const [noteContent, setNoteContent] = useState('');

  useEffect(() => {
    const savedNote = localStorage.getItem('stickyNoteContent');
    if (savedNote) {
      setNoteContent(savedNote);
    }
  }, []);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNoteContent(e.target.value);
    localStorage.setItem('stickyNoteContent', e.target.value);
  };

  return (
    <div
      className={cn(
        'fixed bottom-8 right-8 w-80 h-80 bg-yellow-200 rounded-md shadow-2xl p-4 transform transition-all duration-300 ease-in-out z-50 origin-bottom-right rotate-3 flex flex-col',
        isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
      )}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-handwriting text-xl font-bold text-yellow-800">Notas</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-yellow-700 hover:bg-yellow-300/50"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <textarea
        value={noteContent}
        onChange={handleNoteChange}
        placeholder="Escribe algo..."
        className="w-full h-full bg-transparent border-0 resize-none focus:ring-0 font-handwriting text-lg text-yellow-900 placeholder:text-yellow-600/70"
      />
    </div>
  );
}
