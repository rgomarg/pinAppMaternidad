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
  // Los errores se muestran tras el primer intento de publicar, no mientras se escribe
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    forumApi.getTags().then(setTags).catch(() => setTags([]));
  }, []);

  const toggleTag = (id: number) =>
    setTagIds((current) => (current.includes(id) ? current.filter((tagId) => tagId !== id) : [...current, id]));

  const errors = {
    title: title.trim() ? null : 'El título es obligatorio',
    content: content.trim() ? null : 'El mensaje es obligatorio',
    tags: tagIds.length > 0 ? null : 'Debes seleccionar al menos una etiqueta',
  };
  const isValid = !errors.title && !errors.content && !errors.tags;

  const publish = async () => {
    setSubmitted(true);
    if (!selectedUserId || !isValid || saving) return;
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
        <TouchableOpacity onPress={publish} disabled={saving} accessibilityRole="button">
          {saving ? (
            <ActivityIndicator color="#6d83a1" />
          ) : (
            <Text className={`text-base font-semibold ${submitted && !isValid ? 'text-nanny-muted' : 'text-nanny-blue'}`}>
              Publicar
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        <Text className="mb-2 text-sm font-semibold text-nanny-muted">Título *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={MAX_TITLE}
          placeholder="¿Sobre qué quieres preguntar?"
          placeholderTextColor="#a8a29a"
          className="mb-1 rounded-2xl bg-white px-4 py-3 text-base text-nanny-text"
        />
        <View className="mb-5 flex-row">
          <FieldError message={submitted ? errors.title : null} />
          <Text className="text-xs text-nanny-muted">
            {title.length}/{MAX_TITLE}
          </Text>
        </View>

        <Text className="mb-2 text-sm font-semibold text-nanny-muted">Mensaje *</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          maxLength={MAX_CONTENT}
          placeholder="Cuenta tu situación con el detalle que quieras"
          placeholderTextColor="#a8a29a"
          multiline
          textAlignVertical="top"
          style={{ minHeight: 160 }}
          className="mb-1 rounded-2xl bg-white px-4 py-3 text-base text-nanny-text"
        />
        <View className="mb-5 flex-row">
          <FieldError message={submitted ? errors.content : null} />
        </View>

        <Text className="mb-2 text-sm font-semibold text-nanny-muted">Etiquetas *</Text>
        <TagChips tags={tags} selected={tagIds} onToggle={toggleTag} />
        <View className="mt-1 flex-row">
          <FieldError message={submitted ? errors.tags : null} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldError({ message }: { message: string | null }) {
  return <Text className="flex-1 text-xs text-red-500">{message ?? ''}</Text>;
}
