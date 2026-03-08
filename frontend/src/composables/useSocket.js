import { ref } from 'vue';
import { io } from 'socket.io-client';
const socket = ref(null);
const connected = ref(false);
const notifications = ref([]);
const pendingListeners = []; 
export function useSocket() {
  const connectSocket = () => {
    const token = localStorage.getItem('token');
    if (!token || socket.value) return;
    socket.value = io(import.meta.env.VITE_API_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socket.value.on('connect', () => {
      connected.value = true;
      
      for (const { event, callback } of pendingListeners) {
        socket.value.on(event, callback);
      }
      pendingListeners.length = 0;
    });
    socket.value.on('disconnect', () => { connected.value = false; });
    socket.value.on('connect_error', (err) => { console.error('Socket err:', err.message); connected.value = false; });
  };
  const disconnectSocket = () => {
    if (socket.value) { socket.value.disconnect(); socket.value = null; connected.value = false; }
    pendingListeners.length = 0;
  };
  const onEvent = (event, callback) => {
    if (socket.value?.connected) {
     
      socket.value.on(event, callback);
    } else if (socket.value) {
      
      socket.value.once('connect', () => socket.value.on(event, callback));
    } else {
     
      pendingListeners.push({ event, callback });
    }
  };
  const offEvent = (event, callback) => { if (socket.value) socket.value.off(event, callback); };
  const addNotification = (msg) => {
    notifications.value.unshift({ id: Date.now(), ...msg });
    if (notifications.value.length > 10) notifications.value.pop();
  };
  const removeNotification = (id) => { notifications.value = notifications.value.filter(n => n.id !== id); };
  return { socket, connected, notifications, connectSocket, disconnectSocket, onEvent, offEvent, addNotification, removeNotification };
}