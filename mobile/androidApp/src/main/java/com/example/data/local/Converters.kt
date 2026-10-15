package com.example.data.local

import androidx.room.TypeConverter
import com.example.model.HabitFrequency
import com.example.model.SubTask
import com.example.model.TaskPriority
import com.example.model.TaskStatus
import org.json.JSONArray
import org.json.JSONObject

class Converters {

    @TypeConverter
    fun fromSubTaskList(subTasks: List<SubTask>?): String {
        if (subTasks == null || subTasks.isEmpty()) return "[]"
        val array = JSONArray()
        for (sub in subTasks) {
            val obj = JSONObject()
            obj.put("id", sub.id)
            obj.put("title", sub.title)
            obj.put("isDone", sub.isDone)
            array.put(obj)
        }
        return array.toString()
    }

    @TypeConverter
    fun toSubTaskList(jsonStr: String?): List<SubTask> {
        if (jsonStr.isNullOrBlank()) return emptyList()
        val list = mutableListOf<SubTask>()
        try {
            val array = JSONArray(jsonStr)
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                list.add(
                    SubTask(
                        id = obj.getString("id"),
                        title = obj.getString("title"),
                        isDone = obj.optBoolean("isDone", false)
                    )
                )
            }
        } catch (_: Exception) {}
        return list
    }

    @TypeConverter
    fun fromStringList(strings: List<String>?): String {
        if (strings == null || strings.isEmpty()) return "[]"
        val array = JSONArray()
        for (s in strings) {
            array.put(s)
        }
        return array.toString()
    }

    @TypeConverter
    fun toStringList(jsonStr: String?): List<String> {
        if (jsonStr.isNullOrBlank()) return emptyList()
        val list = mutableListOf<String>()
        try {
            val array = JSONArray(jsonStr)
            for (i in 0 until array.length()) {
                list.add(array.getString(i))
            }
        } catch (_: Exception) {}
        return list
    }

    @TypeConverter
    fun fromTaskPriority(priority: TaskPriority?): String = priority?.name ?: TaskPriority.MEDIUM.name

    @TypeConverter
    fun toTaskPriority(value: String?): TaskPriority {
        return try {
            if (value != null) TaskPriority.valueOf(value) else TaskPriority.MEDIUM
        } catch (_: Exception) {
            TaskPriority.MEDIUM
        }
    }

    @TypeConverter
    fun fromTaskStatus(status: TaskStatus?): String = status?.name ?: TaskStatus.TODO.name

    @TypeConverter
    fun toTaskStatus(value: String?): TaskStatus {
        return try {
            if (value != null) TaskStatus.valueOf(value) else TaskStatus.TODO
        } catch (_: Exception) {
            TaskStatus.TODO
        }
    }

    @TypeConverter
    fun fromHabitFrequency(freq: HabitFrequency?): String = freq?.name ?: HabitFrequency.DAILY.name

    @TypeConverter
    fun toHabitFrequency(value: String?): HabitFrequency {
        return try {
            if (value != null) HabitFrequency.valueOf(value) else HabitFrequency.DAILY
        } catch (_: Exception) {
            HabitFrequency.DAILY
        }
    }
}
