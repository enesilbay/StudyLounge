import React from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { C } from '../(tabs)/sensor';
import { Theme } from '../utils/theme';

const T = C;
const { width, height } = Dimensions.get('window');

export function AppScreen({
  children,
  scroll,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const content = <View style={[styles.content, contentStyle]}>{children}</View>;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={T.background} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={bg.orb1} />
        <View style={bg.orb2} />
        <View style={bg.orb3} />
      </View>
      {scroll ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function IconButton({
  name,
  onPress,
  color = T.primary,
  style,
}: {
  name: string;
  onPress: () => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[styles.iconButton, style]}>
      <FontAwesome5 solid name={name} size={15} color={color} />
    </TouchableOpacity>
  );
}

export function PageHeader({
  title,
  eyebrow,
  onBack,
  right,
}: {
  title: string;
  eyebrow?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onBack ? <IconButton name="arrow-left" onPress={onBack} /> : <View style={styles.headerSpacer} />}
      <View style={styles.headerText}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {right ?? <View style={styles.headerSpacer} />}
    </View>
  );
}

export function SoftCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.search}>
      <FontAwesome5 solid name="search" size={14} color={T.textMuted} />
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor={T.textMuted}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

export function DarkSheetModal({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>{children}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.background },
  scroll: { flexGrow: 1, paddingBottom: 100 },
  content: { flex: 1, paddingHorizontal: 22, paddingTop: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerText: { flex: 1, alignItems: 'center', paddingHorizontal: 12 },
  eyebrow: { fontSize: 12, color: T.textMuted, fontWeight: '700', marginBottom: 2 },
  title: { fontSize: 20, fontWeight: '900', color: T.textDark, textAlign: 'center' },
  headerSpacer: { width: 42, height: 42 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.soft,
  },
  card: {
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    padding: 18,
    ...Theme.shadows.soft,
  },
  search: {
    height: 54,
    borderRadius: 16,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Theme.shadows.soft,
  },
  searchInput: { flex: 1, color: T.textDark, fontSize: 15, fontWeight: '500' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: T.border,
    ...Theme.shadows.medium,
  },
});

const bg = StyleSheet.create({
  orb1: {
    position: 'absolute',
    top: -height * 0.08,
    right: -width * 0.22,
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375,
    backgroundColor: T.softIndigo,
    opacity: 0.75,
  },
  orb2: {
    position: 'absolute',
    bottom: -height * 0.06,
    left: -width * 0.28,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: T.lightAmber,
    opacity: 0.58,
  },
  orb3: {
    position: 'absolute',
    top: height * 0.37,
    right: width * 0.08,
    width: width * 0.32,
    height: width * 0.32,
    borderRadius: width * 0.16,
    backgroundColor: T.softInfo,
    opacity: 0.45,
  },
});

export default function Dummy() { return null; }
