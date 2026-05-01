import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { NetworkProvider } from "./src/context/NetworkContext";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ScanReceiptScreen from "./src/screens/ScanReceiptScreen";
import AddTransactionScreen from "./src/screens/AddTransactionScreen";
import AIAdvisorScreen from "./src/screens/AIAdvisorScreen";

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="ScanReceipt" component={ScanReceiptScreen} options={{ headerShown: true, title: "Scan Receipt" }} />
          <Stack.Screen name="AddTransaction" component={AddTransactionScreen} options={{ headerShown: true, title: "Add Transaction" }} />
          <Stack.Screen name="AIAdvisor" component={AIAdvisorScreen} options={{ headerShown: true, title: "AI Advisor" }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NetworkProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </NetworkProvider>
  );
}
