import { useEffect } from 'react';

interface ShortcutHandlers {
  onTogglePause?: () => void;
  onClear?: () => void;
  onToggleRecording?: () => void;
  onFocusFilter?: () => void;
  onCloseModal?: () => void;
}

export function useKeyboardShortcuts({
  onTogglePause,
  onClear,
  onToggleRecording,
  onFocusFilter,
  onCloseModal,
}: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing inside input or textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        if (e.key === 'Escape' && onCloseModal) {
          onCloseModal();
          target.blur();
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePause?.();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        onClear?.();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        onToggleRecording?.();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        onFocusFilter?.();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCloseModal?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePause, onClear, onToggleRecording, onFocusFilter, onCloseModal]);
}
