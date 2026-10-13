package com.lifeos.mobile.supabase

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

sealed class RealtimeTableEvent {
    data class TasksChanged(val schema: String = "public") : RealtimeTableEvent()
    data class HabitsChanged(val schema: String = "public") : RealtimeTableEvent()
    data class HabitLogsChanged(val schema: String = "public") : RealtimeTableEvent()
    data class WorkspacesChanged(val schema: String = "public") : RealtimeTableEvent()
}

class RealtimeSyncEngine {
    private val _events = MutableSharedFlow<RealtimeTableEvent>(extraBufferCapacity = 64)
    val events: SharedFlow<RealtimeTableEvent> = _events.asSharedFlow()

    fun notifyTableChanged(event: RealtimeTableEvent) {
        _events.tryEmit(event)
    }
}
