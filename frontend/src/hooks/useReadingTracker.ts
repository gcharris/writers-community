import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';

interface ReadingMetrics {
  sessionId: string | null;
  timeOnPage: number;
  scrollDepth: number;
  isTracking: boolean;
}

export const useReadingTracker = (workId: string, sectionId?: string) => {
  const [metrics, setMetrics] = useState<ReadingMetrics>({
    sessionId: null,
    timeOnPage: 0,
    scrollDepth: 0,
    isTracking: false,
  });

  const startTimeRef = useRef<number>(Date.now());
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start reading session
  useEffect(() => {
    const startSession = async () => {
      try {
        const response = await apiClient.post('/reading/start', {
          work_id: workId,
          section_id: sectionId || null,
        });

        setMetrics(prev => ({
          ...prev,
          sessionId: response.data.id,
          isTracking: true,
        }));

        startTimeRef.current = Date.now();
      } catch (error) {
        console.error('Failed to start reading session:', error);
      }
    };

    startSession();

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [workId, sectionId]);

  // Track scroll depth
  useEffect(() => {
    if (!metrics.isTracking) return;

    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;

      const scrollDepth = Math.round(
        ((scrollTop + windowHeight) / documentHeight) * 100
      );

      setMetrics(prev => ({
        ...prev,
        scrollDepth: Math.max(prev.scrollDepth, scrollDepth),
      }));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [metrics.isTracking]);

  // Update backend every 10 seconds
  useEffect(() => {
    if (!metrics.sessionId || !metrics.isTracking) return;

    updateIntervalRef.current = setInterval(async () => {
      const timeOnPage = Math.floor((Date.now() - startTimeRef.current) / 1000);

      setMetrics(prev => ({ ...prev, timeOnPage }));

      try {
        await apiClient.put(`/reading/${metrics.sessionId}/update`, {
          time_on_page: timeOnPage,
          scroll_depth: metrics.scrollDepth,
          scroll_event: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to update reading session:', error);
      }
    }, 10000); // 10 seconds

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [metrics.sessionId, metrics.isTracking, metrics.scrollDepth]);

  const completeSession = async () => {
    if (!metrics.sessionId) return null;

    try {
      const response = await apiClient.post(`/reading/${metrics.sessionId}/complete`);
      setMetrics(prev => ({ ...prev, isTracking: false }));
      return response.data;
    } catch (error) {
      console.error('Failed to complete reading session:', error);
      return null;
    }
  };

  return {
    metrics,
    completeSession,
  };
};
