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
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface StickyNoteProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialContent: string;
  onSave: (content: string) => void;
}

const NoteContent = ({ initialContent, onSave }: Pick<StickyNoteProps, 'initialContent' | 'onSave'>) => {
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
            className="w-full h-full bg-yellow-200/80 backdrop-blur-sm p-4 flex flex-col shadow-lg rounded-lg"
            style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.5)), url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23eab308\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E")',
            }}
        >
            <textarea
                value={noteContent}
                onChange={handleNoteChange}
                onBlur={handleBlur}
                placeholder="Escribe algo..."
                className="w-full flex-1 bg-transparent border-0 resize-none focus:ring-0 font-handwriting text-lg text-yellow-900 placeholder:text-yellow-600/70 p-2"
            />
        </div>
    );
};


export function StickyNote({ isOpen, onOpenChange, initialContent, onSave }: StickyNoteProps) {
  return (
    <>
      {/* Desktop uses a Dialog-like pop-up */}
      <div className="hidden lg:block">
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                'fixed bottom-24 right-8 w-80 h-80 rounded-md transform transition-all duration-300 ease-in-out z-50 origin-bottom-right rotate-3 p-0 border-0 bg-transparent shadow-none',
                isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
                )}
                hideCloseButton
            >
                <NoteContent initialContent={initialContent} onSave={onSave} />
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-card shadow-lg text-card-foreground hover:bg-card/80"
                    onClick={() => onOpenChange(false)}
                >
                    <X className="h-5 w-5" />
                </Button>
            </DialogContent>
        </Dialog>
      </div>

      {/* Mobile uses a Sheet */}
      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-[50vh] p-0 bg-transparent border-0">
                 <SheetHeader className="p-4 bg-yellow-200/80 border-b">
                    <SheetTitle className="font-handwriting text-xl font-bold text-yellow-800">
                        Notas Rápidas
                    </SheetTitle>
                    <SheetDescription className="sr-only">Un bloc de notas para apuntes rápidos.</SheetDescription>
                </SheetHeader>
                <NoteContent initialContent={initialContent} onSave={onSave} />
            </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
