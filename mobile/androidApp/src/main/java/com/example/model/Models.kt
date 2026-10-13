package com.example.model

data class Workspace(
    val id: String,
    val name: String,
    val iconName: String,
    val colorHex: String,
    val description: String
)

enum class TaskPriority(val label: String, val level: Int) {
    LOW("Low", 1),
    MEDIUM("Medium", 2),
    HIGH("High", 3),
    URGENT("Urgent", 4)
}

enum class TaskStatus(val label: String) {
    TODO("To Do"),
    IN_PROGRESS("In Progress"),
    DONE("Completed")
}

data class SubTask(
    val id: String,
    val title: String,
    val isDone: Boolean = false
)

data class TaskItem(
    val id: String,
    val title: String,
    val notes: String = "",
    val workspaceId: String,
    val priority: TaskPriority = TaskPriority.MEDIUM,
    val status: TaskStatus = TaskStatus.TODO,
    val dueDateMillis: Long? = null,
    val subTasks: List<SubTask> = emptyList(),
    val tags: List<String> = emptyList(),
    val isTopPriorityToday: Boolean = false,
    val createdAtMillis: Long = System.currentTimeMillis()
)

enum class HabitFrequency(val label: String) {
    DAILY("Everyday"),
    WEEKDAYS("Weekdays (Mon-Fri)"),
    THREE_TIMES_A_WEEK("3x / Week")
}

data class HabitItem(
    val id: String,
    val title: String,
    val workspaceId: String,
    val frequency: HabitFrequency = HabitFrequency.DAILY,
    val streakCount: Int = 0,
    val bestStreak: Int = 0,
    val completedDates: List<String> = emptyList(), // ISO date "yyyy-MM-dd"
    val colorHex: String = "#06B6D4"
)

data class ScheduleEvent(
    val id: String,
    val title: String,
    val startTime: String, // e.g. "09:00 AM"
    val endTime: String,   // e.g. "10:30 AM"
    val workspaceId: String,
    val category: String = "Focus Block",
    val isDone: Boolean = false
)

data class NoteItem(
    val id: String,
    val title: String,
    val content: String,
    val workspaceId: String,
    val tags: List<String> = emptyList(),
    val isPinned: Boolean = false,
    val updatedAtMillis: Long = System.currentTimeMillis()
)

data class LifePillar(
    val id: String,
    val title: String,
    val subtitle: String,
    val iconName: String,
    val colorHex: String,
    val progressPercent: Float
)

data class GoalMilestone(
    val id: String,
    val title: String,
    val isCompleted: Boolean = false
)

data class GoalItem(
    val id: String,
    val pillarId: String,
    val workspaceId: String,
    val title: String,
    val targetDate: String,
    val milestones: List<GoalMilestone> = emptyList(),
    val progress: Float = 0f
)

data class FocusSession(
    val id: String,
    val durationMinutes: Int,
    val completedAtMillis: Long = System.currentTimeMillis(),
    val tag: String = "Deep Work"
)

data class DailyAiBrief(
    val greeting: String,
    val motivationalQuote: String,
    val topRecommendations: List<String>,
    val habitSummary: String
)
