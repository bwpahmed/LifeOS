package com.example.ui.viewmodel

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.LifeOsRepository
import com.example.model.*
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.*

enum class LifeOsScreen(val label: String) {
    DASHBOARD("Cockpit"),
    TASKS("Tasks"),
    HABITS("Habits"),
    PLANNER("Planner"),
    KNOWLEDGE("Knowledge & Goals"),
    FOCUS("Focus Timer")
}

enum class QuickCaptureType {
    TASK, HABIT, NOTE, SCHEDULE_EVENT, GOAL
}

class LifeOsViewModel(application: Application) : AndroidViewModel(application) {

    val repository = LifeOsRepository(application.applicationContext)

    // Dark/Light Theme state persisted in SharedPreferences
    private val themePrefs = application.getSharedPreferences("lifeos_theme_prefs", Context.MODE_PRIVATE)
    private val _isDarkTheme = MutableStateFlow(themePrefs.getBoolean("is_dark_theme", true))
    val isDarkTheme: StateFlow<Boolean> = _isDarkTheme.asStateFlow()

    fun toggleTheme() {
        val next = !_isDarkTheme.value
        _isDarkTheme.value = next
        themePrefs.edit().putBoolean("is_dark_theme", next).apply()
    }

    // Current navigation tab
    private val _currentScreen = MutableStateFlow(LifeOsScreen.DASHBOARD)
    val currentScreen: StateFlow<LifeOsScreen> = _currentScreen.asStateFlow()

    // Workspace & Search
    val workspaces = repository.workspaces
    val activeWorkspaceId = repository.activeWorkspaceId
    val searchQuery = repository.searchQuery

    // Supabase Cloud State
    val syncStatus = repository.syncStatus
    val syncAccountEmail = repository.syncAccountEmail
    val lastSyncTimeMessage = repository.lastSyncTimeMessage

    private val _isCloudSyncModalOpen = MutableStateFlow(false)
    val isCloudSyncModalOpen: StateFlow<Boolean> = _isCloudSyncModalOpen.asStateFlow()

    fun openCloudSyncModal() { _isCloudSyncModalOpen.value = true }
    fun closeCloudSyncModal() { _isCloudSyncModalOpen.value = false }

