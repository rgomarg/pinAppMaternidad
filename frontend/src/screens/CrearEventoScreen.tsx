import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { TouchableOpacity } from "react-native";

export default function CrearEventoScreen(){
    const navigation = useNavigation();
    
    return(
        <TouchableOpacity 
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
            style={{
                position: 'absolute',
                bottom: 24,
                right: 24,
                width: 56,
                height: 56,
                backgroundColor: '#6d83a1',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOpacity: 0.3,
                shadowRadius: 4.65,
                elevation: 8,
            }}
        >
            <Ionicons name="arrow-back-outline" size={32} color="#ffffff" />
        </TouchableOpacity>    
    )
    
} 