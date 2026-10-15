package com.example.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.example.model.SubTask
import com.example.model.TaskItem
import com.example.model.TaskPriority
import com.example.model.TaskStatus

@Entity(tableName = "tasks")
data class TaskEntity(
    @PrimaryKey
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
    val createdAtMillis: Long = System.currentTimeMillis(),
    val isSynced: Boolean = false,
    val lastModifiedMillis: Long = System.currentTimeMillis()
) {
    fun toDomainModel(): TaskItem {
        return TaskItem(
            id = id,
            title = title,
            notes = notes,
            workspaceId = workspaceId,
            priority = priority,
            status = status,
            dueDateMillis = dueDateMillis,
            subTasks = subTasks,
            tags = tags,
            isTopPriorityToday = isTopPriorityToday,
            createdAtMillis = createdAtMillis
        )
    }

    companion object {
        fun fromDomainModel(item: TaskItem, isSynced: Boolean = false): TaskEntity {
            return TaskEntity(
                id = item.id,
                title = item.title,
                notes = item.notes,
                workspaceId = item.workspaceId,
                priority = item.priority,
                status = item.status,
                dueDateMillis = item.dueDateMillis,
                subTasks = item.subTasks,
                tags = item.tags,
                isTopPriorityToday = item.isTopPriorityToday,
                createdAtMillis = item.createdAtMillis,
                isSynced = isSynced,
                lastModifiedMillis = System.currentTimeMillis()
            )
        }
    }
}
