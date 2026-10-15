package com.example.ui.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
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
    onOpenAddHabit: () -> Unit,
    isDarkTheme: Boolean = true,
    onToggleTheme: () -> Unit = {}
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
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            },
            text = {
                Text(
                    text = "Are you sure you want to remove \"${habitToDelete?.title}\"? All historical check-in data will be deleted.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        habitToDelete?.let { onDeleteHabit(it.id) }
                        habitToDelete = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = RoseAccent)
                ) {
                    Text("Delete", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { habitToDelete = null }) {
                    Text("Cancel", color = MaterialTheme.colorScheme.onSurface)
                }
            },
            containerColor = MaterialTheme.colorScheme.surface,
            shape = RoundedCornerShape(16.dp)
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
                .padding(horizontal = 20.dp),
            contentPadding = PaddingValues(top = 16.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Week Horizon Navigator with Theme Mood Switch
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("week_navigator_card"),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        // Previous Week
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

                        // Center: Horizon Label & Reset
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = if (weekOffset == 0) "THIS WEEK" else if (weekOffset == -1) "LAST WEEK" else if (weekOffset == 1) "NEXT WEEK" else "WEEK HORIZON",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 0.8.sp,
                                    color = if (weekOffset == 0) EmeraldAccent else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                if (weekOffset != 0) {
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "Today",
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = EmeraldAccent,
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(4.dp))
                                            .background(EmeraldAccent.copy(alpha = 0.15f))
                                            .clickable { weekOffset = 0 }
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = weekRangeLabel,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }

                        // Next Week
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

            // 2. Weekly Discipline Scorecard
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("weekly_scorecard_card"),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "DISCIPLINE SCORE",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = EmeraldAccent,
                                    letterSpacing = 1.sp
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = if (weeklyScorePercent >= 80) "Exceptional Momentum" else if (weeklyScorePercent >= 50) "Consistent Progress" else "Build Your Routine",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "$totalCompletedInWeek of $totalPossibleSlots check-ins completed this week",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            // Circular Score Gauge
                            Box(
                                modifier = Modifier
                                    .size(68.dp)
                                    .clip(CircleShape)
                                    .background(EmeraldAccent.copy(alpha = 0.12f))
                                    .border(2.dp, EmeraldAccent, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        text = "$weeklyScorePercent%",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = EmeraldAccent
                                    )
                                    Text(
                                        text = "SCORE",
                                        style = MaterialTheme.typography.labelSmall,
                                        fontSize = 8.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Metric Badges
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            // Top Streak Pill
                            Row(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(AmberAccent.copy(alpha = 0.12f))
                                    .border(1.dp, AmberAccent.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                                    .padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    Icons.Default.LocalFireDepartment,
                                    contentDescription = null,
                                    tint = AmberAccent,
                                    modifier = Modifier.size(15.dp)
                                )
                                Text(
                                    text = "$maxStreak days top streak",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = AmberAccent
                                )
                            }

                            // Active Habits Count Pill
                            Row(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(MaterialTheme.colorScheme.surfaceVariant)
                                    .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(8.dp))
                                    .padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = EmeraldAccent,
                                    modifier = Modifier.size(15.dp)
                                )
                                Text(
                                    text = "${filteredHabits.size} active habits",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Medium,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }
                }
            }

            // 3. Category Filter Carousel
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
                                .clip(RoundedCornerShape(10.dp))
                                .background(
                                    if (isSelected) EmeraldAccent
                                    else MaterialTheme.colorScheme.surface
                                )
                                .border(
                                    1.dp,
                                    if (isSelected) EmeraldAccent else MaterialTheme.colorScheme.outline,
                                    RoundedCornerShape(10.dp)
                                )
                                .clickable { selectedCategoryFilter = catKey }
                                .padding(horizontal = 12.dp, vertical = 7.dp)
                                .testTag("category_filter_$catKey"),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "$catLabel ($count)",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) ObsidianDark else MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }

            // 4. Distinct Card Styling for Each Habit Entry (High Readability 7-Day Matrix)
            if (filteredHabits.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(36.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Default.EventNote,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                text = "No habits found in this sphere",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Add daily anchors to build momentum.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(14.dp))
                            Button(
                                onClick = onOpenAddHabit,
                                colors = ButtonDefaults.buttonColors(containerColor = EmeraldAccent, contentColor = ObsidianDark)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Create Habit", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            } else {
                items(filteredHabits, key = { it.id }) { habit ->
                    HabitDistinctCard(
                        habit = habit,
                        weekDays = weekDays,
                        onToggleDate = { dateStr -> onToggleHabitDate(habit.id, dateStr) },
                        onDeleteRequest = { habitToDelete = habit }
                    )
                }
            }

            // 5. Daily Completion Volume Spark
            if (filteredHabits.isNotEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "WEEKLY COMPLETION DISTRIBUTION",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                letterSpacing = 0.8.sp
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Bottom
                            ) {
                                weekDays.forEach { day ->
                                    val countCompleted = filteredHabits.count { it.completedDates.contains(day.dateString) }
                                    val ratio = countCompleted.toFloat() / filteredHabits.size.toFloat()
                                    val barHeight = (42 * ratio).coerceAtLeast(6f).dp

                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        modifier = Modifier.width(36.dp)
                                    ) {
                                        Text(
                                            text = "$countCompleted",
                                            style = MaterialTheme.typography.labelSmall,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (ratio > 0.7f) EmeraldAccent else MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Box(
                                            modifier = Modifier
                                                .width(18.dp)
                                                .height(barHeight)
                                                .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                                                .background(
                                                    if (day.isToday) EmeraldAccent
                                                    else if (ratio >= 0.7f) EmeraldAccent.copy(alpha = 0.6f)
                                                    else if (ratio > 0f) VioletAccent.copy(alpha = 0.4f)
                                                    else MaterialTheme.colorScheme.surfaceVariant
                                                )
                                        )
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Text(
                                            text = day.dayName.take(1),
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = if (day.isToday) FontWeight.Bold else FontWeight.Normal,
                                            color = if (day.isToday) EmeraldAccent else MaterialTheme.colorScheme.onSurfaceVariant,
                                            fontSize = 10.sp
                                        )
                                    }
                                }
                            }
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
            containerColor = EmeraldAccent,
            contentColor = ObsidianDark
        ) {
            Icon(Icons.Default.Add, contentDescription = "Add New Habit")
        }
    }
}

