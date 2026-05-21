import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Crown, ChevronRight, Lock, Plus, X } from 'lucide-react';
import { api } from '../lib/api';

interface Room {
  id: number;
  name: string;
  category?: string;
  isPremiumOnly: boolean;
  activeUsers: number;
  maxUsers: number;
  isPrivate: boolean;
}

export default function LobbiesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'classic' | 'elite'>('classic');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    icon: '🏠',
    category: 'Genel',
    isPrivate: false,
    password: '',
    maxUsers: 10,
    isPremiumOnly: false,
  });

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await api.get('/lobbies');
        setRooms(response.data);
      } catch (error) {
        console.error('Failed to fetch lobbies:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRooms();
  }, []);

  const filteredRooms = rooms.filter((r) => r.isPremiumOnly === (activeTab === 'elite'));

  const joinRoom = (roomId: number, isPrivate: boolean) => {
    if (isPrivate) {
      const password = prompt('Bu oda şifreli. Lütfen şifreyi giriniz:');
      if (!password) return;
      // In a real scenario, you'd probably verify the password via API first or pass it to socket connection
      // For now, we just pass the roomId to the focus page which will handle socket connection.
      // (The backend websocket might need password check)
    }
    navigate(`/app/focus/${roomId}`);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.name.trim()) return;
    setIsCreating(true);
    try {
      const payload: any = {
        ...newRoom,
        maxUsers: Number(newRoom.maxUsers),
      };
      if (!payload.isPrivate) {
        delete payload.password;
      }
      
      const res = await api.post('/lobbies', payload);
      setRooms(prev => [...prev, res.data]);
      setIsModalOpen(false);
      navigate(`/app/focus/${res.data.id}`);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Oda kurulamadı.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="pb-20 md:pb-0 relative">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-textDark mb-2">Çalışma Odaları</h1>
          <p className="text-textMuted font-medium">Sana uygun bir oda seç ve hemen odaklanmaya başla.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white font-bold py-3 px-6 rounded-xl hover:bg-secondary transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden md:inline">Oda Kur</span>
        </button>
      </header>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-border mb-8 max-w-sm">
        <button
          onClick={() => setActiveTab('classic')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'classic' ? 'bg-softIndigo text-primary shadow-sm' : 'text-textMuted hover:text-textDark'
          }`}
        >
          Klasik Odalar
        </button>
        <button
          onClick={() => setActiveTab('elite')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'elite' ? 'bg-lightAmber text-accent shadow-sm' : 'text-textMuted hover:text-textDark'
          }`}
        >
          <Crown className="w-4 h-4" />
          Elite Odalar
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        /* Room Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRooms.map((room, idx) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-6 rounded-[24px] border flex flex-col justify-between hover:shadow-md transition-all cursor-pointer bg-white ${
                room.isPremiumOnly ? 'border-accent' : 'border-border'
              }`}
              onClick={() => joinRoom(room.id, room.isPrivate)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 ${
                    room.isPremiumOnly ? 'bg-lightAmber text-accent' : 'bg-gray-100 text-textMuted'
                  }`}>
                    {room.category || 'Genel Oda'}
                  </span>
                  <h3 className="text-xl font-black text-textDark flex items-center gap-2">
                    {room.isPrivate && <Lock className="w-4 h-4 text-textMuted" />}
                    {room.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 bg-softSuccess text-success px-3 py-1.5 rounded-xl text-sm font-bold">
                  <Users className="w-4 h-4" />
                  {room.activeUsers}/{room.maxUsers}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <span className="text-sm font-bold text-textMuted flex items-center gap-2">
                  {room.isPremiumOnly ? <><Crown className="w-4 h-4 text-accent"/> x2 Puan Çarpanı</> : 'Standart Puan'}
                </span>
                <button className="w-10 h-10 rounded-full bg-softIndigo text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                  <ChevronRight className="w-5 h-5 ml-0.5" />
                </button>
              </div>
            </motion.div>
          ))}

          {filteredRooms.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-textMuted" />
              </div>
              <h3 className="text-lg font-bold text-textDark mb-1">Oda Bulunamadı</h3>
              <p className="text-textMuted text-sm">Şu anda bu kategoride aktif bir oda yok.</p>
            </div>
          )}
        </div>
      )}

      {/* Create Room Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-[24px] shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h2 className="text-xl font-bold text-textDark">Oda Kur</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-textMuted hover:text-textDark">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateRoom} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-textMuted mb-2">Oda Adı</label>
                <input 
                  type="text" 
                  value={newRoom.name} 
                  onChange={(e) => setNewRoom({...newRoom, name: e.target.value})}
                  className="w-full border border-border rounded-xl px-4 py-3 outline-none focus:border-primary"
                  placeholder="Örn: Final Çalışması"
                  required
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-textMuted mb-2">Kategori</label>
                  <select 
                    value={newRoom.category} 
                    onChange={(e) => setNewRoom({...newRoom, category: e.target.value})}
                    className="w-full border border-border rounded-xl px-4 py-3 outline-none focus:border-primary bg-white"
                  >
                    <option value="Genel">Genel</option>
                    <option value="Yazılım">Yazılım</option>
                    <option value="Sınav">Sınav</option>
                    <option value="Tıp">Tıp</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-textMuted mb-2">Kapasite</label>
                  <input 
                    type="number" 
                    min="2" max="50"
                    value={newRoom.maxUsers} 
                    onChange={(e) => setNewRoom({...newRoom, maxUsers: Number(e.target.value)})}
                    className="w-full border border-border rounded-xl px-4 py-3 outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 border border-border rounded-xl">
                <div>
                  <h4 className="font-bold text-textDark text-sm">Özel Oda</h4>
                  <p className="text-xs text-textMuted">Odaya şifre ile girilir</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={newRoom.isPrivate}
                  onChange={(e) => setNewRoom({...newRoom, isPrivate: e.target.checked})}
                  className="w-5 h-5 accent-primary"
                />
              </div>

              {newRoom.isPrivate && (
                <div>
                  <label className="block text-sm font-bold text-textMuted mb-2">Oda Şifresi</label>
                  <input 
                    type="text" 
                    value={newRoom.password} 
                    onChange={(e) => setNewRoom({...newRoom, password: e.target.value})}
                    className="w-full border border-border rounded-xl px-4 py-3 outline-none focus:border-primary"
                    placeholder="Şifre belirle"
                    required={newRoom.isPrivate}
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={isCreating || !newRoom.name.trim()}
                className="w-full bg-primary text-white font-bold py-4 rounded-xl mt-4 hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {isCreating ? 'Kuruluyor...' : 'Odayı Oluştur'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
