import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import { apiUrl } from './config/api';
import { C } from './(tabs)/sensor';

const BACKEND_URL = apiUrl('');
const T = C;

export default function DMScreen() {
  const router = useRouter();
  const { targetUserId, targetName, targetUsername } = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [myUserId, setMyUserId] = useState<number>(0);
  const [myBubbleColor, setMyBubbleColor] = useState<string>(T.primary);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        
        let uid = myUserId;
        const stored = await AsyncStorage.getItem('user_data');
        if (stored) {
          const user = JSON.parse(stored);
          uid = user.id;
          setMyUserId(user.id);
          if (user.equippedBubbleColor) setMyBubbleColor(user.equippedBubbleColor);
        } else {
          const meRes = await fetch(apiUrl('/users/me'), { headers: { Authorization: `Bearer ${token}` } });
          const meData = await meRes.json();
          uid = meData.user.id;
          setMyUserId(uid);
          if (meData.user.equippedBubbleColor) setMyBubbleColor(meData.user.equippedBubbleColor);
        }

        const res = await fetch(apiUrl(`/messages/dm/${targetUserId}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.log(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [targetUserId]);

  useEffect(() => {
    if (!myUserId) return;
    const initSocket = async () => {
      const token = await AsyncStorage.getItem('access_token');
      socketRef.current = io(BACKEND_URL, { transports: ['websocket'], auth: { token } });
      
      socketRef.current.on('receive_dm', (msg: any) => {
        if (
          (msg.senderId === myUserId && msg.receiverId === Number(targetUserId)) ||
          (msg.senderId === Number(targetUserId) && msg.receiverId === myUserId)
        ) {
          setMessages((prev) => [...prev, msg]);
        }
      });
    };
    initSocket();

    return () => { socketRef.current?.disconnect(); };
  }, [myUserId, targetUserId]);

  const sendMessage = () => {
    if (!inputText.trim() || !socketRef.current) return;
    socketRef.current.emit('send_dm', {
      targetUserId: Number(targetUserId),
      text: inputText.trim()
    });
    setInputText('');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top || 50 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <FontAwesome5 name="chevron-left" size={18} color={T.primary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{targetName}</Text>
          <Text style={styles.headerUser}>@{targetUsername}</Text>
        </View>
      </View>

      <View style={styles.chatBackground}>
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ActivityIndicator color={T.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 20 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const isMe = item.sender?.id === myUserId || item.senderId === myUserId;
              const dateVal = item.createdAt ? new Date(item.createdAt) : new Date();
              return (
                <View style={[styles.bubbleWrapper, isMe ? styles.myBubbleWrapper : styles.theirBubbleWrapper]}>
                  <View style={[styles.bubble, isMe ? [styles.myBubble, { backgroundColor: myBubbleColor }] : styles.theirBubble]}>
                    <Text style={[styles.msgText, isMe ? styles.myMsgText : styles.theirMsgText]}>{item.text}</Text>
                  </View>
                  <Text style={styles.timeText}>
                    {dateVal.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            }}
          />
        )}
      </View>

      <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom + 10, 20) }]}>
        <TouchableOpacity style={styles.attachBtn}>
          <FontAwesome5 name="plus" size={18} color={T.primary} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Mesaj yaz..."
          placeholderTextColor={T.textMuted}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <FontAwesome5 name="paper-plane" solid size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    zIndex: 10,
  },
  backBtn: { padding: 8, marginRight: 10 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 18, fontWeight: '900', color: T.textDark },
  headerUser: { fontSize: 13, color: T.textMuted, marginTop: 2 },
  callBtns: { flexDirection: 'row', alignItems: 'center' },
  chatBackground: { flex: 1, backgroundColor: T.background },
  inputArea: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.border,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 5,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.softIndigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: T.background,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: T.textDark,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleWrapper: { maxWidth: '80%', marginBottom: 4 },
  myBubbleWrapper: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirBubbleWrapper: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { padding: 14, borderRadius: 20 },
  myBubble: { backgroundColor: T.primary, borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 20 },
  myMsgText: { color: '#fff' },
  theirMsgText: { color: T.textDark },
  timeText: { fontSize: 10, color: T.textMuted, marginTop: 4, paddingHorizontal: 4 },
});
