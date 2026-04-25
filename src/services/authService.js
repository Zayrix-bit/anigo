import { backendApi } from "./api";

export const login = async (email, password) => {
  const { data } = await backendApi.post("/auth/login", { email, password });
  return data;
};

export const register = async (username, email, password) => {
  const { data } = await backendApi.post("/auth/register", { username, email, password });
  return data;
};

export const getMe = async () => {
  const { data } = await backendApi.get("/auth/me");
  return data;
};

export const updateMe = async (profileData) => {
  const { data } = await backendApi.put("/auth/me", profileData);
  return data;
};
