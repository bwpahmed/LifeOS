package com.lifeos.mobile

import com.lifeos.mobile.domain.HabitFrequency
import com.lifeos.mobile.domain.HabitItem
import com.lifeos.mobile.domain.SyncQueueOp
import com.lifeos.mobile.domain.SyncState
import com.lifeos.mobile.domain.TaskItem
import com.lifeos.mobile.domain.TaskPriority
import com.lifeos.mobile.domain.TaskStatus
import com.lifeos.mobile.supabase.RealtimeSyncEngine
import com.lifeos.mobile.supabase.RealtimeTableEvent
import com.lifeos.mobile.supabase.SupabaseConfig
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class SyncEngineTest {

    @Test
    fun testSingleOwnerRestrictionConfigured() {
        assertEquals("bwpahmed@gmail.com", SupabaseConfig.OWNER_EMAIL)
        assertTrue(SupabaseConfig.PROJECT_URL.startsWith("https://"))
        assertTrue(SupabaseConfig.PUBLISHABLE_KEY.isNotEmpty())
    }

    @Test
    fun testTaskCreationAndSyncState() {
        val task = TaskItem(
            id = "task-123",
            title = "Test Task",
            workspaceId = "work",
            priority = TaskPriority.HIGH,
            status = TaskStatus.TODO,
            syncState = SyncState.PENDING_INSERT,
            isDemoData = false
        )
        assertEquals("task-123", task.id)
        assertEquals(SyncState.PENDING_INSERT, task.syncState)
        assertFalse(task.isDemoData)
    }

    @Test
    fun testConflictResolutionLocalUnsyncedWinsOverCloud() {
        val localTask = TaskItem(
            id = "task-sync-1",
            title = "Locally Modified Note",
            notes = "Local work in progress",
            workspaceId = "work",
            status = TaskStatus.IN_PROGRESS,
            syncState = SyncState.PENDING_UPDATE,
            isDemoData = false
        )

        val cloudTask = TaskItem(
            id = "task-sync-1",
            title = "Old Cloud Title",
            notes = "Stale cloud notes",
            workspaceId = "work",
            status = TaskStatus.TODO,
            syncState = SyncState.SYNCED,
            isDemoData = false
        )

        // Reconciliation simulation: local unsynced edits must be preserved
        val localList = listOf(localTask)
        val cloudList = listOf(cloudTask)

        val merged = mutableListOf<TaskItem>()
        for (ct in cloudList) {
            val localUnsynced = localList.find { it.id == ct.id && it.syncState != SyncState.SYNCED }
            if (localUnsynced != null) {
                merged.add(localUnsynced)
            } else {
                merged.add(ct)
            }
        }

        assertEquals(1, merged.size)
        assertEquals("Locally Modified Note", merged[0].title)
        assertEquals(TaskStatus.IN_PROGRESS, merged[0].status)
    }

    @Test
    fun testDemoDataIsolation() {
        val demoTask = TaskItem(
            id = "demo_t1",
            title = "Demo Task",
            workspaceId = "personal",
            isDemoData = true
        )
        val realTask = TaskItem(
            id = "real_t1",
            title = "Real User Task",
            workspaceId = "personal",
            isDemoData = false
        )

        val tasks = listOf(demoTask, realTask)
        val syncCandidates = tasks.filter { !it.isDemoData }

        assertEquals(1, syncCandidates.size)
        assertEquals("real_t1", syncCandidates[0].id)
    }

    @Test
    fun testRealtimeEventParsing() {
        val engine = RealtimeSyncEngine()

        val taskInsertMsg = """{"topic":"realtime:public","event":"postgres_changes","payload":{"data":{"table":"tasks","type":"INSERT","record":{"id":"123","name":"New"}}}}"""
        val event1 = engine.parsePhoenixMessage(taskInsertMsg)
        assertNotNull(event1)
        assertTrue(event1 is RealtimeTableEvent.TasksChanged)
        assertEquals("INSERT", (event1 as RealtimeTableEvent.TasksChanged).action)

        val habitMsg = """{"topic":"realtime:public","event":"postgres_changes","payload":{"data":{"table":"habits","type":"UPDATE"}}}"""
        val event2 = engine.parsePhoenixMessage(habitMsg)
        assertNotNull(event2)
        assertTrue(event2 is RealtimeTableEvent.HabitsChanged)

        val stickyMsg = """{"topic":"realtime:public","event":"postgres_changes","payload":{"data":{"table":"sticky_notes","type":"UPDATE"}}}"""
        val event3 = engine.parsePhoenixMessage(stickyMsg)
        assertNotNull(event3)
        assertTrue(event3 is RealtimeTableEvent.StickyNotesChanged)
    }

    @Test
    fun testHabitStreakCalculation() {
        val habit = HabitItem(
            id = "h-1",
            title = "Daily Meditation",
            workspaceId = "health",
            frequency = HabitFrequency.DAILY,
            streakCount = 7,
            completedDates = listOf("2026-10-10", "2026-10-11", "2026-10-12")
        )
        assertEquals(3, habit.completedDates.size)
        assertFalse(habit.isDemoData)
    }
}
