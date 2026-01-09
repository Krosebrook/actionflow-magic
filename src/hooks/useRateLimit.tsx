import { useState, useCallback, useRef } from "react";

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs?: number;
}

interface RateLimitState {
  isLocked: boolean;
  remainingAttempts: number;
  lockoutEndsAt: number | null;
  timeUntilReset: number;
}

export const useRateLimit = (config: RateLimitConfig) => {
  const { maxAttempts, windowMs, lockoutMs = 60000 } = config;
  
  const attemptsRef = useRef<number[]>([]);
  const lockoutEndRef = useRef<number | null>(null);
  const [state, setState] = useState<RateLimitState>({
    isLocked: false,
    remainingAttempts: maxAttempts,
    lockoutEndsAt: null,
    timeUntilReset: 0,
  });

  const updateState = useCallback(() => {
    const now = Date.now();
    
    // Check if lockout has expired
    if (lockoutEndRef.current && now >= lockoutEndRef.current) {
      lockoutEndRef.current = null;
      attemptsRef.current = [];
    }

    // Clean up old attempts outside the window
    attemptsRef.current = attemptsRef.current.filter(
      (timestamp) => now - timestamp < windowMs
    );

    const isLocked = lockoutEndRef.current !== null && now < lockoutEndRef.current;
    const remainingAttempts = Math.max(0, maxAttempts - attemptsRef.current.length);
    
    setState({
      isLocked,
      remainingAttempts,
      lockoutEndsAt: lockoutEndRef.current,
      timeUntilReset: isLocked && lockoutEndRef.current 
        ? Math.ceil((lockoutEndRef.current - now) / 1000) 
        : 0,
    });
  }, [maxAttempts, windowMs]);

  const checkLimit = useCallback((): boolean => {
    const now = Date.now();
    
    // Check if still in lockout
    if (lockoutEndRef.current && now < lockoutEndRef.current) {
      updateState();
      return false;
    }
    
    // Reset lockout if expired
    if (lockoutEndRef.current && now >= lockoutEndRef.current) {
      lockoutEndRef.current = null;
      attemptsRef.current = [];
    }

    // Clean up old attempts
    attemptsRef.current = attemptsRef.current.filter(
      (timestamp) => now - timestamp < windowMs
    );

    // Check if limit exceeded
    if (attemptsRef.current.length >= maxAttempts) {
      lockoutEndRef.current = now + lockoutMs;
      updateState();
      return false;
    }

    // Record this attempt
    attemptsRef.current.push(now);
    updateState();
    return true;
  }, [maxAttempts, windowMs, lockoutMs, updateState]);

  const reset = useCallback(() => {
    attemptsRef.current = [];
    lockoutEndRef.current = null;
    setState({
      isLocked: false,
      remainingAttempts: maxAttempts,
      lockoutEndsAt: null,
      timeUntilReset: 0,
    });
  }, [maxAttempts]);

  return {
    checkLimit,
    reset,
    ...state,
  };
};

// Pre-configured rate limiters for common use cases
export const useAuthRateLimit = () => useRateLimit({
  maxAttempts: 5,
  windowMs: 60000, // 1 minute
  lockoutMs: 300000, // 5 minute lockout after too many attempts
});

export const useFormRateLimit = () => useRateLimit({
  maxAttempts: 10,
  windowMs: 60000, // 1 minute
  lockoutMs: 60000, // 1 minute lockout
});
