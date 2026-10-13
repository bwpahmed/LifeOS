package com.example.data.supabase

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.example.model.HabitFrequency
import com.example.model.HabitItem
import com.example.model.SubTask
import com.example.model.TaskItem
import com.example.model.TaskPriority
import com.example.model.TaskStatus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

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
        context.getSharedPreferences("lifeos_supabase_auth", Context.MODE_PRIVATE)

    var currentSession: SupabaseSession? = null
        private set

    init {
        restoreSession()
    }

    private fun restoreSession() {
        val token = prefs.getString("access_token", null)
        val refresh = prefs.getString("refresh_token", null)
        val userId = prefs.getString("user_id", null)
        val email = prefs.getString("user_email", null)
        val expiresAt = prefs.getLong("expires_at", 0L)

        if (token != null && userId != null && email != null) {
            currentSession = SupabaseSession(
                accessToken = token,
                refreshToken = refresh ?: "",
                user = SupabaseUser(id = userId, email = email),
                expiresAt = expiresAt
            )
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

    fun clearSession() {
        currentSession = null
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

    suspend fun signInWithEmail(email: String, password: String):Result<SupabaseSession> = withContext(Dispatchers.IO) {
        try {
            val url = URL("${SupabaseConfig.AUTH_ENDPOINT}/token?grant_type=password")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 8000
                readTimeout = 8000
            }

            val body = JSONObject().apply {
                put("email", email.trim())
                put("password", password)
            }

            OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }

            val code = conn.responseCode
            val responseStream = if (code in 200..299) conn.inputStream else conn.errorStream
            val responseText = BufferedReader(InputStreamReader(responseStream)).use { it.readText() }
            conn.disconnect()

            if (code in 200..299) {
                val json = JSONObject(responseText)
                val token = json.getString("access_token")
                val refreshToken = json.optString("refresh_token", "")
                val expiresIn = json.optLong("expires_in", 3600L)
                val userObj = json.getJSONObject("user")
                val userId = userObj.getString("id")
                val userEmail = userObj.optString("email", email)

                val session = SupabaseSession(
                    accessToken = token,
                    refreshToken = refreshToken,
                    user = SupabaseUser(userId, userEmail),
                    expiresAt = System.currentTimeMillis() + (expiresIn * 1000)
                )
                saveSession(session)
                Result.success(session)
            } else {
                val errorMsg = try {
                    JSONObject(responseText).optString("error_description", "Authentication failed ($code)")
                } catch (_: Exception) {
                    "Authentication failed: HTTP $code"
                }
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e("SupabaseClient", "Sign in exception", e)
            Result.failure(e)
        }
    }

    suspend fun signUpWithEmail(email: String, password: String): Result<String> = withContext(Dispatchers.IO) {
        try {
            val url = URL("${SupabaseConfig.AUTH_ENDPOINT}/signup")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 8000
                readTimeout = 8000
            }

            val body = JSONObject().apply {
                put("email", email.trim())
                put("password", password)
            }

            OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }

            val code = conn.responseCode
            val responseStream = if (code in 200..299) conn.inputStream else conn.errorStream
            val responseText = BufferedReader(InputStreamReader(responseStream)).use { it.readText() }
            conn.disconnect()

            if (code in 200..299) {
                Result.success("Sign up successful. Check confirmation email if required.")
            } else {
                val errorMsg = try {
                    val obj = JSONObject(responseText)
                    obj.optString("msg", obj.optString("message", "Sign up failed ($code)"))
                } catch (_: Exception) {
                    "Sign up error ($code)"
                }
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun fetchCloudWorkspaces(): Result<List<JSONObject>> = withContext(Dispatchers.IO) {
        val session = currentSession ?: return@withContext Result.failure(Exception("Not logged in to Supabase"))
        try {
            val url = URL("${SupabaseConfig.REST_ENDPOINT}/workspaces?select=id,name,type")
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
                val list = mutableListOf<JSONObject>()
                val arr = JSONArray(text)
                for (i in 0 until arr.length()) {
                    list.add(arr.getJSONObject(i))
                }
                Result.success(list)
            } else {
                Result.failure(Exception("Failed to fetch workspaces: HTTP $code - $text"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun fetchCloudTasks(): Result<List<TaskItem>> = withContext(Dispatchers.IO) {
        val session = currentSession ?: return@withContext Result.failure(Exception("Not authenticated with Supabase"))
        try {
            val url = URL("${SupabaseConfig.REST_ENDPOINT}/tasks?select=id,workspace_id,name,description,area,status,importance,tags,notes,completed_at,created_at&order=created_at.desc")
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
                            status = stat
                        )
                    )
                }
                Result.success(tasks)
            } else {
                Result.failure(Exception("Fetch tasks failed: HTTP $code - $text"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun fetchCloudHabits(): Result<List<HabitItem>> = withContext(Dispatchers.IO) {
        val session = currentSession ?: return@withContext Result.failure(Exception("Not authenticated with Supabase"))
        try {
            val habitsUrl = URL("${SupabaseConfig.REST_ENDPOINT}/habits?select=id,workspace_id,name,area,frequency,target,unit,kind")
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

            // Fetch habit logs to populate completed dates
            val logsUrl = URL("${SupabaseConfig.REST_ENDPOINT}/habit_logs?select=habit_id,date,value&order=date.desc&limit=200")
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
                        completedDates = completed
                    )
                )
            }

            Result.success(habits)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logHabitCompletionToCloud(habitId: String, dateString: String, completed: Boolean): Result<Unit> = withContext(Dispatchers.IO) {
        val session = currentSession ?: return@withContext Result.failure(Exception("Not logged in"))
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
}
