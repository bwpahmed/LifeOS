package com.example.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.example.model.HabitFrequency
import com.example.model.HabitItem

@Entity(tableName = "habits")
data class HabitEntity(
    @PrimaryKey
    val id: String,
    val title: String,
    val workspaceId: String,
    val frequency: HabitFrequency = HabitFrequency.DAILY,
    val streakCount: Int = 0,
    val bestStreak: Int = 0,
    val completedDates: List<String> = emptyList(),
    val colorHex: String = "#06B6D4",
    val isSynced: Boolean = false,
    val lastModifiedMillis: Long = System.currentTimeMillis()
) {
    fun toDomainModel(): HabitItem {
        return HabitItem(
            id = id,
            title = title,
            workspaceId = workspaceId,
            frequency = frequency,
            streakCount = streakCount,
            bestStreak = bestStreak,
            completedDates = completedDates,
            colorHex = colorHex
        )
    }

    companion object {
        fun fromDomainModel(item: HabitItem, isSynced: Boolean = false): HabitEntity {
            return HabitEntity(
                id = item.id,
                title = item.title,
                workspaceId = item.workspaceId,
                frequency = item.frequency,
                streakCount = item.streakCount,
                bestStreak = item.bestStreak,
                completedDates = item.completedDates,
                colorHex = item.colorHex,
                isSynced = isSynced,
                lastModifiedMillis = System.currentTimeMillis()
            )
        }
    }
}
