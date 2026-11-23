import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquare, Search, Users } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import {
  getConversations,
  getBaseUrl,
  type Conversation,
} from '../../lib/chat-api';
import { UserContext } from '../../contexts/app-context';
import { useNavigation } from '@react-navigation/native';
import { format, isToday } from 'date-fns';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface AvatarProps {
  name: string;
  size?: number;
  isDark: boolean;
}

function AvatarPlaceholder({ name, size = 44, isDark }: AvatarProps) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        { backgroundColor: isDark ? '#1e3a35' : '#d0f0ea' },
      ]}
    >
      <Text
        style={[styles.avatarText, { color: isDark ? '#5dd4bf' : '#00a991' }]}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  return format(d, 'dd/MM');
}

export function ChatScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const currentUser = useContext(UserContext);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (e) {
      console.error('Failed to load conversations', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const getConvName = (conv: Conversation): string => {
    if (conv.type === 'group') return conv.name || 'Unnamed Group';
    const other = conv.participants.find(p => p.id !== currentUser?.id);
    return other ? other.displayName || other.username : 'Unknown';
  };

  const getLastMsgText = (conv: Conversation): string => {
    const msg = conv.lastMessage;
    if (!msg) return 'No messages yet';
    if (msg.isDeleted) return 'This message was deleted';
    const prefix = msg.senderId === currentUser?.id ? 'You: ' : '';
    switch (msg.type) {
      case 'image':
        return `${prefix}📷 Photo`;
      case 'video':
        return `${prefix}🎥 Video`;
      case 'audio':
        return `${prefix}🎵 Audio`;
      case 'document':
        return `${prefix}📄 File`;
      case 'event_share':
        return `${prefix}🔗 Shared event`;
      default:
        return `${prefix}${msg.content || ''}`;
    }
  };

  const filtered = conversations.filter(c =>
    getConvName(c).toLowerCase().includes(search.toLowerCase()),
  );

  const colors = {
    bg: isDark ? '#111113' : '#fafafa',
    card: isDark ? '#1b1b1f' : '#ffffff',
    border: isDark ? '#2d2d31' : '#e5e5e7',
    text: isDark ? '#f4f4f5' : '#111113',
    muted: isDark ? '#71717a' : '#8c8c93',
    inputBg: isDark ? '#27272a' : '#f4f4f5',
    primary: isDark ? '#5dd4bf' : '#00a991',
    badge: isDark ? '#5dd4bf' : '#00a991',
  };

  const renderItem = ({ item: conv }: { item: Conversation }) => {
    const name = getConvName(conv);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.convRow, { borderBottomColor: colors.border }]}
        onPress={() =>
          navigation.navigate('Conversation', { conversation: conv })
        }
      >
        {conv.type === 'group' ? (
          <View
            style={[
              styles.avatar,
              { backgroundColor: isDark ? '#1e2a3a' : '#e0e7ff' },
            ]}
          >
            <Users size={20} color={isDark ? '#818cf8' : '#6366f1'} />
          </View>
        ) : (
          <AvatarPlaceholder name={name} isDark={isDark} />
        )}

        <View style={styles.convMeta}>
          <View style={styles.convTopRow}>
            <Text
              style={[styles.convName, { color: colors.text }]}
              numberOfLines={1}
            >
              {name}
            </Text>
            {conv.lastMessage && (
              <Text style={[styles.convTime, { color: colors.muted }]}>
                {formatTime(conv.lastMessage.createdAt)}
              </Text>
            )}
          </View>
          <View style={styles.convBottomRow}>
            <Text
              style={[styles.convPreview, { color: colors.muted }]}
              numberOfLines={1}
            >
              {getLastMsgText(conv)}
            </Text>
            {conv.unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.badge }]}>
                <Text style={styles.badgeText}>{conv.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bg, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Messages
        </Text>
      </View>

      {/* Search */}
      <View
        style={[
          styles.searchWrap,
          { backgroundColor: colors.inputBg, borderColor: colors.border },
        ]}
      >
        <Search size={14} color={colors.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search conversations..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <MessageSquare size={40} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {search ? 'No results' : 'No conversations yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 36,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700' },
  convMeta: { flex: 1, minWidth: 0 },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  convName: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  convTime: { fontSize: 10, flexShrink: 0 },
  convBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  convPreview: { fontSize: 12, flex: 1 },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 13 },
});
