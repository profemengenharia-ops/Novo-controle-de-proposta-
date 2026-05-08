import { toast } from 'sonner';

/**
 * Substituto não-bloqueante para window.confirm baseado em sonner toast.
 * Resolve true se o usuário clicar em "Confirmar", false se cancelar/expirar.
 */
export function confirmAction(opts: {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}): Promise<boolean> {
  return new Promise(resolve => {
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const id = toast(opts.title, {
      description: opts.description,
      duration: 15000,
      action: {
        label: opts.confirmLabel ?? 'Confirmar',
        onClick: () => {
          settle(true);
          toast.dismiss(id);
        },
      },
      cancel: {
        label: opts.cancelLabel ?? 'Cancelar',
        onClick: () => {
          settle(false);
          toast.dismiss(id);
        },
      },
      onDismiss: () => settle(false),
      onAutoClose: () => settle(false),
    });
  });
}
