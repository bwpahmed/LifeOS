package com.lifeos.mobile.repository

import com.lifeos.mobile.domain.CalendarItem
import com.lifeos.mobile.domain.GoalItem
import com.lifeos.mobile.domain.HabitItem
import com.lifeos.mobile.domain.StickyNoteItem
import com.lifeos.mobile.domain.TaskItem
import com.lifeos.mobile.domain.Workspace
import com.lifeos.mobile.supabase.MobileSyncStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

open class LifeOsUnifiedRepository {
    protected val _workspaces = MutableStateFlow<List<Workspace>>(emptyList())
    val workspaces: StateFlow<List<Workspace>> = _workspaces.asStateFlow()

    protected val _tasks = MutableStateFlow<List<TaskItem>>(emptyList())
    val tasks: StateFlow<List<TaskItem>> = _tasks.asStateFlow()

    protected val _habits = MutableStateFlow<List<HabitItem>>(emptyList())
    val habits: StateFlow<List<HabitItem>> = _habits.asStateFlow()

    protected val _stickyNotes = MutableStateFlow<List<StickyNoteItem>>(emptyList())
    val stickyNotes: StateFlow<List<StickyNoteItem>> = _stickyNotes.asStateFlow()

    protected val _calendarItems = MutableStateFlow<List<CalendarItem>>(emptyList())
    val calendarItems: StateFlow<List<CalendarItem>> = _calendarItems.asStateFlow()

    protected val _goals = MutableStateFlow<List<GoalItem>>(emptyList())
    val goals: StateFlow<List<GoalItem>> = _goals.asStateFlow()

    protected val _syncStatus = MutableStateFlow(MobileSyncStatus.OFFLINE_LOCAL)
    val syncStatus: StateFlow<MobileSyncStatus> = _syncStatus.asStateFlow()

    protected val _currentUserEmail = MutableStateFlow<String?>(null)
    val currentUserEmail: StateFlow<String?> = _currentUserEmail.asStateFlow()

    protected val _pendingOperationsCount = MutableStateFlow(0)
    val pendingOperationsCount: StateFlow<Int> = _pendingOperationsCount.asStateFlow()

    fun updateSyncStatus(status: MobileSyncStatus) {
        _syncStatus.value = status
    }

    fun updateUserEmail(email: String?) {
        _currentUserEmail.value = email
    }

    fun updatePendingOperationsCount(count: Int) {
        _pendingOperationsCount.value = count
    }
}
