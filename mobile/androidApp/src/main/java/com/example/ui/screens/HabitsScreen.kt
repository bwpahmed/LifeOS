package com.example.ui.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.DayInfo
import com.example.model.HabitItem
import com.example.ui.theme.*

@Composable
fun HabitsScreen(
    habits: List<HabitItem>,
    getWeekDays: (weekOffset: Int) -> List<DayInfo>,
    getWeekRangeLabel: (weekOffset: Int) -> String,
    onToggleHabitDate: (habitId: String, dateString: String) -> Unit,
    onDeleteHabit: (String) -> Unit,
    onOpenAddHabit: () -> Unit
) {
    var weekOffset by remember { mutableIntStateOf(0) }
    var selectedCategoryFilter by remember { mutableStateOf("ALL") }
    var habitToDelete by remember { mutableStateOf<HabitItem?>(null) }

    val weekDays = remember(weekOffset) {
        getWeekDays(weekOffset)
    }

    val weekRangeLabel = remember(weekOffset) {
        getWeekRangeLabel(weekOffset)
    }

    val categories = listOf(
        "ALL" to "All Spheres",
        "health" to "Health",
        "work" to "Work",
        "growth" to "Mind",
        "personal" to "Personal",
        "finance" to "Finance"
    )

    val filteredHabits = if (selectedCategoryFilter == "ALL") {
        habits
    } else {
        habits.filter { it.workspaceId.equals(selectedCategoryFilter, ignoreCase = true) }
    }

    // Weekly metrics calculation for active week
    val totalPossibleSlots = (filteredHabits.size * 7).coerceAtLeast(1)
    val totalCompletedInWeek = filteredHabits.sumOf { habit ->
        weekDays.count { day -> habit.completedDates.contains(day.dateString) }
    }
    val weeklyScorePercent = ((totalCompletedInWeek.toFloat() / totalPossibleSlots.toFloat()) * 100).toInt()
    val maxStreak = if (habits.isNotEmpty()) habits.maxOf { it.streakCount } else 0

    // Confirmation dialog for deleting a habit
    if (habitToDelete != null) {
        AlertDialog(
            onDismissRequest = { habitToDelete = null },
            title = {
                Text(
                    text = "Delete Habit",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Text(
                    text = "Are you sure you want to remove \"${habitToDelete?.title}\"? All historical check-in data will be deleted.",
                    style = MaterialTheme.typography.bodyMedium
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        habitToDelete?.let { onDeleteHabit(it.id) }
                        habitToDelete = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = RoseRed)
                ) {
                    Text("Delete", color = White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { habitToDelete = null }) {
                    Text("Cancel")
                }
            },
            containerColor = MaterialTheme.colorScheme.surface
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .testTag("habits_screen")
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            contentPadding = PaddingValues(top = 12.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // 1. Week Horizon Navigator Bar
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("week_navigator_card"),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 10.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        IconButton(
                            onClick = { weekOffset-- },
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                                .testTag("btn_prev_week")
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Previous Week",
                                tint = MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.size(18.dp)
                            )
                        }

                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = if (weekOffset == 0) "This Week" else if (weekOffset == -1) "Last Week" else if (weekOffset == 1) "Next Week" else "Week Horizon",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = if (weekOffset == 0) EmeraldDark else Slate600
                                )
                                if (weekOffset != 0) {
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "Reset",
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = EmeraldGreen,
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(4.dp))
                                            .background(EmeraldSoftBg)
                                            .clickable { weekOffset = 0 }
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                            Text(
                                text = weekRangeLabel,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.ExtraBold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }

                        IconButton(
                            onClick = { weekOffset++ },
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                                .testTag("btn_next_week")
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowForward,
                                contentDescription = "Next Week",
                                tint = MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }

            // 2. Weekly Scorecard & Goal Adherence Card
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("weekly_scorecard_card"),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(18.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .clip(CircleShape)
                                            .background(EmeraldGreen)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "WEEKLY HABIT DISCIPLINE",
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = EmeraldDark,
                                        letterSpacing = 0.5.sp
                                    )
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = if (weeklyScorePercent >= 80) "Exceptional Momentum" else if (weeklyScorePercent >= 50) "Consistent Progress" else "Build Your Routine",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "$totalCompletedInWeek of $totalPossibleSlots check-ins completed this week",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Slate600
                                )
                            }

                            // Circular Weekly Score Dial
                            Box(
                                modifier = Modifier
                                    .size(72.dp)
                                    .clip(CircleShape)
                                    .background(EmeraldSoftBg)
                                    .border(2.5.dp, EmeraldGreen, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        text = "$weeklyScorePercent%",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = EmeraldDark
                                    )
                                    Text(
                                        text = "SCORE",
                                        style = MaterialTheme.typography.labelSmall,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = EmeraldGreen
                                    )
                                }
                            }
                        }

                        // Streak and metrics pills
                        Spacer(modifier = Modifier.height(14.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            // Streak pill
                            Row(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(AmberSoftBg)
                                    .border(1.dp, AmberLight.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                                    .padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.LocalFireDepartment,
                                    contentDescription = null,
                                    tint = AmberGold,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "$maxStreak days top streak",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Slate900
                                )
                            }

                            // Total active habits pill
                            Row(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(MaterialTheme.colorScheme.surfaceVariant)
                                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp))
                                    .padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = EmeraldGreen,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "${filteredHabits.size} active habits",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Slate900
                                )
                            }
                        }
                    }
                }
            }

            // 3. Category Filter Bar
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    categories.forEach { (catKey, catLabel) ->
                        val isSelected = selectedCategoryFilter == catKey
                        val count = if (catKey == "ALL") habits.size else habits.count { it.workspaceId.equals(catKey, ignoreCase = true) }

                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(if (isSelected) EmeraldGreen else MaterialTheme.colorScheme.surface)
                                .border(
                                    1.dp,
                                    if (isSelected) EmeraldGreen else MaterialTheme.colorScheme.outline,
                                    RoundedCornerShape(20.dp)
                                )
                                .clickable { selectedCategoryFilter = catKey }
                                .padding(horizontal = 14.dp, vertical = 7.dp)
                                .testTag("category_filter_$catKey"),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "$catLabel ($count)",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) White else Slate700
                            )
                        }
                    }
                }
            }

            // 4. Interactive 7-Day Matrix Table Card
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("habit_matrix_table"),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp)
                    ) {
                        // Matrix Table Header
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Habit Title Column Header
                            Text(
                                text = "HABIT & STREAK",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = Slate600,
                                modifier = Modifier.weight(1.3f)
                            )

                            // 7 Days Columns Headers (M T W T F S S)
                            Row(
                                modifier = Modifier.weight(1.7f),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                weekDays.forEach { day ->
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        modifier = Modifier.width(30.dp)
                                    ) {
                                        Text(
                                            text = day.dayName.take(1),
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = if (day.isToday) FontWeight.ExtraBold else FontWeight.Bold,
                                            color = if (day.isToday) EmeraldDark else Slate600,
                                            fontSize = 11.sp
                                        )
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Box(
                                            modifier = Modifier
                                                .size(22.dp)
                                                .clip(CircleShape)
                                                .background(if (day.isToday) EmeraldGreen else Color.Transparent),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = day.dayNumber,
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = FontWeight.Bold,
                                                color = if (day.isToday) White else Slate700,
                                                fontSize = 10.sp
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        HorizontalDivider(
                            color = MaterialTheme.colorScheme.outline,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 4.dp)
                        )

                        if (filteredHabits.isEmpty()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 36.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(
                                        Icons.Default.EventNote,
                                        contentDescription = null,
                                        tint = Slate400,
                                        modifier = Modifier.size(44.dp)
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        "No habits found in this sphere.",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        "Add daily disciplines to build continuous momentum.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Slate600
                                    )
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Button(
                                        onClick = onOpenAddHabit,
                                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen)
                                    ) {
                                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Create New Habit", fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        } else {
                            // Habit Matrix Rows
                            filteredHabits.forEachIndexed { index, habit ->
                                HabitMatrixRow(
                                    habit = habit,
                                    weekDays = weekDays,
                                    onToggleDate = { dateStr -> onToggleHabitDate(habit.id, dateStr) },
                                    onDeleteRequest = { habitToDelete = habit }
                                )

                                if (index < filteredHabits.lastIndex) {
                                    HorizontalDivider(
                                        color = MaterialTheme.colorScheme.outlineVariant,
                                        modifier = Modifier.padding(horizontal = 14.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // 5. Daily Adherence Spark Summary (Daily completion across the active week)
            if (filteredHabits.isNotEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = "DAILY COMPLETION RATE",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = Slate600
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Bottom
                            ) {
                                weekDays.forEach { day ->
                                    val countCompleted = filteredHabits.count { it.completedDates.contains(day.dateString) }
                                    val ratio = countCompleted.toFloat() / filteredHabits.size.toFloat()
                                    val barHeight = (36 * ratio).coerceAtLeast(4f).dp

                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        modifier = Modifier.width(36.dp)
                                    ) {
                                        Text(
                                            text = "$countCompleted",
                                            style = MaterialTheme.typography.labelSmall,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (ratio > 0.7f) EmeraldDark else Slate600
                                        )
                                        Spacer(modifier = Modifier.height(3.dp))
                                        Box(
                                            modifier = Modifier
                                                .width(16.dp)
                                                .height(barHeight)
                                                .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                                                .background(
                                                    if (day.isToday) EmeraldGreen
                                                    else if (ratio >= 0.7f) EmeraldLight
                                                    else if (ratio > 0f) Slate300
                                                    else Slate200
                                                )
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = day.dayName.take(1),
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = if (day.isToday) FontWeight.Bold else FontWeight.Normal,
                                            color = if (day.isToday) EmeraldDark else Slate600,
                                            fontSize = 10.sp
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 6. Interactive Tips Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = EmeraldSoftBg),
                    border = androidx.compose.foundation.BorderStroke(1.dp, EmeraldBorder)
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.TouchApp,
                            contentDescription = null,
                            tint = EmeraldDark,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Instant 7-Day Matrix Toggles",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = EmeraldDark
                            )
                            Text(
                                text = "Tap any cell to toggle check-in for that specific day. Streaks and weekly scores recalculate automatically.",
                                style = MaterialTheme.typography.bodySmall,
                                color = Slate900,
                                lineHeight = 16.sp
                            )
                        }
                    }
                }
            }
        }

        // Add Habit Floating Action Button
        FloatingActionButton(
            onClick = onOpenAddHabit,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(bottom = 96.dp, end = 20.dp)
                .testTag("add_habit_fab"),
            containerColor = EmeraldGreen,
            contentColor = White
        ) {
            Icon(Icons.Default.Add, contentDescription = "Add New Habit")
        }
    }
}

@Composable
fun HabitMatrixRow(
    habit: HabitItem,
    weekDays: List<DayInfo>,
    onToggleDate: (String) -> Unit,
    onDeleteRequest: () -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }

    val habitColor = try {
        Color(android.graphics.Color.parseColor(habit.colorHex))
    } catch (_: Exception) { EmeraldGreen }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 10.dp)
            .testTag("habit_row_${habit.id}"),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Left Column: Habit Info, Category & Streak
        Box(
            modifier = Modifier
                .weight(1.3f)
                .padding(end = 6.dp)
        ) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(habitColor)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = habit.title,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.clickable { showMenu = true }
                    )
                }
                Spacer(modifier = Modifier.height(3.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.LocalFireDepartment,
                        contentDescription = null,
                        tint = AmberGold,
                        modifier = Modifier.size(13.dp)
                    )
                    Spacer(modifier = Modifier.width(2.dp))
                    Text(
                        text = "${habit.streakCount}d streak",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = AmberGold,
                        fontSize = 11.sp
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "• ${habit.workspaceId.replaceFirstChar { it.uppercase() }}",
                        style = MaterialTheme.typography.labelSmall,
                        color = Slate600,
                        fontSize = 10.sp
                    )
                }
            }

            DropdownMenu(
                expanded = showMenu,
                onDismissRequest = { showMenu = false },
                modifier = Modifier.background(MaterialTheme.colorScheme.surface)
            ) {
                DropdownMenuItem(
                    text = { Text("Delete Habit", color = RoseRed, fontWeight = FontWeight.Bold) },
                    leadingIcon = { Icon(Icons.Default.Delete, contentDescription = null, tint = RoseRed) },
                    onClick = {
                        showMenu = false
                        onDeleteRequest()
                    }
                )
            }
        }

        // Right Column: 7 Clickable Day Toggle Cells
        Row(
            modifier = Modifier.weight(1.7f),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            weekDays.forEach { day ->
                val isCompleted = habit.completedDates.contains(day.dateString)

                val cellBg by animateColorAsState(
                    targetValue = when {
                        isCompleted -> EmeraldGreen
                        day.isToday -> EmeraldSoftBg
                        else -> MaterialTheme.colorScheme.surface
                    },
                    animationSpec = tween(durationMillis = 200),
                    label = "cell_bg"
                )

                val cellBorder by animateColorAsState(
                    targetValue = when {
                        isCompleted -> EmeraldGreen
                        day.isToday -> EmeraldLight
                        else -> MaterialTheme.colorScheme.outline
                    },
                    animationSpec = tween(durationMillis = 200),
                    label = "cell_border"
                )

                Box(
                    modifier = Modifier
                        .size(30.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(cellBg)
                        .border(1.dp, cellBorder, RoundedCornerShape(8.dp))
                        .clickable { onToggleDate(day.dateString) }
                        .testTag("habit_${habit.id}_cell_${day.dateString}"),
                    contentAlignment = Alignment.Center
                ) {
                    if (isCompleted) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = "Completed",
                            tint = White,
                            modifier = Modifier.size(17.dp)
                        )
                    } else if (day.isToday) {
                        Box(
                            modifier = Modifier
                                .size(5.dp)
                                .clip(CircleShape)
                                .background(EmeraldGreen.copy(alpha = 0.5f))
                        )
                    }
                }
            }
        }
    }
}
