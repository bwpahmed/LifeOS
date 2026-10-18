package com.example.data.supabase

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.example.model.GoalItem
import com.example.model.HabitFrequency
import com.example.model.HabitItem
import com.example.model.NoteItem
import com.example.model.ScheduleEvent
import com.example.model.TaskItem
import com.example.model.TaskPriority
import com.example.model.TaskStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

data class SupabaseUser(
    val id: String,
    val email: String,
    val displayName: String = "LifeOS User"
)

data class SupabaseSession(
    val accessToken: String,
    val refreshToken: String,
    val user: SupabaseUser,
    val expiresAt: Long
)

enum class SupabaseSyncStatus {
    OFFLINE_LOCAL,
    CONNECTING,
    CONNECTED,
    SYNCING,
    SYNC_ERROR
}

class SupabaseClient(private val context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("lifeos_supabase_auth_secure", Context.MODE_PRIVATE)

    var currentSession: SupabaseSession? = null
        private set

    var currentWorkspaceId: String? = null
        private set

    private var realtimeJob: Job? = null
    private var onRealtimeChangeListener: (() -> Unit)? = null

    init {
        restoreSession()
    }

    private fun restoreSession() {
        val token = prefs.getString("access_token", null)
        val refresh = prefs.getString("refresh_token", null)
        val userId = prefs.getString("user_id", null)
        val email = prefs.getString("user_email", null)
        val expiresAt = prefs.getLong("expires_at", 0L)
        val wsId = prefs.getString("workspace_id", null)
        if (token != null && userId != null && email != null) {
            currentSession = SupabaseSession(
                accessToken = token,
                refreshToken = refresh ?: "",
                user = SupabaseUser(id = userId, email = email),
                expiresAt = expiresAt
            )
            currentWorkspaceId = wsId
        }
    }

    fun saveSession(session: SupabaseSession) {
        currentSession = session
        prefs.edit()
            .putString("access_token", session.accessToken)
            .putString("refresh_token", session.refreshToken)
            .putString("user_id", session.user.id)
            .putString("user_email", session.user.email)
            .putLong("expires_at", session.expiresAt)
            .apply()
    }

    fun saveWorkspaceId(wsId: String) {
        currentWorkspaceId = wsId
        prefs.edit().putString("workspace_id", wsId).apply()
    }

    fun clearSession() {
        stopRealtimeSubscription()
        currentSession = null
        currentWorkspaceId = null
        prefs.edit().clear().apply()
    }

    val isAuthenticated: Boolean
        get() = currentSession != null && currentSession!!.accessToken.isNotEmpty()

    val currentUserEmail: String?
        get() = currentSession?.user?.email

    val currentUserId: String?
        get() = currentSession?.user?.id

    suspend fun testConnection(): Boolean = withContext(Dispatchers.IO) {
        try {
            val url = URL("${SupabaseConfig.AUTH_ENDPOINT}/settings")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
                connectTimeout = 6000
                readTimeout = 6000
            }
            val code = conn.responseCode
            conn.disconnect()
            code in 200..299
        } catch (e: Exception) {
            Log.e("SupabaseClient", "Connection test failed", e)
            false
        }
    }

    suspend fun refreshSession(): Boolean = withContext(Dispatchers.IO) {
        val session = currentSession ?: return@withContext false
        if (session.refreshToken.isEmpty()) return@withContext false
        try {
            val url = URL("${SupabaseConfig.AUTH_ENDPOINT}/token?grant_type=refresh_token")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 7000
                readTimeout = 7000
            }
            val body = JSONObject().apply {
                put("refresh_token", session.refreshToken)
            }
            OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = BufferedReader(InputStreamReader(stream)).use { it.readText() }
            conn.disconnect()
            if (code in 200..299) {
                val json = JSONObject(text)
                val newAccess = json.getString("access_token")
                val newRefresh = json.getString("refresh_token")
                val userObj = json.getJSONObject("user")
                val uid = userObj.getString("id")
                val email = userObj.optString("email", session.user.email)
                val expiresAt = System.currentTimeMillis() + (json.optLong("expires_in", 3600) * 1000)
                val updated = SupabaseSession(
                    accessToken = newAccess,
                    refreshToken = newRefresh,
                    user = SupabaseUser(id = uid, email = email),
                    expiresAt = expiresAt
                )
                saveSession(updated)
                true
            } else {
                false
            }
        } catch (_: Exception) {
            false
        }
    }

    suspend fun signInWithEmail(email: String, password: String): Result<SupabaseSession> = withContext(Dispatchers.IO) {
        val cleanEmail = email.trim()
        if (!cleanEmail.equals(SupabaseConfig.OWNER_EMAIL, ignoreCase = true)) {
            return@withContext Result.failure(
                Exception("LifeOS is restricted to the configured owner account (${SupabaseConfig.OWNER_EMAIL})")
            )
        }
        try {
            val url = URL("${SupabaseConfig.AUTH_ENDPOINT}/token?grant_type=password")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 7000
                readTimeout = 7000
            }
            val body = JSONObject().apply {
                put("email", cleanEmail)
                put("password", password)
            }
            OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = BufferedReader(InputStreamReader(stream)).use { it.readText() }
            conn.disconnect()
            if (code in 200..299) {
                val json = JSONObject(text)
                val access = json.getString("access_token")
                val refresh = json.getString("refresh_token")
                val userObj = json.getJSONObject("user")
                val uid = userObj.getString("id")
                val uEmail = userObj.getString("email")
                val expiresAt = System.currentTimeMillis() + (json.optLong("expires_in", 3600) * 1000)
                val session = SupabaseSession(
                    accessToken = access,
                    refreshToken = refresh,
                    user = SupabaseUser(id = uid, email = uEmail),
                    expiresAt = expiresAt
                )
                saveSession(session)
                resolveWorkspaceId(session)
                Result.success(session)
            } else {
                Result.failure(Exception("Supabase authentication failed ($code): $text"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun resolveWorkspaceId(session: SupabaseSession): String? = withContext(Dispatchers.IO) {
        try {
            val url = URL("${SupabaseConfig.REST_ENDPOINT}/workspace_members?select=workspace_id&user_id=eq.${session.user.id}&limit=1")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
                setRequestProperty("Authorization", "Bearer ${session.accessToken}")
                connectTimeout = 6000
                readTimeout = 6000
            }
            val code = conn.responseCode
            if (code in 200..299) {
                val text = BufferedReader(InputStreamReader(conn.inputStream)).use { it.readText() }
                conn.disconnect()
                val arr = JSONArray(text)
                if (arr.length() > 0) {
                    val ws = arr.getJSONObject(0).getString("workspace_id")
                    saveWorkspaceId(ws)
                    return@withContext ws
                }
            }
            conn.disconnect()
            null
        } catch (_: Exception) {
            null
        }
    }

    suspend fun signUpWithEmail(email: String, password: String): Result<String> = withContext(Dispatchers.IO) {
        val cleanEmail = email.trim()
        if (!cleanEmail.equals(SupabaseConfig.OWNER_EMAIL, ignoreCase = true)) {
            return@withContext Result.failure(
                Exception("Registration is restricted to the configured owner account (${SupabaseConfig.OWNER_EMAIL})")
            )
        }
        try {
            val url = URL("${SupabaseConfig.AUTH_ENDPOINT}/signup")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 7000
                readTimeout = 7000
            }
            val body = JSONObject().apply {
                put("email", cleanEmail)
                put("password", password)
            }
            OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = BufferedReader(InputStreamReader(stream)).use { it.readText() }
            conn.disconnect()
            if (code in 200..299) {
                Result.success("Registration completed. Please confirm email or sign in.")
            } else {
                Result.failure(Exception("Registration failed ($code): $text"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ==========================================
    // TASKS SYNCHRONIZATION (CREATE, UPDATE, DELETE)
    // ==========================================

    suspend fun fetchCloudTasks(workspaceId: String? = null): Result<List<TaskItem>> = withContext(Dispatchers.IO) {
        val session = currentSession ?: return@withContext Result.failure(Exception("Not authenticated"))
        val ws = workspaceId ?: currentWorkspaceId
        val endpoint = if (ws != null) {
            "${SupabaseConfig.REST_ENDPOINT}/tasks?workspace_id=eq.$ws&select=id,name,description,area,status,importance,deadline,notes,completed_at,created_at&order=deadline.asc.nullslast&limit=300"
        } else {
            "${SupabaseConfig.REST_ENDPOINT}/tasks?select=id,name,description,area,status,importance,deadline,notes,completed_at,created_at&order=deadline.asc.nullslast&limit=300"
        }
        try {
            val url = URL(endpoint)
            var conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
                setRequestProperty("Authorization", "Bearer ${session.accessToken}")
                connectTimeout = 7000
                readTimeout = 7000
            }
            var code = conn.responseCode
            if (code == 401 && refreshSession()) {
                conn.disconnect()
                conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
                    setRequestProperty("Authorization", "Bearer ${currentSession?.accessToken}")
                    connectTimeout = 7000
                    readTimeout = 7000
                }
                code = conn.responseCode
            }

            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = BufferedReader(InputStreamReader(stream)).use { it.readText() }
            conn.disconnect()
            if (code in 200..299) {
                val tasks = mutableListOf<TaskItem>()
                val arr = JSONArray(text)
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    val id = obj.getString("id")
                    val title = obj.getString("name")
                    val notes = obj.optString("notes", obj.optString("description", ""))
                    val statusStr = obj.optString("status", "Inbox")
                    val importance = obj.optInt("importance", 2)
                    val area = obj.optString("area", "personal")
                    val prio = when (importance) {
                        4 -> TaskPriority.URGENT
                        3 -> TaskPriority.HIGH
                        1 -> TaskPriority.LOW
                        else -> TaskPriority.MEDIUM
                    }
                    val stat = when (statusStr.lowercase(Locale.ROOT)) {
                        "done", "completed" -> TaskStatus.DONE
                        "in progress", "next" -> TaskStatus.IN_PROGRESS
                        else -> TaskStatus.TODO
                    }
                    tasks.add(
                        TaskItem(
                            id = id,
                            title = title,
                            notes = notes,
                            workspaceId = area.ifEmpty { "personal" },
                            priority = prio,
                            status = stat,
                            isSynced = true,
                            isDeleted = false,
                            isDemoData = false
                        )
                    )
                }
                Result.success(tasks)
            } else {
                Result.failure(Exception("Fetch tasks failed ($code): $text"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createCloudTask(task: TaskItem, workspaceId: String? = null): Result<TaskItem> = withContext(Dispatchers.IO) {
        val session = currentSession ?: return@withContext Result.failure(Exception("Not authenticated"))
        val ws = workspaceId ?: currentWorkspaceId
        try {
            val url = URL("${SupabaseConfig.REST_ENDPOINT}/tasks")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
                setRequestProperty("Authorization", "Bearer ${session.accessToken}")
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Prefer", "return=representation")
                doOutput = true
                connectTimeout = 7000
                readTimeout = 7000
            }
            val body = JSONObject().apply {
                put("id", task.id)
                put("name", task.title)
                put("description", task.notes)
                put("notes", task.notes)
                put("area", task.workspaceId.ifEmpty { "personal" })
                put("status", if (task.status == TaskStatus.DONE) "Completed" else "Inbox")
                put("importance", task.priority.level)
                put("created_by", session.user.id)
                if (ws != null) put("workspace_id", ws)
            }
            OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = BufferedReader(InputStreamReader(stream)).use { it.readText() }
            conn.disconnect()
            if (code in 200..299) {
                Result.success(task.copy(isSynced = true))
            } else {
                Result.failure(Exception("Create task upstream failed ($code): $text"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateCloudTask(task: TaskItem): Result<Unit> = withContext(Dispatchers.IO) {
        val session = currentSession ?: return@withContext Result.failure(Exception("Not authenticated"))
        try {
            val url = URL("${SupabaseConfig.REST_ENDPOINT}/tasks?id=eq.${task.id}")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "PATCH"
                setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
                setRequestProperty("Authorization", "Bearer ${session.accessToken}")
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 7000
                readTimeout = 7000
            }
            val isDone = task.status == TaskStatus.DONE
            val nowIso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }.format(Date())

            val body = JSONObject().apply {
                put("name", task.title)
                put("notes", task.notes)
                put("description", task.notes)
                put("status", if (isDone) "Completed" else "Inbox")
                put("importance", task.priority.level)
                put("updated_at", nowIso)
                if (isDone) put("completed_at", nowIso) else put("completed_at", JSONObject.NULL)
            }
            OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = BufferedReader(InputStreamReader(stream)).use { it.readText() }
            conn.disconnect()
            if (code in 200..299) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Update task upstream failed ($code): $text"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteCloudTask(taskId: String): Result<Unit> = withContext(Dispatchers.IO) {
        val session = currentSession ?: return@withContext Result.failure(Exception("Not authenticated"))
        try {
            val url = URL("${SupabaseConfig.REST_ENDPOINT}/tasks?id=eq.$taskId")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "DELETE"
                setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
                setRequestProperty("Authorization", "Bearer ${session.accessToken}")
                connectTimeout = 7000
                readTimeout = 7000
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = BufferedReader(InputStreamReader(stream)).use { it.readText() }
            conn.disconnect()
            if (code in 200..299) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Delete task upstream failed ($code): $text"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ==========================================
    // HABITS & HABIT LOGS
    // ==========================================

    suspend fun fetchCloudHabits(workspaceId: String? = null): Result<List<HabitItem>> = withContext(Dispatchers.IO) {
        val session = currentSession ?: return@withContext Result.failure(Exception("Not authenticated"))
        val ws = workspaceId ?: currentWorkspaceId
        try {
            val endpoint = if (ws != null) {
                "${SupabaseConfig.REST_ENDPOINT}/habits?workspace_id=eq.$ws&select=id,workspace_id,name,area,frequency,target,unit,kind"
            } else {
                "${SupabaseConfig.REST_ENDPOINT}/habits?select=id,workspace_id,name,area,frequency,target,unit,kind"
            }
            val habitsUrl = URL(endpoint)
            val habitsConn = (habitsUrl.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
                setRequestProperty("Authorization", "Bearer ${session.accessToken}")
                connectTimeout = 7000
                readTimeout = 7000
            }
            val hCode = habitsConn.responseCode
            val hStream = if (hCode in 200..299) habitsConn.inputStream else habitsConn.errorStream
            val hText = BufferedReader(InputStreamReader(hStream)).use { it.readText() }
            habitsConn.disconnect()
            if (hCode !in 200..299) {
                return@withContext Result.failure(Exception("Fetch habits failed: HTTP $hCode - $hText"))
            }

            val logsUrl = URL("${SupabaseConfig.REST_ENDPOINT}/habit_logs?select=habit_id,date,value&order=date.desc&limit=300")
            val logsConn = (logsUrl.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
                setRequestProperty("Authorization", "Bearer ${session.accessToken}")
                connectTimeout = 7000
                readTimeout = 7000
            }
            val lCode = logsConn.responseCode
            val lStream = if (lCode in 200..299) logsConn.inputStream else logsConn.errorStream
            val lText = BufferedReader(InputStreamReader(lStream)).use { it.readText() }
            logsConn.disconnect()
            val logsByHabit = mutableMapOf<String, MutableList<String>>()
            if (lCode in 200..299) {
                val lArr = JSONArray(lText)
                for (j in 0 until lArr.length()) {
                    val lObj = lArr.getJSONObject(j)
                    val hId = lObj.getString("habit_id")
                    val date = lObj.getString("date")
                    logsByHabit.getOrPut(hId) { mutableListOf() }.add(date)
                }
            }

            val habits = mutableListOf<HabitItem>()
            val hArr = JSONArray(hText)
            for (i in 0 until hArr.length()) {
                val obj = hArr.getJSONObject(i)
                val id = obj.getString("id")
                val name = obj.getString("name")
                val area = obj.optString("area", "health")
                val freqStr = obj.optString("frequency", "Daily")
                val completed = logsByHabit[id]?.distinct() ?: emptyList()
                val freq = when (freqStr.lowercase(Locale.ROOT)) {
                    "weekdays" -> HabitFrequency.WEEKDAYS
                    "3x / week", "3x" -> HabitFrequency.THREE_TIMES_A_WEEK
                    else -> HabitFrequency.DAILY
                }
                habits.add(
                    HabitItem(
                        id = id,
                        title = name,
                        workspaceId = area.ifEmpty { "health" },
                        frequency = freq,
                        streakCount = completed.size,
                        bestStreak = maxOf(completed.size, 5),
                        completedDates = completed,
                        isSynced = true,
                        isDemoData = false
                    )
                )
            }
            Result.success(habits)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logHabitCompletionToCloud(habitId: String, dateString: String, completed: Boolean): Result<Unit> = withContext(Dispatchers.IO) {
        val session = currentSession ?: return@withContext Result.failure(Exception("Not authenticated"))
        try {
            if (completed) {
                val url = URL("${SupabaseConfig.REST_ENDPOINT}/habit_logs")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
                    setRequestProperty("Authorization", "Bearer ${session.accessToken}")
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("Prefer", "resolution=merge-duplicates")
                    doOutput = true
                    connectTimeout = 7000
                    readTimeout = 7000
                }
                val body = JSONObject().apply {
                    put("habit_id", habitId)
                    put("date", dateString)
                    put("value", 1)
                }
                OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }
                val code = conn.responseCode
                conn.disconnect()
                if (code in 200..299) Result.success(Unit) else Result.failure(Exception("Habit log error ($code)"))
            } else {
                val url = URL("${SupabaseConfig.REST_ENDPOINT}/habit_logs?habit_id=eq.$habitId&date=eq.$dateString")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "DELETE"
                    setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
                    setRequestProperty("Authorization", "Bearer ${session.accessToken}")
                    connectTimeout = 7000
                    readTimeout = 7000
                }
                val code = conn.responseCode
                conn.disconnect()
                if (code in 200..299) Result.success(Unit) else Result.failure(Exception("Habit unlog error ($code)"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ==========================================
    // STICKY NOTES / VAULT
    // ==========================================

    suspend fun fetchCloudStickyNotes(workspaceId: String? = null): Result<List<NoteItem>> = withContext(Dispatchers.IO) {
        val session = currentSession ?: return@withContext Result.failure(Exception("Not authenticated"))
        val ws = workspaceId ?: currentWorkspaceId
        try {
            val endpoint = if (ws != null) {
                "${SupabaseConfig.REST_ENDPOINT}/sticky_notes?workspace_id=eq.$ws&archived=eq.false&order=pinned.desc,updated_at.desc&limit=50"
            } else {
                "${SupabaseConfig.REST_ENDPOINT}/sticky_notes?archived=eq.false&order=pinned.desc,updated_at.desc&limit=50"
            }
            val url = URL(endpoint)
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
                setRequestProperty("Authorization", "Bearer ${session.accessToken}")
                connectTimeout = 7000
                readTimeout = 7000
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = BufferedReader(InputStreamReader(stream)).use { it.readText() }
            conn.disconnect()
            if (code in 200..299) {
                val arr = JSONArray(text)
                val list = mutableListOf<NoteItem>()
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    list.add(
                        NoteItem(
                            id = obj.getString("id"),
                            title = obj.getString("title"),
                            content = obj.optString("body", ""),
                            workspaceId = obj.optString("workspace_id", "personal"),
                            isPinned = obj.optBoolean("pinned", false),
                            color = obj.optString("color", "yellow"),
                            isArchived = obj.optBoolean("archived", false),
                            isSynced = true,
                            isDemoData = false
                        )
                    )
                }
                Result.success(list)
            } else {
                Result.failure(Exception("Fetch sticky notes failed ($code)"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createCloudStickyNote(title: String, body: String, color: String = "yellow", workspaceId: String? = null): Result<NoteItem> = withContext(Dispatchers.IO) {
        val session = currentSession ?: return@withContext Result.failure(Exception("Not authenticated"))
        val ws = workspaceId ?: currentWorkspaceId
        try {
            val url = URL("${SupabaseConfig.REST_ENDPOINT}/sticky_notes")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
                setRequestProperty("Authorization", "Bearer ${session.accessToken}")
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Prefer", "return=representation")
                doOutput = true
                connectTimeout = 7000
                readTimeout = 7000
            }
            val newId = UUID.randomUUID().toString()
            val payload = JSONObject().apply {
                put("id", newId)
                put("title", title.ifEmpty { "Important note" })
                put("body", body)
                put("color", color)
                put("pinned", true)
                put("archived", false)
                put("created_by", session.user.id)
                if (ws != null) put("workspace_id", ws)
            }
            OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }
            val code = conn.responseCode
            conn.disconnect()
            if (code in 200..299) {
                Result.success(
                    NoteItem(
                        id = newId,
                        title = title,
                        content = body,
                        workspaceId = ws ?: "personal",
                        isPinned = true,
                        color = color,
                        isArchived = false,
                        isSynced = true
                    )
                )
            } else {
                Result.failure(Exception("Create sticky note failed ($code)"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ==========================================
    // SUPABASE REALTIME SUBSCRIPTION
    // ==========================================

    private var webSocket: WebSocket? = null
    private val okHttpClient = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    fun startRealtimeSubscription(onChanged: () -> Unit) {
        onRealtimeChangeListener = onChanged
        stopRealtimeSubscription()
        realtimeJob = CoroutineScope(Dispatchers.IO).launch {
            launch {
                connectRealtimeWebSocket()
            }
            while (isActive) {
                try {
                    delay(30000)
                    if (isAuthenticated) {
                        withContext(Dispatchers.Main) {
                            onRealtimeChangeListener?.invoke()
                        }
                    }
                } catch (_: Exception) {
                    delay(10000)
                }
            }
        }
    }

    private suspend fun connectRealtimeWebSocket() {
        val wsUrl = "wss://fdtbftuxziicubztgcde.supabase.co/realtime/v1/websocket?apikey=${SupabaseConfig.PUBLISHABLE_KEY}&vsn=1.0.0"
        val request = Request.Builder().url(wsUrl).build()

        val listener = object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d("SupabaseRealtime", "WebSocket connected, subscribing to tables")
                val joinMsg = JSONObject().apply {
                    put("topic", "realtime:public")
                    put("event", "phx_join")
                    put("ref", "1")
                    val payload = JSONObject().apply {
                        val config = JSONObject().apply {
                            put("broadcast", JSONObject().apply { put("ack", false); put("self", false) })
                            put("presence", JSONObject().apply { put("key", "") })
                            val changes = JSONArray().apply {
                                for (table in listOf("tasks", "habits", "habit_logs", "sticky_notes", "calendar_items", "goals")) {
                                    put(JSONObject().apply {
                                        put("event", "*")
                                        put("schema", "public")
                                        put("table", table)
                                    })
                                }
                            }
                            put("postgres_changes", changes)
                        }
                        put("config", config)
                    }
                    put("payload", payload)
                }
                webSocket.send(joinMsg.toString())
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                if (text.contains("postgres_changes")) {
                    Log.d("SupabaseRealtime", "Observed realtime update from postgres: $text")
                    CoroutineScope(Dispatchers.Main).launch {
                        onRealtimeChangeListener?.invoke()
                    }
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.w("SupabaseRealtime", "WebSocket failure: ${t.message}")
            }
        }

        try {
            webSocket = okHttpClient.newWebSocket(request, listener)
            while (currentCoroutineContext().isActive) {
                delay(25000)
                val hb = JSONObject().apply {
                    put("topic", "phoenix")
                    put("event", "heartbeat")
                    put("payload", JSONObject())
                    put("ref", "hb_${System.currentTimeMillis()}")
                }
                webSocket?.send(hb.toString())
            }
        } catch (e: Exception) {
            Log.e("SupabaseRealtime", "Error in realtime connection", e)
        }
    }

    fun stopRealtimeSubscription() {
        realtimeJob?.cancel()
        realtimeJob = null
        try {
            webSocket?.close(1000, "Normal closure")
        } catch (_: Exception) {}
        webSocket = null
    }
}
