'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { StickyNoteIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Dialog } from '@/components/ui/dialog';

interface StickyNoteProps {
  isOpen: boolean;
  onToggle: () => void;
  initialContent: string;
  onSave: (content: string) => void;
}

const NoteContent = ({ initialContent, onSave, onToggle }: Pick<StickyNoteProps, 'initialContent' | 'onSave' | 'onToggle'>) => {
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
        <div 
            className="w-full h-full bg-yellow-200 p-4 flex flex-col shadow-lg rounded-lg"
            style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.5)), url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23eab308\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E")',
            }}
        >
            <SheetHeader className="mb-2 text-left">
                <SheetTitle className="font-handwriting text-xl font-bold text-yellow-800 flex justify-between items-center">
                    Notas Rápidas
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-yellow-700 hover:bg-yellow-300/50 lg:hidden"
                        onClick={onToggle}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </SheetTitle>
                <SheetDescription className="sr-only">Un bloc de notas para apuntes rápidos.</SheetDescription>
            </SheetHeader>
            <textarea
            value={noteContent}
            onChange={handleNoteChange}
            onBlur={handleBlur}
            placeholder="Escribe algo..."
            className="w-full h-full bg-transparent border-0 resize-none focus:ring-0 font-handwriting text-lg text-yellow-900 placeholder:text-yellow-600/70"
            />
        </div>
    );
};


export function StickyNote({ isOpen, onToggle, initialContent, onSave }: StickyNoteProps) {
  return (
    <>
      <div className="fixed bottom-48 right-8 z-40 lg:hidden">
         <Button
          onClick={onToggle}
          variant="secondary"
          className="h-16 w-16 rounded-full shadow-lg bg-secondary text-secondary-foreground hover:bg-secondary/80"
          size="icon"
        >
          <StickyNoteIcon className="h-8 w-8" />
        </Button>
      </div>

       <div className="hidden lg:block">
        <div className="fixed bottom-48 right-8 z-40">
            <Button
                onClick={onToggle}
                variant="secondary"
                className="h-16 w-16 rounded-full shadow-lg bg-secondary text-secondary-foreground hover:bg-secondary/80"
                size="icon"
            >
                <StickyNoteIcon className="h-8 w-8" />
            </Button>
        </div>
        <Dialog open={isOpen} onOpenChange={onToggle}>
            <div
                className={cn(
                'fixed bottom-48 right-28 w-80 h-80 rounded-md transform transition-all duration-300 ease-in-out z-50 origin-bottom-right rotate-3',
                isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
                )}
            >
               <NoteContent initialContent={initialContent} onSave={onSave} onToggle={onToggle} />
                 <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 text-yellow-700 hover:bg-yellow-300/50"
                    onClick={onToggle}
                >
                    <X className="h-5 w-5" />
                </Button>
            </div>
        </Dialog>
      </div>

      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={onToggle}>
            <SheetContent side="bottom" className="h-[50vh] p-0 bg-transparent border-0">
                <NoteContent initialContent={initialContent} onSave={onSave} onToggle={onToggle} />
            </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
