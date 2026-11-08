import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi, type AdminThread, type AdminUser } from '../../api/admin';

type Summary = { users: AdminUser[]; threads: AdminThread[] };

// Pantalla de inicio del administrador: no tiene hijos, así que en lugar de los datos
// de crecimiento ve un resumen de la moderación del foro y accesos directos al panel.
export default function AdminHome({ adminId }: { adminId: number }) {
  const navigation = useNavigation<any>();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setError(null);
      Promise.all([adminApi.getUsers(adminId), adminApi.getThreads(adminId)])
        .then(([users, threads]) => !cancelled && setSummary({ users, threads }))
        .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'No se pudo cargar el resumen.'));
      return () => {
        cancelled = true;
      };
    }, [adminId]),
  );

  const openPanel = (tab: 'threads' | 'users') =>
    navigation.navigate('Foro', { screen: 'AdminPanel', params: { tab }, initial: false });

  if (error) return <Text className="mt-12 text-center text-nanny-muted">{error}</Text>;
  if (!summary) return <ActivityIndicator size="large" color="#6d83a1" style={{ marginTop: 48 }} />;

  const count = <T extends { status: string }>(items: T[], status: string) =>
    items.filter((item) => item.status === status).length;

  return (
    <View>
      <Text className="mb-3 text-base font-bold uppercase tracking-wider text-nanny-muted">Foro</Text>
      <View className="mb-6 flex-row flex-wrap gap-3">
        <StatTile label="Hilos visibles" value={count(summary.threads, 'VISIBLE')} icon="chatbubbles-outline" />
        <StatTile label="Hilos eliminados" value={count(summary.threads, 'DELETED')} icon="trash-outline" alert />
        <StatTile
          label="Ocultos por bloqueo"
          value={count(summary.threads, 'AUTHOR_BLOCKED')}
          icon="eye-off-outline"
          alert
        />
        <StatTile label="Ocultos por reporte" value={count(summary.threads, 'HIDDEN')} icon="flag-outline" />
      </View>

      <Text className="mb-3 text-base font-bold uppercase tracking-wider text-nanny-muted">Usuarios</Text>
      <View className="mb-6 flex-row flex-wrap gap-3">
        <StatTile label="Usuarios activos" value={count(summary.users, 'ACTIVE')} icon="people-outline" />
        <StatTile label="Usuarios bloqueados" value={count(summary.users, 'BLOCKED')} icon="ban-outline" alert />
      </View>

      <Text className="mb-3 text-base font-bold uppercase tracking-wider text-nanny-muted">Acciones</Text>
      <ShortcutButton
        icon="shield-checkmark-outline"
        title="Moderar hilos"
        subtitle="Buscar, eliminar o restaurar hilos del foro"
        onPress={() => openPanel('threads')}
      />
      <ShortcutButton
        icon="person-remove-outline"
        title="Gestionar usuarios"
        subtitle="Bloquear o desbloquear usuarios y su contenido"
        onPress={() => openPanel('users')}
      />
      <ShortcutButton
        icon="chatbubbles-outline"
        title="Ir al foro"
        subtitle="Ver el foro como lo ven las familias y moderar desde él"
        onPress={() => navigation.navigate('Foro', { screen: 'ThreadList' })}
      />
    </View>
  );
}

function StatTile({
  label,
  value,
  icon,
  alert = false,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  alert?: boolean;
}) {
  const highlighted = alert && value > 0;
  return (
    <View style={{ width: '47%' }} className="rounded-2xl bg-nanny-card p-4">
      <Ionicons name={icon} size={18} color={highlighted ? '#cc7a66' : '#6d83a1'} />
      <Text className={`mt-2 text-3xl font-bold ${highlighted ? 'text-nanny-red' : 'text-nanny-text'}`}>{value}</Text>
      <Text className="text-sm font-medium text-nanny-muted">{label}</Text>
    </View>
  );
}

function ShortcutButton({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-3xl bg-white p-5"
      accessibilityRole="button"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-nanny-blue/15">
        <Ionicons name={icon} size={20} color="#6d83a1" />
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-base font-semibold text-nanny-text">{title}</Text>
        <Text className="text-sm text-nanny-muted">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#808080" />
    </TouchableOpacity>
  );
}
