import { useCallback, useRef, useState } from 'react';

interface ConfirmDialogState {
  isOpen: boolean;
  message: string;
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState>({ isOpen: false, message: '' });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ isOpen: true, message });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setState({ isOpen: false, message: '' });
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setState({ isOpen: false, message: '' });
  }, []);

  return {
    isOpen: state.isOpen,
    message: state.message,
    confirm,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  };
}
