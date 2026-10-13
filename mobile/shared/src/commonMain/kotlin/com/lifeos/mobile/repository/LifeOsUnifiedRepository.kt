package com.lifeos.mobile.repository

import com.lifeos.mobile.domain.HabitItem
import com.lifeos.mobile.domain.TaskItem
import com.lifeos.mobile.domain.Workspace
import com.lifeos.mobile.supabase.AuthSession
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

    protected val _syncStatus = MutableStateFlow(MobileSyncStatus.OFFLINE_LOCAL)
    val syncStatus: StateFlow<MobileSyncStatus> = _syncStatus.asStateFlow()

    protected val _currentUserEmail = MutableStateFlow<String?>(null)
    val currentUserEmail: StateFlow<String?> = _currentUserEmail.asStateFlow()

    fun updateSyncStatus(status: MobileSyncStatus) {
        _syncStatus.value = status
    }

    fun updateUserEmail(email: String?) {
        _currentUserEmail.value = email
    }
}
