import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

// Session timeout configuration
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const WARNING_BEFORE_TIMEOUT_MS = 5 * 60 * 1000; // Show warning 5 minutes before timeout
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

interface UseSessionTimeoutOptions {
  enabled?: boolean;
  timeoutMs?: number;
  warningMs?: number;
  onTimeout?: () => void;
  onWarning?: () => void;
}

export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
  const {
    enabled = true,
    timeoutMs = SESSION_TIMEOUT_MS,
    warningMs = WARNING_BEFORE_TIMEOUT_MS,
    onTimeout,
    onWarning,
  } = options;

  const { toast } = useToast();
  const navigate = useNavigate();
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  }, []);

  const handleTimeout = useCallback(async () => {
    console.log('Session timeout - logging out user due to inactivity');
    
    // Sign out the user
    await supabase.auth.signOut();
    
    toast({
      variant: 'destructive',
      title: 'Session Expired',
      description: 'You have been logged out due to inactivity.',
    });

    if (onTimeout) {
      onTimeout();
    } else {
      navigate('/auth');
    }
  }, [toast, navigate, onTimeout]);

  const handleWarning = useCallback(() => {
    if (!warningShownRef.current) {
      warningShownRef.current = true;
      
      const remainingMinutes = Math.ceil(warningMs / 60000);
      
      toast({
        title: 'Session Expiring Soon',
        description: `Your session will expire in ${remainingMinutes} minutes due to inactivity. Move your mouse or press any key to stay logged in.`,
      });

      if (onWarning) {
        onWarning();
      }
    }
  }, [toast, warningMs, onWarning]);

  const resetTimers = useCallback(() => {
    if (!enabled) return;

    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    clearTimers();

    // Set warning timer
    warningRef.current = setTimeout(() => {
      handleWarning();
    }, timeoutMs - warningMs);

    // Set timeout timer
    timeoutRef.current = setTimeout(() => {
      handleTimeout();
    }, timeoutMs);
  }, [enabled, timeoutMs, warningMs, clearTimers, handleWarning, handleTimeout]);

  const handleActivity = useCallback(() => {
    // Debounce activity detection to avoid excessive timer resets
    const now = Date.now();
    if (now - lastActivityRef.current > 1000) { // Only reset if more than 1 second has passed
      resetTimers();
    }
  }, [resetTimers]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Check if user is authenticated before setting up timeout
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        resetTimers();
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        resetTimers();
      } else {
        clearTimers();
      }
    });

    // Add activity listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Also listen for visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if session should have expired while tab was hidden
        const now = Date.now();
        const elapsed = now - lastActivityRef.current;
        
        if (elapsed >= timeoutMs) {
          handleTimeout();
        } else {
          resetTimers();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimers();
      subscription.unsubscribe();
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, timeoutMs, clearTimers, resetTimers, handleActivity, handleTimeout]);

  // Expose method to manually extend session
  const extendSession = useCallback(() => {
    resetTimers();
    toast({
      title: 'Session Extended',
      description: 'Your session has been extended.',
    });
  }, [resetTimers, toast]);

  // Get remaining time until timeout
  const getRemainingTime = useCallback(() => {
    const elapsed = Date.now() - lastActivityRef.current;
    return Math.max(0, timeoutMs - elapsed);
  }, [timeoutMs]);

  return {
    extendSession,
    getRemainingTime,
    lastActivity: lastActivityRef.current,
  };
}
