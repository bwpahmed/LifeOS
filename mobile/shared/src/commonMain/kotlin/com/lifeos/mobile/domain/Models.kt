package com.lifeos.mobile.domain

import kotlinx.serialization.Serializable

@Serializable
enum class SyncState {
    SYNCED,
    PENDING_INSERT,
    PENDING_UPDATE,
    PENDING_DELETE
}

@Serializable
data class Workspace(
    val id: String,
    val name: String,
    val iconName: String = "folder",
    val colorHex: String = "#10B981",
    val description: String = ""
)

@Serializable
enum class TaskPriority(val label: String, val level: Int) {
    LOW("Low", 1),
    MEDIUM("Medium", 2),
    HIGH("High", 3),
    URGENT("Urgent", 4)
}

@Serializable
enum class TaskStatus(val label: String) {
    TODO("To Do"),
    IN_PROGRESS("In Progress"),
    DONE("Completed")
}

@Serializable
data class SubTask(
    val id: String,
    val title: String,
    val isDone: Boolean = false
)

@Serializable
data class TaskItem(
    val id: String,
    val title: String,
    val notes: String = "",
    val workspaceId: String = "personal",
    val area: String = "personal",
    val priority: TaskPriority = TaskPriority.MEDIUM,
    val status: TaskStatus = TaskStatus.TODO,
    val dueDateMillis: Long? = null,
    val subTasks: List<SubTask> = emptyList(),
    val tags: List<String> = emptyList(),
    val isTopPriorityToday: Boolean = false,
    val createdAtMillis: Long = 0L,
    val updatedAtMillis: Long = 0L,
    val syncState: SyncState = SyncState.SYNCED,
    val isDemoData: Boolean = false
)

@Serializable
enum class HabitFrequency(val label: String) {
    DAILY("Everyday"),
    WEEKDAYS("Weekdays (Mon-Fri)"),
    THREE_TIMES_A_WEEK("3x / Week")
}

@Serializable
data class HabitItem(
    val id: String,
    val title: String,
    val workspaceId: String = "personal",
    val area: String = "health",
    val frequency: HabitFrequency = HabitFrequency.DAILY,
    val streakCount: Int = 0,
    val bestStreak: Int = 0,
    val completedDates: List<String> = emptyList(),
    val colorHex: String = "#10B981",
    val syncState: SyncState = SyncState.SYNCED,
    val isDemoData: Boolean = false
)

@Serializable
data class CalendarItem(
    val id: String,
    val workspaceId: String = "personal",
    val title: String,
    val kind: String = "routine",
    val startsAt: String = "",
    val endsAt: String = "",
    val refTable: String? = null,
    val refId: String? = null,
    val syncState: SyncState = SyncState.SYNCED,
    val isDemoData: Boolean = false
)

@Serializable
data class StickyNoteItem(
    val id: String,
    val workspaceId: String = "personal",
    val title: String = "Important note",
    val body: String = "",
    val color: String = "yellow",
    val isPinned: Boolean = true,
    val isArchived: Boolean = false,
    val createdAtMillis: Long = 0L,
    val updatedAtMillis: Long = 0L,
    val syncState: SyncState = SyncState.SYNCED,
    val isDemoData: Boolean = false
)

@Serializable
data class GoalItem(
    val id: String,
    val workspaceId: String = "personal",
    val area: String = "work",
    val title: String,
    val why: String = "",
    val target: Double? = null,
    val unit: String? = null,
    val deadline: String? = null,
    val status: String = "On Track",
    val progress: Int = 0,
    val syncState: SyncState = SyncState.SYNCED,
    val isDemoData: Boolean = false
)

@Serializable
enum class SyncQueueOp {
    INSERT,
    UPDATE,
    DELETE
}

@Serializable
data class SyncOperation(
    val id: String,
    val entityType: String,
    val entityId: String,
    val opType: SyncQueueOp,
    val payloadJson: String,
    val createdAtMillis: Long,
    val retryCount: Int = 0,
    val lastError: String? = null
)
