'use client';
import { useState, useEffect } from 'react';
import type { CurrentProfile } from '@/lib/auth';
import { peekProfile, getProfile, clearProfileCache } from '@/lib/profileCache';

export { getProfile as getCurrentUserClient, clearProfileCache };

export function useCurrentUser() {
  const [profile, setProfile] = useState<CurrentProfile | null>(() => peekProfile()?.user || null);
  const [loading, setLoading] = useState<boolean>(() => !peekProfile()?.user);

  useEffect(() => {
    let mounted = true;
    getProfile().then((p) => {
      if (mounted) {
        setProfile(p);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { profile, loading };
}
