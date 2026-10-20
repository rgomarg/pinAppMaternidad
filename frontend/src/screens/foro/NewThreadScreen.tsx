import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { forumApi, type Tag } from '../../api/forum';
import { useFamilySelection } from '../../context/FamilySelectionContext';
import TagChips from '../../components/foro/TagChips';

// Mismos límites que CreateThreadDto en el backend
const MAX_TITLE = 150;
const MAX_CONTENT = 5000;

export default function NewThreadScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { selectedUserId } = useFamilySelection();

  const [tags, setTags] = useState<Tag[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    forumApi.getTags().then(setTags).catch(() => setTags([]));
  }, []);

  const toggleTag = (id: number) =>
    setTagIds((current) => (current.includes(id) ? current.filter((tagId) => tagId !== id) : [...current, id]));

  const canPublish = title.trim().length > 0 && content.trim().length > 0 && !saving;

  const publish = async () => {
    if (!selectedUserId || !canPublish) return;
    setSaving(true);
    try {
      const thread = await forumApi.createThread({
        title: title.trim(),
        content: content.trim(),
        ownerId: selectedUserId,
        tagIds,
      });
      // replace: al volver desde el hilo nuevo se llega al listado, no al formulario
      navigation.replace('ThreadDetail', { threadId: thread.id });
    } catch (e) {
      Alert.alert('No se pudo publicar', e instanceof Error ? e.message : 'Inténtalo de nuevo.');
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, paddingTop: insets.top }}
      className="bg-nanny-bg"
    >
      <View className="flex-row items-center justify-between px-6 py-3">
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text className="text-base text-nanny-blue">Cancelar</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-nanny-text">Nuevo hilo</Text>
        <TouchableOpacity onPress={publish} disabled={!canPublish} accessibilityRole="button">
          {saving ? (
            <ActivityIndicator color="#6d83a1" />
          ) : (
            <Text className={`text-base font-semibold ${canPublish ? 'text-nanny-blue' : 'text-nanny-muted'}`}>
              Publicar
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        <Text className="mb-2 text-sm font-semibold text-nanny-muted">Título</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={MAX_TITLE}
          placeholder="¿Sobre qué quieres preguntar?"
          placeholderTextColor="#a8a29a"
          className="mb-1 rounded-2xl bg-white px-4 py-3 text-base text-nanny-text"
        />
        <Text className="mb-5 text-right text-xs text-nanny-muted">
          {title.length}/{MAX_TITLE}
        </Text>

        <Text className="mb-2 text-sm font-semibold text-nanny-muted">Mensaje</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          maxLength={MAX_CONTENT}
          placeholder="Cuenta tu situación con el detalle que quieras"
          placeholderTextColor="#a8a29a"
          multiline
          textAlignVertical="top"
          style={{ minHeight: 160 }}
          className="mb-5 rounded-2xl bg-white px-4 py-3 text-base text-nanny-text"
        />

        <Text className="mb-2 text-sm font-semibold text-nanny-muted">Etiquetas</Text>
        <TagChips tags={tags} selected={tagIds} onToggle={toggleTag} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
