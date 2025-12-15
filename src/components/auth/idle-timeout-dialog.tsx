
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface IdleTimeoutDialogProps {
  isIdle: boolean;
  onLogout: () => void;
  onStay: () => void;
}

const WARNING_DURATION_MS = 2 * 60 * 1000; // 2 minutes

export function IdleTimeoutDialog({ isIdle, onLogout, onStay }: IdleTimeoutDialogProps) {
  const [countdown, setCountdown] = useState(WARNING_DURATION_MS / 1000);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isIdle) {
      setCountdown(WARNING_DURATION_MS / 1000); // Reset countdown
      interval = setInterval(() => {
        setCountdown((currentCountdown) => {
          if (currentCountdown <= 1) {
            clearInterval(interval);
            return 0;
          }
          return currentCountdown - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isIdle]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isIdle} onOpenChange={(open) => !open && onStay()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Are you still there?</DialogTitle>
          <DialogDescription>
            You've been inactive for a while. For your security, you will be logged out automatically in{' '}
            <span className="font-bold">{formatTime(countdown)}</span>.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onLogout}>
            Log Out Now
          </Button>
          <Button onClick={onStay}>Stay Logged In</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
