import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../api/config';
import { useFamilySelection } from '../context/FamilySelectionContext';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { setSelectedUserId } = useFamilySelection();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor, introduce tu correo y contraseña.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_URL}/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      // Login exitoso: activamos el usuario en el contexto global
      setSelectedUserId(data.id);

      // Redirigimos a la pantalla principal pasando el userId
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs', params: { screen: 'Datos', params: { userId: data.id } } }],
      });
    } catch (err: any) {
      console.error('Error de login:', err);
      setErrorMessage(err?.message || 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickUser = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setErrorMessage(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#FAF7F2' }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 16) + 8,
          paddingBottom: Math.max(insets.bottom, 24) + 16,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Botón Volver */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-[#EDE5D8] items-center justify-center mb-4 self-start"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#45403B" />
        </TouchableOpacity>

        {/* Icono central de cabecera */}
        <View className="items-center mb-5">
          <View className="relative">
            <View className="w-20 h-20 rounded-full bg-[#4E6E7E] items-center justify-center shadow-sm">
              {/* Pin con corazón */}
              <Ionicons name="location" size={38} color="#FFFFFF" />
              <View className="absolute top-[26px]">
                <Ionicons name="heart" size={14} color="#4E6E7E" />
              </View>
            </View>
            {/* Pequeña insignia de hoja abajo a la derecha */}
            <View className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#FAF7F2] items-center justify-center border border-[#E3DBD0]">
              <Ionicons name="leaf" size={12} color="#4E6E7E" />
            </View>
          </View>
        </View>

        {/* Título y subtítulo */}
        <View className="items-center mb-3">
          <Text
            className="text-3xl font-bold text-[#24211E] text-center"
            style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}
          >
            Bienvenido de nuevo
          </Text>
          <Text className="text-sm text-[#726B64] text-center mt-1.5 px-4 leading-5">
            Accede a tu espacio sereno de salud familiar y bienestar
          </Text>
        </View>

        {/* Badge Entorno seguro */}
        <View className="self-center flex-row items-center bg-[#E5EEF2] px-3.5 py-1.5 rounded-full mb-6">
          <Ionicons name="shield-checkmark-outline" size={14} color="#4E6E7E" />
          <Text className="text-xs font-semibold text-[#4E6E7E] ml-1.5">
            Entorno seguro y privado
          </Text>
        </View>

        {/* Mensaje de error si ocurre */}
        {errorMessage ? (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4 flex-row items-center">
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text className="text-xs text-red-700 ml-2 flex-1 font-medium">{errorMessage}</Text>
          </View>
        ) : null}

        {/* Tarjeta del formulario (Inputs) */}
        <View className="bg-[#F3EDE4] rounded-[26px] p-5 mb-3.5 border border-[#EBE3D7]">
          {/* Correo electrónico */}
          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="mail-outline" size={15} color="#5A544E" />
              <Text className="text-xs font-semibold text-[#5A544E] ml-1.5">
                Correo electrónico
              </Text>
            </View>
            <View className="bg-white rounded-2xl px-4 py-3 border border-[#E5DDD0]">
              <TextInput
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="ana.garcia@email.com"
                placeholderTextColor="#A8A29A"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="text-base text-[#24211E] p-0"
              />
            </View>
          </View>

          {/* Contraseña */}
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Ionicons name="lock-closed-outline" size={15} color="#5A544E" />
                <Text className="text-xs font-semibold text-[#5A544E] ml-1.5">
                  Contraseña
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    'Recuperar contraseña',
                    'Para restablecer tu contraseña, contacta con el administrador del centro o soporte.'
                  )
                }
              >
                <Text className="text-xs font-medium text-[#4E6E7E]">
                  ¿Has olvidado tu contraseña?
                </Text>
              </TouchableOpacity>
            </View>
            <View className="bg-white rounded-2xl px-4 py-3 border border-[#E5DDD0] flex-row items-center justify-between">
              <TextInput
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="••••••••••••••••"
                placeholderTextColor="#A8A29A"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                className="text-base text-[#24211E] p-0 flex-1 mr-2"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#7B746C"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tarjeta Recordar sesión */}
        <View className="bg-[#F3EDE4] rounded-2xl p-4 mb-4 flex-row items-center justify-between border border-[#EBE3D7]">
          <View className="flex-row items-center flex-1 mr-3">
            <View className="w-9 h-9 rounded-xl bg-white/70 items-center justify-center mr-3 border border-[#E3DBD0]">
              <Ionicons name="phone-portrait-outline" size={18} color="#4E6E7E" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-[#24211E]">Recordar sesión</Text>
              <Text className="text-xs text-[#7B746C]">Mantener activo en este dispositivo</Text>
            </View>
          </View>
          <Switch
            value={rememberSession}
            onValueChange={setRememberSession}
            trackColor={{ false: '#D9D1C7', true: '#4E6E7E' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#D9D1C7"
          />
        </View>

        {/* Botón principal Iniciar sesión */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
          className="bg-[#4E6E7E] rounded-2xl py-4 flex-row items-center justify-center mb-6 shadow-sm"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text className="text-white font-semibold text-base mr-2">
                Iniciar sesión
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        {/* Separador O CONTINÚA CON */}
        <View className="flex-row items-center mb-5">
          <View className="flex-1 h-[1px] bg-[#E3DBD0]" />
          <Text className="px-3 text-[11px] font-bold tracking-wider text-[#938C84]">
            O CONTINÚA CON
          </Text>
          <View className="flex-1 h-[1px] bg-[#E3DBD0]" />
        </View>

        {/* Botones Sociales (Google y Apple) */}
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Google Sign-In', 'La autenticación con Google se activará en la versión final.')
            }
            activeOpacity={0.8}
            className="flex-1 bg-[#F3EDE4] rounded-2xl py-3.5 flex-row items-center justify-center border border-[#EBE3D7]"
          >
            <Ionicons name="logo-google" size={18} color="#EA4335" />
            <Text className="text-sm font-semibold text-[#24211E] ml-2">Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              Alert.alert('Apple Sign-In', 'La autenticación con Apple se activará en la versión final.')
            }
            activeOpacity={0.8}
            className="flex-1 bg-[#F3EDE4] rounded-2xl py-3.5 flex-row items-center justify-center border border-[#EBE3D7]"
          >
            <Ionicons name="logo-apple" size={19} color="#000000" />
            <Text className="text-sm font-semibold text-[#24211E] ml-2">Apple</Text>
          </TouchableOpacity>
        </View>

        {/* Enlace para registrarse */}
        <View className="flex-row items-center justify-center mb-6">
          <Text className="text-sm text-[#726B64]">¿No tienes cuenta todavía? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} hitSlop={8}>
            <Text className="text-sm font-bold text-[#4E6E7E]">Regístrate</Text>
          </TouchableOpacity>
        </View>

        {/* Acceso rápido a usuarios de prueba */}
        <View className="bg-white/60 rounded-2xl p-3.5 border border-[#E5DDD0]">
          <Text className="text-[11px] font-bold text-[#726B64] uppercase tracking-wider mb-2 text-center">
            💡 Usuarios de prueba disponibles (Toca para autocompletar)
          </Text>
          <View className="gap-1.5">
            <TouchableOpacity
              onPress={() => fillQuickUser('laura.pro@example.com', 'hashed_password_123')}
              className="bg-[#F3EDE4] rounded-xl px-3 py-2 flex-row justify-between items-center"
            >
              <Text className="text-xs font-medium text-[#24211E]">Laura Pérez (PRO)</Text>
              <Text className="text-[11px] text-[#4E6E7E]">laura.pro@example.com</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => fillQuickUser('carlos.user@example.com', 'hashed_password_456')}
              className="bg-[#F3EDE4] rounded-xl px-3 py-2 flex-row justify-between items-center"
            >
              <Text className="text-xs font-medium text-[#24211E]">Carlos Martín (USER)</Text>
              <Text className="text-[11px] text-[#4E6E7E]">carlos.user@example.com</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => fillQuickUser('elena.admin@example.com', 'hashed_password_789')}
              className="bg-[#F3EDE4] rounded-xl px-3 py-2 flex-row justify-between items-center"
            >
              <Text className="text-xs font-medium text-[#24211E]">Elena Gómez (Pediatra)</Text>
              <Text className="text-[11px] text-[#4E6E7E]">elena.admin@example.com</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

