import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { langHeaders, getCurrentLangName } from '@/lib/language';
import { DEMO_DATA_MODE, isMissingBackendError } from '@/lib/backendMode';

export interface Suggestion {
  label: string;
  prompt: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  suggestions?: Suggestion[];
}

// Extract ```suggestions ...``` block from assistant content
function extractSuggestions(text: string): { clean: string; suggestions: Suggestion[] } {
  const re = /```suggestions\s*([\s\S]*?)```/i;
  const match = text.match(re);
  if (!match) return { clean: text, suggestions: [] };
  const block = match[1];
  const suggestions: Suggestion[] = [];
  for (const raw of block.split('\n')) {
    const line = raw.trim().replace(/^[-*]\s*/, '');
    if (!line) continue;
    const [label, ...rest] = line.split('::');
    const prompt = rest.join('::').trim();
    if (label && prompt) suggestions.push({ label: label.trim(), prompt });
  }
  const clean = text.replace(re, '').trim();
  return { clean, suggestions };
}

const TOOL_LABELS: Record<string, { label: string; emoji: string }> = {
  get_weather: { label: 'Weather', emoji: '🌤️' },
  get_market_prices: { label: 'Market Prices', emoji: '💰' },
  get_crop_recommendation: { label: 'Crop Advisor', emoji: '🌾' },
  get_gov_schemes: { label: 'Govt Schemes', emoji: '📋' },
  get_disease_info: { label: 'Disease Info', emoji: '🔬' },
  get_farm_stats: { label: 'Farm Stats', emoji: '📊' },
  add_product: { label: 'Add Product', emoji: '📦' },
  check_my_orders: { label: 'Orders', emoji: '🛒' },
  book_vet_consultation: { label: 'Book Vet', emoji: '🩺' },
  update_order_status: { label: 'Update Order', emoji: '✏️' },
  search_products: { label: 'Search', emoji: '🔍' },
};

function localAgentReply(message: string): Message {
  const lower = message.toLowerCase();

  if (lower.includes('weather')) {
    return {
      role: 'assistant',
      content: 'Demo mode: the weather Edge Function is not deployed yet. For today, plan irrigation around moderate humidity and possible showers. Deploy the weather function and set OPENWEATHERMAP_API_KEY for live forecasts.',
      toolsUsed: ['get_weather'],
    };
  }

  if (lower.includes('price') || lower.includes('market') || lower.includes('mandi')) {
    return {
      role: 'assistant',
      content: 'Demo mode market note: show tomato around Rs.42/kg, wheat around Rs.26/kg, and onion around Rs.31/kg until the products table and market functions are live.',
      toolsUsed: ['get_market_prices'],
    };
  }

  if (lower.includes('crop') || lower.includes('grow')) {
    return {
      role: 'assistant',
      content: 'Demo crop advice: for a monsoon-season farm, consider maize, soybean, pulses, or tomato depending on soil drainage. Add your farm record after running the Supabase setup SQL for personalized recommendations.',
      toolsUsed: ['get_crop_recommendation'],
    };
  }

  if (lower.includes('scheme')) {
    return {
      role: 'assistant',
      content: 'Demo schemes: small farmers commonly check PM-KISAN, PMFBY crop insurance, Soil Health Card, and Kisan Credit Card. Deploy gov-schemes for live eligibility guidance.',
      toolsUsed: ['get_gov_schemes'],
    };
  }

  return {
    role: 'assistant',
    content: 'Demo mode is active because the new Supabase project has no tables/functions yet. I can still guide crop, weather, market, disease, schemes, product listing, and vet workflows. Run supabase/farmer_only_setup.sql and deploy Edge Functions for live agent tools.',
    suggestions: [
      { label: 'Setup backend', prompt: 'What backend setup is still missing?' },
      { label: 'Crop advice', prompt: 'What crop should I grow this season?' },
      { label: 'Market prices', prompt: 'What are demo mandi prices?' },
    ],
  };
}

export function useAIAgent() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);

  const sendMessage = useCallback(async (
    message: string,
    userRole: string = 'farmer',
    currentPage?: string
  ) => {
    const userMsg: Message = { role: 'user', content: message };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setActiveTools([]);

    let assistantContent = '';
    let toolsUsed: string[] = [];

    try {
      if (DEMO_DATA_MODE) {
        setMessages(prev => [...prev, localAgentReply(message)]);
        return;
      }

      // Get the user's session token for secure server-side auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: 'Please sign in to use the AI assistant.' },
        ]);
        setIsLoading(false);
        return;
      }
      const accessToken = session.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            ...langHeaders(),
          },
          body: JSON.stringify({
            message,
            context: { userRole, currentPage, language: getCurrentLangName() },
            conversationHistory: messages.slice(-10),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';

      // Non-streaming JSON response (no tool calls)
      if (contentType.includes('application/json')) {
        const data = await response.json();
        const parsed = extractSuggestions(data.response || '');
        toolsUsed = data.tools_used || [];
        setMessages(prev => [...prev, { role: 'assistant', content: parsed.clean, toolsUsed, suggestions: parsed.suggestions }]);
        return;
      }

      // Streaming SSE response (with tool calls)
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const updateAssistant = (chunk: string) => {
        assistantContent += chunk;
        const { clean, suggestions } = extractSuggestions(assistantContent);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: clean, toolsUsed, suggestions } : m
            );
          }
          return [...prev, { role: 'assistant', content: clean, toolsUsed, suggestions }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);

            // Handle tool info event
            if (parsed.tools_used) {
              toolsUsed = parsed.tools_used;
              setActiveTools(parsed.tools_used);
              continue;
            }

            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (err) {
      if (isMissingBackendError(err)) {
        setMessages(prev => [...prev, localAgentReply(message)]);
        return;
      }
      console.error('AI agent error:', err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
      setActiveTools([]);
    }
  }, [messages]);

  const clearMessages = () => setMessages([]);

  return {
    messages,
    isLoading,
    activeTools,
    sendMessage,
    clearMessages,
    TOOL_LABELS,
  };
}
