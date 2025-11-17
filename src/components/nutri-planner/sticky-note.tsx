'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { StickyNote as StickyNoteIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StickyNoteProps {
  isOpen: boolean;
  onToggle: () => void;
  initialContent: string;
  onSave: (content: string) => void;
}

export function StickyNote({ isOpen, onToggle, initialContent, onSave }: StickyNoteProps) {
  const [noteContent, setNoteContent] = useState(initialContent);

  useEffect(() => {
    setNoteContent(initialContent);
  }, [initialContent]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNoteContent(e.target.value);
  };
  
  const handleBlur = () => {
    onSave(noteContent);
  };

  return (
    <>
      <div className="fixed bottom-48 right-8 z-40">
         <Button
          onClick={onToggle}
          className="h-16 w-16 rounded-full shadow-lg bg-yellow-300 text-yellow-800 hover:bg-yellow-400"
          size="icon"
        >
          <StickyNoteIcon className="h-8 w-8" />
        </Button>
      </div>

      <div
        className={cn(
          'fixed bottom-48 right-28 w-80 h-80 bg-yellow-200 rounded-md shadow-2xl p-4 transform transition-all duration-300 ease-in-out z-50 origin-bottom-right rotate-3 flex flex-col',
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        )}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-handwriting text-xl font-bold text-yellow-800">Notas</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-yellow-700 hover:bg-yellow-300/50"
            onClick={onToggle}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <textarea
          value={noteContent}
          onChange={handleNoteChange}
          onBlur={handleBlur}
          placeholder="Escribe algo..."
          className="w-full h-full bg-transparent border-0 resize-none focus:ring-0 font-handwriting text-lg text-yellow-900 placeholder:text-yellow-600/70"
        />
      </div>
    </>
  );
}
