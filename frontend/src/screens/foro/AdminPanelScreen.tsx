import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  adminApi,
  type AdminReport,
  type AdminThread,
  type AdminUser,
  type ReportStatus,
  type ThreadStatus,
  type UserStatus,
} from '../../api/admin';
import { useFamilySelection } from '../../context/FamilySelectionContext';
import { timeAgo } from '../../components/foro/AuthorAvatar';

type Tab = 'threads' | 'users' | 'reports';

const REPORT_FILTERS: { value: ReportStatus | null; label: string }[] = [
  { value: null, label: 'Todos' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'RESOLVED', label: 'Aceptados' },
  { value: 'DISMISSED', label: 'Rechazados' },
];

const THREAD_FILTERS: { value: ThreadStatus | null; label: string }[] = [
  { value: null, label: 'Todos' },
  { value: 'VISIBLE', label: 'Visibles' },
  { value: 'DELETED', label: 'Eliminados' },
  { value: 'AUTHOR_BLOCKED', label: 'Autor bloqueado' },
  { value: 'HIDDEN', label: 'Ocultos por reporte' },
];

const USER_FILTERS: { value: UserStatus | null; label: string }[] = [
  { value: null, label: 'Todos' },
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'BLOCKED', label: 'Bloqueados' },
];

// Etiqueta visual del estado de cada registro (PA: "Eliminado" o "Bloqueado")
const STATUS_BADGE: Record<ThreadStatus | UserStatus, { label: string; className: string; textClassName: string }> = {
  VISIBLE: { label: 'Visible', className: 'bg-nanny-green/15', textClassName: 'text-nanny-green' },
  ACTIVE: { label: 'Activo', className: 'bg-nanny-green/15', textClassName: 'text-nanny-green' },
  DELETED: { label: 'Eliminado', className: 'bg-nanny-red/15', textClassName: 'text-nanny-red' },
  BLOCKED: { label: 'Bloqueado', className: 'bg-nanny-red/15', textClassName: 'text-nanny-red' },
  AUTHOR_BLOCKED: { label: 'Bloqueado (autor)', className: 'bg-nanny-red/15', textClassName: 'text-nanny-red' },
  HIDDEN: { label: 'Oculto por reporte', className: 'bg-nanny-card', textClassName: 'text-nanny-muted' },
};

