package com.lifeos.mobile.supabase

import com.lifeos.mobile.domain.HabitItem
import com.lifeos.mobile.domain.TaskItem
import com.lifeos.mobile.domain.Workspace

interface SupabaseDataService {
    suspend fun fetchWorkspaces(session: AuthSession): Result<List<Workspace>>
    suspend fun fetchTasks(session: AuthSession, workspaceId: String? = null): Result<List<TaskItem>>
    suspend fun upsertTask(session: AuthSession, task: TaskItem): Result<TaskItem>
    suspend fun deleteTask(session: AuthSession, taskId: String): Result<Unit>
    suspend fun fetchHabits(session: AuthSession, workspaceId: String? = null): Result<List<HabitItem>>
    suspend fun logHabit(session: AuthSession, habitId: String, date: String, value: Double = 1.0): Result<Unit>
    suspend fun deleteHabitLog(session: AuthSession, habitId: String, date: String): Result<Unit>
}

enum class SyncQueueOp {
    INSERT,
    UPDATE,
    DELETE
}

data class SyncQueueEntry(
    val id: String,
    val tableName: String,
    val op: SyncQueueOp,
    val payloadJson: String,
    val timestamp: Long
)
