/**
 * Socket.IO Client Service
 * Handles real-time communication with the backend server
 */
import { io } from 'socket.io-client'

// Get the backend URL from environment or default to localhost:5000
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Create socket instance
let socket = null

// Debug logging helper
const DEBUG = true
const debugLog = (message, data = null) => {
  if (DEBUG) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12)
    if (data) {
      console.log(`[Socket.IO ${timestamp}] ${message}`, data)
    } else {
      console.log(`[Socket.IO ${timestamp}] ${message}`)
    }
  }
}

/**
 * Initialize Socket.IO connection
 * @param {string} token - Optional JWT token for authentication
 * @returns {Socket} Socket.IO client instance
 */
export const initSocket = (token = null) => {
  debugLog('🚀 initSocket called', { hasToken: !!token, socketExists: !!socket, socketConnected: socket?.connected })
  
  if (socket?.connected) {
    debugLog('✅ Socket already connected', { id: socket.id })
    return socket
  }

  const options = {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  }

  // Add auth token if provided
  if (token) {
    options.auth = { token }
  }

  debugLog('🔌 Creating new socket connection to:', SOCKET_URL)
  socket = io(SOCKET_URL, options)

  // Connection event handlers
  socket.on('connect', () => {
    debugLog('✅ Socket CONNECTED', { id: socket.id, transport: socket.io.engine.transport.name })
  })

  socket.on('disconnect', (reason) => {
    debugLog('❌ Socket DISCONNECTED', { reason })
  })

  socket.on('connect_error', (error) => {
    debugLog('❌ Socket CONNECTION ERROR', { message: error.message, type: error.type })
  })

  socket.on('reconnect', (attemptNumber) => {
    debugLog('🔄 Socket RECONNECTED', { attemptNumber })
  })
  
  // Debug: Log ALL incoming events
  socket.onAny((eventName, ...args) => {
    debugLog(`📥 Received event: "${eventName}"`, args)
  })

  return socket
}

/**
 * Get the current socket instance
 * @returns {Socket|null} Socket.IO client instance or null if not initialized
 */
export const getSocket = () => socket

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
    console.log('🔌 Socket disconnected manually')
  }
}

/**
 * Subscribe to village status updates
 * @param {Function} callback - Function to call when village status is updated
 * @returns {Function} Unsubscribe function
 */
export const subscribeToVillageStatusUpdates = (callback) => {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('[SOCKET CLIENT] subscribeToVillageStatusUpdates called')
  console.log('[SOCKET CLIENT] Socket exists:', !!socket)
  console.log('[SOCKET CLIENT] Socket connected:', socket?.connected)
  console.log('[SOCKET CLIENT] Socket ID:', socket?.id)
  console.log('═══════════════════════════════════════════════════════════════')
  
  if (!socket) {
    console.error('[SOCKET CLIENT] Socket not initialized. Call initSocket() first.')
    return () => {}
  }

  const handler = (data) => {
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('[SOCKET CLIENT] RECEIVED village-status-updated event!')
    console.log('[SOCKET CLIENT] Village name:', data?.villageName)
    console.log('[SOCKET CLIENT] Status:', data?.status?.status)
    console.log('[SOCKET CLIENT] Total peoples:', data?.status?.totalPeoples)
    console.log('[SOCKET CLIENT] Updated at:', data?.updatedAt)
    console.log('[SOCKET CLIENT] Debug info:', data?._debug)
    console.log('[SOCKET CLIENT] Full payload:', JSON.stringify(data, null, 2))
    console.log('═══════════════════════════════════════════════════════════════')
    callback(data)
  }

  // Also listen for the global fallback event
  const globalHandler = (data) => {
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('[SOCKET CLIENT] RECEIVED village-status-updated-global event!')
    console.log('[SOCKET CLIENT] This is the GLOBAL fallback event')
    console.log('[SOCKET CLIENT] Village name:', data?.villageName)
    console.log('═══════════════════════════════════════════════════════════════')
    // Don't call callback here to avoid double-triggering
    // This is just for debugging
  }

  console.log('[SOCKET CLIENT] Subscribing to "village-status-updated" event')
  socket.on('village-status-updated', handler)
  
  console.log('[SOCKET CLIENT] Subscribing to "village-status-updated-global" event (debug only)')
  socket.on('village-status-updated-global', globalHandler)

  // Return unsubscribe function
  return () => {
    console.log('[SOCKET CLIENT] Unsubscribing from village status events')
    socket.off('village-status-updated', handler)
    socket.off('village-status-updated-global', globalHandler)
  }
}

