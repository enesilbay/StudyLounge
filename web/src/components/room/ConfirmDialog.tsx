import { Button, ModalShell } from '../ui';

/** Odadaki herkesi etkileyen eylemler (sayacı bitir, tahtayı kapat, kişiyi çıkar) için onay penceresi. */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ModalShell
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>Vazgeç</Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {null}
    </ModalShell>
  );
}
