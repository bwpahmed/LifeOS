package com.example.data

import android.content.Context
import android.content.SharedPreferences
import com.example.data.local.*
import com.example.data.supabase.*
import com.example.model.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

data class DayInfo(
    val dayName: String,     // "Mon", "Tue", etc.
    val dayNumber: String,   // "12", "13", etc.
    val dateString: String,  // "yyyy-MM-dd"
    val isToday: Boolean
)

class LifeOsRepository(private val context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("lifeos_storage", Context.MODE_PRIVATE)

    // State flows
    private val _workspaces = MutableStateFlow<List<Workspace>>(emptyList())
    val workspaces: StateFlow<List<Workspace>> = _workspaces.asStateFlow()

    private val _activeWorkspaceId = MutableStateFlow<String>("ALL")
    val activeWorkspaceId: StateFlow<String> = _activeWorkspaceId.asStateFlow()

    private val _tasks = MutableStateFlow<List<TaskItem>>(emptyList())
    val tasks: StateFlow<List<TaskItem>> = _tasks.asStateFlow()

    private val _habits = MutableStateFlow<List<HabitItem>>(emptyList())
    val habits: StateFlow<List<HabitItem>> = _habits.asStateFlow()

    private val _scheduleEvents = MutableStateFlow<List<ScheduleEvent>>(emptyList())
    val scheduleEvents: StateFlow<List<ScheduleEvent>> = _scheduleEvents.asStateFlow()

    private val _notes = MutableStateFlow<List<NoteItem>>(emptyList())
    val notes: StateFlow<List<NoteItem>> = _notes.asStateFlow()

    private val _pillars = MutableStateFlow<List<LifePillar>>(emptyList())
    val pillars: StateFlow<List<LifePillar>> = _pillars.asStateFlow()

    private val _goals = MutableStateFlow<List<GoalItem>>(emptyList())
    val goals: StateFlow<List<GoalItem>> = _goals.asStateFlow()

    private val _focusSessions = MutableStateFlow<List<FocusSession>>(emptyList())
    val focusSessions: StateFlow<List<FocusSession>> = _focusSessions.asStateFlow()

    private val _privacyGateEnabled = MutableStateFlow<Boolean>(false)
    val privacyGateEnabled: StateFlow<Boolean> = _privacyGateEnabled.asStateFlow()

    private val _isLocked = MutableStateFlow<Boolean>(false)
    val isLocked: StateFlow<Boolean> = _isLocked.asStateFlow()

    private val _pin = MutableStateFlow<String>("1234")

    private val _searchQuery = MutableStateFlow<String>("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    // Supabase Cloud Integration
    val supabaseClient: SupabaseClient = SupabaseClient(context)

    // Room Database Integration for Offline Availability and Consistency
    val database: LifeOsDatabase = LifeOsDatabase.getInstance(context)
    val taskDao: TaskDao = database.taskDao()
    val habitDao: HabitDao = database.habitDao()

    val roomTasksFlow: Flow<List<TaskItem>> = taskDao.getAllTasks().map { list -> list.map { it.toDomainModel() } }
    val roomHabitsFlow: Flow<List<HabitItem>> = habitDao.getAllHabits().map { list -> list.map { it.toDomainModel() } }

    private val _syncStatus = MutableStateFlow<SupabaseSyncStatus>(
        if (supabaseClient.isAuthenticated) SupabaseSyncStatus.CONNECTED else SupabaseSyncStatus.OFFLINE_LOCAL
    )
    val syncStatus: StateFlow<SupabaseSyncStatus> = _syncStatus.asStateFlow()

    private val _syncAccountEmail = MutableStateFlow<String?>(supabaseClient.currentUserEmail)
    val syncAccountEmail: StateFlow<String?> = _syncAccountEmail.asStateFlow()

    private val _lastSyncTimeMessage = MutableStateFlow<String>("Never synced")
    val lastSyncTimeMessage: StateFlow<String> = _lastSyncTimeMessage.asStateFlow()

    private val repoScope = CoroutineScope(Dispatchers.IO)

    init {
        // Observe Room reactive Flow for real-time local persistence updates
        repoScope.launch {
            taskDao.getAllTasks().collect { entities ->
                if (entities.isNotEmpty()) {
                    _tasks.value = entities.map { it.toDomainModel() }
                }
            }
        }
        repoScope.launch {
            habitDao.getAllHabits().collect { entities ->
                if (entities.isNotEmpty()) {
                    _habits.value = entities.map { it.toDomainModel() }
                }
            }
        }

        loadData()
        if (supabaseClient.isAuthenticated) {
            repoScope.launch {
                syncWithSupabase()
            }
        }
    }

    private fun loadData() {
        val initialWorkspaces = listOf(
            Workspace("ALL", "All Spheres", "Dashboard", "#10B981", "Consolidated view across all areas of life"),
            Workspace("health", "Health & Energy", "Favorite", "#10B981", "Fitness, nutrition, sleep, and recovery"),
            Workspace("work", "Work & Build", "Work", "#0EA5E9", "Engineering projects, career, and deep work"),
            Workspace("growth", "Growth & Mind", "School", "#F59E0B", "Reading, continuous learning, and skills"),
            Workspace("personal", "Personal", "Person", "#8B5CF6", "Daily life, hobbies, and personal routines"),
            Workspace("finance", "Finance", "Payments", "#EC4899", "Budgets, investments, and wealth goals")
        )
        _workspaces.value = initialWorkspaces

        val rawTasks = prefs.getString("tasks_json", null)
        if (rawTasks != null) {
            try {
                val list = mutableListOf<TaskItem>()
                val arr = JSONArray(rawTasks)
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    val subArr = obj.optJSONArray("subTasks") ?: JSONArray()
                    val subList = mutableListOf<SubTask>()
                    for (j in 0 until subArr.length()) {
                        val subObj = subArr.getJSONObject(j)
                        subList.add(SubTask(subObj.getString("id"), subObj.getString("title"), subObj.optBoolean("isDone", false)))
                    }
                    val tagsArr = obj.optJSONArray("tags") ?: JSONArray()
                    val tagList = mutableListOf<String>()
                    for (k in 0 until tagsArr.length()) {
                        tagList.add(tagsArr.getString(k))
                    }
                    val prioStr = obj.optString("priority", "MEDIUM")
                    val prio = try { TaskPriority.valueOf(prioStr) } catch (_: Exception) { TaskPriority.MEDIUM }
                    val statStr = obj.optString("status", "TODO")
                    val stat = try { TaskStatus.valueOf(statStr) } catch (_: Exception) { TaskStatus.TODO }

                    list.add(
                        TaskItem(
                            id = obj.getString("id"),
                            title = obj.getString("title"),
                            notes = obj.optString("notes", ""),
                            workspaceId = obj.optString("workspaceId", "personal"),
                            priority = prio,
                            status = stat,
                            subTasks = subList,
                            tags = tagList,
                            isTopPriorityToday = obj.optBoolean("isTopPriorityToday", false)
                        )
                    )
                }
                _tasks.value = list
            } catch (e: Exception) {
                initDefaultTasks()
            }
        } else {
            initDefaultTasks()
        }

        val rawHabits = prefs.getString("habits_json", null)
        if (rawHabits != null) {
            try {
                val list = mutableListOf<HabitItem>()
                val arr = JSONArray(rawHabits)
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    val datesArr = obj.optJSONArray("completedDates") ?: JSONArray()
                    val datesList = mutableListOf<String>()
                    for (k in 0 until datesArr.length()) {
                        datesList.add(datesArr.getString(k))
                    }
                    val freqStr = obj.optString("frequency", "DAILY")
                    val freq = try { HabitFrequency.valueOf(freqStr) } catch (_: Exception) { HabitFrequency.DAILY }
                    list.add(
                        HabitItem(
                            id = obj.getString("id"),
                            title = obj.getString("title"),
                            workspaceId = obj.optString("workspaceId", "personal"),
                            frequency = freq,
                            streakCount = obj.optInt("streakCount", 0),
                            bestStreak = obj.optInt("bestStreak", 0),
                            completedDates = datesList,
                            colorHex = obj.optString("colorHex", "#10B981")
                        )
                    )
                }
                _habits.value = list
            } catch (e: Exception) {
                initDefaultHabits()
            }
        } else {
            initDefaultHabits()
        }

        initDefaultSchedule()
        initDefaultNotes()
        initPillars()
        initDefaultGoals()

        // Seed Room SQLite persistence if empty
        repoScope.launch {
            try {
                if (taskDao.getCount() == 0 && _tasks.value.isNotEmpty()) {
                    taskDao.insertTasks(_tasks.value.map { TaskEntity.fromDomainModel(it) })
                }
                if (habitDao.getCount() == 0 && _habits.value.isNotEmpty()) {
                    habitDao.insertHabits(_habits.value.map { HabitEntity.fromDomainModel(it) })
                }
            } catch (_: Exception) {}
        }

        _privacyGateEnabled.value = prefs.getBoolean("privacy_gate_enabled", false)
        _pin.value = prefs.getString("user_pin", "1234") ?: "1234"
    }

    private fun initDefaultTasks() {
        _tasks.value = listOf(
            TaskItem(
                id = "t1",
                title = "Ship LifeOS 7-Day Habit Matrix & Light UI",
                notes = "Verify responsive weekly grid, instant cell toggles, and clean web styling",
                workspaceId = "work",
                priority = TaskPriority.URGENT,
                status = TaskStatus.IN_PROGRESS,
                isTopPriorityToday = true,
                tags = listOf("Engineering", "MVP", "Release"),
                subTasks = listOf(
                    SubTask("s1", "Implement 7-day matrix grid layout", true),
                    SubTask("s2", "Add weekly completion percentage score", true),
                    SubTask("s3", "Enable category filters for habits", true),
                    SubTask("s4", "Test real-time date toggling across days", false)
                )
            ),
            TaskItem(
                id = "t2",
                title = "Water intake protocol: 2,500 ml target",
                notes = "Direct hydration logging across morning and afternoon",
                workspaceId = "health",
                priority = TaskPriority.HIGH,
                status = TaskStatus.TODO,
                isTopPriorityToday = true,
                tags = listOf("Hydration", "Health")
            ),
            TaskItem(
                id = "t3",
                title = "Review Weekly Financial Allocation & Savings",
                notes = "Audit subscription expenses and fund index fund allocation",
                workspaceId = "finance",
                priority = TaskPriority.MEDIUM,
                status = TaskStatus.TODO,
                isTopPriorityToday = true,
                tags = listOf("Finance", "Audit")
            ),
            TaskItem(
                id = "t4",
                title = "Read 20 pages of 'Thinking in Systems'",
                notes = "Chapter 4: Feedback loops and delay mechanisms",
                workspaceId = "growth",
                priority = TaskPriority.LOW,
                status = TaskStatus.TODO,
                tags = listOf("Reading", "Mental Models")
            ),
            TaskItem(
                id = "t5",
                title = "Record Daily Nutritional Intake",
                notes = "Log high-protein lunch and clean dinner macros",
                workspaceId = "health",
                priority = TaskPriority.MEDIUM,
                status = TaskStatus.DONE,
                tags = listOf("Health", "Nutrition")
            )
        )
        saveTasks()
    }

    private fun initDefaultHabits() {
        val weekDays = getCurrentWeekDays()
        val mon = weekDays.getOrNull(0)?.dateString ?: getOffsetDateString(-3)
        val tue = weekDays.getOrNull(1)?.dateString ?: getOffsetDateString(-2)
        val wed = weekDays.getOrNull(2)?.dateString ?: getOffsetDateString(-1)
        val thu = weekDays.getOrNull(3)?.dateString ?: getTodayDateString()
        val fri = weekDays.getOrNull(4)?.dateString ?: getOffsetDateString(1)

        _habits.value = listOf(
            HabitItem(
                id = "h1",
                title = "Water & Hydration (2,500 ml)",
                workspaceId = "health",
                frequency = HabitFrequency.DAILY,
                streakCount = 14,
                bestStreak = 21,
                completedDates = listOf(mon, tue, wed, thu),
                colorHex = "#10B981"
            ),
            HabitItem(
                id = "h2",
                title = "Morning Sunlight & 10m Meditation",
                workspaceId = "health",
                frequency = HabitFrequency.DAILY,
                streakCount = 12,
                bestStreak = 18,
                completedDates = listOf(mon, tue, wed, thu),
                colorHex = "#F59E0B"
            ),
            HabitItem(
                id = "h3",
                title = "90m Uninterrupted Deep Work Block",
                workspaceId = "work",
                frequency = HabitFrequency.WEEKDAYS,
                streakCount = 8,
                bestStreak = 12,
                completedDates = listOf(mon, tue, thu),
                colorHex = "#0EA5E9"
            ),
            HabitItem(
                id = "h4",
                title = "Food & Protein Logging",
                workspaceId = "health",
                frequency = HabitFrequency.DAILY,
                streakCount = 9,
                bestStreak = 14,
                completedDates = listOf(mon, wed, thu),
                colorHex = "#10B981"
            ),
            HabitItem(
                id = "h5",
                title = "Medicine / Supplement Reminders",
                workspaceId = "health",
                frequency = HabitFrequency.DAILY,
                streakCount = 19,
                bestStreak = 30,
                completedDates = listOf(mon, tue, wed, thu),
                colorHex = "#06B6D4"
            ),
            HabitItem(
                id = "h6",
                title = "Hair & Skincare Routine",
                workspaceId = "personal",
                frequency = HabitFrequency.DAILY,
                streakCount = 6,
                bestStreak = 10,
                completedDates = listOf(tue, wed, thu),
                colorHex = "#8B5CF6"
            ),
            HabitItem(
                id = "h7",
                title = "Daily Reading & Knowledge Journal",
                workspaceId = "growth",
                frequency = HabitFrequency.DAILY,
                streakCount = 11,
                bestStreak = 15,
                completedDates = listOf(mon, tue, thu),
                colorHex = "#F59E0B"
            )
        )
        saveHabits()
    }

    private fun initDefaultSchedule() {
        _scheduleEvents.value = listOf(
            ScheduleEvent("s1", "Morning Routine & Hydration", "06:30 AM", "07:15 AM", "health", "Wellness", true),
            ScheduleEvent("s2", "Deep Work: LifeOS Habit Matrix", "08:00 AM", "10:30 AM", "work", "Engineering", false),
            ScheduleEvent("s3", "Nutritional Lunch & Protein Intake", "12:00 PM", "12:45 PM", "health", "Nutrition", false),
            ScheduleEvent("s4", "Zone 2 Cardio & Mobility", "01:30 PM", "02:30 PM", "health", "Fitness", false),
            ScheduleEvent("s5", "Reading & Continuous Learning", "05:00 PM", "05:45 PM", "growth", "Study", false),
            ScheduleEvent("s6", "Evening Reset & Day Review", "09:00 PM", "09:30 PM", "personal", "Review", false)
        )
    }

    private fun initDefaultNotes() {
        _notes.value = listOf(
            NoteItem(
                id = "n1",
                title = "LifeOS Design Philosophy: The Clean Cockpit",
                content = """
                    1. Clarity of Focus: Do not manage 50 tasks simultaneously. Choose your Top 3 daily anchors.
                    2. Habits compound silently: Streaks are psychological capital. Never break the chain twice in a row.
                    3. Time-boxing: What doesn't get scheduled doesn't get completed.
                    4. Privacy & Simplicity: Your personal OS should be blazing fast, clean, and distraction-free.
                """.trimIndent(),
                workspaceId = "personal",
                tags = listOf("Philosophy", "Productivity", "Core"),
                isPinned = true
            ),
            NoteItem(
                id = "n2",
                title = "Engineering Architecture & Scalability Principles",
                content = """
                    - Offline-first: Instant UI responses, zero loading spinners on local state.
                    - Deterministic validation on all incoming inputs.
                    - Type-safe navigation and state containers.
                    - High visual contrast and M3 accessibility compliance.
                """.trimIndent(),
                workspaceId = "work",
                tags = listOf("Engineering", "Kotlin", "Android"),
                isPinned = true
            ),
            NoteItem(
                id = "n3",
                title = "Sleep & Recovery Optimization Protocol",
                content = """
                    - Caffeine cutoff: 10 hours before bed (typically 12:30 PM).
                    - Evening temperature drop: Room at 19°C (66°F).
                    - Magnesium Glycinate 400mg + L-Theanine 200mg 45m before bed.
                    - Red-tinted lighting after sunset.
                """.trimIndent(),
                workspaceId = "health",
                tags = listOf("Health", "Biohacking", "Sleep"),
                isPinned = false
            )
        )
    }

    private fun initPillars() {
        _pillars.value = listOf(
            LifePillar("p1", "Physical & Mental Vitality", "Energy, sleep, exercise & nutrition", "Favorite", "#10B981", 0.78f),
            LifePillar("p2", "Career & Engineering Craft", "Building impactful software products", "Work", "#0EA5E9", 0.85f),
            LifePillar("p3", "Intellectual Mastery", "Reading, systems thinking & languages", "School", "#F59E0B", 0.72f),
            LifePillar("p4", "Financial Sovereignty", "Investing, asset building & discipline", "Payments", "#EC4899", 0.65f),
            LifePillar("p5", "Relationships & Community", "Family, close friends & collaboration", "Person", "#8B5CF6", 0.70f)
        )
    }

    private fun initDefaultGoals() {
        _goals.value = listOf(
            GoalItem(
                id = "g1",
                pillarId = "p2",
                workspaceId = "work",
                title = "Ship LifeOS Native Mobile Experience",
                targetDate = "End of Month",
                progress = 0.75f,
                milestones = listOf(
                    GoalMilestone("m1", "Architect domain models & state flow", true),
                    GoalMilestone("m2", "Build interactive 7-day habit matrix", true),
                    GoalMilestone("m3", "Deploy clean web-inspired light UI", true),
                    GoalMilestone("m4", "Verify weekly habit analytics score", false)
                )
            ),
            GoalItem(
                id = "g2",
                pillarId = "p1",
                workspaceId = "health",
                title = "Reach 15% Body Fat & Run 10km Sub-50m",
                targetDate = "Q4 Milestone",
                progress = 0.60f,
                milestones = listOf(
                    GoalMilestone("m5", "Establish 4x weekly strength training", true),
                    GoalMilestone("m6", "Weekly 10k pace run under 53 min", true),
                    GoalMilestone("m7", "Hit 10k sub-50 min target time", false)
                )
            ),
            GoalItem(
                id = "g3",
                pillarId = "p3",
                workspaceId = "growth",
                title = "Complete 12 Books on Systems & Philosophy",
                targetDate = "Annual Goal",
                progress = 0.66f,
                milestones = listOf(
                    GoalMilestone("m8", "Read 'Thinking in Systems'", true),
                    GoalMilestone("m9", "Read 'Antifragile' by Taleb", true),
                    GoalMilestone("m10", "Read 'Designing Data-Intensive Apps'", false)
                )
            )
        )
    }

    // Task Actions
    fun addTask(task: TaskItem) {
        val updated = listOf(task) + _tasks.value
        _tasks.value = updated
        repoScope.launch {
            try {
                taskDao.insertTask(TaskEntity.fromDomainModel(task, isSynced = false))
            } catch (_: Exception) {}
        }
        saveTasks()
    }

    fun updateTask(task: TaskItem) {
        val updated = _tasks.value.map { if (it.id == task.id) task else it }
        _tasks.value = updated
        repoScope.launch {
            try {
                taskDao.insertTask(TaskEntity.fromDomainModel(task, isSynced = false))
            } catch (_: Exception) {}
        }
        saveTasks()
    }

    fun deleteTask(taskId: String) {
        val updated = _tasks.value.filterNot { it.id == taskId }
        _tasks.value = updated
        repoScope.launch {
            try {
                taskDao.deleteTaskById(taskId)
            } catch (_: Exception) {}
        }
        saveTasks()
    }

    fun toggleTaskStatus(taskId: String) {
        var updatedTask: TaskItem? = null
        val updated = _tasks.value.map { task ->
            if (task.id == taskId) {
                val newStatus = when (task.status) {
                    TaskStatus.DONE -> TaskStatus.TODO
                    TaskStatus.TODO -> TaskStatus.DONE
                    TaskStatus.IN_PROGRESS -> TaskStatus.DONE
                }
                val t = task.copy(status = newStatus)
                updatedTask = t
                t
            } else task
        }
        _tasks.value = updated
        updatedTask?.let { task ->
            repoScope.launch {
                try {
                    taskDao.insertTask(TaskEntity.fromDomainModel(task, isSynced = false))
                } catch (_: Exception) {}
            }
        }
        saveTasks()
    }

    fun toggleSubTask(taskId: String, subTaskId: String) {
        var updatedTask: TaskItem? = null
        val updated = _tasks.value.map { task ->
            if (task.id == taskId) {
                val newSubTasks = task.subTasks.map { sub ->
                    if (sub.id == subTaskId) sub.copy(isDone = !sub.isDone) else sub
                }
                val t = task.copy(subTasks = newSubTasks)
                updatedTask = t
                t
            } else task
        }
        _tasks.value = updated
        updatedTask?.let { task ->
            repoScope.launch {
                try {
                    taskDao.insertTask(TaskEntity.fromDomainModel(task, isSynced = false))
                } catch (_: Exception) {}
            }
        }
        saveTasks()
    }

    fun toggleTopPriorityToday(taskId: String) {
        var updatedTask: TaskItem? = null
        val updated = _tasks.value.map { task ->
            if (task.id == taskId) {
                val t = task.copy(isTopPriorityToday = !task.isTopPriorityToday)
                updatedTask = t
                t
            } else task
        }
        _tasks.value = updated
        updatedTask?.let { task ->
            repoScope.launch {
                try {
                    taskDao.insertTask(TaskEntity.fromDomainModel(task, isSynced = false))
                } catch (_: Exception) {}
            }
        }
        saveTasks()
    }

    // Habit Actions
    fun addHabit(habit: HabitItem) {
        val updated = _habits.value + habit
        _habits.value = updated
        repoScope.launch {
            try {
                habitDao.insertHabit(HabitEntity.fromDomainModel(habit, isSynced = false))
            } catch (_: Exception) {}
        }
        saveHabits()
    }

    fun deleteHabit(habitId: String) {
        val updated = _habits.value.filterNot { it.id == habitId }
        _habits.value = updated
        repoScope.launch {
            try {
                habitDao.deleteHabitById(habitId)
            } catch (_: Exception) {}
        }
        saveHabits()
    }

    fun toggleHabitToday(habitId: String) {
        toggleHabitDate(habitId, getTodayDateString())
    }

    fun toggleHabitDate(habitId: String, dateString: String) {
        var willBeCompleted = false
        var targetHabit: HabitItem? = null
        val updated = _habits.value.map { habit ->
            if (habit.id == habitId) {
                val isCompleted = habit.completedDates.contains(dateString)
                willBeCompleted = !isCompleted
                val newDates = if (isCompleted) {
                    habit.completedDates.filterNot { it == dateString }
                } else {
                    habit.completedDates + dateString
                }
                val newStreak = calculateStreak(newDates)
                val newBest = maxOf(habit.bestStreak, newStreak)

                val h = habit.copy(
                    completedDates = newDates,
                    streakCount = newStreak,
                    bestStreak = newBest
                )
                targetHabit = h
                h
            } else habit
        }
        _habits.value = updated
        targetHabit?.let { habit ->
            repoScope.launch {
                try {
                    habitDao.insertHabit(HabitEntity.fromDomainModel(habit, isSynced = false))
                } catch (_: Exception) {}
            }
        }
        saveHabits()

        if (supabaseClient.isAuthenticated) {
            repoScope.launch {
                try {
                    val logSuccess = supabaseClient.logHabitCompletionToCloud(habitId, dateString, willBeCompleted)
                    if (logSuccess.isSuccess) {
                        targetHabit?.let { h ->
                            habitDao.insertHabit(HabitEntity.fromDomainModel(h, isSynced = true))
                        }
                    }
                } catch (e: Exception) {
                    _syncStatus.value = SupabaseSyncStatus.OFFLINE_LOCAL
                    _lastSyncTimeMessage.value = "Offline mode: habit saved to local Room database"
                }
            }
        }
    }

    private fun calculateStreak(completedDates: List<String>): Int {
        var streak = 0
        val cal = Calendar.getInstance()
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val todayStr = sdf.format(cal.time)

        if (completedDates.contains(todayStr)) {
            streak++
            cal.add(Calendar.DAY_OF_YEAR, -1)
        } else {
            cal.add(Calendar.DAY_OF_YEAR, -1)
            val yestStr = sdf.format(cal.time)
            if (!completedDates.contains(yestStr)) {
                return 0
            }
        }

        while (true) {
            val dStr = sdf.format(cal.time)
            if (completedDates.contains(dStr)) {
                streak++
                cal.add(Calendar.DAY_OF_YEAR, -1)
            } else {
                break
            }
        }
        return streak
    }

    fun getWeekDays(weekOffset: Int = 0): List<DayInfo> {
        val cal = Calendar.getInstance()
        cal.firstDayOfWeek = Calendar.MONDAY
        if (weekOffset != 0) {
            cal.add(Calendar.WEEK_OF_YEAR, weekOffset)
        }
        cal.set(Calendar.DAY_OF_WEEK, Calendar.MONDAY)

        val todaySdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val todayStr = todaySdf.format(Date())

        val dayNameSdf = SimpleDateFormat("EEE", Locale.getDefault())
        val dayNumSdf = SimpleDateFormat("d", Locale.getDefault())

        val result = mutableListOf<DayInfo>()
        for (i in 0 until 7) {
            val dateStr = todaySdf.format(cal.time)
            val dayName = dayNameSdf.format(cal.time)
            val dayNum = dayNumSdf.format(cal.time)
            val isToday = dateStr == todayStr
            result.add(DayInfo(dayName, dayNum, dateStr, isToday))
            cal.add(Calendar.DAY_OF_YEAR, 1)
        }
        return result
    }

    fun getWeekRangeLabel(weekOffset: Int = 0): String {
        val days = getWeekDays(weekOffset)
        val first = days.firstOrNull() ?: return ""
        val last = days.lastOrNull() ?: return ""
        return try {
            val inSdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val outSdf = SimpleDateFormat("MMM d", Locale.getDefault())
            val d1 = inSdf.parse(first.dateString)
            val d2 = inSdf.parse(last.dateString)
            if (d1 != null && d2 != null) {
                "${outSdf.format(d1)} – ${outSdf.format(d2)}"
            } else {
                "${first.dateString} – ${last.dateString}"
            }
        } catch (_: Exception) {
            "${first.dateString} – ${last.dateString}"
        }
    }

    fun getCurrentWeekDays(): List<DayInfo> = getWeekDays(0)

    // Schedule Actions
    fun addScheduleEvent(event: ScheduleEvent) {
        val updated = _scheduleEvents.value + event
        _scheduleEvents.value = updated
    }

    fun toggleScheduleEventDone(eventId: String) {
        val updated = _scheduleEvents.value.map {
            if (it.id == eventId) it.copy(isDone = !it.isDone) else it
        }
        _scheduleEvents.value = updated
    }

    fun deleteScheduleEvent(eventId: String) {
        val updated = _scheduleEvents.value.filterNot { it.id == eventId }
        _scheduleEvents.value = updated
    }

    // Note Actions
    fun addNote(note: NoteItem) {
        val updated = listOf(note) + _notes.value
        _notes.value = updated
    }

    fun updateNote(note: NoteItem) {
        val updated = _notes.value.map { if (it.id == note.id) note else it }
        _notes.value = updated
    }

    fun deleteNote(noteId: String) {
        val updated = _notes.value.filterNot { it.id == noteId }
        _notes.value = updated
    }

    fun togglePinNote(noteId: String) {
        val updated = _notes.value.map {
            if (it.id == noteId) it.copy(isPinned = !it.isPinned) else it
        }
        _notes.value = updated
    }

    // Goal Actions
    fun addGoal(goal: GoalItem) {
        val updated = _goals.value + goal
        _goals.value = updated
    }

    fun toggleMilestone(goalId: String, milestoneId: String) {
        val updated = _goals.value.map { goal ->
            if (goal.id == goalId) {
                val newMilestones = goal.milestones.map { m ->
                    if (m.id == milestoneId) m.copy(isCompleted = !m.isCompleted) else m
                }
                val completedCount = newMilestones.count { it.isCompleted }
                val totalCount = newMilestones.size.coerceAtLeast(1)
                val newProgress = completedCount.toFloat() / totalCount
                goal.copy(milestones = newMilestones, progress = newProgress)
            } else goal
        }
        _goals.value = updated
    }

    fun deleteGoal(goalId: String) {
        val updated = _goals.value.filterNot { it.id == goalId }
        _goals.value = updated
    }

    // Focus Session Actions
    fun logFocusSession(session: FocusSession) {
        val updated = listOf(session) + _focusSessions.value
        _focusSessions.value = updated
    }

    // Workspace & Filters
    fun setActiveWorkspace(id: String) {
        _activeWorkspaceId.value = id
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    // Privacy Gate
    fun togglePrivacyGate(enabled: Boolean) {
        _privacyGateEnabled.value = enabled
        if (!enabled) {
            _isLocked.value = false
        }
        prefs.edit().putBoolean("privacy_gate_enabled", enabled).apply()
    }

    fun lockGate() {
        if (_privacyGateEnabled.value) {
            _isLocked.value = true
        }
    }

    fun unlockGate(enteredPin: String): Boolean {
        return if (enteredPin == _pin.value) {
            _isLocked.value = false
            true
        } else {
            false
        }
    }

    fun setPin(newPin: String) {
        _pin.value = newPin
        prefs.edit().putString("user_pin", newPin).apply()
    }

    // AI Daily Planner & Brain Dump Converter
    fun getDailyAiBrief(): DailyAiBrief {
        val habitCheckins = _habits.value.count { it.completedDates.contains(getTodayDateString()) }
        val totalHabits = _habits.value.size

        val greeting = when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
            in 5..11 -> "Good Morning"
            in 12..17 -> "Good Afternoon"
            else -> "Good Evening"
        }

        val quote = "“Make today count. A clear view of what matters most — your health, habits, and goals.”"

        val recommendations = mutableListOf<String>()
        val topPriority = _tasks.value.firstOrNull { it.isTopPriorityToday && it.status != TaskStatus.DONE }
        if (topPriority != null) {
            recommendations.add("Primary Objective: '${topPriority.title}'")
        } else {
            recommendations.add("All daily anchor tasks completed! Focus on high-leverage growth.")
        }

        if (habitCheckins < totalHabits) {
            val pendingHabit = _habits.value.firstOrNull { !it.completedDates.contains(getTodayDateString()) }
            if (pendingHabit != null) {
                recommendations.add("Maintain daily rhythm: Check in '${pendingHabit.title}'")
            }
        }
        recommendations.add("Hydration goal: Keep steady 2,500ml water intake.")

        val habitSummary = "$habitCheckins of $totalHabits habits completed today."

        return DailyAiBrief(greeting, quote, recommendations, habitSummary)
    }

    fun parseBrainDumpToTasks(rawDump: String): List<TaskItem> {
        val lines = rawDump.split("\n", ",", ";").map { it.trim() }.filter { it.isNotBlank() }
        val newTasks = mutableListOf<TaskItem>()
        for (line in lines) {
            val clean = line.removePrefix("-").removePrefix("•").removePrefix("*").trim()
            if (clean.length > 2) {
                val priority = when {
                    clean.contains("urgent", ignoreCase = true) || clean.contains("asap", ignoreCase = true) -> TaskPriority.URGENT
                    clean.contains("important", ignoreCase = true) -> TaskPriority.HIGH
                    else -> TaskPriority.MEDIUM
                }
                val workspace = when {
                    clean.contains("health", ignoreCase = true) || clean.contains("workout", ignoreCase = true) || clean.contains("run", ignoreCase = true) -> "health"
                    clean.contains("code", ignoreCase = true) || clean.contains("bug", ignoreCase = true) || clean.contains("ship", ignoreCase = true) -> "work"
                    clean.contains("read", ignoreCase = true) || clean.contains("learn", ignoreCase = true) -> "growth"
                    clean.contains("pay", ignoreCase = true) || clean.contains("money", ignoreCase = true) || clean.contains("tax", ignoreCase = true) -> "finance"
                    else -> "personal"
                }
                newTasks.add(
                    TaskItem(
                        id = UUID.randomUUID().toString(),
                        title = clean,
                        workspaceId = workspace,
                        priority = priority,
                        status = TaskStatus.TODO
                    )
                )
            }
        }
        return newTasks
    }

    // Persistence helpers
    private fun saveTasks() {
        val currentTasks = _tasks.value
        repoScope.launch {
            try {
                taskDao.insertTasks(currentTasks.map { TaskEntity.fromDomainModel(it) })
            } catch (_: Exception) {}
        }
        try {
            val arr = JSONArray()
            for (t in currentTasks) {
                val obj = JSONObject()
                obj.put("id", t.id)
                obj.put("title", t.title)
                obj.put("notes", t.notes)
                obj.put("workspaceId", t.workspaceId)
                obj.put("priority", t.priority.name)
                obj.put("status", t.status.name)
                obj.put("isTopPriorityToday", t.isTopPriorityToday)

                val subArr = JSONArray()
                for (s in t.subTasks) {
                    val subObj = JSONObject()
                    subObj.put("id", s.id)
                    subObj.put("title", s.title)
                    subObj.put("isDone", s.isDone)
                    subArr.put(subObj)
                }
                obj.put("subTasks", subArr)

                val tagsArr = JSONArray()
                for (tag in t.tags) tagsArr.put(tag)
                obj.put("tags", tagsArr)

                arr.put(obj)
            }
            prefs.edit().putString("tasks_json", arr.toString()).apply()
        } catch (_: Exception) {}
    }

    private fun saveHabits() {
        val currentHabits = _habits.value
        repoScope.launch {
            try {
                habitDao.insertHabits(currentHabits.map { HabitEntity.fromDomainModel(it) })
            } catch (_: Exception) {}
        }
        try {
            val arr = JSONArray()
            for (h in currentHabits) {
                val obj = JSONObject()
                obj.put("id", h.id)
                obj.put("title", h.title)
                obj.put("workspaceId", h.workspaceId)
                obj.put("frequency", h.frequency.name)
                obj.put("streakCount", h.streakCount)
                obj.put("bestStreak", h.bestStreak)
                obj.put("colorHex", h.colorHex)

                val datesArr = JSONArray()
                for (d in h.completedDates) datesArr.put(d)
                obj.put("completedDates", datesArr)

                arr.put(obj)
            }
            prefs.edit().putString("habits_json", arr.toString()).apply()
        } catch (_: Exception) {}
    }

    // ==========================================
    // SUPABASE INTEGRATION & REALTIME SYNC
    // ==========================================

    suspend fun signInSupabase(email: String, pass: String): Result<SupabaseSession> {
        val result = supabaseClient.signInWithEmail(email, pass)
        if (result.isSuccess) {
            _syncAccountEmail.value = supabaseClient.currentUserEmail
            _syncStatus.value = SupabaseSyncStatus.CONNECTED
            syncWithSupabase()
        } else {
            _syncStatus.value = SupabaseSyncStatus.SYNC_ERROR
        }
        return result
    }

    suspend fun signUpSupabase(email: String, pass: String): Result<String> {
        return supabaseClient.signUpWithEmail(email, pass)
    }

    fun signOutSupabase() {
        supabaseClient.clearSession()
        _syncAccountEmail.value = null
        _syncStatus.value = SupabaseSyncStatus.OFFLINE_LOCAL
        _lastSyncTimeMessage.value = "Local offline mode active (Room database preserved)"
    }

    suspend fun checkCloudConnection(): Boolean {
        return supabaseClient.testConnection()
    }

    suspend fun syncWithSupabase(): Result<String> {
        if (!supabaseClient.isAuthenticated) {
            _syncStatus.value = SupabaseSyncStatus.OFFLINE_LOCAL
            _lastSyncTimeMessage.value = "Offline mode: local Room SQLite database active"
            return Result.failure(Exception("Not authenticated with Supabase"))
        }

        _syncStatus.value = SupabaseSyncStatus.SYNCING
        try {
            // 1. Fetch cloud habits
            val cloudHabitsResult = supabaseClient.fetchCloudHabits()
            if (cloudHabitsResult.isSuccess) {
                val cloudHabits = cloudHabitsResult.getOrNull() ?: emptyList()
                if (cloudHabits.isNotEmpty()) {
                    // Merge cloud habits without deleting locally created habits
                    val localHabits = _habits.value
                    val merged = mutableListOf<HabitItem>()
                    merged.addAll(cloudHabits)
                    for (loc in localHabits) {
                        if (cloudHabits.none { it.id == loc.id }) {
                            merged.add(loc)
                        }
                    }
                    _habits.value = merged
                    habitDao.insertHabits(merged.map { HabitEntity.fromDomainModel(it, isSynced = true) })
                    saveHabits()
                }
            }

            // 2. Fetch cloud tasks
            val cloudTasksResult = supabaseClient.fetchCloudTasks()
            if (cloudTasksResult.isSuccess) {
                val cloudTasks = cloudTasksResult.getOrNull() ?: emptyList()
                if (cloudTasks.isNotEmpty()) {
                    val localTasks = _tasks.value
                    val mergedTasks = mutableListOf<TaskItem>()
                    mergedTasks.addAll(cloudTasks)
                    for (loc in localTasks) {
                        if (cloudTasks.none { it.id == loc.id }) {
                            mergedTasks.add(loc)
                        }
                    }
                    _tasks.value = mergedTasks
                    taskDao.insertTasks(mergedTasks.map { TaskEntity.fromDomainModel(it, isSynced = true) })
                    saveTasks()
                }
            }

            // 3. Push any unsynced offline habit check-ins to Supabase cloud
            try {
                val unsyncedHabits = habitDao.getUnsyncedHabits()
                for (unsynced in unsyncedHabits) {
                    for (date in unsynced.completedDates) {
                        supabaseClient.logHabitCompletionToCloud(unsynced.id, date, true)
                    }
                    habitDao.insertHabit(unsynced.copy(isSynced = true))
                }
            } catch (_: Exception) {
                // Intermittent network during upstream sync: local changes stay safely in Room
            }

            val sdf = SimpleDateFormat("hh:mm a", Locale.getDefault())
            _lastSyncTimeMessage.value = "Synced with Supabase at ${sdf.format(Date())}"
            _syncStatus.value = SupabaseSyncStatus.CONNECTED
            return Result.success("Synchronization successful")
        } catch (e: Exception) {
            // Supabase network unreachable or intermittent - seamlessly fall back to local Room persistence
            _syncStatus.value = SupabaseSyncStatus.OFFLINE_LOCAL
            _lastSyncTimeMessage.value = "Offline mode: habits & tasks secured in local Room database"
            return Result.failure(e)
        }
    }

    companion object {
        fun getTodayDateString(): String {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            return sdf.format(Date())
        }

        fun getOffsetDateString(offsetDays: Int): String {
            val cal = Calendar.getInstance()
            cal.add(Calendar.DAY_OF_YEAR, offsetDays)
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            return sdf.format(cal.time)
        }
    }
}