function StatusBadge({ status }: { status: ThreadStatus | UserStatus }) {
  const badge = STATUS_BADGE[status];
  return (
    <Text className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className} ${badge.textClassName}`}>
      {badge.label}
    </Text>
  );
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminPanelScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialTab: Tab | undefined = route.params?.tab;
  const { selectedUserId } = useFamilySelection();
  const [tab, setTab] = useState<Tab>(initialTab ?? 'threads');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [threadStatus, setThreadStatus] = useState<ThreadStatus | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [reportStatus, setReportStatus] = useState<ReportStatus | null>('PENDING');
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [threads, setThreads] = useState<AdminThread[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Accesos directos desde el inicio del admin (abren el panel en una pestaña concreta)
  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  // Espera a que el admin deje de escribir para no lanzar una búsqueda por tecla
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const load = useCallback(async () => {
    if (!selectedUserId) return;
    setError(null);
    try {
      if (tab === 'threads') {
        setThreads(await adminApi.getThreads(selectedUserId, { search: debouncedSearch, status: threadStatus }));
      } else if (tab === 'reports') {
        setReports(await adminApi.getReports(selectedUserId, { search: debouncedSearch, status: reportStatus }));
      } else {
        setUsers(await adminApi.getUsers(selectedUserId, { search: debouncedSearch, status: userStatus }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el panel.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedUserId, tab, debouncedSearch, threadStatus, userStatus, reportStatus]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const changeTab = (next: Tab) => {
    if (next === tab) return;
    setLoading(true);
    setTab(next);
  };

  // Pide confirmación, ejecuta la acción y sustituye el registro por el que devuelve el backend
  const runAction = <T extends { id: number }>(
    item: T,
    confirm: { title: string; message: string; button: string; destructive: boolean },
    action: () => Promise<T>,
    setItems: React.Dispatch<React.SetStateAction<T[]>>,
  ) => {
    Alert.alert(confirm.title, confirm.message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: confirm.button,
        style: confirm.destructive ? 'destructive' : 'default',
        onPress: async () => {
          setBusyId(item.id);
          try {
            const updated = await action();
            setItems((current) => current.map((it) => (it.id === updated.id ? updated : it)));
          } catch (e) {
            Alert.alert('No se pudo completar la acción', e instanceof Error ? e.message : 'Inténtalo de nuevo.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const toggleThread = (thread: AdminThread) => {
    if (!selectedUserId) return;
    const deleted = thread.status === 'DELETED';
    runAction(
      thread,
      deleted
        ? {
            title: 'Restaurar hilo',
            message: `"${thread.title}" volverá a ser visible en el foro.`,
            button: 'Restaurar',
            destructive: false,
          }
        : {
            title: 'Eliminar hilo',
            message: `"${thread.title}" desaparecerá del foro de inmediato. Se conserva en el sistema y puedes restaurarlo.`,
            button: 'Eliminar',
            destructive: true,
          },
      () =>
        deleted
          ? adminApi.restoreThread(selectedUserId, thread.id)
          : adminApi.deleteThread(selectedUserId, thread.id),
      setThreads,
    );
  };

  const toggleUser = (user: AdminUser) => {
    if (!selectedUserId) return;
    const blocked = user.status === 'BLOCKED';
    runAction(
      user,
      blocked
        ? {
            title: 'Desbloquear usuario',
            message: `${user.name} y todo su contenido volverán a ser visibles.`,
            button: 'Desbloquear',
            destructive: false,
          }
        : {
            title: 'Bloquear usuario',
            message: `Se ocultarán de inmediato el perfil de ${user.name} y sus ${user.threadCount} hilos y ${user.messageCount} mensajes. No podrá publicar.`,
            button: 'Bloquear',
            destructive: true,
          },
      () => (blocked ? adminApi.unblockUser(selectedUserId, user.id) : adminApi.blockUser(selectedUserId, user.id)),
      setUsers,
    );
  };

  const reviewReport = (report: AdminReport, accept: boolean) => {
    if (!selectedUserId) return;
    const what = report.targetType === 'THREAD' ? 'hilo' : 'mensaje';
    runAction(
      report,
      accept
        ? {
            title: 'Aceptar reporte',
            message: `El ${what} reportado se ocultará del foro de inmediato.`,
            button: 'Ocultar contenido',
            destructive: true,
          }
        : {
            title: 'Rechazar reporte',
            message: `El ${what} reportado seguirá visible en el foro.`,
            button: 'Rechazar',
            destructive: false,
          },
      () => (accept ? adminApi.resolveReport(selectedUserId, report.id) : adminApi.dismissReport(selectedUserId, report.id)),
      setReports,
    );
  };

  const filters = tab === 'threads' ? THREAD_FILTERS : tab === 'reports' ? REPORT_FILTERS : USER_FILTERS;
  const activeFilter = tab === 'threads' ? threadStatus : tab === 'reports' ? reportStatus : userStatus;
  const selectFilter = (value: string | null) => {
    setLoading(true);
    if (tab === 'threads') setThreadStatus(value as ThreadStatus | null);
    else if (tab === 'reports') setReportStatus(value as ReportStatus | null);
    else setUserStatus(value as UserStatus | null);
  };

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
    />
  );
  const emptyText = error ?? (tab === 'threads'
      ? 'No hay hilos con estos filtros.'
      : tab === 'reports'
        ? 'No hay reportes con estos filtros.'
        : 'No hay usuarios con estos filtros.');

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-nanny-bg">
      <View className="px-6 pb-3 pt-2">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mb-2 flex-row items-center"
          accessibilityRole="button"
          accessibilityLabel="Volver al foro"
        >
          <Ionicons name="chevron-back" size={18} color="#6d83a1" />
          <Text className="ml-1 text-sm text-nanny-blue">Foro</Text>
        </TouchableOpacity>
        <Text className="mb-1 text-sm font-medium text-nanny-muted">Administración</Text>
        <Text className="mb-4 text-3xl font-semibold text-nanny-text">Moderación</Text>

        <View className="mb-3 flex-row rounded-full bg-nanny-card p-1">
          {(
            [
              { value: 'threads', label: 'Hilos' },
              { value: 'reports', label: 'Reportes' },
              { value: 'users', label: 'Usuarios' },
            ] as const
          ).map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => changeTab(option.value)}
              className={`flex-1 items-center rounded-full py-2 ${tab === option.value ? 'bg-white' : ''}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === option.value }}
            >
              <Text className={`text-sm font-semibold ${tab === option.value ? 'text-nanny-text' : 'text-nanny-muted'}`}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="mb-3 flex-row items-center rounded-2xl bg-white px-4">
          <Ionicons name="search" size={16} color="#808080" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={
              tab === 'threads'
                ? 'Buscar por título, contenido o autor'
                : tab === 'reports'
                  ? 'Buscar en el motivo del reporte'
                  : 'Buscar por nombre o email'
            }
            placeholderTextColor="#808080"
            className="ml-2 flex-1 py-3 text-sm text-nanny-text"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Borrar búsqueda">
              <Ionicons name="close-circle" size={16} color="#808080" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {filters.map((filter) => {
            const active = activeFilter === filter.value;
            return (
              <TouchableOpacity
                key={filter.label}
                onPress={() => selectFilter(filter.value)}
                className={`rounded-full px-4 py-2 ${active ? 'bg-nanny-blue' : 'bg-nanny-card'}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-nanny-text'}`}>{filter.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6d83a1" style={{ marginTop: 48 }} />
      ) : tab === 'threads' ? (
        <FlatList
          data={threads}
          keyExtractor={(thread) => String(thread.id)}
          renderItem={({ item }) => (
            <ThreadRow thread={item} busy={busyId === item.id} onToggle={() => toggleThread(item)} />
          )}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text className="mt-12 text-center text-nanny-muted">{emptyText}</Text>}
        />
      ) : tab === 'reports' ? (
        <FlatList
          data={reports}
          keyExtractor={(report) => String(report.id)}
          renderItem={({ item }) => (
            <ReportRow
              report={item}
              busy={busyId === item.id}
              onAccept={() => reviewReport(item, true)}
              onDismiss={() => reviewReport(item, false)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text className="mt-12 text-center text-nanny-muted">{emptyText}</Text>}
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(user) => String(user.id)}
          renderItem={({ item }) => (
            <UserRow
              user={item}
              isSelf={item.id === selectedUserId}
              busy={busyId === item.id}
              onToggle={() => toggleUser(item)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text className="mt-12 text-center text-nanny-muted">{emptyText}</Text>}
        />
      )}
    </View>
  );
}

function ActionButton({
  label,
  icon,
  destructive,
  busy,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  const color = destructive ? '#cc7a66' : '#6d83a1';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      className={`flex-row items-center rounded-full px-4 py-2 ${destructive ? 'bg-nanny-red/15' : 'bg-nanny-blue/15'}`}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {busy ? <ActivityIndicator size="small" color={color} /> : <Ionicons name={icon} size={16} color={color} />}
      <Text className={`ml-1 text-sm font-semibold ${destructive ? 'text-nanny-red' : 'text-nanny-blue'}`}>{label}</Text>
    </TouchableOpacity>
  );
}

function ThreadRow({ thread, busy, onToggle }: { thread: AdminThread; busy: boolean; onToggle: () => void }) {
  const deleted = thread.status === 'DELETED';
  return (
    <View className="mb-3 rounded-3xl bg-white p-5">
      <View className="mb-2 flex-row flex-wrap items-center gap-2">
        <StatusBadge status={thread.status} />
        {/* Un hilo eliminado cuyo autor también está bloqueado muestra ambas etiquetas */}
        {deleted && thread.owner.blockedAt && <StatusBadge status="AUTHOR_BLOCKED" />}
        <Text className="ml-auto text-xs text-nanny-muted">{timeAgo(thread.createdAt)}</Text>
      </View>

      <Text className="mb-1 text-lg font-semibold text-nanny-text">{thread.title}</Text>
      <Text className="mb-3 text-sm text-nanny-muted">{thread.content}</Text>

      <Text className="text-xs text-nanny-muted">
        Autor: <Text className="font-semibold text-nanny-text">{thread.owner.name}</Text> · {thread.owner.email}
      </Text>
      <Text className="text-xs text-nanny-muted">
        {thread.messageCount} mensajes{thread.tags.length > 0 && ` · ${thread.tags.map((t) => `#${t.name}`).join(' ')}`}
      </Text>
      {thread.deletedAt && <Text className="text-xs text-nanny-red">Eliminado el {formatDate(thread.deletedAt)}</Text>}

      <View className="mt-4 flex-row justify-end">
        <ActionButton
          label={deleted ? 'Restaurar' : 'Eliminar'}
          icon={deleted ? 'refresh' : 'trash-outline'}
          destructive={!deleted}
          busy={busy}
          onPress={onToggle}
        />
      </View>
    </View>
  );
}

function UserRow({
  user,
  isSelf,
  busy,
  onToggle,
}: {
  user: AdminUser;
  isSelf: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  const blocked = user.status === 'BLOCKED';
  // Los administradores no se pueden bloquear (tampoco a sí mismos)
  const canModerate = user.role !== 'ADMIN' && !isSelf;
  return (
    <View className="mb-3 rounded-3xl bg-white p-5">
      <View className="mb-2 flex-row flex-wrap items-center gap-2">
        <StatusBadge status={user.status} />
        {user.role !== 'USER' && (
          <Text className="rounded-full bg-nanny-bg px-2 py-0.5 text-xs font-semibold text-nanny-blue">
            {user.role === 'ADMIN' ? 'Admin' : 'Profesional'}
          </Text>
        )}
      </View>

      <Text className="text-lg font-semibold text-nanny-text">{user.name}</Text>
      <Text className="mb-2 text-sm text-nanny-muted">{user.email}</Text>
      <Text className="text-xs text-nanny-muted">
        {user.threadCount} hilos · {user.messageCount} mensajes
      </Text>
      {user.blockedAt && <Text className="text-xs text-nanny-red">Bloqueado el {formatDate(user.blockedAt)}</Text>}

      {canModerate && (
        <View className="mt-4 flex-row justify-end">
          <ActionButton
            label={blocked ? 'Desbloquear' : 'Bloquear'}
            icon={blocked ? 'lock-open-outline' : 'ban-outline'}
            destructive={!blocked}
            busy={busy}
            onPress={onToggle}
          />
        </View>
      )}
    </View>
  );
}

const REPORT_BADGE: Record<ReportStatus, { label: string; className: string; textClassName: string }> = {
  PENDING: { label: 'Pendiente', className: 'bg-nanny-blue/15', textClassName: 'text-nanny-blue' },
  RESOLVED: { label: 'Aceptado', className: 'bg-nanny-red/15', textClassName: 'text-nanny-red' },
  DISMISSED: { label: 'Rechazado', className: 'bg-nanny-card', textClassName: 'text-nanny-muted' },
};

function ReportRow({
  report,
  busy,
  onAccept,
  onDismiss,
}: {
  report: AdminReport;
  busy: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const badge = REPORT_BADGE[report.status];
  const { target } = report;
  return (
    <View className="mb-3 rounded-3xl bg-white p-5">
      <View className="mb-2 flex-row flex-wrap items-center gap-2">
        <Text className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className} ${badge.textClassName}`}>
          {badge.label}
        </Text>
        <Text className="rounded-full bg-nanny-bg px-2 py-0.5 text-xs font-semibold text-nanny-blue">
          {report.targetType === 'THREAD' ? 'Hilo' : 'Mensaje'}
        </Text>
        {target?.isHidden && (
          <Text className="rounded-full bg-nanny-card px-2 py-0.5 text-xs font-semibold text-nanny-muted">Oculto</Text>
        )}
        <Text className="ml-auto text-xs text-nanny-muted">{timeAgo(report.createdAt)}</Text>
      </View>

      <Text className="mb-1 text-xs font-semibold uppercase text-nanny-muted">Motivo</Text>
      <Text className="mb-3 text-sm text-nanny-text">{report.reason}</Text>

      <Text className="mb-1 text-xs font-semibold uppercase text-nanny-muted">Contenido reportado</Text>
      {target ? (
        <>
          {target.title && <Text className="text-base font-semibold text-nanny-text">{target.title}</Text>}
          <Text className="text-sm text-nanny-muted">{target.content}</Text>
          <Text className="mt-1 text-xs text-nanny-muted">
            Autor: <Text className="font-semibold text-nanny-text">{target.author.name}</Text>
          </Text>
        </>
      ) : (
        <Text className="text-sm text-nanny-muted">El contenido ya no existe.</Text>
      )}
      <Text className="mt-1 text-xs text-nanny-muted">Reportado por {report.reporter.name}</Text>

      {report.status === 'PENDING' && target && (
        <View className="mt-4 flex-row justify-end gap-2">
          <ActionButton label="Rechazar" icon="close" destructive={false} busy={busy} onPress={onDismiss} />
          <ActionButton label="Ocultar" icon="eye-off-outline" destructive busy={busy} onPress={onAccept} />
        </View>
      )}
    </View>
  );
}
