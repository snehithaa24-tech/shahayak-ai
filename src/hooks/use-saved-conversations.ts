'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { type SavedConversation, type TranscriptTurn } from '@/lib/session/transcript-types';

async function fetchConversationsList(userId: string): Promise<SavedConversation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, language, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(15);

  if (error) {
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id as string,
    title: (row.title as string) || 'Conversation',
    language: (row.language === 'hi' ? 'hi' : 'en') as 'en' | 'hi',
    createdAt: row.created_at as string,
  }));
}

export function useSavedConversations(userId: string | null) {
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadingTurnsId, setLoadingTurnsId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const mergeRows = useCallback((rows: SavedConversation[]) => {
    setConversations((prev) => {
      const existingTurns = new Map(prev.map((c) => [c.id, c.turns]));
      return rows.map((row) => ({
        ...row,
        turns: existingTurns.get(row.id),
      }));
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;

    try {
      const rows = await fetchConversationsList(userId);
      mergeRows(rows);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoadedUserId(userId);
    }
  }, [userId, mergeRows]);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    fetchConversationsList(userId)
      .then((rows) => {
        if (!active) return;
        mergeRows(rows);
        setLoadError(false);
      })
      .catch(() => {
        if (!active) return;
        setLoadError(true);
      })
      .finally(() => {
        if (!active) return;
        setLoadedUserId(userId);
      });

    return () => {
      active = false;
    };
  }, [userId, mergeRows]);

  const loadTurnsForConversation = useCallback(async (conversationId: string) => {
    setLoadingTurnsId(conversationId);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('transcript_turns')
        .select('id, role, content, language, created_at, turn_index')
        .eq('conversation_id', conversationId)
        .order('turn_index', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) return;

      const turns: TranscriptTurn[] = (data || []).map((row) => ({
        id: row.id as string,
        role: row.role === 'user' ? 'user' : 'assistant',
        content: row.content as string,
        language: row.language === 'hi' ? 'hi' : 'en',
        timestamp: new Date(row.created_at as string).getTime(),
        isFinal: true,
      }));

      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, turns } : c))
      );
    } finally {
      setLoadingTurnsId((prev) => (prev === conversationId ? null : prev));
    }
  }, []);

  const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    setDeletingId(conversationId);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
      if (error) return false;

      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      return true;
    } catch {
      return false;
    } finally {
      setDeletingId((prev) => (prev === conversationId ? null : prev));
    }
  }, []);

  const visibleConversations = userId ? conversations : [];
  const isLoading = Boolean(userId) && loadedUserId !== userId;

  return {
    conversations: visibleConversations,
    isLoading,
    loadError: Boolean(userId) && loadError,
    loadingTurnsId,
    deletingId,
    refresh,
    loadTurnsForConversation,
    deleteConversation,
  };
}
