import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  Sparkles,
  Minimize2,
  Maximize2,
  Wrench,
  Trash2,
  Mic,
  MicOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIAgent } from '@/hooks/useAIAgent';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';

const SPEECH_LANGS: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  te: 'te-IN',
};

interface AIAssistantProps {
  userRole?: string;
  currentPage?: string;
}

export default function AIAssistant({ userRole = 'farmer', currentPage }: AIAssistantProps) {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const { messages, isLoading, activeTools, sendMessage, clearMessages, TOOL_LABELS } = useAIAgent();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Web Speech API for voice input
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    const langCode = (i18n.language || 'en').split('-')[0];
    recognition.lang = SPEECH_LANGS[langCode] || 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setInput(transcript);
      if (event.results[0]?.isFinal) {
        setIsListening(false);
        if (transcript.trim()) {
          sendMessage(transcript.trim(), userRole, currentPage);
          setInput('');
        }
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [sendMessage, userRole, currentPage, i18n.language]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTools]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input, userRole, currentPage);
    setInput('');
  };

  const quickActions = [
    { label: 'Crop advice', message: 'What crops should I grow this season based on current weather?' },
    { label: 'Mandi prices', message: 'What are the current market prices for wheat?' },
    { label: 'Weather plan', message: 'What is the current weather and how should I plan my farming?' },
    { label: 'List product', message: 'I want to list 50 kg of organic tomatoes for sale at Rs.40/kg' },
    { label: 'Book a vet', message: 'I need to book a vet consultation for my cow that has a fever' },
    { label: 'Govt Schemes', message: 'What government schemes am I eligible for as a small farmer?' },
  ];

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-20 right-4 z-50 p-4 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-shadow"
          >
            <MessageCircle className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full flex items-center justify-center">
              <Sparkles className="h-2.5 w-2.5 text-white" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1, height: isMinimized ? 'auto' : '520px' }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "fixed bottom-20 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)]",
              "bg-card rounded-2xl border border-border shadow-2xl overflow-hidden",
              "flex flex-col"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/60">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-sm">FarmAssist AI</h3>
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">Agent</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Smart tools - Real-time data</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {messages.length > 0 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearMessages} title="Clear chat">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMinimized(!isMinimized)}>
                  {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  {messages.length === 0 ? (
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-3">
                          <Sparkles className="h-7 w-7 text-primary" />
                        </div>
                        <h4 className="font-semibold mb-1">Namaste!</h4>
                        <p className="text-xs text-muted-foreground">
                          I can check weather, prices, recommend crops, list products, check orders, book vets, and more automatically.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider">Try asking</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {quickActions.map((action) => (
                            <button
                              key={action.label}
                              onClick={() => sendMessage(action.message, userRole, currentPage)}
                              className="p-2 text-[11px] text-left rounded-lg bg-muted/60 hover:bg-muted transition-colors border border-transparent hover:border-border"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn("flex gap-2", msg.role === 'user' ? 'justify-end' : 'justify-start')}
                        >
                          {msg.role === 'assistant' && (
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                              <Bot className="h-3.5 w-3.5 text-primary" />
                            </div>
                          )}
                          <div className="max-w-[80%] space-y-1">
                            {/* Tool badges */}
                            {msg.role === 'assistant' && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1">
                                {msg.toolsUsed.map((tool) => (
                                  <span
                                    key={tool}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full"
                                  >
                                    <Wrench className="h-2.5 w-2.5" />
                                    {TOOL_LABELS[tool]?.emoji} {TOOL_LABELS[tool]?.label || tool}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div
                              className={cn(
                                "rounded-2xl px-3 py-2 text-sm",
                                msg.role === 'user'
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-muted rounded-bl-md"
                              )}
                            >
                              <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed [&_p]:my-0.5 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_table]:text-xs [&_th]:px-2 [&_td]:px-2 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_strong]:font-semibold">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                            </div>
                            {/* Proactive suggestion chips */}
                            {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {msg.suggestions.map((s, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => sendMessage(s.prompt, userRole, currentPage)}
                                    disabled={isLoading}
                                    className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20 disabled:opacity-50"
                                  >
                                    {s.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {msg.role === 'user' && (
                            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                              <User className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </motion.div>
                      ))}

                      {/* Loading with tool indicators */}
                      {isLoading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Bot className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="space-y-1.5">
                            {activeTools.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {activeTools.map((tool) => (
                                  <span
                                    key={tool}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-primary/15 text-primary rounded-full animate-pulse"
                                  >
                                    <Wrench className="h-2.5 w-2.5 animate-spin" />
                                    {TOOL_LABELS[tool]?.emoji} Using {TOOL_LABELS[tool]?.label || tool}...
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2.5">
                              <div className="flex gap-1">
                                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-3 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={isListening ? 'Listening...' : 'Ask or tap mic to speak...'}
                      disabled={isLoading || isListening}
                      className="flex-1 text-sm"
                    />
                    {/* Mic button */}
                    {((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) && (
                      <Button
                        type="button"
                        size="icon"
                        variant={isListening ? 'destructive' : 'outline'}
                        onClick={isListening ? stopListening : startListening}
                        disabled={isLoading}
                        className={isListening ? 'animate-pulse' : ''}
                      >
                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                    )}
                    <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