/**
 * Subscribe to people group updates
 * @param {Function} callback - Function to call when people group is added/updated
 * @returns {Function} Unsubscribe function
 */
export const subscribeToPeopleGroupUpdates = (callback) => {
  if (!socket) {
    console.warn('🔌 Socket not initialized. Call initSocket() first.')
    return () => {}
  }

  const addHandler = (data) => {
    console.log('🔌 Received people-group-added event:', data)
    callback({ type: 'added', data })
  }

  const updateHandler = (data) => {
    console.log('🔌 Received people-group-updated event:', data)
    callback({ type: 'updated', data })
  }

  socket.on('people-group-added', addHandler)
  socket.on('people-group-updated', updateHandler)

  // Return unsubscribe function
  return () => {
    socket.off('people-group-added', addHandler)
    socket.off('people-group-updated', updateHandler)
  }
}

/**
 * Subscribe to village updates (created, updated, deleted)
 * @param {Function} callback - Function to call when village changes
 * @returns {Function} Unsubscribe function
 */
export const subscribeToVillageUpdates = (callback) => {
  if (!socket) {
    console.warn('🔌 Socket not initialized. Call initSocket() first.')
    return () => {}
  }

  const createHandler = (data) => {
    console.log('🔌 Received village-created event:', data)
    callback({ type: 'created', data })
  }

  const updateHandler = (data) => {
    console.log('🔌 Received village-updated event:', data)
    callback({ type: 'updated', data })
  }

  const deleteHandler = (data) => {
    console.log('🔌 Received village-deleted event:', data)
    callback({ type: 'deleted', data })
  }

  socket.on('village-created', createHandler)
  socket.on('village-updated', updateHandler)
  socket.on('village-deleted', deleteHandler)

  // Return unsubscribe function
  return () => {
    socket.off('village-created', createHandler)
    socket.off('village-updated', updateHandler)
    socket.off('village-deleted', deleteHandler)
  }
}

/**
 * Subscribe to dashboard-related updates (for real-time stats)
 * @param {Function} callback - Function to call when dashboard data changes
 * @returns {Function} Unsubscribe function
 */
export const subscribeToDashboardUpdates = (callback) => {
  if (!socket) {
    console.warn('🔌 Socket not initialized. Call initSocket() first.')
    return () => {}
  }

  const statsHandler = (data) => {
    console.log('🔌 Received dashboard-stats-updated event:', data)
    callback({ type: 'stats', data })
  }

  socket.on('dashboard-stats-updated', statsHandler)

  // Return unsubscribe function
  return () => {
    socket.off('dashboard-stats-updated', statsHandler)
  }
}

/**
 * Join a specific room (e.g., region room)
 * @param {string} room - Room name to join
 */
export const joinRoom = (room) => {
  if (socket) {
    socket.emit('join-region', room)
    console.log('🔌 Joined room:', room)
  }
}

/**
 * Leave a specific room
 * @param {string} room - Room name to leave
 */
export const leaveRoom = (room) => {
  if (socket) {
    socket.emit('leave-region', room)
    console.log('🔌 Left room:', room)
  }
}

export default {
  initSocket,
  getSocket,
  disconnectSocket,
  subscribeToVillageStatusUpdates,
  subscribeToPeopleGroupUpdates,
  subscribeToVillageUpdates,
  subscribeToDashboardUpdates,
  joinRoom,
  leaveRoom,
}
