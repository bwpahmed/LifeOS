package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.LifeOsRepository
import com.example.model.*
import com.example.ui.theme.*
import com.example.ui.viewmodel.LifeOsScreen
import com.example.ui.viewmodel.QuickCaptureType

@Composable
fun DashboardScreen(
    tasks: List<TaskItem>,
    habits: List<HabitItem>,
    scheduleEvents: List<ScheduleEvent>,
    pillars: List<LifePillar>,
    aiBrief: DailyAiBrief,
    onToggleTaskStatus: (String) -> Unit,
    onToggleHabitToday: (String) -> Unit,
    onToggleScheduleEvent: (String) -> Unit,
    onNavigate: (LifeOsScreen) -> Unit,
    onOpenQuickCapture: (QuickCaptureType) -> Unit,
    onOpenBrainDump: () -> Unit
) {
    val todayDate = LifeOsRepository.getTodayDateString()
    val topTasks = tasks.filter { it.isTopPriorityToday || it.priority == TaskPriority.URGENT }.take(3)
    val completedTasksCount = tasks.count { it.status == TaskStatus.DONE }
    val totalTasksCount = tasks.size
    val completedHabitsCount = habits.count { it.completedDates.contains(todayDate) }
    val totalHabitsCount = habits.size

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 16.dp)
            .testTag("dashboard_screen"),
        contentPadding = PaddingValues(top = 12.dp, bottom = 88.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Daily Command Center Greeting Card (Inspired by Web LifeOS)
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("ai_briefing_card"),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(24.dp)
                                    .clip(CircleShape)
                                    .background(EmeraldSoftBg),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.AutoAwesome,
                                    contentDescription = null,
                                    tint = EmeraldGreen,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "DAILY COMMAND CENTER",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = EmeraldDark,
                                letterSpacing = 0.5.sp
                            )
                        }

                        IconButton(
                            onClick = onOpenBrainDump,
                            modifier = Modifier
                                .size(30.dp)
                                .clip(CircleShape)
                                .background(AmberSoftBg)
                        ) {
                            Icon(Icons.Default.FlashOn, contentDescription = "Quick AI", tint = AmberGold, modifier = Modifier.size(16.dp))
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = aiBrief.greeting,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = aiBrief.motivationalQuote,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Slate700,
                        lineHeight = 20.sp
                    )

                    Spacer(modifier = Modifier.height(14.dp))
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                    Spacer(modifier = Modifier.height(10.dp))

                    aiBrief.topRecommendations.forEach { rec ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(vertical = 3.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(EmeraldGreen)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = rec,
                                style = MaterialTheme.typography.bodySmall,
                                color = Slate900
                            )
                        }
                    }
                }
            }
        }

        // Executive Metrics Counters
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                MetricWidget(
                    title = "Today's Habits",
                    value = "$completedHabitsCount / $totalHabitsCount",
                    progress = if (totalHabitsCount > 0) completedHabitsCount.toFloat() / totalHabitsCount else 0f,
                    color = EmeraldGreen,
                    modifier = Modifier.weight(1f),
                    onClick = { onNavigate(LifeOsScreen.HABITS) }
                )
                MetricWidget(
                    title = "Tasks Progress",
                    value = "$completedTasksCount / $totalTasksCount",
                    progress = if (totalTasksCount > 0) completedTasksCount.toFloat() / totalTasksCount else 0f,
                    color = ElectricCyan,
                    modifier = Modifier.weight(1f),
                    onClick = { onNavigate(LifeOsScreen.TASKS) }
                )
            }
        }

        // Must-Win Priorities (Top 3 daily anchors)
        item {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Star, contentDescription = null, tint = AmberGold, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Must-Win Priorities Today",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    TextButton(onClick = { onNavigate(LifeOsScreen.TASKS) }) {
                        Text("View All", color = EmeraldGreen, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                    }
                }

                if (topTasks.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.surface)
                            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
                            .padding(16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "No anchor priorities designated today. Tap '+' to anchor a task.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Slate600
                        )
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        topTasks.forEach { task ->
                            TaskRowItem(
                                task = task,
                                onToggleStatus = { onToggleTaskStatus(task.id) }
                            )
                        }
                    }
                }
            }
        }

        // Daily Habits Checklist with 7-Day Matrix Navigation
        item {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.LocalFireDepartment, contentDescription = null, tint = EmeraldGreen, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Today's Habit Checklist",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    TextButton(onClick = { onNavigate(LifeOsScreen.HABITS) }) {
                        Text("7-Day Matrix →", color = EmeraldGreen, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                    }
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    habits.take(4).forEach { habit ->
                        val isDone = habit.completedDates.contains(todayDate)
                        HabitCompactRow(
                            habit = habit,
                            isDone = isDone,
                            onToggle = { onToggleHabitToday(habit.id) }
                        )
                    }
                }
            }
        }

        // Today's Time-Blocked Schedule
        item {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.AccessTime, contentDescription = null, tint = EmeraldDark, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Today's Schedule",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    TextButton(onClick = { onNavigate(LifeOsScreen.PLANNER) }) {
                        Text("Planner", color = EmeraldGreen, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                    }
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    scheduleEvents.take(3).forEach { event ->
                        ScheduleRowItem(
                            event = event,
                            onToggle = { onToggleScheduleEvent(event.id) }
                        )
                    }
                }
            }
        }

        // Life Pillars Balance Overview
        item {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "Life Spheres Equilibrium",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    pillars.take(3).forEach { pillar ->
                        PillarMiniCard(
                            pillar = pillar,
                            modifier = Modifier.weight(1f),
                            onClick = { onNavigate(LifeOsScreen.KNOWLEDGE) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun MetricWidget(
    title: String,
    value: String,
    progress: Float,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier.clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(title, style = MaterialTheme.typography.labelSmall, color = Slate700)
            Spacer(modifier = Modifier.height(4.dp))
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onSurface)
            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { progress.coerceIn(0f, 1f) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp)),
                color = color,
                trackColor = Slate100
            )
        }
    }
}

