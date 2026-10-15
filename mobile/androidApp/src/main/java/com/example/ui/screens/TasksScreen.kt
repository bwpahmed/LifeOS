package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.SubTask
import com.example.model.TaskItem
import com.example.model.TaskPriority
import com.example.model.TaskStatus
import com.example.ui.theme.*

@Composable
fun TasksScreen(
    tasks: List<TaskItem>,
    onToggleTaskStatus: (String) -> Unit,
    onToggleSubTask: (String, String) -> Unit,
    onToggleTopPriority: (String) -> Unit,
    onDeleteTask: (String) -> Unit,
    onOpenAddTask: () -> Unit
) {
    var selectedStatusFilter by remember { mutableStateOf<TaskStatus?>(null) }
    var selectedPriorityFilter by remember { mutableStateOf<TaskPriority?>(null) }

    val filteredList = tasks.filter { task ->
        val statusMatches = selectedStatusFilter == null || task.status == selectedStatusFilter
        val priorityMatches = selectedPriorityFilter == null || task.priority == selectedPriorityFilter
        statusMatches && priorityMatches
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .testTag("tasks_screen")
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp)
        ) {
            // Status Filters Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = selectedStatusFilter == null,
                    onClick = { selectedStatusFilter = null },
                    label = { Text("All (${tasks.size})") },
                    colors = chipColors()
                )
                TaskStatus.values().forEach { status ->
                    val count = tasks.count { it.status == status }
                    FilterChip(
                        selected = selectedStatusFilter == status,
                        onClick = {
                            selectedStatusFilter = if (selectedStatusFilter == status) null else status
                        },
                        label = { Text("${status.label} ($count)") },
                        colors = chipColors()
                    )
                }
            }

            // Priority Quick Badges
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(bottom = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                TaskPriority.values().reversed().forEach { priority ->
                    val isSel = selectedPriorityFilter == priority
                    val color = when (priority) {
                        TaskPriority.URGENT -> RoseAccent
                        TaskPriority.HIGH -> AmberAccent
                        TaskPriority.MEDIUM -> CyanAccent
                        TaskPriority.LOW -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                    }
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isSel) color.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surface)
                            .border(1.dp, if (isSel) color else MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp))
                            .clickable {
                                selectedPriorityFilter = if (isSel) null else priority
                            }
                            .padding(horizontal = 10.dp, vertical = 5.dp)
                    ) {
                        Text(
                            text = priority.label,
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isSel) color else MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = if (isSel) FontWeight.Bold else FontWeight.Medium
                        )
                    }
                }
            }

            if (filteredList.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.CheckCircleOutline,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                            modifier = Modifier.size(52.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            "No tasks found for the active filter.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            onClick = onOpenAddTask,
                            colors = ButtonDefaults.buttonColors(containerColor = EmeraldAccent, contentColor = ObsidianDark)
                        ) {
                            Text("Create New Task", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(top = 4.dp, bottom = 88.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filteredList, key = { it.id }) { task ->
                        TaskDetailCard(
                            task = task,
                            onToggleStatus = { onToggleTaskStatus(task.id) },
                            onToggleSubTask = { subId -> onToggleSubTask(task.id, subId) },
                            onToggleTopPriority = { onToggleTopPriority(task.id) },
                            onDelete = { onDeleteTask(task.id) }
                        )
                    }
                }
            }
        }

        // Floating Action Button
        FloatingActionButton(
            onClick = onOpenAddTask,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(bottom = 96.dp, end = 20.dp)
                .testTag("add_task_fab"),
            containerColor = EmeraldGreen,
            contentColor = White
        ) {
            Icon(Icons.Default.Add, contentDescription = "Add Task")
        }
    }
}

@Composable
fun TaskDetailCard(
    task: TaskItem,
    onToggleStatus: () -> Unit,
    onToggleSubTask: (String) -> Unit,
    onToggleTopPriority: () -> Unit,
    onDelete: () -> Unit
) {
    val isDone = task.status == TaskStatus.DONE
    var isExpanded by remember { mutableStateOf(false) }

    val priorityColor = when (task.priority) {
        TaskPriority.LOW -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
        TaskPriority.MEDIUM -> CyanAccent
        TaskPriority.HIGH -> AmberAccent
        TaskPriority.URGENT -> RoseAccent
    }

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (task.isTopPriorityToday) AmberAccent.copy(alpha = 0.5f) else MaterialTheme.colorScheme.outline
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Checkbox(
                    checked = isDone,
                    onCheckedChange = { onToggleStatus() },
                    colors = CheckboxDefaults.colors(
                        checkedColor = EmeraldAccent,
                        uncheckedColor = MaterialTheme.colorScheme.outline,
                        checkmarkColor = ObsidianDark
                    )
                )

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { isExpanded = !isExpanded }
                ) {
                    Text(
                        text = task.title,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = if (isDone) MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f) else MaterialTheme.colorScheme.onSurface,
                        textDecoration = if (isDone) androidx.compose.ui.text.style.TextDecoration.LineThrough else null
                    )
                    if (task.notes.isNotBlank()) {
                        Text(
                            text = task.notes,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = if (isExpanded) 10 else 1
                        )
                    }
                }

                // Priority pill
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

                // Top Anchor star
                IconButton(
                    onClick = onToggleTopPriority,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = if (task.isTopPriorityToday) Icons.Default.Star else Icons.Default.StarBorder,
                        contentDescription = "Anchor",
                        tint = if (task.isTopPriorityToday) AmberAccent else MaterialTheme.colorScheme.outline,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            // Tags row & Expand toggle
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 40.dp, top = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    task.tags.forEach { tag ->
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                                .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(6.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "#$tag",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 10.sp
                            )
                        }
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (task.subTasks.isNotEmpty()) {
                        val subDone = task.subTasks.count { it.isDone }
                        Text(
                            text = "$subDone/${task.subTasks.size} subtasks",
                            style = MaterialTheme.typography.labelSmall,
                            color = EmeraldAccent,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.clickable { isExpanded = !isExpanded }
                        )
                    }
                    IconButton(
                        onClick = onDelete,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            Icons.Default.DeleteOutline,
                            contentDescription = "Delete",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            // Expandable Subtasks checklist
            AnimatedVisibility(visible = isExpanded && task.subTasks.isNotEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 36.dp, top = 8.dp)
                ) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.padding(vertical = 4.dp))
                    task.subTasks.forEach { sub ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onToggleSubTask(sub.id) }
                                .padding(vertical = 2.dp)
                        ) {
                            Checkbox(
                                checked = sub.isDone,
                                onCheckedChange = { onToggleSubTask(sub.id) },
                                modifier = Modifier.size(28.dp),
                                colors = CheckboxDefaults.colors(
                                    checkedColor = EmeraldAccent,
                                    uncheckedColor = MaterialTheme.colorScheme.outline,
                                    checkmarkColor = ObsidianDark
                                )
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = sub.title,
                                style = MaterialTheme.typography.bodySmall,
                                color = if (sub.isDone) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                                textDecoration = if (sub.isDone) androidx.compose.ui.text.style.TextDecoration.LineThrough else null
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun chipColors() = FilterChipDefaults.filterChipColors(
    selectedContainerColor = EmeraldAccent.copy(alpha = 0.15f),
    selectedLabelColor = EmeraldAccent,
    containerColor = MaterialTheme.colorScheme.surface,
    labelColor = MaterialTheme.colorScheme.onSurfaceVariant
)
