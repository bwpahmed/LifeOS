package com.lifeos.mobile.supabase

data class AuthUser(
    val id: String,
    val email: String,
    val displayName: String = "LifeOS User"
)

data class AuthSession(
    val accessToken: String,
    val refreshToken: String,
    val user: AuthUser,
    val expiresAt: Long
)

enum class MobileSyncStatus {
    OFFLINE_LOCAL,
    CONNECTING,
    CONNECTED,
    SYNCING,
    SYNC_ERROR
}

interface SupabaseAuthService {
    val currentSession: AuthSession?
    val isAuthenticated: Boolean
    val userEmail: String?
    val userId: String?

    suspend fun signIn(email: String, password: String): Result<AuthSession>
    suspend fun signUp(email: String, password: String): Result<String>
    fun signOut()
}
