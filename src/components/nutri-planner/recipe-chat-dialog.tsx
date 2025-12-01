'use client';

import { useState, useRef, useEffect } from 'react';
import { recipeChat } from '@/ai/flows/recipe-chat-flow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, LoaderCircle, Send, Bot, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Recipe, RecipeChatInput, RecipeChatOutput } from '@/lib/types';
import type { MessageData } from 'genkit';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';


interface RecipeChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeGenerated: (recipe: Omit<Recipe, 'id'>) => void;
}

// Simple markdown to HTML for bold and lists
const formatMessage = (text: string) => {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/^\s*-\s/gm, '<li>') // List items
}


export function RecipeChatDialog({ isOpen, onClose, onRecipeGenerated }: RecipeChatDialogProps) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Start the conversation with a greeting from the bot
      setMessages([
        { role: 'model', content: [{ text: '¡Hola! Soy NutriBot. ¿Qué te apetece cocinar hoy? Puedo ayudarte a crear una receta desde cero.' }] }
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const tryParseJson = (text: string): Omit<Recipe, 'id'> | null => {
    try {
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedText);

        // Basic validation to see if it looks like a recipe
        if (parsed.name && parsed.ingredients && parsed.instructions) {
            return parsed;
        }
        return null;
    } catch (e) {
        return null;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: MessageData = { role: 'user', content: [{ text: input }] };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await recipeChat({
        history: messages,
        message: input,
      });

      const potentialRecipe = tryParseJson(responseText);

      if (potentialRecipe) {
        onRecipeGenerated(potentialRecipe);
        toast({
          title: '¡Receta Generada!',
          description: 'El asistente ha creado una receta para ti. Revisa los detalles y guárdala.',
        });
        onClose();
        setMessages([]); // Reset for next time
      } else {
        const botMessage: MessageData = { role: 'model', content: [{ text: responseText }] };
        setMessages([...newMessages, botMessage]);
      }
    } catch (error) {
      console.error('Failed to get response from AI:', error);
      toast({
        variant: 'destructive',
        title: 'Error de IA',
        description: 'No se pudo obtener una respuesta. Por favor, intenta de nuevo.',
      });
      // Restore previous messages state if call fails
       setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) { setMessages([]); onClose(); }}}>
      <DialogContent className="bg-glass max-w-lg h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Asistente de Recetas
          </DialogTitle>
          <DialogDescription>
            Chatea con NutriBot para crear una nueva receta paso a paso.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 my-4 p-4 border rounded-lg bg-background/50" ref={scrollAreaRef}>
            <div className="space-y-6">
                {messages.map((msg, index) => (
                    <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                        {msg.role === 'model' && (
                           <Avatar className="h-8 w-8 border-2 border-primary">
                             <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                           </Avatar>
                        )}
                        <div className={cn(
                            "max-w-[80%] p-3 rounded-xl",
                            msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        )}>
                            <p className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatMessage(msg.content[0].text as string) }}></p>
                        </div>
                         {msg.role === 'user' && (
                           <Avatar className="h-8 w-8">
                             <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                           </Avatar>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3 justify-start">
                        <Avatar className="h-8 w-8 border-2 border-primary">
                            <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                        </Avatar>
                        <div className="max-w-[80%] p-3 rounded-xl bg-muted flex items-center">
                            <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>

        <div className="flex items-center gap-2">
            <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Escribe tu mensaje..."
                disabled={isLoading}
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                <Send className="h-5 w-5" />
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
