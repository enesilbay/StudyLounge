import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, Send } from 'lucide-react';
import { Avatar, PageHeader, Pill, StateBlock, Surface } from '../components/ui';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { unwrapData } from '../lib/apiResponses';
import type { Message, User } from '../lib/types';
import { useAuthStore } from '../store/authStore';

export default function DMPage() {
  const user = useAuthStore((state) => state.user);
  const [friends, setFriends] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeFriendId, setActiveFriendId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const activeFriend = friends.find((friend) => friend.id === activeFriendId) ?? friends[0];

  useEffect(() => {
    let ignore = false;

    async function loadFriends() {
      if (!user?.id) return;
      setIsLoadingFriends(true);
      try {
        const response = await api.get<User[]>(`/users/friends/${user.id}`);
        const nextFriends = unwrapData<User[]>(response.data);
        if (!ignore) {
          setFriends(nextFriends);
          setActiveFriendId((current) => current ?? nextFriends[0]?.id ?? null);
        }
      } catch {
        if (!ignore) setFriends([]);
      } finally {
        if (!ignore) setIsLoadingFriends(false);
      }
    }

    void loadFriends();
    return () => {
      ignore = true;
    };
  }, [user?.id]);

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
        title="Mesajlar"
        description="Arkadaş listesi, direkt mesaj geçmişi ve anlık mesajlaşma mobildeki socket akışıyla çalışır."
      />

      <div className="grid h-[calc(100vh-220px)] min-h-[620px] grid-cols-1 gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Surface className="flex flex-col overflow-hidden">
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Arkadaş ara"
                className="min-h-11 w-full rounded-xl border border-border bg-background pl-11 pr-4 text-base font-semibold outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoadingFriends ? <StateBlock loading title="Arkadaşlar yükleniyor" /> : null}
            {!isLoadingFriends && filteredFriends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => setActiveFriendId(friend.id)}
                className={`flex w-full items-center gap-4 border-b border-border p-4 text-left transition-colors ${
                  activeFriend?.id === friend.id ? 'bg-softIndigo' : 'bg-white hover:bg-background'
                }`}
              >
                <Avatar name={friend.fullName} image={friend.avatarUrl} frame={friend.equippedProfileFrame} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black text-textDark">{friend.fullName}</p>
                  <p className="mt-1 truncate text-base font-semibold text-textMuted">
                    {friend.isOnline ? 'Çevrim içi ve çalışmaya hazır' : `${friend.totalFocusMinutes ?? 0} dk odak`}
                  </p>
                </div>
              </button>
            ))}
            {!isLoadingFriends && filteredFriends.length === 0 ? <StateBlock title="Arkadaş bulunamadı" description="Arkadaş ekledikçe konuşmalar burada görünecek." /> : null}
          </div>
        </Surface>

        <Surface className="flex flex-col overflow-hidden">
          {activeFriend ? (
            <>
              <div className="flex items-center justify-between border-b border-border bg-white p-4">
                <div className="flex items-center gap-4">
                  <button className="grid h-10 w-10 place-items-center rounded-xl bg-background text-textMuted lg:hidden">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Avatar name={activeFriend.fullName} image={activeFriend.avatarUrl} frame={activeFriend.equippedProfileFrame} premium={activeFriend.isOnline} />
                  <div>
                    <h2 className="font-black text-textDark">{activeFriend.fullName}</h2>
                    <p className="text-base font-bold text-textMuted">@{activeFriend.username ?? 'kullanici'}</p>
                  </div>
                </div>
                <Pill tone={activeFriend.isOnline ? 'success' : 'neutral'}>{activeFriend.isOnline ? 'Çevrim içi' : 'Çevrim dışı'}</Pill>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-background p-5">
                {isLoadingMessages ? <StateBlock loading title="Mesajlar yükleniyor" /> : null}
                {!isLoadingMessages && messages.map((message) => {
                  const senderId = message.senderId ?? message.sender?.id;
                  const mine = senderId === user?.id;
                  return (
                    <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xl rounded-2xl px-4 py-3 ${mine ? 'bg-primary text-white' : 'border border-border bg-white text-textDark'}`}>
                        {!mine ? <p className="mb-1 text-base font-black text-accent">{message.sender?.fullName ?? message.senderName ?? activeFriend.fullName}</p> : null}
                        <p className="text-base font-semibold leading-6">{message.text}</p>
                        <p className={`mt-1 text-base font-bold ${mine ? 'text-white/70' : 'text-textMuted'}`}>{formatTime(message.createdAt)}</p>
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
                className="border-t border-border bg-white p-4"
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
                    className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-white disabled:cursor-not-allowed disabled:opacity-60"
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
    </div>
  );
}

function formatTime(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
