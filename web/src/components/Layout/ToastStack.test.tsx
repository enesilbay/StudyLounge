import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ToastStack from './ToastStack';
import { useInboxStore } from '../../store/inboxStore';

describe('ToastStack', () => {
  it('aria-live bölgesi bildirim yokken de sayfada durur', () => {
    const { container } = render(
      <MemoryRouter>
        <ToastStack />
      </MemoryRouter>,
    );
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('gelen bildirimi aynı bölgenin içinde gösterir', () => {
    const { container } = render(
      <MemoryRouter>
        <ToastStack />
      </MemoryRouter>,
    );
    act(() => useInboxStore.getState().pushToast({ title: 'Yeni mesaj', body: 'Selam' }));
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent('Yeni mesaj');
    expect(screen.getByLabelText('Bildirimi kapat')).toBeInTheDocument();
  });
});
