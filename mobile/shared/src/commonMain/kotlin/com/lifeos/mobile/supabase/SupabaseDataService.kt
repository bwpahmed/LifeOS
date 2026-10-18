package com.lifeos.mobile.supabase

import com.lifeos.mobile.domain.CalendarItem
import com.lifeos.mobile.domain.GoalItem
import com.lifeos.mobile.domain.HabitItem
import com.lifeos.mobile.domain.StickyNoteItem
import com.lifeos.mobile.domain.TaskItem
import com.lifeos.mobile.domain.Workspace

interface SupabaseDataService {
    suspend fun fetchWorkspaces(session: AuthSession): Result<List<Workspace>>
    
    // Tasks
    suspend fun fetchTasks(session: AuthSession, workspaceId: String? = null): Result<List<TaskItem>>
    suspend fun insertTask(session: AuthSession, task: TaskItem): Result<TaskItem>
    suspend fun updateTask(session: AuthSession, task: TaskItem): Result<TaskItem>
    suspend fun deleteTask(session: AuthSession, taskId: String): Result<Unit>
    
    // Habits
    suspend fun fetchHabits(session: AuthSession, workspaceId: String? = null): Result<List<HabitItem>>
    suspend fun insertHabit(session: AuthSession, habit: HabitItem): Result<HabitItem>
    suspend fun logHabit(session: AuthSession, habitId: String, date: String, value: Double = 1.0): Result<Unit>
    suspend fun deleteHabitLog(session: AuthSession, habitId: String, date: String): Result<Unit>
    suspend fun deleteHabit(session: AuthSession, habitId: String): Result<Unit>

    // Planner / Calendar Items
    suspend fun fetchCalendarItems(session: AuthSession, workspaceId: String? = null): Result<List<CalendarItem>>
    suspend fun insertCalendarItem(session: AuthSession, item: CalendarItem): Result<CalendarItem>
    suspend fun deleteCalendarItem(session: AuthSession, itemId: String): Result<Unit>

    // Vault / Sticky Notes
    suspend fun fetchStickyNotes(session: AuthSession, workspaceId: String? = null): Result<List<StickyNoteItem>>
    suspend fun insertStickyNote(session: AuthSession, note: StickyNoteItem): Result<StickyNoteItem>
    suspend fun updateStickyNote(session: AuthSession, note: StickyNoteItem): Result<StickyNoteItem>
    suspend fun archiveStickyNote(session: AuthSession, noteId: String): Result<Unit>

    // Goals
    suspend fun fetchGoals(session: AuthSession, workspaceId: String? = null): Result<List<GoalItem>>
    suspend fun insertGoal(session: AuthSession, goal: GoalItem): Result<GoalItem>
    suspend fun updateGoal(session: AuthSession, goal: GoalItem): Result<GoalItem>
}
