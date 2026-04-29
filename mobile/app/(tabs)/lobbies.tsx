import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, SafeAreaView, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

const COLORS = {
  deepIndigo: '#1A237E',
  amberGold: '#FFC107',
  background: '#F8F9FA',
  card: '#FFFFFF',
  textMuted: '#6B7280',
};

const INITIAL_LOBBIES = [
  { id: '1', name: 'Sessiz Kütüphane', icon: 'book-reader', desc: 'Tam odaklanma.' },
  { id: '2', name: 'Yazılımcılar Odası', icon: 'laptop-code', desc: 'Kod ve Kahve.' },
  { id: '3', name: 'Sınav Haftası', icon: 'brain', desc: 'Son gece çalışanlar.' },
  { id: '4', name: 'Kafe Ortamı', icon: 'coffee', desc: 'Hafif gürültülü.' },
];

export default function LobbiesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  const [searchQuery, setSearchQuery] = useState('');
  
  // Arama filtresi (Lobi Bul)
  const filteredLobbies = INITIAL_LOBBIES.filter(lobby => 
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
        <View style={styles.header}>
          <Text style={styles.title}>Lobiler</Text>
          <TouchableOpacity style={styles.createButton}>
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
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredLobbies}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => handleJoinLobby(item.name)}>
              <View style={styles.iconContainer}>
                <FontAwesome5 name={item.icon} size={24} color={COLORS.amberGold} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color={COLORS.deepIndigo} style={{ opacity: 0.3 }} />
            </TouchableOpacity>
          )}
        />
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
  searchSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEE', borderRadius: 12, paddingHorizontal: 15, marginBottom: 20 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 45, color: '#000' },
  card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 15, borderRadius: 18, marginBottom: 12, alignItems: 'center', elevation: 2 },
  iconContainer: { width: 50, height: 50, borderRadius: 12, backgroundColor: 'rgba(255, 193, 7, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.deepIndigo },
  cardDesc: { fontSize: 13, color: COLORS.textMuted }
});