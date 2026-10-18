package com.lifeos.mobile.supabase

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

sealed class RealtimeTableEvent {
    data class TasksChanged(val action: String = "UPDATE", val recordId: String? = null) : RealtimeTableEvent()
    data class HabitsChanged(val action: String = "UPDATE", val recordId: String? = null) : RealtimeTableEvent()
    data class HabitLogsChanged(val action: String = "UPDATE", val recordId: String? = null) : RealtimeTableEvent()
    data class StickyNotesChanged(val action: String = "UPDATE", val recordId: String? = null) : RealtimeTableEvent()
    data class CalendarChanged(val action: String = "UPDATE", val recordId: String? = null) : RealtimeTableEvent()
    data class GoalsChanged(val action: String = "UPDATE", val recordId: String? = null) : RealtimeTableEvent()
    data class WorkspacesChanged(val action: String = "UPDATE", val recordId: String? = null) : RealtimeTableEvent()
}

class RealtimeSyncEngine {
    private val _events = MutableSharedFlow<RealtimeTableEvent>(extraBufferCapacity = 64)
    val events: SharedFlow<RealtimeTableEvent> = _events.asSharedFlow()

    fun notifyTableChanged(event: RealtimeTableEvent) {
        _events.tryEmit(event)
    }

    fun parsePhoenixMessage(text: String): RealtimeTableEvent? {
        if (!text.contains("postgres_changes")) return null
        return when {
            text.contains("\"table\":\"tasks\"") -> {
                val action = if (text.contains("\"type\":\"DELETE\"")) "DELETE" else if (text.contains("\"type\":\"INSERT\"")) "INSERT" else "UPDATE"
                RealtimeTableEvent.TasksChanged(action = action)
            }
            text.contains("\"table\":\"habits\"") -> RealtimeTableEvent.HabitsChanged()
            text.contains("\"table\":\"habit_logs\"") -> RealtimeTableEvent.HabitLogsChanged()
            text.contains("\"table\":\"sticky_notes\"") -> RealtimeTableEvent.StickyNotesChanged()
            text.contains("\"table\":\"calendar_items\"") -> RealtimeTableEvent.CalendarChanged()
            text.contains("\"table\":\"goals\"") -> RealtimeTableEvent.GoalsChanged()
            text.contains("\"table\":\"workspaces\"") -> RealtimeTableEvent.WorkspacesChanged()
            else -> null
        }
    }
}
