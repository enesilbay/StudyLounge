import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { C } from './(tabs)/sensor';

const { width, height } = Dimensions.get('window');

// ── DEKORATIF ARKAPLAN NOKTALARI ──
function BackgroundOrbs() {
  return (
    <>
      <View style={bg.orb1} />
      <View style={bg.orb2} />
      <View style={bg.orb3} />
      <View style={bg.gridLine1} />
      <View style={bg.gridLine2} />
    </>
  );
}

export default function AnalyticsScreen() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<any>({
    labels: ['...', '...', '...', '...', '...', '...', '...'],
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0], color: (opacity = 1) => `rgba(255, 193, 7, ${opacity})`, strokeWidth: 4 }]
  });
  const [totalWeeklyMinutes, setTotalWeeklyMinutes] = useState(0);
  const [heatmapData, setHeatmapData] = useState<number[]>(new Array(24).fill(0));

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const stored = await AsyncStorage.getItem('user_data');
        const token = await AsyncStorage.getItem('access_token');
        if (!stored || !token) return;
        const user = JSON.parse(stored);

        const res = await fetch(`http://10.192.24.96:3000/users/analytics/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const records = await res.json();
          
          // Son 7 günü (bugün dahil) hesapla
          const today = new Date();
          const last7Days = Array.from({length: 7}, (_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
          });

          // Günleri formatla (Örn: 'Pzt', 'Sal' vb. veya '08/05')
          const labels = last7Days.map(d => {
            const dateObj = new Date(d);
            const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
            return days[dateObj.getDay()];
          });

          // Her gün için focusMinutes bul, yoksa 0
          const dataPoints = last7Days.map(dateStr => {
            const record = records.find((r: any) => r.date === dateStr);
            return record ? record.focusMinutes : 0;
          });

          const sum = dataPoints.reduce((a, b) => a + b, 0);

          setWeeklyData({
            labels,
            datasets: [{ 
              data: dataPoints.every(v => v === 0) ? [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1] : dataPoints, // LineChart throws error if all 0
              color: (opacity = 1) => `rgba(255, 193, 7, ${opacity})`, 
              strokeWidth: 4 
            }]
          });
          setTotalWeeklyMinutes(sum);

          // Heatmap hesaplama (Son 7 günün saatlik toplamı)
          const hourlyTotals = new Array(24).fill(0);
          records.forEach((r: any) => {
            if (r.hourlyDistribution && Array.isArray(r.hourlyDistribution)) {
              r.hourlyDistribution.forEach((val: number, i: number) => {
                hourlyTotals[i] += val;
              });
            }
          });
          setHeatmapData(hourlyTotals);
        }
      } catch (err) {
        console.error("Analitik hatası:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const chartConfig = {
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.5})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.5})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    propsForDots: { r: '5', strokeWidth: '2', stroke: C.primary },
    propsForBackgroundLines: { strokeDasharray: '', stroke: C.card }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BackgroundOrbs />
      </View>

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <FontAwesome5 name="arrow-left" size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>PRO Analitik</Text>
        <FontAwesome5 name="crown" size={18} color={C.primary} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent} bounces={true}>
        
        {/* Özet Kartları */}
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <LinearGradient colors={[C.card, 'rgba(255,255,255,0.02)']} style={StyleSheet.absoluteFillObject} />
            <View style={s.iconWrapRed}>
              <FontAwesome5 name="fire-alt" size={18} color={C.danger} />
            </View>
            <Text style={s.summaryVal}>{totalWeeklyMinutes}<Text style={s.summaryUnit}>dk</Text></Text>
            <Text style={s.summaryLabel}>Bu Hafta</Text>
          </View>
          <View style={s.summaryCard}>
            <LinearGradient colors={[C.card, 'rgba(255,255,255,0.02)']} style={StyleSheet.absoluteFillObject} />
            <View style={s.iconWrapGreen}>
              <FontAwesome5 name="chart-line" size={18} color={C.success} />
            </View>
            <Text style={s.summaryVal}>%24</Text>
            <Text style={s.summaryLabel}>Artış</Text>
          </View>
        </View>

        {/* Çizgi Grafiği (Haftalık Dağılım) */}
        <View style={s.chartBox}>
          <Text style={s.chartTitle}>Haftalık Odaklanma</Text>
          <LineChart
            data={weeklyData}
            width={width - 50}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={{ marginVertical: 8, marginLeft: -15 }}
            withVerticalLines={false}
          />
        </View>

        {/* Saatlik Sıcaklık Haritası (Heatmap) */}
        <View style={s.chartBox}>
          <Text style={s.chartTitle}>Sıcaklık Haritası (En Verimli Saatler)</Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 15 }}>Son 7 gündeki saat bazlı toplam çalışma süreniz.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {heatmapData.map((val, i) => {
              const max = Math.max(...heatmapData, 1);
              const opacity = (val / max) * 0.8 + 0.2; // Min opacity 0.2
              return (
                <View key={i} style={{ width: '15%', alignItems: 'center', marginBottom: 15 }}>
                  <View style={{ 
                    width: 34, height: 34, borderRadius: 8, 
                    backgroundColor: val > 0 ? `rgba(255,193,7,${opacity})` : 'rgba(255,255,255,0.05)', 
                    justifyContent: 'center', alignItems: 'center',
                    borderWidth: 1, borderColor: val > 0 ? `rgba(255,193,7,${opacity + 0.2})` : 'rgba(255,255,255,0.02)'
                  }}>
                     {val > 0 && <Text style={{ fontSize: 10, fontWeight: '900', color: C.bg }}>{val}</Text>}
                  </View>
                  <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 5, fontWeight: 'bold' }}>{String(i).padStart(2, '0')}:00</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Verimlilik Puanı */}
        <View style={s.scoreBox}>
          <LinearGradient colors={['rgba(255,193,7,0.1)', 'rgba(255,193,7,0.02)']} style={[StyleSheet.absoluteFillObject, { borderRadius: 28 }]} />
          <Text style={s.scoreTitle}>Verimlilik Puanın</Text>
          <Text style={s.scoreVal}>{totalWeeklyMinutes > 300 ? 'A+' : totalWeeklyMinutes > 150 ? 'B' : 'C'}</Text>
          <Text style={s.scoreDesc}>
            {totalWeeklyMinutes > 300 ? 'Harika gidiyorsun! Geçen haftaya göre daha istikrarlısın.' : 'Biraz daha odaklanırsan hedeflerine ulaşacaksın!'}
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 10, paddingBottom: 20 },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.primary, letterSpacing: 1 },
  scrollContent: { paddingHorizontal: 25, paddingBottom: 100 },
  
  summaryRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  summaryCard: { flex: 1, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  iconWrapRed: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  iconWrapGreen: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  summaryVal: { fontSize: 26, fontWeight: '900', color: C.text },
  summaryUnit: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontWeight: '600' },

  chartBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 28, padding: 20, paddingBottom: 10, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  chartTitle: { alignSelf: 'flex-start', fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 10, marginLeft: 5 },

  scoreBox: { borderRadius: 28, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,193,7,0.3)', overflow: 'hidden' },
  scoreTitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 5, fontWeight: '700' },
  scoreVal: { fontSize: 60, fontWeight: '900', color: C.primary, textShadowColor: 'rgba(255, 193, 7, 0.4)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 15 },
  scoreDesc: { fontSize: 14, color: C.text, textAlign: 'center', marginTop: 15, opacity: 0.8, fontWeight: '500', lineHeight: 22 },
});

const bg = StyleSheet.create({
  orb1: { position: 'absolute', top: -height * 0.08, left: -width * 0.2, width: width * 0.7, height: width * 0.7, borderRadius: width * 0.35, backgroundColor: 'rgba(255,193,7,0.06)' },
  orb2: { position: 'absolute', bottom: height * 0.05, right: -width * 0.3, width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, backgroundColor: 'rgba(99,102,241,0.05)' },
  orb3: { position: 'absolute', top: height * 0.4, left: width * 0.1, width: width * 0.3, height: width * 0.3, borderRadius: width * 0.15, backgroundColor: 'rgba(255,193,7,0.04)' },
  gridLine1: { position: 'absolute', top: 0, left: width * 0.33, width: 1, height: height, backgroundColor: 'rgba(255,255,255,0.02)' },
  gridLine2: { position: 'absolute', top: 0, left: width * 0.66, width: 1, height: height, backgroundColor: 'rgba(255,255,255,0.02)' },
});