/**
 * Modernized Distinct Habit Card
 * Displays the habit metadata on top, progress bar, and a dedicated, spacious 7-Day Matrix strip
 * where each daily habit entry has its own distinct card styling and tactile spring feedback.
 */
@Composable
fun HabitDistinctCard(
    habit: HabitItem,
    weekDays: List<DayInfo>,
    onToggleDate: (String) -> Unit,
    onDeleteRequest: () -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }

    val habitColor = try {
        Color(android.graphics.Color.parseColor(habit.colorHex))
    } catch (_: Exception) { EmeraldAccent }

    val completedThisWeek = weekDays.count { day -> habit.completedDates.contains(day.dateString) }
    val weeklyRatio = completedThisWeek.toFloat() / 7f

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("habit_card_${habit.id}"),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Habit Card Top Row: Sphere indicator, Title, Streak Flame, Options Menu
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Sphere tag & Title
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(habitColor)
                    )
                    Column {
                        Text(
                            text = habit.title,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = habit.workspaceId.uppercase(),
                            style = MaterialTheme.typography.labelSmall,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Streak Flame & Weekly Rate Badge
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Streak Pill
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(AmberAccent.copy(alpha = 0.12f))
                            .border(1.dp, AmberAccent.copy(alpha = 0.25f), RoundedCornerShape(8.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        Icon(
                            Icons.Default.LocalFireDepartment,
                            contentDescription = null,
                            tint = AmberAccent,
                            modifier = Modifier.size(13.dp)
                        )
                        Text(
                            text = "${habit.streakCount}d",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = AmberAccent,
                            fontSize = 11.sp
                        )
                    }

                    // Weekly Ratio Badge
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "$completedThisWeek/7",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = if (completedThisWeek >= 5) EmeraldAccent else MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 11.sp
                        )
                    }

                    // Options Menu Button
                    Box {
                        IconButton(
                            onClick = { showMenu = true },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(
                                Icons.Default.MoreVert,
                                contentDescription = "Habit Options",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(16.dp)
                            )
                        }

                        DropdownMenu(
                            expanded = showMenu,
                            onDismissRequest = { showMenu = false },
                            modifier = Modifier.background(MaterialTheme.colorScheme.surface)
                        ) {
                            DropdownMenuItem(
                                text = { Text("Delete Habit", color = RoseAccent, fontWeight = FontWeight.Bold) },
                                leadingIcon = { Icon(Icons.Default.Delete, contentDescription = null, tint = RoseAccent) },
                                onClick = {
                                    showMenu = false
                                    onDeleteRequest()
                                }
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Dedicated 7-Day Matrix Strip: Distinct Card Styling for Each Day
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                weekDays.forEach { day ->
                    DayMatrixCell(
                        day = day,
                        isCompleted = habit.completedDates.contains(day.dateString),
                        accentColor = habitColor,
                        onToggle = { onToggleDate(day.dateString) },
                        testTag = "habit_${habit.id}_cell_${day.dateString}"
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Micro Weekly Progress Indicator
            LinearProgressIndicator(
                progress = { weeklyRatio },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .clip(RoundedCornerShape(1.5.dp)),
                color = if (weeklyRatio >= 0.7f) EmeraldAccent else habitColor.copy(alpha = 0.8f),
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )
        }
    }
}

/**
 * Individual Daily Habit Entry Card with Distinct Card Styling & Tactile Feedback.
 * Features:
 * - Distinct vertical card container for each day
 * - Day name, date number, and interactive state icon
 * - Spring bounce animation on toggle
 * - Visual highlight for "Today"
 * - High-contrast styling in both dark and light modes
 */
@Composable
fun DayMatrixCell(
    day: DayInfo,
    isCompleted: Boolean,
    accentColor: Color,
    onToggle: () -> Unit,
    testTag: String
) {
    // Dynamic spring bounce scale on toggle
    val targetScale = if (isCompleted) 1.0f else 0.96f
    val animatedScale by animateFloatAsState(
        targetValue = targetScale,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "cell_scale"
    )

    // Animated background color transition
    val animatedBg by animateColorAsState(
        targetValue = when {
            isCompleted -> EmeraldAccent
            day.isToday -> EmeraldAccent.copy(alpha = 0.12f)
            else -> MaterialTheme.colorScheme.surfaceVariant
        },
        animationSpec = tween(durationMillis = 200),
        label = "cell_bg"
    )

    // Animated border color transition
    val animatedBorder by animateColorAsState(
        targetValue = when {
            isCompleted -> EmeraldAccent
            day.isToday -> EmeraldAccent.copy(alpha = 0.6f)
            else -> MaterialTheme.colorScheme.outlineVariant
        },
        animationSpec = tween(durationMillis = 200),
        label = "cell_border"
    )

    // Distinct Card for each daily habit entry
    Box(
        modifier = Modifier
            .width(42.dp)
            .height(68.dp)
            .scale(animatedScale)
            .clip(RoundedCornerShape(12.dp))
            .background(animatedBg)
            .border(
                width = if (day.isToday && !isCompleted) 1.5.dp else 1.dp,
                color = animatedBorder,
                shape = RoundedCornerShape(12.dp)
            )
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onToggle
            )
            .padding(vertical = 6.dp)
            .testTag(testTag),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxHeight()
        ) {
            // Day of Week Header (e.g. "M", "T", "W")
            Text(
                text = day.dayName.take(1),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = if (day.isToday) FontWeight.Bold else FontWeight.SemiBold,
                color = when {
                    isCompleted -> ObsidianDark.copy(alpha = 0.75f)
                    day.isToday -> EmeraldAccent
                    else -> MaterialTheme.colorScheme.onSurfaceVariant
                },
                fontSize = 11.sp
            )

            // Day Number (e.g. "15")
            Text(
                text = day.dayNumber,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = if (day.isToday) FontWeight.ExtraBold else FontWeight.Medium,
                color = when {
                    isCompleted -> ObsidianDark.copy(alpha = 0.85f)
                    day.isToday -> MaterialTheme.colorScheme.onSurface
                    else -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                },
                fontSize = 10.sp
            )

            // Visual Status Icon / Indicator
            Box(
                modifier = Modifier
                    .size(20.dp)
                    .clip(CircleShape)
                    .background(
                        when {
                            isCompleted -> ObsidianDark
                            day.isToday -> EmeraldAccent.copy(alpha = 0.2f)
                            else -> Color.Transparent
                        }
                    ),
                contentAlignment = Alignment.Center
            ) {
                if (isCompleted) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = "Completed",
                        tint = EmeraldAccent,
                        modifier = Modifier.size(13.dp)
                    )
                } else if (day.isToday) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(EmeraldAccent)
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, CircleShape)
                    )
                }
            }
        }
    }
}
