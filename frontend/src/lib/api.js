import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API });

export const getToday = () => client.get(`/puzzle/today`).then((r) => r.data);
export const getPuzzle = (n) => client.get(`/puzzle/${n}`).then((r) => r.data);
export const getArchive = () => client.get(`/puzzle/archive`).then((r) => r.data);
export const submitGuess = (n, optionId) =>
  client.post(`/puzzle/${n}/guess`, { option_id: optionId }).then((r) => r.data);
export const revealAnswer = (n) =>
  client.get(`/puzzle/${n}/reveal`).then((r) => r.data);

// admin
export const adminListSongs = () => client.get(`/admin/songs`).then((r) => r.data);
export const adminCreateSong = (data) => client.post(`/admin/songs`, data).then((r) => r.data);
export const adminUpdateSong = (id, data) => client.put(`/admin/songs/${id}`, data).then((r) => r.data);
export const adminDeleteSong = (id) => client.delete(`/admin/songs/${id}`).then((r) => r.data);
export const adminImportCsv = (formData) =>
  client.post(`/admin/songs/import`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);

// practice mode
export const practiceFilters = () => client.get(`/practice/filters`).then((r) => r.data);
export const practiceNew = (params = {}) =>
  client.post(`/practice/new`, null, { params }).then((r) => r.data);
export const practiceGuess = (sid, optionId) =>
  client.post(`/practice/${sid}/guess`, { option_id: optionId }).then((r) => r.data);
export const practiceReveal = (sid) => client.get(`/practice/${sid}/reveal`).then((r) => r.data);

export default client;
