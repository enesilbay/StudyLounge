import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// `post` çağrıları kaydeder; yanıtı ayrı bir fonksiyon döndürür. Vitest'in sahte fonksiyon
// sonuçlarını izlemesi, reddedilen promise'i bileşen yakalasa bile "yakalanmamış" saymasın.
const post = vi.fn();
let postResponse: () => Promise<unknown> = () => Promise.resolve({ data: {} });
const get = vi.fn();
vi.mock('../../lib/api', () => ({
  api: {
    post: (...args: unknown[]) => {
      post(...args);
      return postResponse();
    },
    get,
  },
}));

const { default: ReportDialog } = await import('./ReportDialog');
const { default: UserSearch } = await import('./UserSearch');

describe('ReportDialog', () => {
  beforeEach(() => post.mockReset());

  it('sends the chosen reason, details and message id', async () => {
    postResponse = () => Promise.resolve({ data: { message: 'Şikayetin alındı.' } });
    const user = userEvent.setup();
    render(<ReportDialog target={{ id: 9, fullName: 'Bora' }} messageId={50} messagePreview="reklam linki" onClose={() => undefined} />);

    expect(screen.getByText('reklam linki')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Taciz ya da hakaret'));
    await user.type(screen.getByLabelText(/Ayrıntı/), '  sohbette hakaret etti  ');
    await user.click(screen.getByRole('button', { name: 'Şikayet et' }));

    expect(post).toHaveBeenCalledWith('/moderation/reports', { targetUserId: 9, reason: 'harassment', details: 'sohbette hakaret etti', messageId: 50 });
    expect(await screen.findByText('Şikayetin alındı.')).toBeInTheDocument();
  });

  it('shows the backend error', async () => {
    postResponse = () => Promise.reject({ response: { data: { message: 'Kendini şikayet edemezsin.' } } });
    const user = userEvent.setup();
    render(<ReportDialog target={{ id: 3, fullName: 'Ben' }} onClose={() => undefined} />);

    await user.click(screen.getByRole('button', { name: 'Şikayet et' }));
    expect(await screen.findByText('Kendini şikayet edemezsin.')).toBeInTheDocument();
  });

  it('renders nothing without a target', () => {
    const { container } = render(<ReportDialog target={null} onClose={() => undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('UserSearch', () => {
  beforeEach(() => {
    get.mockReset();
    vi.useRealTimers();
  });

  it('waits for typing to stop and links results to profiles', async () => {
    vi.useFakeTimers();
    get.mockResolvedValue({ data: [{ id: 4, username: 'ayse', fullName: 'Ayşe Yılmaz' }] });
    render(
      <MemoryRouter>
        <UserSearch />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('Kullanıcı ara'), { target: { value: 'ay' } });
    expect(get).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/users/search', { params: { q: 'ay' } });
    vi.useRealTimers();
    await waitFor(() => expect(screen.getByRole('link', { name: /Ayşe Yılmaz/ })).toHaveAttribute('href', '/app/u/4'));
  });

  it('does not search for a single character', async () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter>
        <UserSearch />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText('Kullanıcı ara'), { target: { value: 'a' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(get).not.toHaveBeenCalled();
  });
});
