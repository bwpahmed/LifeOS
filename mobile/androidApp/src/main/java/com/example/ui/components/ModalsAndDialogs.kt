package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.model.*
import com.example.ui.theme.*
import com.example.ui.viewmodel.QuickCaptureType

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuickCaptureModal(
    isOpen: Boolean,
    onDismiss: () -> Unit,
    initialType: QuickCaptureType,
    workspaces: List<Workspace>,
    activeWorkspaceId: String,
    onAddTask: (title: String, notes: String, workspaceId: String, priority: TaskPriority, isTopPriority: Boolean) -> Unit,
    onAddHabit: (title: String, workspaceId: String, frequency: HabitFrequency, colorHex: String) -> Unit,
    onAddSchedule: (title: String, start: String, end: String, workspaceId: String, category: String) -> Unit,
    onAddNote: (title: String, content: String, workspaceId: String, tags: List<String>) -> Unit,
    onAddGoal: (title: String, pillarId: String, workspaceId: String, targetDate: String, milestones: List<String>) -> Unit
) {
    if (!isOpen) return

    var selectedType by remember { mutableStateOf(initialType) }
    val defaultWs = if (activeWorkspaceId != "ALL") activeWorkspaceId else "personal"
    var selectedWorkspace by remember { mutableStateOf(defaultWs) }

    // Task fields
    var taskTitle by remember { mutableStateOf("") }
    var taskNotes by remember { mutableStateOf("") }
    var taskPriority by remember { mutableStateOf(TaskPriority.MEDIUM) }
    var isTopPriority by remember { mutableStateOf(false) }

    // Habit fields
    var habitTitle by remember { mutableStateOf("") }
    var habitFrequency by remember { mutableStateOf(HabitFrequency.DAILY) }
    var habitColor by remember { mutableStateOf("#10B981") }

    // Schedule fields
    var scheduleTitle by remember { mutableStateOf("") }
    var scheduleStart by remember { mutableStateOf("09:00 AM") }
    var scheduleEnd by remember { mutableStateOf("10:00 AM") }
    var scheduleCategory by remember { mutableStateOf("Focus Block") }

    // Note fields
    var noteTitle by remember { mutableStateOf("") }
    var noteContent by remember { mutableStateOf("") }
    var noteTagsText by remember { mutableStateOf("Ideas") }

    // Goal fields
    var goalTitle by remember { mutableStateOf("") }
    var goalTargetDate by remember { mutableStateOf("End of Quarter") }
    var goalMilestonesText by remember { mutableStateOf("Milestone 1, Milestone 2") }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        dragHandle = { BottomSheetDefaults.DragHandle(color = Slate300) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Quick Capture",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = Slate600)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Selector Tabs
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                QuickCaptureType.values().forEach { type ->
                    val isSelected = selectedType == type
                    val label = when (type) {
                        QuickCaptureType.TASK -> "Task"
                        QuickCaptureType.HABIT -> "Habit"
                        QuickCaptureType.SCHEDULE_EVENT -> "Schedule"
                        QuickCaptureType.NOTE -> "Note"
                        QuickCaptureType.GOAL -> "Goal"
                    }
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isSelected) EmeraldGreen else MaterialTheme.colorScheme.surfaceVariant)
                            .clickable { selectedType = type }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = label,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = if (isSelected) White else Slate700
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Workspace selection
            Text("Sphere / Workspace", style = MaterialTheme.typography.labelMedium, color = Slate600)
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                workspaces.filter { it.id != "ALL" }.forEach { ws ->
                    val isWsSelected = selectedWorkspace == ws.id
                    val color = try {
                        Color(android.graphics.Color.parseColor(ws.colorHex))
                    } catch (_: Exception) { EmeraldGreen }
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (isWsSelected) color.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant)
                            .border(1.dp, if (isWsSelected) color else MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
                            .clickable { selectedWorkspace = ws.id }
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = ws.name,
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isWsSelected) MaterialTheme.colorScheme.onSurface else Slate600,
                            fontWeight = if (isWsSelected) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            when (selectedType) {
                QuickCaptureType.TASK -> {
                    OutlinedTextField(
                        value = taskTitle,
                        onValueChange = { taskTitle = it },
                        label = { Text("Task Title *") },
                        placeholder = { Text("e.g., Deploy production updates") },
                        modifier = Modifier.fillMaxWidth().testTag("quick_task_title"),
                        colors = outlinedFieldColors()
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = taskNotes,
                        onValueChange = { taskNotes = it },
                        label = { Text("Details & Context (Optional)") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = outlinedFieldColors()
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("Priority Level", style = MaterialTheme.typography.labelMedium, color = Slate600)
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        TaskPriority.values().forEach { priority ->
                            val isSel = taskPriority == priority
                            val pColor = when (priority) {
                                TaskPriority.LOW -> Slate600
                                TaskPriority.MEDIUM -> ElectricCyan
                                TaskPriority.HIGH -> AmberGold
                                TaskPriority.URGENT -> RoseRed
                            }
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSel) pColor.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant)
                                    .border(1.dp, if (isSel) pColor else MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp))
                                    .clickable { taskPriority = priority }
                                    .padding(vertical = 8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    priority.label,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (isSel) pColor else Slate600,
                                    fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Anchor as Top Priority Today", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                        Switch(
                            checked = isTopPriority,
                            onCheckedChange = { isTopPriority = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = AmberGold, checkedTrackColor = AmberSoftBg)
                        )
                    }

                    Spacer(modifier = Modifier.height(18.dp))
                    Button(
                        onClick = {
                            if (taskTitle.isNotBlank()) {
                                onAddTask(taskTitle, taskNotes, selectedWorkspace, taskPriority, isTopPriority)
                                onDismiss()
                            }
                        },
                        modifier = Modifier.fillMaxWidth().testTag("save_quick_task_btn"),
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen, contentColor = White)
                    ) {
                        Text("Save Task to LifeOS", fontWeight = FontWeight.Bold)
                    }
                }

                QuickCaptureType.HABIT -> {
                    OutlinedTextField(
                        value = habitTitle,
                        onValueChange = { habitTitle = it },
                        label = { Text("Habit Title *") },
                        placeholder = { Text("e.g. 20m Daily Meditation") },
                        modifier = Modifier.fillMaxWidth().testTag("quick_habit_title"),
                        colors = outlinedFieldColors()
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("Cadence", style = MaterialTheme.typography.labelMedium, color = Slate600)
                    Spacer(modifier = Modifier.height(6.dp))
                    HabitFrequency.values().forEach { freq ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { habitFrequency = freq }
                                .padding(vertical = 4.dp)
                        ) {
                            RadioButton(
                                selected = habitFrequency == freq,
                                onClick = { habitFrequency = freq },
                                colors = RadioButtonDefaults.colors(selectedColor = EmeraldGreen)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(freq.label, color = MaterialTheme.colorScheme.onSurface, style = MaterialTheme.typography.bodyMedium)
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = {
                            if (habitTitle.isNotBlank()) {
                                onAddHabit(habitTitle, selectedWorkspace, habitFrequency, habitColor)
                                onDismiss()
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen, contentColor = White)
                    ) {
                        Text("Initialize Habit Streak", fontWeight = FontWeight.Bold)
                    }
                }

                QuickCaptureType.SCHEDULE_EVENT -> {
                    OutlinedTextField(
                        value = scheduleTitle,
                        onValueChange = { scheduleTitle = it },
                        label = { Text("Time-Block Title *") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = outlinedFieldColors()
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = scheduleStart,
                            onValueChange = { scheduleStart = it },
                            label = { Text("Start Time") },
                            modifier = Modifier.weight(1f),
                            colors = outlinedFieldColors()
                        )
                        OutlinedTextField(
                            value = scheduleEnd,
                            onValueChange = { scheduleEnd = it },
                            label = { Text("End Time") },
                            modifier = Modifier.weight(1f),
                            colors = outlinedFieldColors()
                        )
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = scheduleCategory,
                        onValueChange = { scheduleCategory = it },
                        label = { Text("Category Tag") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = outlinedFieldColors()
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = {
                            if (scheduleTitle.isNotBlank()) {
                                onAddSchedule(scheduleTitle, scheduleStart, scheduleEnd, selectedWorkspace, scheduleCategory)
                                onDismiss()
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen, contentColor = White)
                    ) {
                        Text("Block Time on Calendar", fontWeight = FontWeight.Bold)
                    }
                }

                QuickCaptureType.NOTE -> {
                    OutlinedTextField(
                        value = noteTitle,
                        onValueChange = { noteTitle = it },
                        label = { Text("Note Title *") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = outlinedFieldColors()
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = noteContent,
                        onValueChange = { noteContent = it },
                        label = { Text("Content / Markdown Body") },
                        minLines = 4,
                        modifier = Modifier.fillMaxWidth(),
                        colors = outlinedFieldColors()
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = noteTagsText,
                        onValueChange = { noteTagsText = it },
                        label = { Text("Tags (comma separated)") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = outlinedFieldColors()
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = {
                            if (noteTitle.isNotBlank()) {
                                val tags = noteTagsText.split(",").map { it.trim() }.filter { it.isNotBlank() }
                                onAddNote(noteTitle, noteContent, selectedWorkspace, tags)
                                onDismiss()
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = VioletAccent, contentColor = White)
                    ) {
                        Text("Save Note to Vault", fontWeight = FontWeight.Bold)
                    }
                }

                QuickCaptureType.GOAL -> {
                    OutlinedTextField(
                        value = goalTitle,
                        onValueChange = { goalTitle = it },
                        label = { Text("Goal / Key Result Title *") },
                        placeholder = { Text("e.g. Launch Product & Reach $10k MRR") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = outlinedFieldColors()
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = goalTargetDate,
                        onValueChange = { goalTargetDate = it },
                        label = { Text("Target Horizon") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = outlinedFieldColors()
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = goalMilestonesText,
                        onValueChange = { goalMilestonesText = it },
                        label = { Text("Key Milestones (comma-separated)") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = outlinedFieldColors()
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = {
                            if (goalTitle.isNotBlank()) {
                                val milestones = goalMilestonesText.split(",").map { it.trim() }
                                onAddGoal(goalTitle, "p1", selectedWorkspace, goalTargetDate, milestones)
                                onDismiss()
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = ElectricCyan, contentColor = White)
                    ) {
                        Text("Create Life Goal", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun BrainDumpModal(
    isOpen: Boolean,
    onDismiss: () -> Unit,
    onSynthesize: (String) -> Unit
) {
    if (!isOpen) return

    var dumpText by remember {
        mutableStateOf(
            "• Urgent: Ship LifeOS mobile release\n• Plan weekly team sync\n• 45m zone 2 cardio run\n• Read 2 chapters of book\n• Pay quarterly server bill"
        )
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .clip(RoundedCornerShape(20.dp))
                .background(MaterialTheme.colorScheme.surface)
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(20.dp))
                .padding(20.dp)
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = AmberGold)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "AI Brain Dump Engine",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Slate600)
                    }
                }

                Text(
                    text = "Dump whatever is occupying your mind. The AI parser instantly detects urgency, categorizes across your life spheres, and creates structured action items.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Slate600,
                    modifier = Modifier.padding(vertical = 8.dp)
                )

                OutlinedTextField(
                    value = dumpText,
                    onValueChange = { dumpText = it },
                    minLines = 6,
                    maxLines = 10,
                    modifier = Modifier.fillMaxWidth().testTag("brain_dump_text_input"),
                    colors = outlinedFieldColors(),
                    placeholder = { Text("Type or paste raw thoughts, to-dos, thoughts...", color = Slate400) }
                )

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Slate700)
                    ) {
                        Text("Cancel")
                    }
                    Button(
                        onClick = {
                            if (dumpText.isNotBlank()) {
                                onSynthesize(dumpText)
                            }
                        },
                        modifier = Modifier.weight(1.5f).testTag("synthesize_btn"),
                        colors = ButtonDefaults.buttonColors(containerColor = AmberGold, contentColor = Slate950)
                    ) {
                        Icon(Icons.Default.FlashOn, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Synthesize Items", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun SettingsModal(
    isOpen: Boolean,
    onDismiss: () -> Unit,
    privacyGateEnabled: Boolean,
    onTogglePrivacyGate: (Boolean) -> Unit,
    onLockImmediately: () -> Unit,
    onSetPin: (String) -> Unit
) {
    if (!isOpen) return

    var pinInput by remember { mutableStateOf("") }
    var pinMessage by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(MaterialTheme.colorScheme.surface)
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(20.dp))
                .padding(20.dp)
        ) {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "LifeOS Preferences",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Slate600)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Privacy Gate Section
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Privacy Gate", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                                Text(
                                    "On-device UI security lock protecting your life spheres and notes",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Slate600
                                )
                            }
                            Switch(
                                checked = privacyGateEnabled,
                                onCheckedChange = onTogglePrivacyGate,
                                colors = SwitchDefaults.colors(checkedThumbColor = EmeraldGreen, checkedTrackColor = EmeraldSoftBg)
                            )
                        }

                        if (privacyGateEnabled) {
                            Spacer(modifier = Modifier.height(12.dp))
                            HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                            Spacer(modifier = Modifier.height(12.dp))

                            Text("Change Security PIN (Default: 1234)", style = MaterialTheme.typography.labelSmall, color = Slate600)
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                OutlinedTextField(
                                    value = pinInput,
                                    onValueChange = { if (it.length <= 4) pinInput = it },
                                    placeholder = { Text("4 Digits") },
                                    singleLine = true,
                                    modifier = Modifier.weight(1f),
                                    colors = outlinedFieldColors()
                                )
                                Button(
                                    onClick = {
                                        if (pinInput.length == 4) {
                                            onSetPin(pinInput)
                                            pinMessage = "PIN successfully updated!"
                                            pinInput = ""
                                        } else {
                                            pinMessage = "Must be exactly 4 digits."
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen, contentColor = White)
                                ) {
                                    Text("Set PIN")
                                }
                            }

                            if (pinMessage.isNotBlank()) {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = pinMessage,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (pinMessage.contains("success", ignoreCase = true)) EmeraldDark else RoseRed
                                )
                            }

                            Spacer(modifier = Modifier.height(12.dp))
                            OutlinedButton(
                                onClick = onLockImmediately,
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = RoseRed)
                            ) {
                                Icon(Icons.Default.Lock, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Lock Applet Now")
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // About section
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text("About LifeOS Mobile", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            "Clean light theme, local storage, 7-day habit matrix grid, deep work focus timer, and AI command center.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Slate600
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Version 1.2.0 • Offline Ready", style = MaterialTheme.typography.labelSmall, color = EmeraldDark, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun PrivacyGateLockScreen(
    onUnlock: (String) -> Boolean
) {
    var pinEntered by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf("") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding()
            .navigationBarsPadding(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(24.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(CircleShape)
                    .background(EmeraldAccent.copy(alpha = 0.15f))
                    .border(2.dp, EmeraldAccent, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Lock,
                    contentDescription = "Locked",
                    tint = EmeraldAccent,
                    modifier = Modifier.size(36.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "LifeOS Privacy Gate",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = "Enter 4-digit PIN to access cockpit (default: 1234)",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(24.dp))

            // PIN Dots Display
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                for (i in 0 until 4) {
                    val isFilled = i < pinEntered.length
                    Box(
                        modifier = Modifier
                            .size(18.dp)
                            .clip(CircleShape)
                            .background(if (isFilled) EmeraldAccent else MaterialTheme.colorScheme.surfaceVariant)
                            .border(1.dp, if (isFilled) EmeraldAccent else MaterialTheme.colorScheme.outline, CircleShape)
                    )
                }
            }

            if (errorMessage.isNotBlank()) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = errorMessage,
                    style = MaterialTheme.typography.bodySmall,
                    color = RoseAccent
                )
            }

            Spacer(modifier = Modifier.height(36.dp))

            // Keypad Grid
            val keys = listOf(
                listOf("1", "2", "3"),
                listOf("4", "5", "6"),
                listOf("7", "8", "9"),
                listOf("C", "0", "DEL")
            )

            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                keys.forEach { row ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(20.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        row.forEach { key ->
                            Box(
                                modifier = Modifier
                                    .size(70.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.surface)
                                    .border(1.dp, MaterialTheme.colorScheme.outline, CircleShape)
                                    .clickable {
                                        errorMessage = ""
                                        when (key) {
                                            "C" -> pinEntered = ""
                                            "DEL" -> if (pinEntered.isNotEmpty()) pinEntered = pinEntered.dropLast(1)
                                            else -> {
                                                if (pinEntered.length < 4) {
                                                    val updated = pinEntered + key
                                                    pinEntered = updated
                                                    if (updated.length == 4) {
                                                        val success = onUnlock(updated)
                                                        if (!success) {
                                                            errorMessage = "Invalid PIN. Try again."
                                                            pinEntered = ""
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = key,
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = if (key == "C" || key == "DEL") Slate600 else MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun outlinedFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = EmeraldAccent,
    unfocusedBorderColor = MaterialTheme.colorScheme.outline,
    focusedContainerColor = MaterialTheme.colorScheme.surface,
    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
    focusedTextColor = MaterialTheme.colorScheme.onSurface,
    unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
    focusedLabelColor = EmeraldAccent,
    unfocusedLabelColor = MaterialTheme.colorScheme.onSurfaceVariant
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CloudSyncModal(
    isOpen: Boolean,
    onDismiss: () -> Unit,
    syncStatus: com.example.data.supabase.SupabaseSyncStatus,
    accountEmail: String?,
    lastSyncMessage: String,
    onSyncNow: ((Boolean, String) -> Unit) -> Unit,
    onSignIn: (String, String, (Boolean, String) -> Unit) -> Unit,
    onSignUp: (String, String, (Boolean, String) -> Unit) -> Unit,
    onSignOut: () -> Unit
) {
    if (!isOpen) return

    var isSignUpMode by remember { mutableStateOf(false) }
    var emailInput by remember { mutableStateOf("") }
    var passwordInput by remember { mutableStateOf("") }
    var statusFeedback by remember { mutableStateOf("") }
    var isOperating by remember { mutableStateOf(false) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        dragHandle = { BottomSheetDefaults.DragHandle() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(
                            when (syncStatus) {
                                com.example.data.supabase.SupabaseSyncStatus.CONNECTED -> EmeraldSoftBg
                                com.example.data.supabase.SupabaseSyncStatus.SYNCING -> CyanSoftBg
                                com.example.data.supabase.SupabaseSyncStatus.SYNC_ERROR -> RoseSoftBg
                                else -> MaterialTheme.colorScheme.surfaceVariant
                            }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = when (syncStatus) {
                            com.example.data.supabase.SupabaseSyncStatus.CONNECTED -> Icons.Default.CloudDone
                            com.example.data.supabase.SupabaseSyncStatus.SYNCING -> Icons.Default.Sync
                            com.example.data.supabase.SupabaseSyncStatus.SYNC_ERROR -> Icons.Default.CloudOff
                            else -> Icons.Default.CloudQueue
                        },
                        contentDescription = "Cloud Status",
                        tint = when (syncStatus) {
                            com.example.data.supabase.SupabaseSyncStatus.CONNECTED -> EmeraldAccent
                            com.example.data.supabase.SupabaseSyncStatus.SYNCING -> CyanAccent
                            com.example.data.supabase.SupabaseSyncStatus.SYNC_ERROR -> RoseAccent
                            else -> MaterialTheme.colorScheme.onSurfaceVariant
                        },
                        modifier = Modifier.size(24.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "LifeOS Cloud Sync",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Supabase Ecosystem • Postgres & RLS",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Backend Status Banner
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Connected Backend",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(
                                    when (syncStatus) {
                                        com.example.data.supabase.SupabaseSyncStatus.CONNECTED -> EmeraldAccent.copy(alpha = 0.15f)
                                        com.example.data.supabase.SupabaseSyncStatus.SYNCING -> CyanAccent.copy(alpha = 0.15f)
                                        com.example.data.supabase.SupabaseSyncStatus.SYNC_ERROR -> RoseAccent.copy(alpha = 0.15f)
                                        else -> MaterialTheme.colorScheme.outlineVariant
                                    }
                                )
                                .padding(horizontal = 8.dp, vertical = 3.dp)
                        ) {
                            Text(
                                text = when (syncStatus) {
                                    com.example.data.supabase.SupabaseSyncStatus.CONNECTED -> "CONNECTED"
                                    com.example.data.supabase.SupabaseSyncStatus.SYNCING -> "SYNCING"
                                    com.example.data.supabase.SupabaseSyncStatus.SYNC_ERROR -> "OFFLINE / ERROR"
                                    else -> "LOCAL OFFLINE"
                                },
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = when (syncStatus) {
                                    com.example.data.supabase.SupabaseSyncStatus.CONNECTED -> EmeraldAccent
                                    com.example.data.supabase.SupabaseSyncStatus.SYNCING -> CyanAccent
                                    com.example.data.supabase.SupabaseSyncStatus.SYNC_ERROR -> RoseAccent
                                    else -> MaterialTheme.colorScheme.onSurfaceVariant
                                }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Project: fdtbftuxziicubztgcde.supabase.co",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                        fontSize = 11.sp
                    )
                    Text(
                        text = lastSyncMessage,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (!accountEmail.isNullOrBlank()) {
                // User is authenticated
                Card(
                    colors = CardDefaults.cardColors(containerColor = EmeraldSoftBg),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, EmeraldBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = EmeraldGreen,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Authenticated with LifeOS Account",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = EmeraldDark
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = accountEmail,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Row Level Security (RLS) is active. Your tasks and habits sync across Web, Android, and iOS.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = {
                        isOperating = true
                        statusFeedback = "Syncing with Supabase..."
                        onSyncNow { success, msg ->
                            isOperating = false
                            statusFeedback = msg
                        }
                    },
                    enabled = !isOperating,
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen, contentColor = White),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("sync_now_button")
                ) {
                    Icon(imageVector = Icons.Default.Sync, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(if (isOperating) "Syncing..." else "Sync Now With Cloud")
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedButton(
                    onClick = onSignOut,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = RoseRed),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("sign_out_button")
                ) {
                    Icon(imageVector = Icons.Default.Logout, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Disconnect & Return to Local Mode")
                }
            } else {
                // Not authenticated: provide sign in / sign up fields
                Text(
                    text = if (isSignUpMode) "Create a LifeOS Cloud Account" else "Sign In with LifeOS Account",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "Sign in to synchronize habits and tasks with your web dashboard. Your existing local data will be preserved.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Slate600
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = emailInput,
                    onValueChange = { emailInput = it },
                    label = { Text("Email Address") },
                    placeholder = { Text("you@example.com") },
                    singleLine = true,
                    colors = outlinedFieldColors(),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("auth_email_input")
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = passwordInput,
                    onValueChange = { passwordInput = it },
                    label = { Text("Password") },
                    singleLine = true,
                    visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(),
                    colors = outlinedFieldColors(),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("auth_password_input")
                )

                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = {
                        if (emailInput.isBlank() || passwordInput.isBlank()) {
                            statusFeedback = "Please enter both email and password."
                            return@Button
                        }
                        isOperating = true
                        statusFeedback = "Connecting to Supabase..."
                        if (isSignUpMode) {
                            onSignUp(emailInput, passwordInput) { success, msg ->
                                isOperating = false
                                statusFeedback = msg
                            }
                        } else {
                            onSignIn(emailInput, passwordInput) { success, msg ->
                                isOperating = false
                                statusFeedback = msg
                            }
                        }
                    },
                    enabled = !isOperating,
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen, contentColor = White),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("auth_submit_button")
                ) {
                    Text(
                        if (isOperating) "Connecting..."
                        else if (isSignUpMode) "Create Account"
                        else "Sign In & Sync"
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                TextButton(
                    onClick = {
                        isSignUpMode = !isSignUpMode
                        statusFeedback = ""
                    },
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                ) {
                    Text(
                        if (isSignUpMode) "Already have an account? Sign In"
                        else "Need an account? Sign Up for LifeOS",
                        color = EmeraldDark,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            if (statusFeedback.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = statusFeedback,
                    style = MaterialTheme.typography.bodySmall,
                    color = if (statusFeedback.contains("fail", ignoreCase = true) || statusFeedback.contains("error", ignoreCase = true)) RoseRed else EmeraldDark,
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                )
            }
        }
    }
}