    // Domain models filtered by active workspace and search query
    val allTasks = repository.tasks
    val filteredTasks: StateFlow<List<TaskItem>> = combine(
        repository.tasks,
        activeWorkspaceId,
        searchQuery
    ) { tasks, wsId, query ->
        tasks.filter { task ->
            val matchesWs = wsId == "ALL" || task.workspaceId == wsId
            val matchesQuery = query.isBlank() || task.title.contains(query, ignoreCase = true) ||
                    task.tags.any { it.contains(query, ignoreCase = true) }
            matchesWs && matchesQuery
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allHabits = repository.habits
    val filteredHabits: StateFlow<List<HabitItem>> = combine(
        repository.habits,
        activeWorkspaceId
    ) { habits, wsId ->
        if (wsId == "ALL") habits else habits.filter { it.workspaceId == wsId }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allScheduleEvents = repository.scheduleEvents
    val filteredScheduleEvents: StateFlow<List<ScheduleEvent>> = combine(
        repository.scheduleEvents,
        activeWorkspaceId
    ) { events, wsId ->
        if (wsId == "ALL") events else events.filter { it.workspaceId == wsId }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allNotes = repository.notes
    val filteredNotes: StateFlow<List<NoteItem>> = combine(
        repository.notes,
        activeWorkspaceId,
        searchQuery
    ) { notes, wsId, query ->
        notes.filter { note ->
            val matchesWs = wsId == "ALL" || note.workspaceId == wsId
            val matchesQuery = query.isBlank() || note.title.contains(query, ignoreCase = true) ||
                    note.content.contains(query, ignoreCase = true) ||
                    note.tags.any { it.contains(query, ignoreCase = true) }
            matchesWs && matchesQuery
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val pillars = repository.pillars
    val allGoals = repository.goals
    val filteredGoals: StateFlow<List<GoalItem>> = combine(
        repository.goals,
        activeWorkspaceId
    ) { goals, wsId ->
        if (wsId == "ALL") goals else goals.filter { it.workspaceId == wsId }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Privacy Gate
    val privacyGateEnabled = repository.privacyGateEnabled
    val isLocked = repository.isLocked

    // UI Dialogs & Modal States
    private val _isQuickCaptureOpen = MutableStateFlow(false)
    val isQuickCaptureOpen: StateFlow<Boolean> = _isQuickCaptureOpen.asStateFlow()

    private val _quickCaptureType = MutableStateFlow(QuickCaptureType.TASK)
    val quickCaptureType: StateFlow<QuickCaptureType> = _quickCaptureType.asStateFlow()

    private val _isBrainDumpModalOpen = MutableStateFlow(false)
    val isBrainDumpModalOpen: StateFlow<Boolean> = _isBrainDumpModalOpen.asStateFlow()

    private val _isSettingsOpen = MutableStateFlow(false)
    val isSettingsOpen: StateFlow<Boolean> = _isSettingsOpen.asStateFlow()

    private val _editingNote = MutableStateFlow<NoteItem?>(null)
    val editingNote: StateFlow<NoteItem?> = _editingNote.asStateFlow()

    // Focus Timer State
    private val _focusTotalSeconds = MutableStateFlow(25 * 60)
    val focusTotalSeconds: StateFlow<Int> = _focusTotalSeconds.asStateFlow()

    private val _focusRemainingSeconds = MutableStateFlow(25 * 60)
    val focusRemainingSeconds: StateFlow<Int> = _focusRemainingSeconds.asStateFlow()

    private val _isTimerRunning = MutableStateFlow(false)
    val isTimerRunning: StateFlow<Boolean> = _isTimerRunning.asStateFlow()

    private val _focusSessionsCompleted = MutableStateFlow(2)
    val focusSessionsCompleted: StateFlow<Int> = _focusSessionsCompleted.asStateFlow()

    private var timerJob: Job? = null

    // Navigation
    fun navigateTo(screen: LifeOsScreen) {
        _currentScreen.value = screen
    }

    fun setActiveWorkspace(id: String) {
        repository.setActiveWorkspace(id)
    }

    fun setSearchQuery(query: String) {
        repository.setSearchQuery(query)
    }

    // Task operations
    fun addTask(title: String, notes: String, workspaceId: String, priority: TaskPriority, isTopPriority: Boolean) {
        val task = TaskItem(
            id = UUID.randomUUID().toString(),
            title = title,
            notes = notes,
            workspaceId = workspaceId,
            priority = priority,
            status = TaskStatus.TODO,
            isTopPriorityToday = isTopPriority
        )
        repository.addTask(task)
    }

    fun toggleTaskStatus(taskId: String) {
        repository.toggleTaskStatus(taskId)
    }

    fun toggleSubTask(taskId: String, subTaskId: String) {
        repository.toggleSubTask(taskId, subTaskId)
    }

    fun toggleTopPriorityToday(taskId: String) {
        repository.toggleTopPriorityToday(taskId)
    }

    fun deleteTask(taskId: String) {
        repository.deleteTask(taskId)
    }

    // Habit operations
    fun addHabit(title: String, workspaceId: String, frequency: HabitFrequency, colorHex: String) {
        val habit = HabitItem(
            id = UUID.randomUUID().toString(),
            title = title,
            workspaceId = workspaceId,
            frequency = frequency,
            colorHex = colorHex
        )
        repository.addHabit(habit)
    }

    fun toggleHabitToday(habitId: String) {
        repository.toggleHabitToday(habitId)
    }

    fun toggleHabitDate(habitId: String, dateString: String) {
        repository.toggleHabitDate(habitId, dateString)
    }

    fun getWeekDays(weekOffset: Int = 0) = repository.getWeekDays(weekOffset)
    fun getWeekRangeLabel(weekOffset: Int = 0) = repository.getWeekRangeLabel(weekOffset)
    fun getCurrentWeekDays() = repository.getCurrentWeekDays()

    fun deleteHabit(habitId: String) {
        repository.deleteHabit(habitId)
    }

    // Schedule operations
    fun addScheduleEvent(title: String, start: String, end: String, workspaceId: String, category: String) {
        val event = ScheduleEvent(
            id = UUID.randomUUID().toString(),
            title = title,
            startTime = start,
            endTime = end,
            workspaceId = workspaceId,
            category = category
        )
        repository.addScheduleEvent(event)
    }

    fun toggleScheduleEventDone(eventId: String) {
        repository.toggleScheduleEventDone(eventId)
    }

    fun deleteScheduleEvent(eventId: String) {
        repository.deleteScheduleEvent(eventId)
    }

    // Note operations
    fun addNote(title: String, content: String, workspaceId: String, tags: List<String>) {
        val note = NoteItem(
            id = UUID.randomUUID().toString(),
            title = title,
            content = content,
            workspaceId = workspaceId,
            tags = tags
        )
        repository.addNote(note)
    }

    fun updateNote(note: NoteItem) {
        repository.updateNote(note)
    }

    fun deleteNote(noteId: String) {
        repository.deleteNote(noteId)
    }

    fun togglePinNote(noteId: String) {
        repository.togglePinNote(noteId)
    }

    fun openNoteEditor(note: NoteItem?) {
        _editingNote.value = note
    }

    // Goal operations
    fun addGoal(title: String, pillarId: String, workspaceId: String, targetDate: String, milestonesText: List<String>) {
        val milestones = milestonesText.filter { it.isNotBlank() }.map {
            GoalMilestone(UUID.randomUUID().toString(), it, false)
        }
        val goal = GoalItem(
            id = UUID.randomUUID().toString(),
            pillarId = pillarId,
            workspaceId = workspaceId,
            title = title,
            targetDate = targetDate,
            milestones = milestones,
            progress = 0f
        )
        repository.addGoal(goal)
    }

    fun toggleMilestone(goalId: String, milestoneId: String) {
        repository.toggleMilestone(goalId, milestoneId)
    }

    fun deleteGoal(goalId: String) {
        repository.deleteGoal(goalId)
    }

    // Brain dump & AI
    fun openBrainDump() {
        _isBrainDumpModalOpen.value = true
    }

    fun closeBrainDump() {
        _isBrainDumpModalOpen.value = false
    }

    fun processBrainDump(text: String) {
        val newTasks = repository.parseBrainDumpToTasks(text)
        newTasks.forEach { repository.addTask(it) }
        closeBrainDump()
    }

    fun getDailyAiBrief(): DailyAiBrief {
        return repository.getDailyAiBrief()
    }

    // Quick Capture
    fun openQuickCapture(type: QuickCaptureType = QuickCaptureType.TASK) {
        _quickCaptureType.value = type
        _isQuickCaptureOpen.value = true
    }

    fun closeQuickCapture() {
        _isQuickCaptureOpen.value = false
    }

    // Settings & Privacy Gate
    fun openSettings() {
        _isSettingsOpen.value = true
    }

    fun closeSettings() {
        _isSettingsOpen.value = false
    }

    fun togglePrivacyGate(enabled: Boolean) {
        repository.togglePrivacyGate(enabled)
    }

    fun lockGate() {
        repository.lockGate()
    }

    fun unlockGate(pin: String): Boolean {
        return repository.unlockGate(pin)
    }

    fun setPin(newPin: String) {
        repository.setPin(newPin)
    }

    // Focus Timer
    fun setFocusPreset(minutes: Int) {
        pauseTimer()
        _focusTotalSeconds.value = minutes * 60
        _focusRemainingSeconds.value = minutes * 60
    }

    fun toggleTimer() {
        if (_isTimerRunning.value) {
            pauseTimer()
        } else {
            startTimer()
        }
    }

    private fun startTimer() {
        _isTimerRunning.value = true
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (_focusRemainingSeconds.value > 0) {
                delay(1000)
                _focusRemainingSeconds.value -= 1
            }
            _isTimerRunning.value = false
            _focusSessionsCompleted.value += 1
            repository.logFocusSession(
                FocusSession(
                    id = UUID.randomUUID().toString(),
                    durationMinutes = _focusTotalSeconds.value / 60
                )
            )
            _focusRemainingSeconds.value = _focusTotalSeconds.value
        }
    }

    fun pauseTimer() {
        _isTimerRunning.value = false
        timerJob?.cancel()
    }

    fun resetTimer() {
        pauseTimer()
        _focusRemainingSeconds.value = _focusTotalSeconds.value
    }

    // ==========================================
    // SUPABASE ACTIONS
    // ==========================================

    fun syncWithSupabase(onComplete: (Boolean, String) -> Unit = { _, _ -> }) {
        viewModelScope.launch {
            val result = repository.syncWithSupabase()
            if (result.isSuccess) {
                onComplete(true, result.getOrNull() ?: "Synchronization successful")
            } else {
                onComplete(false, result.exceptionOrNull()?.message ?: "Sync error")
            }
        }
    }

    fun signInSupabase(email: String, pass: String, onComplete: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            val result = repository.signInSupabase(email, pass)
            if (result.isSuccess) {
                onComplete(true, "Signed in as $email")
            } else {
                onComplete(false, result.exceptionOrNull()?.message ?: "Sign in failed")
            }
        }
    }

    fun signUpSupabase(email: String, pass: String, onComplete: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            val result = repository.signUpSupabase(email, pass)
            if (result.isSuccess) {
                onComplete(true, result.getOrNull() ?: "Account created successfully")
            } else {
                onComplete(false, result.exceptionOrNull()?.message ?: "Sign up failed")
            }
        }
    }

    fun signOutSupabase() {
        repository.signOutSupabase()
    }
}
