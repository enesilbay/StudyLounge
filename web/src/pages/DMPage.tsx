import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { ArrowLeft, Check, Flag, MessageCircle, MessagesSquare, Search, Send, UserCheck, UserPlus, Users, X } from 'lucide-react';
import { Avatar, Notice, ModalShell } from '../components/ui';
import { AppPage, Card, EmptyState, SegmentedTabs, actionButton, ghostButton, inputClass, solidButton } from '../components/app/Kit';
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
  // Telefonda liste ve sohbet aynı anda sığmaz; sohbet açılınca liste gizlenir.
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const unreadFrom = useInboxStore((state) => state.unreadFrom);
  const friendRequests = useInboxStore((state) => state.friendRequests);
  const messagesRef = useRef<HTMLDivElement | null>(null);

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
        const requested = nextFriends.some((friend) => friend.id === requestedFriendId);
        setActiveFriendId((current) => current ?? (requested ? requestedFriendId : nextFriends[0]?.id ?? null));
        if (requested) setMobileChatOpen(true);
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

  // Yeni mesajda yalnızca mesaj kutusu kayar (sayfa değil).
  useEffect(() => {
    const list = messagesRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const filteredFriends = useMemo(() => {
    const needle = query.toLocaleLowerCase('tr-TR');
    return friends
      .filter((friend) => `${friend.fullName} ${friend.username ?? ''}`.toLocaleLowerCase('tr-TR').includes(needle))
      .sort((a, b) => Number(unreadFrom.includes(b.id)) - Number(unreadFrom.includes(a.id)) || Number(Boolean(b.isOnline)) - Number(Boolean(a.isOnline)));
  }, [friends, query, unreadFrom]);

  const handleSend = () => {
    if (!activeFriend?.id || !messageText.trim()) return;
    getSocket().emit('send_dm', {
      targetUserId: activeFriend.id,
      text: messageText.trim(),
    });
    setMessageText('');
  };

  const openChat = (friendId: number) => {
    setActiveFriendId(friendId);
    setMobileChatOpen(true);
  };

  return (
    <AppPage
      title="Arkadaşlar"
      actions={
        <button type="button" onClick={() => setAddFriendOpen(true)} className={solidButton}>
          <UserPlus className="h-4 w-4" />
          Arkadaş ekle
        </button>
      }
    >
      <div className="grid h-[calc(100dvh-15rem)] min-h-[30rem] grid-cols-1 gap-4 lg:h-[calc(100dvh-12rem)] lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* ── Liste ── */}
        <Card className={`flex min-h-0 flex-col overflow-hidden ${mobileChatOpen ? 'hidden lg:flex' : 'flex'}`}>
          <div className="space-y-3 p-4">
            <label className="relative block">
              <span className="sr-only">Arkadaş ara</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mb-body" aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Arkadaş ara" className={`${inputClass} pl-11`} />
            </label>
            <SegmentedTabs
              panelId="dm-list"
              label="Arkadaş listesi"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'chats', label: 'Sohbetler' },
                { value: 'requests', label: 'İstekler', badge: friendRequests.length },
              ]}
            />
          </div>

          <div role="tabpanel" id="dm-list" aria-labelledby={`dm-list-tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {tab === 'requests' ? (
              <div className="space-y-2 px-2">
                {requestError ? <Notice tone="danger" onDismiss={() => setRequestError(null)}>{requestError}</Notice> : null}
                {friendRequests.length === 0 ? <EmptyState icon={UserCheck} title="Bekleyen istek yok" text="Sana gönderilen arkadaşlık istekleri burada görünür." /> : null}
                <AnimatePresence initial={false}>
                  {friendRequests.map((request, index) => (
                    <m.div
                      key={request.id}
                      layout={false}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.3, delay: index * 0.04 }}
                      className="rounded-[16px] border border-mb-line bg-mb-surface/60 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={request.sender.fullName} image={request.sender.avatarUrl} frame={request.sender.equippedProfileFrame} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-mb-ink">{request.sender.fullName}</p>
                          <p className="truncate text-sm text-mb-body">@{request.sender.username ?? 'kullanici'}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <button type="button" className={ghostButton} disabled={respondingId === request.id} onClick={() => void respond(request.id, 'rejected')}>
                          <X className="h-4 w-4" />
                          Reddet
                        </button>
                        <button type="button" className={`${actionButton} min-h-10 text-sm`} disabled={respondingId === request.id} onClick={() => void respond(request.id, 'accepted')}>
                          <Check className="h-4 w-4" />
                          Kabul et
                        </button>
                      </div>
                    </m.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <ul className="space-y-1">
                {isLoadingFriends ? <FriendSkeleton /> : null}
                {!isLoadingFriends &&
                  filteredFriends.map((friend, index) => {
                    const active = activeFriend?.id === friend.id;
                    const unread = unreadFrom.includes(friend.id);
                    return (
                      <m.li key={friend.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: Math.min(index, 10) * 0.035 }}>
                        <button
                          type="button"
                          onClick={() => openChat(friend.id)}
                          aria-current={active ? 'true' : undefined}
                          className={`relative flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors ${active ? 'bg-mb-surface' : 'hover:bg-mb-surface/60'}`}
                        >
                          {active ? <span aria-hidden="true" className="absolute inset-y-3 left-0 w-1 rounded-full bg-mb-action" /> : null}
                          <span className="relative shrink-0">
                            <Avatar name={friend.fullName} image={friend.avatarUrl} frame={friend.equippedProfileFrame} size="sm" />
                            {friend.isOnline ? <span aria-hidden="true" className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-mb-action ring-2 ring-mb-card" /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-[15px] ${unread ? 'font-semibold text-mb-ink' : 'font-medium text-mb-ink'}`}>{friend.fullName}</span>
                            <span className="block truncate text-[13px] text-mb-body">{friend.isOnline ? 'Çevrim içi' : `${friend.totalFocusMinutes ?? 0} dk odak`}</span>
                          </span>
                          {unread ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-mb-action" aria-label="Okunmamış mesaj" /> : null}
                        </button>
                      </m.li>
                    );
                  })}
              </ul>
            )}
            {tab === 'chats' && !isLoadingFriends && filteredFriends.length === 0 ? (
              <EmptyState
                icon={Users}
                title={friends.length ? 'Bu adla arkadaş yok' : 'Henüz arkadaşın yok'}
                text={friends.length ? 'Aramayı değiştirip tekrar bak.' : 'Birlikte çalışacağın kişileri ekle; sohbetleriniz burada görünür.'}
                action={
                  friends.length ? undefined : (
                    <button type="button" onClick={() => setAddFriendOpen(true)} className={actionButton}>
                      <UserPlus className="h-4 w-4" />
                      Arkadaş ekle
                    </button>
                  )
                }
              />
            ) : null}
          </div>
        </Card>

        {/* ── Sohbet ── */}
        <Card className={`min-h-0 flex-col overflow-hidden ${mobileChatOpen ? 'flex' : 'hidden lg:flex'}`}>
          {activeFriend ? (
            <>
              <div className="flex items-center gap-3 border-b border-mb-line px-4 py-3">
                <button type="button" onClick={() => setMobileChatOpen(false)} aria-label="Arkadaş listesine dön" className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-mb-body hover:bg-mb-surface lg:hidden">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="relative shrink-0">
                  <Avatar name={activeFriend.fullName} image={activeFriend.avatarUrl} frame={activeFriend.equippedProfileFrame} premium={activeFriend.isPremium} size="sm" />
                  {activeFriend.isOnline ? <span aria-hidden="true" className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-mb-action ring-2 ring-mb-card" /> : null}
                </span>
                <Link to={`/app/u/${activeFriend.id}`} className="min-w-0 flex-1 rounded-[8px] hover:underline">
                  <h2 className="truncate font-mb-display text-[17px] font-medium tracking-[-0.02em] text-mb-ink">{activeFriend.fullName}</h2>
                  <p className="truncate text-[13px] text-mb-body">{activeFriend.isOnline ? 'Çevrim içi' : `@${activeFriend.username ?? 'kullanici'}`}</p>
                </Link>
                <button type="button" onClick={() => setReportOpen(true)} title="Şikayet et" aria-label={`${activeFriend.fullName} kişisini şikayet et`} className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-mb-body hover:bg-mb-surface hover:text-danger">
                  <Flag className="h-4 w-4" />
                </button>
              </div>

              <div ref={messagesRef} role="log" aria-label="Mesajlar" aria-live={isLoadingMessages ? 'off' : 'polite'} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-mb-surface/50 px-4 py-5 md:px-6">
                {isLoadingMessages ? <p className="py-10 text-center text-sm text-mb-body">Mesajlar yükleniyor…</p> : null}
                <AnimatePresence initial={false}>
                  {!isLoadingMessages &&
                    messages.map((message) => {
                      const senderId = message.senderId ?? message.sender?.id;
                      const mine = senderId === user?.id;
                      return (
                        <m.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.25 }}
                          className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] rounded-[16px] px-3.5 py-2 md:max-w-lg ${mine ? 'rounded-br-[4px] bg-mb-action text-mb-on-action' : 'rounded-bl-[4px] border border-mb-line bg-mb-card text-mb-ink'}`}>
                            <p className="whitespace-pre-wrap break-words text-[15px] leading-6">{message.text}</p>
                            <p className={`mt-0.5 text-right text-[11px] ${mine ? 'text-mb-on-action/70' : 'text-mb-body'}`}>{formatTime(message.createdAt)}</p>
                          </div>
                        </m.div>
                      );
                    })}
                </AnimatePresence>
                {!isLoadingMessages && messages.length === 0 ? <EmptyState icon={MessageCircle} title="Henüz mesaj yok" text="Bir merhaba yaz; birlikte çalışmak için bir odada buluşun." /> : null}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2 border-t border-mb-line p-3"
              >
                <input value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Mesaj yaz" aria-label="Mesaj" className={inputClass} />
                <button disabled={!messageText.trim()} aria-label="Gönder" className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-mb-action text-mb-on-action shadow-mb-press transition hover:bg-mb-action-2 disabled:opacity-40">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center">
              <EmptyState icon={MessagesSquare} title="Sohbet seçilmedi" text="Soldan bir arkadaşını seç ya da yeni arkadaş ekle." />
            </div>
          )}
        </Card>
      </div>

      <ModalShell open={addFriendOpen} title="Arkadaş ekle" description="Adını ya da kullanıcı adını yaz, profiline gidip istek gönder." onClose={() => setAddFriendOpen(false)}>
        <div className="min-h-64">
          <UserSearch placeholder="Ad ya da kullanıcı adı" onPick={() => setAddFriendOpen(false)} />
        </div>
      </ModalShell>

      <ReportDialog target={reportOpen && activeFriend ? { id: activeFriend.id, fullName: activeFriend.fullName } : null} onClose={() => setReportOpen(false)} />
    </AppPage>
  );
}

/** Liste yüklenirken yanıp sönen yer tutucular. */
function FriendSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index} className="flex items-center gap-3 px-3 py-2.5" aria-hidden="true">
          <span className="h-10 w-10 animate-pulse rounded-full bg-mb-surface" />
          <span className="flex-1 space-y-1.5">
            <span className="block h-3 w-2/3 animate-pulse rounded bg-mb-surface" />
            <span className="block h-2.5 w-1/3 animate-pulse rounded bg-mb-surface" />
          </span>
        </li>
      ))}
    </>
  );
}

function formatTime(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
