import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || null)
  
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  
  const register = async (name, email, password, inviteCode) => {
    // Use proxy from vite.config.js (routes /api to http://localhost:3000)
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const url = `${apiUrl}/api/auth/register`
    
    console.log('📝 Frontend: Starting registration...', { name, email, inviteCode, url, apiUrl })
    
    try {
      console.log('📤 Frontend: Sending registration request to:', url)
      const response = await axios.post(url, {
        name,
        email,
        password,
        inviteCode
      })
      
      console.log('✅ Frontend: Registration successful', response.data)
      
      token.value = response.data.token
      user.value = response.data.user
      localStorage.setItem('token', token.value)
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      
      return { 
        success: true,
        workspaceId: response.data.workspaceId || null
      }
    } catch (error) {
      console.error('❌ Frontend: Registration failed', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        fullError: error
      })
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Registration failed' 
      }
    }
  }
  
  const login = async (email, password) => {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    try {
      const response = await axios.post(`${apiUrl}/api/auth/login`, {
        email,
        password
      })
      
      token.value = response.data.token
      user.value = response.data.user
      localStorage.setItem('token', token.value)
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Login failed' }
    }
  }
  
  const loginWithGoogle = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const redirectUri = `${window.location.origin}/auth/google/callback`
    const scope = 'openid email profile https://www.googleapis.com/auth/drive.file'
    
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`
  }
  
  const logout = () => {
    console.log('🚪 Logging out...')
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    console.log('✅ Logged out successfully')
  }
  
  const fetchUser = async () => {
    if (!token.value) {
      console.log('⚠️ No token found, cannot fetch user')
      return false
    }
    
    const apiUrl = import.meta.env.VITE_API_URL || ''
    try {
      console.log('🔄 Fetching user data...')
      axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      const response = await axios.get(`${apiUrl}/api/auth/me`)
      user.value = response.data.user
      console.log('✅ User data fetched:', user.value)
      return true
    } catch (error) {
      console.error('❌ Failed to fetch user:', error)
      // Token is invalid, clear it
      if (error.response?.status === 401) {
        logout()
      }
      return false
    }
  }
  
  // Initialize auth if token exists (only on store creation, not on every access)
  if (token.value && !user.value) {
    fetchUser()
  }
  
  return {
    user,
    token,
    isAuthenticated,
    register,
    login,
    loginWithGoogle,
    logout,
    fetchUser
  }
})

