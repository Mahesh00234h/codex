import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessage {
  id: string;
  consultation_id: string;
  sender_id: string;
  message: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  attachment_url?: string;
  is_read: boolean;
  created_at: string;
}

export function useChat(consultationId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!consultationId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as ChatMessage[]);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [consultationId]);

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime updates
    channelRef.current = supabase
      .channel(`chat-${consultationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `consultation_id=eq.${consultationId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [consultationId, fetchMessages]);

  const sendMessage = async (message: string, messageType: 'text' | 'image' | 'file' = 'text', attachmentUrl?: string) => {
    if (!user || !consultationId || !message.trim()) return false;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          consultation_id: consultationId,
          sender_id: user.id,
          message: message.trim(),
          message_type: messageType,
          attachment_url: attachmentUrl,
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const markAsRead = async () => {
    if (!user || !consultationId) return;

    try {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('consultation_id', consultationId)
        .neq('sender_id', user.id);
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  return {
    messages,
    isLoading,
    isSending,
    sendMessage,
    markAsRead,
    fetchMessages,
  };
}