@Composable
fun TaskRowItem(
    task: TaskItem,
    onToggleStatus: () -> Unit
) {
    val isDone = task.status == TaskStatus.DONE
    val priorityColor = when (task.priority) {
        TaskPriority.LOW -> Slate600
        TaskPriority.MEDIUM -> ElectricCyan
        TaskPriority.HIGH -> AmberGold
        TaskPriority.URGENT -> RoseRed
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, if (isDone) Slate200 else MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
            .clickable { onToggleStatus() }
            .padding(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Checkbox(
                checked = isDone,
                onCheckedChange = { onToggleStatus() },
                colors = CheckboxDefaults.colors(
                    checkedColor = EmeraldGreen,
                    uncheckedColor = Slate400,
                    checkmarkColor = White
                )
            )
            Spacer(modifier = Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = task.title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isDone) Slate400 else MaterialTheme.colorScheme.onSurface,
                    textDecoration = if (isDone) androidx.compose.ui.text.style.TextDecoration.LineThrough else null
                )
                if (task.notes.isNotBlank()) {
                    Text(
                        text = task.notes,
                        style = MaterialTheme.typography.bodySmall,
                        color = Slate600,
                        maxLines = 1
                    )
                }
            }
            Spacer(modifier = Modifier.width(8.dp))
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(priorityColor.copy(alpha = 0.12f))
                    .padding(horizontal = 8.dp, vertical = 3.dp)
            ) {
                Text(
                    text = task.priority.label,
                    style = MaterialTheme.typography.labelSmall,
                    color = priorityColor,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
fun HabitCompactRow(
    habit: HabitItem,
    isDone: Boolean,
    onToggle: () -> Unit
) {
    val color = try {
        Color(android.graphics.Color.parseColor(habit.colorHex))
    } catch (_: Exception) { EmeraldGreen }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, if (isDone) EmeraldBorder else MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
            .padding(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(color)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        text = habit.title,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.LocalFireDepartment,
                            contentDescription = null,
                            tint = AmberGold,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(2.dp))
                        Text(
                            text = "${habit.streakCount} day streak",
                            style = MaterialTheme.typography.labelSmall,
                            color = AmberGold,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            IconButton(
                onClick = onToggle,
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(if (isDone) EmeraldGreen else Slate100)
                    .border(1.dp, if (isDone) EmeraldGreen else Slate200, CircleShape)
            ) {
                Icon(
                    Icons.Default.Check,
                    contentDescription = "Complete Habit",
                    tint = if (isDone) White else Slate400,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

@Composable
fun ScheduleRowItem(
    event: ScheduleEvent,
    onToggle: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, if (event.isDone) Slate200 else MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
            .clickable { onToggle() }
            .padding(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "${event.startTime} - ${event.endTime}",
                    style = MaterialTheme.typography.labelSmall,
                    color = EmeraldDark,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = event.title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = if (event.isDone) Slate400 else MaterialTheme.colorScheme.onSurface,
                    textDecoration = if (event.isDone) androidx.compose.ui.text.style.TextDecoration.LineThrough else null
                )
            }
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(Slate100)
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text(
                    text = event.category,
                    style = MaterialTheme.typography.labelSmall,
                    color = Slate700,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
fun PillarMiniCard(
    pillar: LifePillar,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val color = try {
        Color(android.graphics.Color.parseColor(pillar.colorHex))
    } catch (_: Exception) { EmeraldGreen }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(10.dp)
    ) {
        Column {
            Text(
                text = pillar.title.split(" ").firstOrNull() ?: "",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "${(pillar.progressPercent * 100).toInt()}%",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.ExtraBold,
                color = color
            )
            Spacer(modifier = Modifier.height(6.dp))
            LinearProgressIndicator(
                progress = { pillar.progressPercent },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp)),
                color = color,
                trackColor = Slate100
            )
        }
    }
}
