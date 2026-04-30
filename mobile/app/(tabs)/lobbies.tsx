import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, FlatList, 
  SafeAreaView, TextInput, Modal, Alert 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

// proje.md dosyasındaki kurumsal renk paleti
const COLORS = {
  deepIndigo: '#1A237E',
  amberGold: '#FFC107',
  background: '#F8F9FA',
  card: '#FFFFFF',
  textMuted: '#6B7280',
  white: '#FFFFFF'
};

interface Lobby {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export default function LobbiesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  
  // State Tanımlamaları
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  // Yeni Lobi Formu State'leri
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // 1. Backend'den Lobileri Çekme (Dinamik Veri)
  const fetchLobbies = async () => {
    try {
      const response = await fetch('http://192.168.1.5:3000/lobbies');
      const data = await response.json();
      setLobbies(data);
    } catch (error) {
      console.error("Lobi listesi yüklenemedi:", error);
    }
  };

  useEffect(() => {
    fetchLobbies();
  }, []);

  // 2. Yeni Lobi Oluşturma (POST İsteği)
  const handleCreateLobby = async () => {
    if (!newName.trim()) {
      Alert.alert("Hata", "Lütfen bir lobi ismi girin.");
      return;
    }

    try {
      const response = await fetch('http://192.168.1.5:3000/lobbies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDesc,
          icon: 'users', // Varsayılan ikon
        }),
      });

      if (response.ok) {
        setIsModalVisible(false);
        setNewName('');
        setNewDesc('');
        fetchLobbies(); // Listeyi güncelle
      }
    } catch (error) {
      Alert.alert("Hata", "Lobi oluşturulamadı.");
    }
  };

  // Lobi Arama Filtresi
  const filteredLobbies = lobbies.filter(lobby => 
    lobby.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoinLobby = (roomName: string) => {
    router.push({
      pathname: '/sensor' as any,
      params: { ...params, roomName }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header - StudyLounge Marka Kimliği[cite: 2] */}
        <View style={styles.header}>
          <Text style={styles.title}>Lobiler</Text>
          <TouchableOpacity 
            style={styles.createButton} 
            onPress={() => setIsModalVisible(true)}
          >
            <FontAwesome5 name="plus" size={14} color={COLORS.deepIndigo} />
            <Text style={styles.createButtonText}>Lobi Kur</Text>
          </TouchableOpacity>
        </View>

        {/* Lobi Bul (Arama Çubuğu) */}
        <View style={styles.searchSection}>
          <FontAwesome5 name="search" size={16} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Lobi Bul..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Dinamik Lobi Listesi */}
        <FlatList
          data={filteredLobbies}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => handleJoinLobby(item.name)}>
              <View style={styles.iconContainer}>
                <FontAwesome5 name={item.icon || 'users'} size={24} color={COLORS.amberGold} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardDesc}>{item.description}</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color={COLORS.deepIndigo} style={{ opacity: 0.3 }} />
            </TouchableOpacity>
          )}
        />

        {/* Lobi Kurma Modalı */}
        <Modal visible={isModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Yeni Lobi Kur</Text>
              
              <TextInput
                style={styles.modalInput}
                placeholder="Lobi İsmi (Örn: Sınav Maratonu)"
                value={newName}
                onChangeText={setNewName}
              />
              
              <TextInput
                style={[styles.modalInput, { height: 80 }]}
                placeholder="Lobi Açıklaması"
                multiline={true}
                value={newDesc}
                onChangeText={setNewDesc}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: '#EEE' }]} 
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={{ color: '#333' }}>İptal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: COLORS.amberGold }]} 
                  onPress={handleCreateLobby}
                >
                  <Text style={{ color: COLORS.deepIndigo, fontWeight: 'bold' }}>Kur</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.deepIndigo },
  createButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.amberGold, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  createButtonText: { marginLeft: 6, fontWeight: 'bold', color: COLORS.deepIndigo, fontSize: 14 },
  searchSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 15, marginBottom: 20, elevation: 2 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 45, color: '#000' },
  card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 15, borderRadius: 18, marginBottom: 12, alignItems: 'center', elevation: 2 },
  iconContainer: { width: 50, height: 50, borderRadius: 12, backgroundColor: 'rgba(255, 193, 7, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.deepIndigo },
  cardDesc: { fontSize: 13, color: COLORS.textMuted },
  // Modal Stilleri
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', width: '85%', padding: 25, borderRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.deepIndigo, marginBottom: 20 },
  modalInput: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, marginBottom: 15, color: '#000' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  actionButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginLeft: 10 }
});