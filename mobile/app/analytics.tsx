import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

const C = {
  bg: '#0F172A',
  cardBg: '#1E293B',
  primary: '#FFC107',
  secondary: '#1A237E',
  textMuted: '#94A3B8',
  white: '#FFFFFF',
  gold: '#FFD700',
};

export default function AnalyticsScreen() {
  const router = useRouter();

  // Şimdilik backend'den gelmiş gibi varsaydığımız örnek (mock) haftalık veri:
  const weeklyData = {
    labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
    datasets: [
      {
        data: [45, 90, 60, 120, 40, 150, 80],
        color: (opacity = 1) => `rgba(255, 215, 0, ${opacity})`, // Altın sarısı çizgi
        strokeWidth: 3,
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: C.cardBg,
    backgroundGradientTo: C.cardBg,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    propsForDots: { r: '5', strokeWidth: '2', stroke: C.gold },
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <FontAwesome5 name="arrow-left" size={20} color={C.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>PRO Analitik</Text>
        <FontAwesome5 name="crown" size={20} color={C.gold} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        
        {/* Özet Kartları */}
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <FontAwesome5 name="fire-alt" size={20} color="#EF4444" style={s.cardIcon} />
            <Text style={s.summaryVal}>585 dk</Text>
            <Text style={s.summaryLabel}>Bu Hafta</Text>
          </View>
          <View style={s.summaryCard}>
            <FontAwesome5 name="chart-line" size={20} color="#10B981" style={s.cardIcon} />
            <Text style={s.summaryVal}>%24</Text>
            <Text style={s.summaryLabel}>Artış</Text>
          </View>
        </View>

        {/* Çizgi Grafiği (Haftalık Dağılım) */}
        <View style={s.chartBox}>
          <Text style={s.chartTitle}>Haftalık Odaklanma</Text>
          <LineChart
            data={weeklyData}
            width={width - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={{ borderRadius: 16, marginVertical: 8 }}
          />
        </View>

        {/* Verimlilik Puanı */}
        <View style={s.scoreBox}>
          <Text style={s.scoreTitle}>Verimlilik Puanın</Text>
          <Text style={s.scoreVal}>A+</Text>
          <Text style={s.scoreDesc}>Harika gidiyorsun! Geçen haftaya göre daha istikrarlısın.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: C.gold },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  summaryRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  summaryCard: { flex: 1, backgroundColor: C.cardBg, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.1)' },
  cardIcon: { marginBottom: 10 },
  summaryVal: { fontSize: 24, fontWeight: '900', color: C.white },
  summaryLabel: { fontSize: 13, color: C.textMuted, marginTop: 4 },

  chartBox: { backgroundColor: C.cardBg, borderRadius: 16, padding: 15, paddingBottom: 0, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  chartTitle: { alignSelf: 'flex-start', fontSize: 16, fontWeight: 'bold', color: C.white, marginBottom: 10, marginLeft: 10 },

  scoreBox: { backgroundColor: 'rgba(255, 215, 0, 0.05)', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.3)' },
  scoreTitle: { fontSize: 14, color: C.textMuted, marginBottom: 10 },
  scoreVal: { fontSize: 48, fontWeight: '900', color: C.gold, textShadowColor: 'rgba(255, 215, 0, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  scoreDesc: { fontSize: 14, color: C.white, textAlign: 'center', marginTop: 10, opacity: 0.8 },
});