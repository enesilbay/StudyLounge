import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Flag, Search, Send, UserPlus, X } from 'lucide-react';
import { Avatar, Button, Notice, PageHeader, Pill, StateBlock, Surface, ModalShell } from '../components/ui';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { getApiErrorMessage, unwrapData } from '../lib/apiResponses';
import type { Message, User } from '../lib/types';
import { useAuthStore } from '../store/authStore';
import { useInboxStore } from '../store/inboxStore';
import ReportDialog from '../components/social/ReportDialog';
import UserSearch from '../components/social/UserSearch';

export default function DMPage() {
  const user = useAuthStore((state) => state.user);
  const [friends, setFriends] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeFriendId, setActiveFriendId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [tab, setTab] = useState<'chats' | 'requests'>('chats');
  const [requestError, setRequestError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const unreadFrom = useInboxStore((state) => state.unreadFrom);
  const friendRequests = useInboxStore((state) => state.friendRequests);
  
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  // Profil sayfasındaki "Mesaj gönder" bu sohbeti açar (?with=kullanıcıId).
  const [searchParams] = useSearchParams();
  const requestedFriendId = Number(searchParams.get('with')) || null;

  const activeFriend = friends.find((friend) => friend.id === activeFriendId) ?? friends[0];

  const loadFriends = useCallback(async (isCancelled: () => boolean = () => false) => {
    if (!user?.id) return;
    setIsLoadingFriends(true);
    try {
      const response = await api.get<User[]>(`/users/friends/${user.id}`);
      const nextFriends = unwrapData<User[]>(response.data);
      if (!isCancelled()) {
        setFriends(nextFriends);
        setActiveFriendId((current) => current ?? (nextFriends.some((friend) => friend.id === requestedFriendId) ? requestedFriendId : nextFriends[0]?.id ?? null));
      }
    } catch {
      if (!isCancelled()) setFriends([]);
    } finally {
      if (!isCancelled()) setIsLoadingFriends(false);
    }
  }, [user?.id, requestedFriendId]);

  useEffect(() => {
    let ignore = false;
    void loadFriends(() => ignore);
    return () => {
      ignore = true;
    };
  }, [loadFriends]);

  // Açık sohbetin mesajları okunmuş sayılır; uygulama geneli bildirimler bu kişiyi atlar.
  useEffect(() => {
    const { setViewingDmWith, markRead, unreadFrom: unread } = useInboxStore.getState();
    setViewingDmWith(activeFriend?.id ?? null);
    if (activeFriend?.id && unread.includes(activeFriend.id)) markRead(activeFriend.id);
    return () => setViewingDmWith(null);
  }, [activeFriend?.id]);

  const respond = async (requestId: number, status: 'accepted' | 'rejected') => {
    setRespondingId(requestId);
    setRequestError(null);
    try {
      await useInboxStore.getState().respondToRequest(requestId, status);
      if (status === 'accepted') await loadFriends();
    } catch (error) {
      setRequestError(getApiErrorMessage(error));
    } finally {
      setRespondingId(null);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function loadMessages() {
      if (!activeFriend?.id) {
        setMessages([]);
        return;
      }
      setIsLoadingMessages(true);
      try {
        const response = await api.get<Message[]>(`/messages/dm/${activeFriend.id}`);
        if (!ignore) setMessages(unwrapData<Message[]>(response.data));
      } catch {
        if (!ignore) setMessages([]);
      } finally {
        if (!ignore) setIsLoadingMessages(false);
      }
    }

    void loadMessages();
    return () => {
      ignore = true;
    };
  }, [activeFriend?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket();

    const onReceiveDm = (message: Message) => {
      const senderId = message.senderId ?? message.sender?.id;
      const receiverId = message.receiverId ?? message.receiver?.id;
      if (
        (senderId === user.id && receiverId === activeFriend?.id) ||
        (senderId === activeFriend?.id && receiverId === user.id)
      ) {
        setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
        // Sohbet açıkken gelen mesaj veritabanında da okundu işaretlenir.
        if (senderId === activeFriend?.id && !document.hidden) useInboxStore.getState().markRead(senderId);
      }
    };

    socket.on('receive_dm', onReceiveDm);
    return () => {
      socket.off('receive_dm', onReceiveDm);
    };
  }, [activeFriend?.id, user?.id]);

  const filteredFriends = useMemo(() => {
    const needle = query.toLowerCase();
    return friends.filter((friend) => `${friend.fullName} ${friend.username ?? ''}`.toLowerCase().includes(needle));
  }, [friends, query]);

  const handleSend = () => {
    if (!activeFriend?.id || !messageText.trim()) return;
    getSocket().emit('send_dm', {
      targetUserId: activeFriend.id,
      text: messageText.trim(),
    });
    setMessageText('');
  };

  return (
    <div>
      <PageHeader
        eyebrow="Sosyal"
        title="Arkadaşlarım"
        description="Arkadaşlarını görebilir ve onlara direkt mesaj gönderebilirsin."
      />

      <div className="grid h-[calc(100vh-220px)] min-h-[620px] grid-cols-1 gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Surface className="flex flex-col overflow-hidden">
          <div className="border-b border-border p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Arkadaş ara"
                  className="min-h-11 w-full rounded-xl border border-border bg-background pl-11 pr-4 text-base font-semibold outline-none focus:border-primary"
                />
              </div>
              <button onClick={() => setAddFriendOpen(true)} aria-label="Arkadaş ekle" title="Arkadaş ekle" className="flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-onPrimary hover:bg-secondary">
                <UserPlus className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 border-b border-border bg-sunken p-1" role="tablist" aria-label="Arkadaş listesi">
            {(['chats', 'requests'] as const).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tab === item}
                onClick={() => setTab(item)}
                className={`flex min-h-10 items-center justify-center gap-2 rounded-md text-[15px] font-semibold transition ${tab === item ? 'bg-surface text-textDark shadow-sm' : 'text-textMuted hover:text-textDark'}`}
              >
                {item === 'chats' ? 'Sohbetler' : 'İstekler'}
                {item === 'requests' && friendRequests.length > 0 ? (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-onPrimary">{friendRequests.length}</span>
                ) : null}
              </button>
            ))}
          </div>

          {tab === 'requests' ? (
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {requestError ? <Notice tone="danger" onDismiss={() => setRequestError(null)}>{requestError}</Notice> : null}
              {friendRequests.length === 0 ? <StateBlock title="Bekleyen istek yok" description="Sana gönderilen arkadaşlık istekleri burada görünür." /> : null}
              {friendRequests.map((request) => (
                <div key={request.id} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={request.sender.fullName} image={request.sender.avatarUrl} frame={request.sender.equippedProfileFrame} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-textDark">{request.sender.fullName}</p>
                      <p className="truncate text-sm text-textMuted">@{request.sender.username ?? 'kullanici'}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button size="sm" variant="ghost" icon={X} disabled={respondingId === request.id} onClick={() => void respond(request.id, 'rejected')}>
                      Reddet
                    </Button>
                    <Button size="sm" icon={Check} loading={respondingId === request.id} onClick={() => void respond(request.id, 'accepted')}>
                      Kabul et
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <div className="flex-1 overflow-y-auto">
            {isLoadingFriends ? <StateBlock loading title="Arkadaşlar yükleniyor" /> : null}
            {!isLoadingFriends && filteredFriends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => setActiveFriendId(friend.id)}
                className={`flex w-full items-center gap-4 border-b border-border p-4 text-left transition-colors ${
                  activeFriend?.id === friend.id ? 'bg-softIndigo' : 'bg-surface hover:bg-background'
                }`}
              >
                <Avatar name={friend.fullName} image={friend.avatarUrl} frame={friend.equippedProfileFrame} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold text-textDark">
                    <span className="truncate">{friend.fullName}</span>
                    {unreadFrom.includes(friend.id) ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label="Okunmamış mesaj" /> : null}
                  </p>
                  <p className="mt-1 truncate text-base text-textMuted">
                    {friend.isOnline ? 'Çevrim içi ve çalışmaya hazır' : `${friend.totalFocusMinutes ?? 0} dk odak`}
                  </p>
                </div>
              </button>
            ))}
            {!isLoadingFriends && filteredFriends.length === 0 ? <StateBlock title="Arkadaş bulunamadı" description="Arkadaş ekledikçe konuşmalar burada görünecek." /> : null}
          </div>
          )}
        </Surface>

        <Surface className="flex flex-col overflow-hidden">
          {activeFriend ? (
            <>
              <div className="flex items-center justify-between border-b border-border bg-surface p-4">
                <div className="flex items-center gap-4">
                  <button className="grid h-10 w-10 place-items-center rounded-xl bg-background text-textMuted lg:hidden">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Avatar name={activeFriend.fullName} image={activeFriend.avatarUrl} frame={activeFriend.equippedProfileFrame} premium={activeFriend.isPremium} />
                  <Link to={`/app/u/${activeFriend.id}`} className="min-w-0 hover:underline">
                    <h2 className="truncate font-semibold text-textDark">{activeFriend.fullName}</h2>
                    <p className="truncate text-base text-textMuted">@{activeFriend.username ?? 'kullanici'}</p>
                  </Link>
                </div>
                <div className="flex items-center gap-1">
                  <Pill tone={activeFriend.isOnline ? 'success' : 'neutral'}>{activeFriend.isOnline ? 'Çevrim içi' : 'Çevrim dışı'}</Pill>
                  <button type="button" onClick={() => setReportOpen(true)} title="Şikayet et" aria-label={`${activeFriend.fullName} kişisini şikayet et`} className="grid h-10 w-10 place-items-center rounded-lg text-textMuted hover:bg-sunken hover:text-danger">
                    <Flag className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-background p-5">
                {isLoadingMessages ? <StateBlock loading title="Mesajlar yükleniyor" /> : null}
                {!isLoadingMessages && messages.map((message) => {
                  const senderId = message.senderId ?? message.sender?.id;
                  const mine = senderId === user?.id;
                  return (
                    <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xl rounded-xl px-4 py-3 ${mine ? 'bg-primary text-onPrimary' : 'border border-border bg-surface text-textDark'}`}>
                        {!mine ? <p className="mb-1 text-base font-semibold text-accentDark">{message.sender?.fullName ?? message.senderName ?? activeFriend.fullName}</p> : null}
                        <p className="text-base font-semibold leading-6">{message.text}</p>
                        <p className={`mt-1 text-base font-semibold ${mine ? 'text-white/70' : 'text-textMuted'}`}>{formatTime(message.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
                {!isLoadingMessages && messages.length === 0 ? <StateBlock title="Henüz mesaj yok" description="İlk mesajı yazarak sohbeti başlat." /> : null}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSend();
                }}
                className="border-t border-border bg-surface p-4"
              >
                <div className="flex items-center gap-3">
                  <input
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    placeholder="Mesaj yaz..."
                    className="min-h-12 flex-1 rounded-xl border border-border bg-background px-4 text-base font-semibold outline-none focus:border-primary"
                  />
                  <button
                    disabled={!messageText.trim()}
                    className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-onPrimary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center">
              <StateBlock title="Sohbet seçilmedi" description="Arkadaş ekledikçe konuşmalar burada görünecek." />
            </div>
          )}
        </Surface>
      </div>
      
      <ModalShell open={addFriendOpen} title="Arkadaş ekle" description="Adını ya da kullanıcı adını yaz, profiline gidip istek gönder." onClose={() => setAddFriendOpen(false)}>
        <div className="min-h-64">
          <UserSearch placeholder="Ad ya da kullanıcı adı" onPick={() => setAddFriendOpen(false)} />
        </div>
      </ModalShell>

      <ReportDialog target={reportOpen && activeFriend ? { id: activeFriend.id, fullName: activeFriend.fullName } : null} onClose={() => setReportOpen(false)} />
    </div>
  );
}

function formatTime(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
