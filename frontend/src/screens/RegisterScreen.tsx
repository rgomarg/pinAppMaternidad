import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { setSelectedUserId } = useFamilySelection();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    // Validaciones en cliente
    if (!name.trim()) {
      setErrorMessage('Por favor, introduce tu nombre completo.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Por favor, introduce tu correo electrónico.');
      return;
    }
    if (!password) {
      setErrorMessage('Por favor, introduce una contraseña.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }
    if (!acceptTerms) {
      setErrorMessage('Debes aceptar las condiciones de privacidad.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_URL}/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al crear la cuenta');
      }

      // Registro exitoso: seleccionamos el usuario en el contexto
      setSelectedUserId(data.id);

      Alert.alert(
        '¡Cuenta creada!',
        `Bienvenido/a a tu espacio de salud familiar, ${data.name}.`,
        [
          {
            text: 'Comenzar',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs', params: { screen: 'Datos', params: { userId: data.id } } }],
              });
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Error de registro:', err);
      setErrorMessage(err?.message || 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
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
              <Ionicons name="location" size={38} color="#FFFFFF" />
              <View className="absolute top-[26px]">
                <Ionicons name="heart" size={14} color="#4E6E7E" />
              </View>
            </View>
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
            Crea tu cuenta
          </Text>
          <Text className="text-sm text-[#726B64] text-center mt-1.5 px-4 leading-5">
            Comienza a cuidar de la salud y bienestar de tu familia
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

        {/* Tarjeta del formulario */}
        <View className="bg-[#F3EDE4] rounded-[26px] p-5 mb-4 border border-[#EBE3D7]">
          {/* Nombre completo */}
          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="person-outline" size={15} color="#5A544E" />
              <Text className="text-xs font-semibold text-[#5A544E] ml-1.5">
                Nombre completo
              </Text>
            </View>
            <View className="bg-white rounded-2xl px-4 py-3 border border-[#E5DDD0]">
              <TextInput
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Ej. Ana García"
                placeholderTextColor="#A8A29A"
                autoCapitalize="words"
                className="text-base text-[#24211E] p-0"
              />
            </View>
          </View>

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
          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="lock-closed-outline" size={15} color="#5A544E" />
              <Text className="text-xs font-semibold text-[#5A544E] ml-1.5">
                Contraseña (mínimo 6 caracteres)
              </Text>
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

          {/* Confirmar Contraseña */}
          <View>
            <View className="flex-row items-center mb-2">
              <Ionicons name="checkmark-done-outline" size={15} color="#5A544E" />
              <Text className="text-xs font-semibold text-[#5A544E] ml-1.5">
                Confirmar contraseña
              </Text>
            </View>
            <View className="bg-white rounded-2xl px-4 py-3 border border-[#E5DDD0] flex-row items-center justify-between">
              <TextInput
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="••••••••••••••••"
                placeholderTextColor="#A8A29A"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                className="text-base text-[#24211E] p-0 flex-1 mr-2"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={10}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#7B746C"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Términos y privacidad */}
        <TouchableOpacity
          onPress={() => setAcceptTerms(!acceptTerms)}
          activeOpacity={0.8}
          className="flex-row items-center px-1 mb-5"
        >
          <View
            className={`w-5 h-5 rounded-md items-center justify-center mr-2.5 border ${
              acceptTerms ? 'bg-[#4E6E7E] border-[#4E6E7E]' : 'bg-white border-[#C8BFB4]'
            }`}
          >
            {acceptTerms && <Ionicons name="checkmark" size={14} color="white" />}
          </View>
          <Text className="text-xs text-[#5A544E] flex-1 leading-4">
            Acepto los <Text className="font-semibold text-[#4E6E7E]">términos de servicio</Text> y la{' '}
            <Text className="font-semibold text-[#4E6E7E]">política de privacidad</Text> de salud familiar.
          </Text>
        </TouchableOpacity>

        {/* Botón principal Registrarse */}
        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
          className="bg-[#4E6E7E] rounded-2xl py-4 flex-row items-center justify-center mb-6 shadow-sm"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text className="text-white font-semibold text-base mr-2">
                Crear cuenta
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        {/* Separador O REGÍSTRATE CON */}
        <View className="flex-row items-center mb-5">
          <View className="flex-1 h-[1px] bg-[#E3DBD0]" />
          <Text className="px-3 text-[11px] font-bold tracking-wider text-[#938C84]">
            O REGÍSTRATE CON
          </Text>
          <View className="flex-1 h-[1px] bg-[#E3DBD0]" />
        </View>

        {/* Botones Sociales (Google y Apple) */}
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Google Sign-In', 'El registro con Google estará disponible próximamente.')
            }
            activeOpacity={0.8}
            className="flex-1 bg-[#F3EDE4] rounded-2xl py-3.5 flex-row items-center justify-center border border-[#EBE3D7]"
          >
            <Ionicons name="logo-google" size={18} color="#EA4335" />
            <Text className="text-sm font-semibold text-[#24211E] ml-2">Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              Alert.alert('Apple Sign-In', 'El registro con Apple estará disponible próximamente.')
            }
            activeOpacity={0.8}
            className="flex-1 bg-[#F3EDE4] rounded-2xl py-3.5 flex-row items-center justify-center border border-[#EBE3D7]"
          >
            <Ionicons name="logo-apple" size={19} color="#000000" />
            <Text className="text-sm font-semibold text-[#24211E] ml-2">Apple</Text>
          </TouchableOpacity>
        </View>

        {/* Enlace para volver a Iniciar sesión */}
        <View className="flex-row items-center justify-center mb-4">
          <Text className="text-sm text-[#726B64]">¿Ya tienes una cuenta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} hitSlop={8}>
            <Text className="text-sm font-bold text-[#4E6E7E]">Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

