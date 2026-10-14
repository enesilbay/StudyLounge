import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalShell } from './ui';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Aç</button>
      <ModalShell open={open} title="Başlık" onClose={() => setOpen(false)}>
        <input aria-label="Ad" />
        <button>Kaydet</button>
      </ModalShell>
    </div>
  );
}

describe('ModalShell', () => {
  it('odağı içeri alır, Tab içeride döner, arka planı inert yapar', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('Aç'));
    expect(screen.getByLabelText('Ad')).toHaveFocus();
    expect(screen.getByText('Aç').closest('[inert]')).not.toBeNull();
    await user.tab();
    expect(screen.getByText('Kaydet')).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Kapat')).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByText('Kaydet')).toHaveFocus();
  });

  it('Esc kapatır ve odak tetikleyiciye döner', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByText('Aç');
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
    expect(trigger.closest('[inert]')).toBeNull();
  });
});
