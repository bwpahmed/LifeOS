package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.ui.components.*
import com.example.ui.screens.*
import com.example.ui.theme.LifeOsTheme
import com.example.ui.viewmodel.LifeOsScreen
import com.example.ui.viewmodel.LifeOsViewModel
import com.example.ui.viewmodel.QuickCaptureType

class MainActivity : ComponentActivity() {

    private val viewModel: LifeOsViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val isDarkTheme by viewModel.isDarkTheme.collectAsStateWithLifecycle()
            LifeOsTheme(darkTheme = isDarkTheme) {
                LifeOsApp(viewModel = viewModel, isDarkTheme = isDarkTheme)
            }
        }
    }
}

@Composable
fun LifeOsApp(viewModel: LifeOsViewModel, isDarkTheme: Boolean) {
    val currentScreen by viewModel.currentScreen.collectAsStateWithLifecycle()
    val isLocked by viewModel.isLocked.collectAsStateWithLifecycle()

    // Back handling: if not on DASHBOARD, pressing Back navigates to DASHBOARD
    BackHandler(enabled = currentScreen != LifeOsScreen.DASHBOARD && !isLocked) {
        viewModel.navigateTo(LifeOsScreen.DASHBOARD)
    }

    if (isLocked) {
        PrivacyGateLockScreen(
            onUnlock = { pin -> viewModel.unlockGate(pin) }
        )
        return
    }

    val workspaces by viewModel.workspaces.collectAsStateWithLifecycle()
    val activeWorkspaceId by viewModel.activeWorkspaceId.collectAsStateWithLifecycle()
    val searchQuery by viewModel.searchQuery.collectAsStateWithLifecycle()
    val privacyGateEnabled by viewModel.privacyGateEnabled.collectAsStateWithLifecycle()

    val tasks by viewModel.filteredTasks.collectAsStateWithLifecycle()
    val habits by viewModel.filteredHabits.collectAsStateWithLifecycle()
    val scheduleEvents by viewModel.filteredScheduleEvents.collectAsStateWithLifecycle()
    val notes by viewModel.filteredNotes.collectAsStateWithLifecycle()
    val pillars by viewModel.pillars.collectAsStateWithLifecycle()
    val goals by viewModel.filteredGoals.collectAsStateWithLifecycle()

    val isQuickCaptureOpen by viewModel.isQuickCaptureOpen.collectAsStateWithLifecycle()
    val quickCaptureType by viewModel.quickCaptureType.collectAsStateWithLifecycle()
    val isBrainDumpOpen by viewModel.isBrainDumpModalOpen.collectAsStateWithLifecycle()
    val isSettingsOpen by viewModel.isSettingsOpen.collectAsStateWithLifecycle()
    val editingNote by viewModel.editingNote.collectAsStateWithLifecycle()

    // Supabase Cloud Sync
    val syncStatus by viewModel.syncStatus.collectAsStateWithLifecycle()
    val syncAccountEmail by viewModel.syncAccountEmail.collectAsStateWithLifecycle()
    val lastSyncTimeMessage by viewModel.lastSyncTimeMessage.collectAsStateWithLifecycle()
    val isCloudSyncOpen by viewModel.isCloudSyncModalOpen.collectAsStateWithLifecycle()

    // Focus timer state
    val totalSeconds by viewModel.focusTotalSeconds.collectAsStateWithLifecycle()
    val remainingSeconds by viewModel.focusRemainingSeconds.collectAsStateWithLifecycle()
    val isTimerRunning by viewModel.isTimerRunning.collectAsStateWithLifecycle()
    val sessionsCompleted by viewModel.focusSessionsCompleted.collectAsStateWithLifecycle()

    val aiBrief = remember(tasks, habits) {
        viewModel.getDailyAiBrief()
    }

    Scaffold(
        topBar = {
            LifeOsTopBar(
                workspaces = workspaces,
                activeWorkspaceId = activeWorkspaceId,
                onWorkspaceSelected = { viewModel.setActiveWorkspace(it) },
                searchQuery = searchQuery,
                onSearchQueryChanged = { viewModel.setSearchQuery(it) },
                onOpenBrainDump = { viewModel.openBrainDump() },
                onOpenSettings = { viewModel.openSettings() },
                privacyGateEnabled = privacyGateEnabled,
                onLockGate = { viewModel.lockGate() },
                syncStatus = syncStatus,
                onOpenCloudSync = { viewModel.openCloudSyncModal() },
                isDarkTheme = isDarkTheme,
                onToggleTheme = { viewModel.toggleTheme() }
            )
        },
        bottomBar = {
            LifeOsBottomBar(
                currentScreen = currentScreen,
                onScreenSelected = { viewModel.navigateTo(it) }
            )
        },
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (currentScreen) {
                LifeOsScreen.DASHBOARD -> {
                    DashboardScreen(
                        tasks = tasks,
                        habits = habits,
                        scheduleEvents = scheduleEvents,
                        pillars = pillars,
                        aiBrief = aiBrief,
                        onToggleTaskStatus = { viewModel.toggleTaskStatus(it) },
                        onToggleHabitToday = { viewModel.toggleHabitToday(it) },
                        onToggleScheduleEvent = { viewModel.toggleScheduleEventDone(it) },
                        onNavigate = { viewModel.navigateTo(it) },
                        onOpenQuickCapture = { viewModel.openQuickCapture(it) },
                        onOpenBrainDump = { viewModel.openBrainDump() }
                    )
                }
                LifeOsScreen.TASKS -> {
                    TasksScreen(
                        tasks = tasks,
                        onToggleTaskStatus = { viewModel.toggleTaskStatus(it) },
                        onToggleSubTask = { taskId, subId -> viewModel.toggleSubTask(taskId, subId) },
                        onToggleTopPriority = { viewModel.toggleTopPriorityToday(it) },
                        onDeleteTask = { viewModel.deleteTask(it) },
                        onOpenAddTask = { viewModel.openQuickCapture(QuickCaptureType.TASK) }
                    )
                }
                LifeOsScreen.HABITS -> {
                    HabitsScreen(
                        habits = habits,
                        getWeekDays = { offset -> viewModel.getWeekDays(offset) },
                        getWeekRangeLabel = { offset -> viewModel.getWeekRangeLabel(offset) },
                        onToggleHabitDate = { habitId, dateStr -> viewModel.toggleHabitDate(habitId, dateStr) },
                        onDeleteHabit = { viewModel.deleteHabit(it) },
                        onOpenAddHabit = { viewModel.openQuickCapture(QuickCaptureType.HABIT) },
                        isDarkTheme = isDarkTheme,
                        onToggleTheme = { viewModel.toggleTheme() }
                    )
                }
                LifeOsScreen.PLANNER -> {
                    PlannerScreen(
                        scheduleEvents = scheduleEvents,
                        onToggleEventDone = { viewModel.toggleScheduleEventDone(it) },
                        onDeleteEvent = { viewModel.deleteScheduleEvent(it) },
                        onOpenAddEvent = { viewModel.openQuickCapture(QuickCaptureType.SCHEDULE_EVENT) }
                    )
                }
                LifeOsScreen.KNOWLEDGE -> {
                    KnowledgeAndGoalsScreen(
                        notes = notes,
                        pillars = pillars,
                        goals = goals,
                        onTogglePinNote = { viewModel.togglePinNote(it) },
                        onDeleteNote = { viewModel.deleteNote(it) },
                        onOpenNoteEditor = { viewModel.openNoteEditor(it) },
                        onToggleMilestone = { gId, mId -> viewModel.toggleMilestone(gId, mId) },
                        onDeleteGoal = { viewModel.deleteGoal(it) },
                        onOpenAddNote = { viewModel.openQuickCapture(QuickCaptureType.NOTE) },
                        onOpenAddGoal = { viewModel.openQuickCapture(QuickCaptureType.GOAL) }
                    )
                }
                LifeOsScreen.FOCUS -> {
                    FocusScreen(
                        totalSeconds = totalSeconds,
                        remainingSeconds = remainingSeconds,
                        isTimerRunning = isTimerRunning,
                        sessionsCompleted = sessionsCompleted,
                        onToggleTimer = { viewModel.toggleTimer() },
                        onResetTimer = { viewModel.resetTimer() },
                        onSelectPreset = { viewModel.setFocusPreset(it) }
                    )
                }
            }
        }
    }

    // Modals & Bottom Sheets
    QuickCaptureModal(
        isOpen = isQuickCaptureOpen,
        onDismiss = { viewModel.closeQuickCapture() },
        initialType = quickCaptureType,
        workspaces = workspaces,
        activeWorkspaceId = activeWorkspaceId,
        onAddTask = { title, notesText, wsId, priority, isTop ->
            viewModel.addTask(title, notesText, wsId, priority, isTop)
        },
        onAddHabit = { title, wsId, freq, color ->
            viewModel.addHabit(title, wsId, freq, color)
        },
        onAddSchedule = { title, start, end, wsId, cat ->
            viewModel.addScheduleEvent(title, start, end, wsId, cat)
        },
        onAddNote = { title, content, wsId, tags ->
            viewModel.addNote(title, content, wsId, tags)
        },
        onAddGoal = { title, pillarId, wsId, targetDate, milestones ->
            viewModel.addGoal(title, pillarId, wsId, targetDate, milestones)
        }
    )

    BrainDumpModal(
        isOpen = isBrainDumpOpen,
        onDismiss = { viewModel.closeBrainDump() },
        onSynthesize = { text -> viewModel.processBrainDump(text) }
    )

    SettingsModal(
        isOpen = isSettingsOpen,
        onDismiss = { viewModel.closeSettings() },
        privacyGateEnabled = privacyGateEnabled,
        onTogglePrivacyGate = { viewModel.togglePrivacyGate(it) },
        onLockImmediately = { viewModel.lockGate() },
        onSetPin = { viewModel.setPin(it) }
    )

    NoteEditorModal(
        note = editingNote,
        onDismiss = { viewModel.openNoteEditor(null) },
        onSave = { viewModel.updateNote(it) },
        onDelete = { viewModel.deleteNote(it) }
    )

    CloudSyncModal(
        isOpen = isCloudSyncOpen,
        onDismiss = { viewModel.closeCloudSyncModal() },
        syncStatus = syncStatus,
        accountEmail = syncAccountEmail,
        lastSyncMessage = lastSyncTimeMessage,
        onSyncNow = { cb -> viewModel.syncWithSupabase(cb) },
        onSignIn = { email, pass, cb -> viewModel.signInSupabase(email, pass, cb) },
        onSignUp = { email, pass, cb -> viewModel.signUpSupabase(email, pass, cb) },
        onSignOut = { viewModel.signOutSupabase() }
    )
}
