import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Send,
  Trash2,
  Users,
  Edit2,
  X,
  Check,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format, isToday, isYesterday } from 'date-fns';
import {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markConversationRead,
  getBaseUrl,
  type Conversation,
  type Message,
} from '../../lib/chat-api';
import { UserContext } from '../../contexts/app-context';
import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

type ListItem =
  | { type: 'date'; date: string; id: string }
  | { type: 'message'; message: Message };

export function ConversationScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const conversation: Conversation = route.params.conversation;
  const currentUser = useContext(UserContext);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const listRef = useRef<FlatList>(null);
  const socketRef = useRef<Socket | null>(null);
  const inputRef = useRef<TextInput>(null);

  const colors = {
    bg: isDark ? '#111113' : '#f5f5f7',
    card: isDark ? '#1b1b1f' : '#ffffff',
    border: isDark ? '#2d2d31' : '#e5e5e7',
    text: isDark ? '#f4f4f5' : '#111113',
    muted: isDark ? '#71717a' : '#8c8c93',
    inputBg: isDark ? '#27272a' : '#ffffff',
    primary: isDark ? '#5dd4bf' : '#00a991',
    myBubble: isDark ? '#1e3a35' : '#00a991',
    myBubbleText: '#ffffff',
    otherBubble: isDark ? '#27272a' : '#ffffff',
    actionHeaderBg: isDark ? '#27272a' : '#e4e4e7',
    destructive: '#ef4444',
  };

  // ─── Load messages ───────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getMessages(conversation.id, 100, 0);
      setMessages(data);
      markConversationRead(conversation.id).catch(() => {});
    } catch (e) {
      console.error('Failed to load messages', e);
    } finally {
      setLoading(false);
    }
  }, [conversation.id]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Socket.io real-time ─────────────────────────────────────────────────────
  useEffect(() => {
    let socket: Socket;
    (async () => {
      try {
        const baseUrl = await getBaseUrl();
        const userJson = await AsyncStorage.getItem('@user');
        const user = userJson ? JSON.parse(userJson) : null;
        if (!baseUrl || !user?.token) return;

        socket = io(baseUrl, {
          transports: ['websocket', 'polling'],
          auth: { token: user.token },
          query: { token: user.token },
          extraHeaders: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        socket.on('connect', () => {
          socket.emit('join:conversation', conversation.id);
        });

        socket.on('message:new', (msg: Message) => {
          if (msg.conversationId === conversation.id) {
            setMessages(prev => {
              const exists = prev.some(m => m.id === msg.id);
              if (exists) {
                return prev.map(m => (m.id === msg.id ? msg : m));
              }
              return [...prev, msg];
            });
            markConversationRead(conversation.id).catch(() => {});
          }
        });

        socketRef.current = socket;
      } catch (e) {
        console.error('Socket error', e);
      }
    })();

    return () => {
      socket?.disconnect();
    };
  }, [conversation.id]);

  // ─── Group messages by date ──────────────────────────────────────────────────
  const listItems = React.useMemo<ListItem[]>(() => {
    const sorted = [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const result: ListItem[] = [];
    let lastDateStr: string | null = null;

    for (const msg of sorted) {
      const d = new Date(msg.createdAt);
      const dateKey = format(d, 'yyyy-MM-dd');

      if (dateKey !== lastDateStr) {
        let label = format(d, 'EEEE, d MMMM yyyy');
        if (isToday(d)) label = 'Today';
        else if (isYesterday(d)) label = 'Yesterday';

        result.push({ type: 'date', date: label, id: `date-${dateKey}` });
        lastDateStr = dateKey;
      }

      result.push({ type: 'message', message: msg });
    }

    return result;
  }, [messages]);

  // ─── Auto-scroll to bottom on new messages ───────────────────────────────────
  useEffect(() => {
    if (listItems.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [listItems.length]);

  // ─── Send or Edit Message ────────────────────────────────────────────────────
  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);

    try {
      if (editingMessage) {
        // Submit edit
        const updated = await editMessage(
          conversation.id,
          editingMessage.id,
          content,
        );
        setMessages(prev =>
          prev.map(m => (m.id === updated.id ? updated : m)),
        );
        setEditingMessage(null);
        setSelectedMessage(null);
        setText('');
      } else {
        // Send new message
        setText('');
        const msg = await sendMessage(conversation.id, {
          content,
          type: 'text',
        });
        setMessages(prev => [...prev, msg]);
      }
    } catch (e) {
      Alert.alert('Error', editingMessage ? 'Failed to edit message' : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // ─── Delete Message Action ───────────────────────────────────────────────────
  const handleDeleteSelected = () => {
    if (!selectedMessage) return;
    const msgToDelete = selectedMessage;

    Alert.alert('Delete message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMessage(conversation.id, msgToDelete.id);
            setMessages(prev =>
              prev.map(m =>
                m.id === msgToDelete.id
                  ? { ...m, isDeleted: true, content: null }
                  : m,
              ),
            );
            setSelectedMessage(null);
            if (editingMessage?.id === msgToDelete.id) {
              setEditingMessage(null);
              setText('');
            }
          } catch {
            Alert.alert('Error', 'Failed to delete message');
          }
        },
      },
    ]);
  };

  // ─── Start Editing Selected Message ─────────────────────────────────────────
  const handleStartEdit = () => {
    if (!selectedMessage || selectedMessage.isDeleted) return;
    setEditingMessage(selectedMessage);
    setText(selectedMessage.content || '');
    setSelectedMessage(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ─── Conversation name helper ────────────────────────────────────────────────
  const convName =
    conversation.type === 'group'
      ? conversation.name || 'Group'
      : (() => {
          const other = conversation.participants.find(
            p => p.id !== currentUser?.id,
          );
          return other ? other.displayName || other.username : 'Unknown';
        })();

  // ─── Render item (message or date header) ────────────────────────────────────
  const renderItem = ({ item, index }: { item: ListItem; index: number }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateHeaderWrap}>
          <View
            style={[
              styles.dateHeaderBadge,
              { backgroundColor: isDark ? '#27272a' : '#e4e4e7' },
            ]}>
            <Text
              style={[
                styles.dateHeaderText,
                { color: isDark ? '#a1a1aa' : '#52525b' },
              ]}>
              {item.date}
            </Text>
          </View>
        </View>
      );
    }

    const msg = item.message;
    const isMe = msg.senderId === currentUser?.id;
    const isSelected = selectedMessage?.id === msg.id;

    // Determine whether to show sender name above bubble:
    // Only show if it's NOT sent by me, AND it is the FIRST message in a group sent by this sender
    const prevItem = index > 0 ? listItems[index - 1] : null;
    const showSenderName =
      !isMe &&
      (prevItem?.type !== 'message' || prevItem.message.senderId !== msg.senderId);

    return (
      <View
        style={[
          styles.bubbleWrap,
          isMe ? styles.bubbleWrapRight : styles.bubbleWrapLeft,
        ]}>
        {showSenderName && (
          <Text style={[styles.senderName, { color: colors.primary }]}>
            {msg.senderDisplayName || msg.senderUsername}
          </Text>
        )}
        <TouchableOpacity
          activeOpacity={0.75}
          onLongPress={() => setSelectedMessage(msg)}
          onPress={() => {
            if (selectedMessage) {
              setSelectedMessage(isSelected ? null : msg);
            }
          }}
          style={[
            styles.bubble,
            isMe
              ? [styles.bubbleRight, { backgroundColor: colors.myBubble }]
              : [
                  styles.bubbleLeft,
                  {
                    backgroundColor: colors.otherBubble,
                    borderColor: colors.border,
                    borderWidth: StyleSheet.hairlineWidth,
                  },
                ],
            isSelected && {
              borderWidth: 2,
              borderColor: colors.primary,
            },
            msg.isDeleted && { opacity: 0.55 },
          ]}>
          <Text
            style={[
              styles.bubbleText,
              {
                color: isMe ? colors.myBubbleText : colors.text,
                fontStyle: msg.isDeleted ? 'italic' : 'normal',
              },
            ]}>
            {msg.isDeleted ? 'This message was deleted' : msg.content || ''}
          </Text>
          <Text
            style={[
              styles.bubbleTime,
              { color: isMe ? 'rgba(255,255,255,0.65)' : colors.muted },
            ]}>
            {format(new Date(msg.createdAt), 'HH:mm')}
            {msg.createdAt !== msg.updatedAt && !msg.isDeleted ? ' · edited' : ''}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const isOwnSelected = selectedMessage?.senderId === currentUser?.id;
  const canEditSelected =
    isOwnSelected &&
    selectedMessage?.type === 'text' &&
    !selectedMessage?.isDeleted;
  const canDeleteSelected = isOwnSelected && !selectedMessage?.isDeleted;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>
      {/* ─── Top Header or Action Bar ────────────────────────────────────────── */}
      {selectedMessage ? (
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.actionHeaderBg,
              borderBottomColor: colors.border,
              paddingTop: insets.top,
            },
          ]}>
          <TouchableOpacity
            onPress={() => setSelectedMessage(null)}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text
              style={[styles.headerName, { color: colors.text }]}
              numberOfLines={1}>
              1 message selected
            </Text>
            <Text
              style={[styles.headerSub, { color: colors.muted }]}
              numberOfLines={1}>
              {selectedMessage.content || 'Message'}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            {canEditSelected && (
              <TouchableOpacity
                onPress={handleStartEdit}
                style={styles.actionIconBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Edit2 size={18} color={colors.primary} />
              </TouchableOpacity>
            )}

            {canDeleteSelected && (
              <TouchableOpacity
                onPress={handleDeleteSelected}
                style={styles.actionIconBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Trash2 size={18} color={colors.destructive} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
              paddingTop: insets.top,
            },
          ]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ArrowLeft size={20} color={colors.primary} />
          </TouchableOpacity>

          {conversation.type === 'group' ? (
            <View
              style={[
                styles.headerAvatar,
                { backgroundColor: isDark ? '#1e2a3a' : '#e0e7ff' },
              ]}>
              <Users size={14} color={isDark ? '#818cf8' : '#6366f1'} />
            </View>
          ) : (
            <View
              style={[
                styles.headerAvatar,
                { backgroundColor: isDark ? '#1e3a35' : '#d0f0ea' },
              ]}>
              <Text style={[styles.headerAvatarText, { color: colors.primary }]}>
                {getInitials(convName)}
              </Text>
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text
              style={[styles.headerName, { color: colors.text }]}
              numberOfLines={1}>
              {convName}
            </Text>
            {conversation.type === 'group' && (
              <Text style={[styles.headerSub, { color: colors.muted }]}>
                {conversation.participants.length} members
              </Text>
            )}
          </View>
        </View>
      )}

      {/* ─── Messages List ──────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={listItems}
          keyExtractor={item =>
            item.type === 'date' ? item.id : item.message.id
          }
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
        />
      )}

      {/* ─── Editing Banner Indicator ───────────────────────────────────────── */}
      {editingMessage && (
        <View style={[styles.editingBanner, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.editingBannerTitle, { color: colors.primary }]}>
              Editing Message
            </Text>
            <Text style={[styles.editingBannerText, { color: colors.muted }]} numberOfLines={1}>
              {editingMessage.content}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setEditingMessage(null);
              setText('');
            }}
            style={{ padding: 4 }}>
            <X size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Input Bar ──────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 8,
          },
        ]}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBg,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder={editingMessage ? 'Edit message...' : 'Type a message...'}
          placeholderTextColor={colors.muted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim() || sending}
          style={[
            styles.sendBtn,
            {
              backgroundColor:
                !text.trim() || sending ? colors.border : colors.primary,
            },
          ]}>
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : editingMessage ? (
            <Check size={18} color="#fff" />
          ) : (
            <Send size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  backBtn: { padding: 4 },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: { fontSize: 12, fontWeight: '700' },
  headerName: { fontSize: 15, fontWeight: '600' },
  headerSub: { fontSize: 11 },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconBtn: {
    padding: 6,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messageList: { padding: 12, gap: 6, paddingBottom: 8 },
  bubbleWrap: { maxWidth: '75%', gap: 2, marginVertical: 2 },
  bubbleWrapLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubbleWrapRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  senderName: { fontSize: 10, fontWeight: '600', marginLeft: 4, marginBottom: 2 },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 2,
  },
  bubbleLeft: { borderTopLeftRadius: 4 },
  bubbleRight: { borderTopRightRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTime: { fontSize: 10, alignSelf: 'flex-end' },
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  editingBannerTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  editingBannerText: {
    fontSize: 12,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateHeaderWrap: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateHeaderBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateHeaderText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
