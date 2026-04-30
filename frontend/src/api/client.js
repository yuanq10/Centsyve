import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "REPLACE_WITH_RAILWAY_URL"; // e.g. https://centsyve-api.railway.app

const client = axios.create({ baseURL: API_BASE_URL });

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;
