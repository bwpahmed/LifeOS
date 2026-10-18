import SwiftUI
import Combine

// MARK: - Supabase Config
enum SupabaseConfig {
    static let projectUrl = "https://fdtbftuxziicubztgcde.supabase.co"
    static let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdGJmdHV4emlpY3VienRnY2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NDM1NDAsImV4cCI6MjEwNTExOTU0MH0.hGQWnoAGfPr7gdT4xsyCl2qYsjgdSIwfu2x1l34jzIw"
    static let restEndpoint = "\(projectUrl)/rest/v1"
    static let authEndpoint = "\(projectUrl)/auth/v1"
    static let realtimeEndpoint = "wss://fdtbftuxziicubztgcde.supabase.co/realtime/v1/websocket?apikey=\(anonKey)&vsn=1.0.0"
    static let ownerEmail = "bwpahmed@gmail.com"
}

// MARK: - Domain Models
struct TaskModel: Identifiable, Codable, Equatable {
    let id: String
    var name: String
    var description: String?
    var area: String
    var status: String
    var importance: Int
    var deadline: String?
    var notes: String?
    var completedAt: String?
    var createdAt: String?
    var isSynced: Bool = true

    var isCompleted: Bool {
        status.lowercased() == "done" || status.lowercased() == "completed"
    }
}

struct HabitModel: Identifiable, Codable, Equatable {
    let id: String
    var name: String
    var area: String
    var frequency: String
    var target: Int
    var unit: String
    var completedDates: [String] = []

    var streakCount: Int {
        completedDates.count
    }
}

struct CalendarItemModel: Identifiable, Codable, Equatable {
    let id: String
    var title: String
    var kind: String
    var startsAt: String
    var endsAt: String
}

struct StickyNoteModel: Identifiable, Codable, Equatable {
    let id: String
    var title: String
    var body: String
    var color: String
    var pinned: Bool
    var archived: Bool
    var updatedAt: String
}

struct GoalModel: Identifiable, Codable, Equatable {
    let id: String
    var area: String
    var name: String
    var why: String?
    var progress: Int
    var status: String
    var target: Double?
    var unit: String?
}

// MARK: - Supabase Live Service & Realtime Client
class SupabaseService: ObservableObject {
    static let shared = SupabaseService()

    @Published var isAuthenticated: Bool = false
    @Published var userEmail: String? = nil
    @Published var userId: String? = nil
    @Published var workspaceId: String = ""
    @Published var syncStatusText: String = "Ready"
    @Published var isRealtimeConnected: Bool = false
    @Published var pendingOperationsCount: Int = 0

    @Published var tasks: [TaskModel] = []
    @Published var habits: [HabitModel] = []
    @Published var calendarItems: [CalendarItemModel] = []
    @Published var stickyNotes: [StickyNoteModel] = []
    @Published var goals: [GoalModel] = []

    private var accessToken: String? = nil
    private var refreshToken: String? = nil
    private var webSocketTask: URLSessionWebSocketTask?
    private var heartbeatTimer: Timer?
    private let urlSession = URLSession(configuration: .default)

    private let tasksCacheKey = "lifeos_cached_tasks_v2"
    private let habitsCacheKey = "lifeos_cached_habits_v2"
    private let notesCacheKey = "lifeos_cached_notes_v2"
    private let calendarCacheKey = "lifeos_cached_calendar_v2"
    private let goalsCacheKey = "lifeos_cached_goals_v2"
    private let tokenCacheKey = "lifeos_access_token_v2"
    private let refreshCacheKey = "lifeos_refresh_token_v2"
    private let emailCacheKey = "lifeos_user_email_v2"
    private let userIdCacheKey = "lifeos_user_id_v2"
    private let workspaceCacheKey = "lifeos_workspace_id_v2"

    init() {
        restoreSession()
        loadLocalCaches()
        if isAuthenticated {
            Task {
                await syncAll()
                connectRealtimeWebSocket()
            }
        }
    }

    private func restoreSession() {
        if let token = UserDefaults.standard.string(forKey: tokenCacheKey),
           let email = UserDefaults.standard.string(forKey: emailCacheKey),
           let uid = UserDefaults.standard.string(forKey: userIdCacheKey) {
            self.accessToken = token
            self.refreshToken = UserDefaults.standard.string(forKey: refreshCacheKey)
            self.userEmail = email
            self.userId = uid
            self.workspaceId = UserDefaults.standard.string(forKey: workspaceCacheKey) ?? ""
            self.isAuthenticated = true
            self.syncStatusText = "Restored session for \(email)"
        }
    }

    private func saveSession(token: String, refresh: String, email: String, uid: String) {
        self.accessToken = token
        self.refreshToken = refresh
        self.userEmail = email
        self.userId = uid
        self.isAuthenticated = true

        UserDefaults.standard.set(token, forKey: tokenCacheKey)
        UserDefaults.standard.set(refresh, forKey: refreshCacheKey)
        UserDefaults.standard.set(email, forKey: emailCacheKey)
        UserDefaults.standard.set(uid, forKey: userIdCacheKey)
    }

    func signOut() {
        disconnectRealtimeWebSocket()
        self.accessToken = nil
        self.refreshToken = nil
        self.userEmail = nil
        self.userId = nil
        self.workspaceId = ""
        self.isAuthenticated = false
        self.syncStatusText = "Signed out"

        UserDefaults.standard.removeObject(forKey: tokenCacheKey)
        UserDefaults.standard.removeObject(forKey: refreshCacheKey)
        UserDefaults.standard.removeObject(forKey: emailCacheKey)
        UserDefaults.standard.removeObject(forKey: userIdCacheKey)
        UserDefaults.standard.removeObject(forKey: workspaceCacheKey)
    }

    // MARK: - Auth
    func signIn(email: String, pass: String) async -> Result<String, Error> {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: "\(SupabaseConfig.authEndpoint)/token?grant_type=password") else {
            return .failure(NSError(domain: "LifeOS", code: 400, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = ["email": trimmedEmail, "password": pass]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (data, response) = try await urlSession.data(for: request)
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
                let errorMsg = String(data: data, encoding: .utf8) ?? "Sign in failed"
                return .failure(NSError(domain: "LifeOS", code: 401, userInfo: [NSLocalizedDescriptionKey: errorMsg]))
            }

            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let access = json["access_token"] as? String,
                  let refresh = json["refresh_token"] as? String,
                  let user = json["user"] as? [String: Any],
                  let uid = user["id"] as? String else {
                return .failure(NSError(domain: "LifeOS", code: 500, userInfo: [NSLocalizedDescriptionKey: "Malformed auth response"]))
            }

            await MainActor.run {
                saveSession(token: access, refresh: refresh, email: trimmedEmail, uid: uid)
                syncStatusText = "Connected to Supabase"
            }

            await resolveWorkspace()
            await syncAll()
            connectRealtimeWebSocket()
            return .success("Signed in as \(trimmedEmail)")
        } catch {
            return .failure(error)
        }
    }

    private func refreshTokenIfNeeded() async -> Bool {
        guard let refresh = self.refreshToken,
              let url = URL(string: "\(SupabaseConfig.authEndpoint)/token?grant_type=refresh_token") else {
            return false
        }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = ["refresh_token": refresh]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (data, response) = try await urlSession.data(for: req)
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode),
                  let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let access = json["access_token"] as? String,
                  let newRefresh = json["refresh_token"] as? String,
                  let user = json["user"] as? [String: Any],
                  let uid = user["id"] as? String,
                  let email = user["email"] as? String else {
                return false
            }

            await MainActor.run {
                saveSession(token: access, refresh: newRefresh, email: email, uid: uid)
            }
            return true
        } catch {
            return false
        }
    }

    private func resolveWorkspace() async {
        guard let token = self.accessToken, let uid = self.userId else { return }
        guard let url = URL(string: "\(SupabaseConfig.restEndpoint)/workspace_members?select=workspace_id&user_id=eq.\(uid)&limit=1") else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        if let (data, resp) = try? await urlSession.data(for: req),
           let http = resp as? HTTPURLResponse, (200...299).contains(http.statusCode),
           let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]],
           let first = arr.first,
           let ws = first["workspace_id"] as? String {
            await MainActor.run {
                self.workspaceId = ws
                UserDefaults.standard.set(ws, forKey: workspaceCacheKey)
            }
        }
    }

    // MARK: - Synchronize All
    func syncAll() async {
        guard isAuthenticated, let token = self.accessToken else {
            await MainActor.run { self.syncStatusText = "Offline Local Mode" }
            return
        }

        await MainActor.run { self.syncStatusText = "Syncing..." }

        await fetchCloudTasks(token: token)
        await fetchCloudHabits(token: token)
        await fetchCloudCalendar(token: token)
        await fetchCloudStickyNotes(token: token)
        await fetchCloudGoals(token: token)

        await MainActor.run {
            let df = DateFormatter()
            df.timeStyle = .short
            self.syncStatusText = "Synced at \(df.string(from: Date()))"
        }
    }

    // MARK: - Tasks Live Supabase
    private func fetchCloudTasks(token: String) async {
        var urlStr = "\(SupabaseConfig.restEndpoint)/tasks?select=id,name,description,area,status,importance,deadline,notes,completed_at,created_at&order=deadline.asc.nullslast&limit=300"
        if !workspaceId.isEmpty {
            urlStr += "&workspace_id=eq.\(workspaceId)"
        }
        guard let url = URL(string: urlStr) else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        do {
            let (data, resp) = try await urlSession.data(for: req)
            guard let http = resp as? HTTPURLResponse else { return }
            if http.statusCode == 401 {
                if await refreshTokenIfNeeded() {
                    await fetchCloudTasks(token: self.accessToken ?? token)
                }
                return
            }
            guard (200...299).contains(http.statusCode),
                  let arr = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return }

            var fetched: [TaskModel] = []
            for item in arr {
                guard let id = item["id"] as? String,
                      let name = item["name"] as? String else { continue }
                let desc = item["description"] as? String
                let area = item["area"] as? String ?? "personal"
                let status = item["status"] as? String ?? "Inbox"
                let importance = item["importance"] as? Int ?? 2
                let deadline = item["deadline"] as? String
                let notes = item["notes"] as? String
                let completedAt = item["completed_at"] as? String
                let createdAt = item["created_at"] as? String

                fetched.append(TaskModel(
                    id: id,
                    name: name,
                    description: desc,
                    area: area,
                    status: status,
                    importance: importance,
                    deadline: deadline,
                    notes: notes,
                    completedAt: completedAt,
                    createdAt: createdAt,
                    isSynced: true
                ))
            }

            await MainActor.run {
                self.tasks = fetched
                self.saveTasksLocalCache()
            }
        } catch {
            print("Tasks fetch error: \(error)")
        }
    }

    func createTask(name: String, area: String = "personal", priority: Int = 2, notes: String = "") async {
        let newId = UUID().uuidString.lowercased()
        let localTask = TaskModel(
            id: newId,
            name: name,
            description: notes,
            area: area,
            status: "Inbox",
            importance: priority,
            deadline: nil,
            notes: notes,
            completedAt: nil,
            createdAt: ISO8601DateFormatter().string(from: Date()),
            isSynced: false
        )

        await MainActor.run {
            self.tasks.insert(localTask, at: 0)
            self.saveTasksLocalCache()
        }

        guard isAuthenticated, let token = self.accessToken, let uid = self.userId else { return }
        guard let url = URL(string: "\(SupabaseConfig.restEndpoint)/tasks") else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("return=representation", forHTTPHeaderField: "Prefer")

        var body: [String: Any] = [
            "id": newId,
            "name": name,
            "description": notes,
            "area": area,
            "status": "Inbox",
            "importance": priority,
            "notes": notes,
            "created_by": uid,
            "created_at": ISO8601DateFormatter().string(from: Date())
        ]
        if !workspaceId.isEmpty {
            body["workspace_id"] = workspaceId
        }

        req.httpBody = try? JSONSerialization.data(withJSONObject: body)

        if let (_, resp) = try? await urlSession.data(for: req),
           let http = resp as? HTTPURLResponse, (200...299).contains(http.statusCode) {
            await MainActor.run {
                if let idx = self.tasks.firstIndex(where: { $0.id == newId }) {
                    self.tasks[idx].isSynced = true
                }
            }
        }
    }

    func toggleTaskComplete(task: TaskModel) async {
        let nextStatus = task.isCompleted ? "Inbox" : "Completed"
        let completedAt = task.isCompleted ? nil : ISO8601DateFormatter().string(from: Date())

        await MainActor.run {
            if let idx = self.tasks.firstIndex(where: { $0.id == task.id }) {
                self.tasks[idx].status = nextStatus
                self.tasks[idx].completedAt = completedAt
                self.saveTasksLocalCache()
            }
        }

        guard isAuthenticated, let token = self.accessToken else { return }
        guard let url = URL(string: "\(SupabaseConfig.restEndpoint)/tasks?id=eq.\(task.id)") else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        req.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var body: [String: Any] = [
            "status": nextStatus,
            "updated_at": ISO8601DateFormatter().string(from: Date())
        ]
        if let ca = completedAt {
            body["completed_at"] = ca
        } else {
            body["completed_at"] = NSNull()
        }

        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        let _ = try? await urlSession.data(for: req)
    }

    func deleteTask(id: String) async {
        await MainActor.run {
            self.tasks.removeAll(where: { $0.id == id })
            self.saveTasksLocalCache()
        }

        guard isAuthenticated, let token = self.accessToken else { return }
        guard let url = URL(string: "\(SupabaseConfig.restEndpoint)/tasks?id=eq.\(id)") else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "DELETE"
        req.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let _ = try? await urlSession.data(for: req)
    }

    // MARK: - Habits Live Supabase
    private func fetchCloudHabits(token: String) async {
        var urlStr = "\(SupabaseConfig.restEndpoint)/habits?select=id,name,area,frequency,target,unit"
        if !workspaceId.isEmpty {
            urlStr += "&workspace_id=eq.\(workspaceId)"
        }
        guard let url = URL(string: urlStr) else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        guard let (data, resp) = try? await urlSession.data(for: req),
              let http = resp as? HTTPURLResponse, (200...299).contains(http.statusCode),
              let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return }

        var logsByHabit: [String: [String]] = [:]
        if let logsUrl = URL(string: "\(SupabaseConfig.restEndpoint)/habit_logs?select=habit_id,date&order=date.desc&limit=300") {
            var logReq = URLRequest(url: logsUrl)
            logReq.httpMethod = "GET"
            logReq.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
            logReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

            if let (lData, lResp) = try? await urlSession.data(for: logReq),
               let lHttp = lResp as? HTTPURLResponse, (200...299).contains(lHttp.statusCode),
               let lArr = try? JSONSerialization.jsonObject(with: lData) as? [[String: Any]] {
                for item in lArr {
                    if let hid = item["habit_id"] as? String, let d = item["date"] as? String {
                        logsByHabit[hid, default: []].append(d)
                    }
                }
            }
        }

        var fetched: [HabitModel] = []
        for item in arr {
            guard let id = item["id"] as? String,
                  let name = item["name"] as? String else { continue }
            let area = item["area"] as? String ?? "health"
            let freq = item["frequency"] as? String ?? "Daily"
            let target = item["target"] as? Int ?? 1
            let unit = item["unit"] as? String ?? "done"
            let completed = Array(Set(logsByHabit[id] ?? [])).sorted()

            fetched.append(HabitModel(
                id: id,
                name: name,
                area: area,
                frequency: freq,
                target: target,
                unit: unit,
                completedDates: completed
            ))
        }

        await MainActor.run {
            self.habits = fetched
            self.saveHabitsLocalCache()
        }
    }

    func toggleHabitCompletion(habit: HabitModel, date: String) async {
        let isDone = habit.completedDates.contains(date)
        await MainActor.run {
            if let idx = self.habits.firstIndex(where: { $0.id == habit.id }) {
                if isDone {
                    self.habits[idx].completedDates.removeAll(where: { $0 == date })
                } else {
                    self.habits[idx].completedDates.append(date)
                }
                self.saveHabitsLocalCache()
            }
        }

        guard isAuthenticated, let token = self.accessToken else { return }

        if isDone {
            guard let url = URL(string: "\(SupabaseConfig.restEndpoint)/habit_logs?habit_id=eq.\(habit.id)&date=eq.\(date)") else { return }
            var req = URLRequest(url: url)
            req.httpMethod = "DELETE"
            req.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            let _ = try? await urlSession.data(for: req)
        } else {
            guard let url = URL(string: "\(SupabaseConfig.restEndpoint)/habit_logs") else { return }
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue("resolution=merge-duplicates", forHTTPHeaderField: "Prefer")

            let body: [String: Any] = [
                "habit_id": habit.id,
                "date": date,
                "value": 1
            ]
            req.httpBody = try? JSONSerialization.data(withJSONObject: body)
            let _ = try? await urlSession.data(for: req)
        }
    }

    // MARK: - Calendar / Planner Live Supabase
    private func fetchCloudCalendar(token: String) async {
        var urlStr = "\(SupabaseConfig.restEndpoint)/calendar_items?select=id,title,kind,starts_at,ends_at&order=starts_at.asc&limit=100"
        if !workspaceId.isEmpty {
            urlStr += "&workspace_id=eq.\(workspaceId)"
        }
        guard let url = URL(string: urlStr) else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        guard let (data, resp) = try? await urlSession.data(for: req),
              let http = resp as? HTTPURLResponse, (200...299).contains(http.statusCode),
              let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return }

        var fetched: [CalendarItemModel] = []
        for item in arr {
            guard let id = item["id"] as? String,
                  let title = item["title"] as? String else { continue }
            let kind = item["kind"] as? String ?? "routine"
            let sAt = item["starts_at"] as? String ?? ""
            let eAt = item["ends_at"] as? String ?? ""
            fetched.append(CalendarItemModel(id: id, title: title, kind: kind, startsAt: sAt, endsAt: eAt))
        }

        await MainActor.run {
            self.calendarItems = fetched
            self.saveCalendarLocalCache()
        }
    }

    // MARK: - Sticky Notes / Vault Live Supabase
    private func fetchCloudStickyNotes(token: String) async {
        var urlStr = "\(SupabaseConfig.restEndpoint)/sticky_notes?select=id,title,body,color,pinned,archived,updated_at&archived=eq.false&order=pinned.desc,updated_at.desc&limit=50"
        if !workspaceId.isEmpty {
            urlStr += "&workspace_id=eq.\(workspaceId)"
        }
        guard let url = URL(string: urlStr) else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        guard let (data, resp) = try? await urlSession.data(for: req),
              let http = resp as? HTTPURLResponse, (200...299).contains(http.statusCode),
              let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return }

        var fetched: [StickyNoteModel] = []
        for item in arr {
            guard let id = item["id"] as? String else { continue }
            let title = item["title"] as? String ?? "Note"
            let body = item["body"] as? String ?? ""
            let color = item["color"] as? String ?? "yellow"
            let pinned = item["pinned"] as? Bool ?? false
            let archived = item["archived"] as? Bool ?? false
            let uAt = item["updated_at"] as? String ?? ""

            fetched.append(StickyNoteModel(
                id: id,
                title: title,
                body: body,
                color: color,
                pinned: pinned,
                archived: archived,
                updatedAt: uAt
            ))
        }

        await MainActor.run {
            self.stickyNotes = fetched
            self.saveNotesLocalCache()
        }
    }

    func createStickyNote(title: String, body: String, color: String = "yellow") async {
        guard isAuthenticated, let token = self.accessToken, let uid = self.userId else { return }
        guard let url = URL(string: "\(SupabaseConfig.restEndpoint)/sticky_notes") else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var payload: [String: Any] = [
            "title": title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Important note" : title,
            "body": body,
            "color": color,
            "pinned": true,
            "archived": false,
            "created_by": uid
        ]
        if !workspaceId.isEmpty {
            payload["workspace_id"] = workspaceId
        }

        req.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        if let (_, resp) = try? await urlSession.data(for: req),
           let http = resp as? HTTPURLResponse, (200...299).contains(http.statusCode) {
            await fetchCloudStickyNotes(token: token)
        }
    }

    func togglePinNote(note: StickyNoteModel) async {
        let nextPin = !note.pinned
        await MainActor.run {
            if let idx = self.stickyNotes.firstIndex(where: { $0.id == note.id }) {
                self.stickyNotes[idx].pinned = nextPin
                self.saveNotesLocalCache()
            }
        }

        guard isAuthenticated, let token = self.accessToken else { return }
        guard let url = URL(string: "\(SupabaseConfig.restEndpoint)/sticky_notes?id=eq.\(note.id)") else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        req.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "pinned": nextPin,
            "updated_at": ISO8601DateFormatter().string(from: Date())
        ]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        let _ = try? await urlSession.data(for: req)
    }

    // MARK: - Goals Live Supabase
    private func fetchCloudGoals(token: String) async {
        var urlStr = "\(SupabaseConfig.restEndpoint)/goals?select=id,area,name,why,progress,status,target,unit&order=created_at.asc&limit=50"
        if !workspaceId.isEmpty {
            urlStr += "&workspace_id=eq.\(workspaceId)"
        }
        guard let url = URL(string: urlStr) else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        guard let (data, resp) = try? await urlSession.data(for: req),
              let http = resp as? HTTPURLResponse, (200...299).contains(http.statusCode),
              let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return }

        var fetched: [GoalModel] = []
        for item in arr {
            guard let id = item["id"] as? String,
                  let name = item["name"] as? String else { continue }
            let area = item["area"] as? String ?? "growth"
            let why = item["why"] as? String
            let progress = item["progress"] as? Int ?? 0
            let status = item["status"] as? String ?? "On Track"
            let target = item["target"] as? Double
            let unit = item["unit"] as? String

            fetched.append(GoalModel(
                id: id,
                area: area,
                name: name,
                why: why,
                progress: progress,
                status: status,
                target: target,
                unit: unit
            ))
        }

        await MainActor.run {
            self.goals = fetched
            self.saveGoalsLocalCache()
        }
    }

    // MARK: - Realtime WebSocket Subscriptions
    func connectRealtimeWebSocket() {
        guard let wsUrl = URL(string: SupabaseConfig.realtimeEndpoint) else { return }
        disconnectRealtimeWebSocket()

        let task = urlSession.webSocketTask(with: wsUrl)
        self.webSocketTask = task
        task.resume()

        Task {
            await MainActor.run { self.isRealtimeConnected = true }
            self.joinRealtimeChannel()
            self.startHeartbeat()
            self.receiveWebSocketMessage()
        }
    }

    func disconnectRealtimeWebSocket() {
        heartbeatTimer?.invalidate()
        heartbeatTimer = nil
        webSocketTask?.cancel(with: .normalClosure, reason: nil)
        webSocketTask = nil
        isRealtimeConnected = false
    }

    private func joinRealtimeChannel() {
        let joinMsg: [String: Any] = [
            "topic": "realtime:public",
            "event": "phx_join",
            "payload": [
                "config": [
                    "broadcast": ["ack": false, "self": false],
                    "presence": ["key": ""],
                    "postgres_changes": [
                        ["event": "*", "schema": "public", "table": "tasks"],
                        ["event": "*", "schema": "public", "table": "habits"],
                        ["event": "*", "schema": "public", "table": "habit_logs"],
                        ["event": "*", "schema": "public", "table": "sticky_notes"],
                        ["event": "*", "schema": "public", "table": "calendar_items"],
                        ["event": "*", "schema": "public", "table": "goals"]
                    ]
                ]
            ],
            "ref": "1"
        ]

        if let data = try? JSONSerialization.data(withJSONObject: joinMsg),
           let str = String(data: data, encoding: .utf8) {
            webSocketTask?.send(.string(str)) { error in
                if let err = error {
                    print("WebSocket join error: \(err)")
                }
            }
        }
    }

    private func startHeartbeat() {
        DispatchQueue.main.async {
            self.heartbeatTimer = Timer.scheduledTimer(withTimeInterval: 25.0, repeats: true) { [weak self] _ in
                let hb: [String: Any] = ["topic": "phoenix", "event": "heartbeat", "payload": [:], "ref": UUID().uuidString]
                if let data = try? JSONSerialization.data(withJSONObject: hb),
                   let str = String(data: data, encoding: .utf8) {
                    self?.webSocketTask?.send(.string(str)) { _ in }
                }
            }
        }
    }

    private func receiveWebSocketMessage() {
        webSocketTask?.receive { [weak self] result in
            guard let self = self else { return }
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    if text.contains("postgres_changes") {
                        Task {
                            await self.syncAll()
                        }
                    }
                default: break
                }
                self.receiveWebSocketMessage()
            case .failure(let err):
                print("WebSocket receive error: \(err)")
                DispatchQueue.main.async {
                    self.isRealtimeConnected = false
                }
            }
        }
    }

    // MARK: - Local Cache Persistence
    private func saveTasksLocalCache() {
        if let data = try? JSONEncoder().encode(tasks) {
            UserDefaults.standard.set(data, forKey: tasksCacheKey)
        }
    }

    private func saveHabitsLocalCache() {
        if let data = try? JSONEncoder().encode(habits) {
            UserDefaults.standard.set(data, forKey: habitsCacheKey)
        }
    }

    private func saveNotesLocalCache() {
        if let data = try? JSONEncoder().encode(stickyNotes) {
            UserDefaults.standard.set(data, forKey: notesCacheKey)
        }
    }

    private func saveCalendarLocalCache() {
        if let data = try? JSONEncoder().encode(calendarItems) {
            UserDefaults.standard.set(data, forKey: calendarCacheKey)
        }
    }

    private func saveGoalsLocalCache() {
        if let data = try? JSONEncoder().encode(goals) {
            UserDefaults.standard.set(data, forKey: goalsCacheKey)
        }
    }

    private func loadLocalCaches() {
        if let data = UserDefaults.standard.data(forKey: tasksCacheKey),
           let t = try? JSONDecoder().decode([TaskModel].self, from: data) {
            self.tasks = t
        }
        if let data = UserDefaults.standard.data(forKey: habitsCacheKey),
           let h = try? JSONDecoder().decode([HabitModel].self, from: data) {
            self.habits = h
        }
        if let data = UserDefaults.standard.data(forKey: notesCacheKey),
           let n = try? JSONDecoder().decode([StickyNoteModel].self, from: data) {
            self.stickyNotes = n
        }
        if let data = UserDefaults.standard.data(forKey: calendarCacheKey),
           let c = try? JSONDecoder().decode([CalendarItemModel].self, from: data) {
            self.calendarItems = c
        }
        if let data = UserDefaults.standard.data(forKey: goalsCacheKey),
           let g = try? JSONDecoder().decode([GoalModel].self, from: data) {
            self.goals = g
        }
    }
}

// MARK: - Main UI Root
struct ContentView: View {
    @StateObject private var service = SupabaseService.shared
    @State private var selectedTab = 0
    @State private var showAuthSheet = false

    var body: some View {
        TabView(selection: $selectedTab) {
            CockpitView(showAuth: $showAuthSheet)
                .tabItem {
                    Label("Cockpit", systemImage: "safari")
                }
                .tag(0)

            TasksView(showAuth: $showAuthSheet)
                .tabItem {
                    Label("Tasks", systemImage: "checklist")
                }
                .tag(1)

            HabitsMatrixView(showAuth: $showAuthSheet)
                .tabItem {
                    Label("Habits", systemImage: "chart.bar.fill")
                }
                .tag(2)

            PlannerView(showAuth: $showAuthSheet)
                .tabItem {
                    Label("Planner", systemImage: "calendar")
                }
                .tag(3)

            VaultView(showAuth: $showAuthSheet)
                .tabItem {
                    Label("Vault", systemImage: "note.text")
                }
                .tag(4)
        }
        .accentColor(Color(red: 0.06, green: 0.73, blue: 0.51))
        .sheet(isPresented: $showAuthSheet) {
            AuthSheetView()
        }
    }
}

// MARK: - Cockpit View
struct CockpitView: View {
    @ObservedObject var service = SupabaseService.shared
    @Binding var showAuth: Bool

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("LifeOS System")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(Color(red: 0.06, green: 0.73, blue: 0.51))
                            Text(service.userEmail ?? "Personal Command Center")
                                .font(.title3)
                                .fontWeight(.heavy)
                                .lineLimit(1)
                        }
                        Spacer()
                        if service.isAuthenticated {
                            Button(action: { service.signOut() }) {
                                Text("Sign Out")
                                    .font(.caption2)
                                    .fontWeight(.bold)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(Color.red.opacity(0.15))
                                    .foregroundColor(.red)
                                    .cornerRadius(8)
                            }
                        } else {
                            Button(action: { showAuth = true }) {
                                Text("Sign In")
                                    .font(.caption2)
                                    .fontWeight(.bold)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(Color(red: 0.06, green: 0.73, blue: 0.51))
                                    .foregroundColor(.white)
                                    .cornerRadius(8)
                            }
                        }
                    }
                    .padding()
                    .background(Color(UIColor.secondarySystemBackground))
                    .cornerRadius(14)

                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            HStack(spacing: 6) {
                                Circle()
                                    .fill(service.isRealtimeConnected ? Color.green : Color.orange)
                                    .frame(width: 8, height: 8)
                                Text(service.isRealtimeConnected ? "Live Realtime Active" : "Polling / Offline")
                                    .font(.caption)
                                    .fontWeight(.bold)
                            }
                            Spacer()
                            Button(action: {
                                Task { await service.syncAll() }
                            }) {
                                HStack(spacing: 4) {
                                    Image(systemName: "arrow.triangle.2.circlepath")
                                    Text("Sync")
                                }
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.primary.opacity(0.08))
                                .cornerRadius(6)
                            }
                        }

                        Text(service.syncStatusText)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color(UIColor.secondarySystemBackground))
                    .cornerRadius(14)

                    Text("Daily Alignment & Focus")
                        .font(.headline)
                        .padding(.top, 4)

                    HStack(spacing: 12) {
                        MetricCard(title: "Tasks Left", value: "\(service.tasks.filter { !$0.isCompleted }.count)", icon: "checklist", color: .blue)
                        MetricCard(title: "Active Habits", value: "\(service.habits.count)", icon: "flame.fill", color: .orange)
                        MetricCard(title: "Sticky Vault", value: "\(service.stickyNotes.count)", icon: "note.text", color: .purple)
                    }

                    Text("Priority Tasks")
                        .font(.headline)
                        .padding(.top, 8)

                    let topTasks = service.tasks.filter { !$0.isCompleted }.prefix(3)
                    if topTasks.isEmpty {
                        Text("No pending priority tasks. Great job!")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .padding(.vertical, 8)
                    } else {
                        VStack(spacing: 8) {
                            ForEach(topTasks) { task in
                                HStack {
                                    Button(action: {
                                        Task { await service.toggleTaskComplete(task: task) }
                                    }) {
                                        Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                                            .foregroundColor(task.isCompleted ? .green : .secondary)
                                            .font(.title3)
                                    }
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(task.name)
                                            .font(.subheadline)
                                            .fontWeight(.medium)
                                        if let n = task.notes, !n.isEmpty {
                                            Text(n)
                                                .font(.caption2)
                                                .foregroundColor(.secondary)
                                                .lineLimit(1)
                                        }
                                    }
                                    Spacer()
                                    Text(task.area.capitalized)
                                        .font(.caption2)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color.primary.opacity(0.05))
                                        .cornerRadius(4)
                                }
                                .padding()
                                .background(Color(UIColor.secondarySystemBackground))
                                .cornerRadius(10)
                            }
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Cockpit")
        }
    }
}

struct MetricCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(color)
                .font(.headline)
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
            Text(title)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(12)
    }
}

// MARK: - Tasks Live View
struct TasksView: View {
    @ObservedObject var service = SupabaseService.shared
    @Binding var showAuth: Bool
    @State private var filter = 0
    @State private var showCreateModal = false
    @State private var newTaskName = ""
    @State private var newTaskArea = "personal"
    @State private var newTaskPriority = 2
    @State private var newTaskNotes = ""

    var filteredTasks: [TaskModel] {
        switch filter {
        case 0:
            return service.tasks.filter { !$0.isCompleted && $0.status.lowercased() != "inbox" }
        case 1:
            return service.tasks.filter { !$0.isCompleted && $0.status.lowercased() == "inbox" }
        default:
            return service.tasks.filter { $0.isCompleted }
        }
    }

    var body: some View {
        NavigationView {
            VStack {
                Picker("Filter", selection: $filter) {
                    Text("Active").tag(0)
                    Text("Inbox").tag(1)
                    Text("Completed").tag(2)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding(.horizontal)

                if filteredTasks.isEmpty {
                    Spacer()
                    VStack(spacing: 8) {
                        Image(systemName: "checkmark.circle")
                            .font(.largeTitle)
                            .foregroundColor(.secondary)
                        Text("No tasks in this view")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                } else {
                    List {
                        ForEach(filteredTasks) { task in
                            HStack(spacing: 12) {
                                Button(action: {
                                    Task { await service.toggleTaskComplete(task: task) }
                                }) {
                                    Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                                        .foregroundColor(task.isCompleted ? .green : .secondary)
                                        .font(.title3)
                                }
                                .buttonStyle(PlainButtonStyle())

                                VStack(alignment: .leading, spacing: 4) {
                                    Text(task.name)
                                        .font(.body)
                                        .strikethrough(task.isCompleted)
                                        .foregroundColor(task.isCompleted ? .secondary : .primary)
                                    if let n = task.notes, !n.isEmpty {
                                        Text(n)
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                            .lineLimit(2)
                                    }
                                }

                                Spacer()

                                VStack(alignment: .trailing, spacing: 2) {
                                    Text(task.area.capitalized)
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                    if !task.isSynced {
                                        Text("Syncing...")
                                            .font(.caption2)
                                            .foregroundColor(.orange)
                                    }
                                }
                            }
                            .padding(.vertical, 4)
                        }
                        .onDelete { indexSet in
                            for index in indexSet {
                                let task = filteredTasks[index]
                                Task { await service.deleteTask(id: task.id) }
                            }
                        }
                    }
                    .listStyle(InsetGroupedListStyle())
                }
            }
            .navigationTitle("Tasks")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        if !service.isAuthenticated {
                            showAuth = true
                        } else {
                            showCreateModal = true
                        }
                    }) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                            .foregroundColor(Color(red: 0.06, green: 0.73, blue: 0.51))
                    }
                }
            }
            .sheet(isPresented: $showCreateModal) {
                NavigationView {
                    Form {
                        Section(header: Text("Task Details")) {
                            TextField("Task name", text: $newTaskName)
                            TextField("Notes or context", text: $newTaskNotes)
                        }

                        Section(header: Text("Life Area")) {
                            Picker("Area", selection: $newTaskArea) {
                                Text("Personal").tag("personal")
                                Text("Work").tag("work")
                                Text("Health").tag("health")
                                Text("Growth").tag("growth")
                                Text("Finance").tag("finance")
                            }
                        }

                        Section(header: Text("Priority")) {
                            Picker("Priority", selection: $newTaskPriority) {
                                Text("Low").tag(1)
                                Text("Medium").tag(2)
                                Text("High").tag(3)
                                Text("Urgent").tag(4)
                            }
                        }
                    }
                    .navigationTitle("New Task")
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Cancel") { showCreateModal = false }
                        }
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Add") {
                                let name = newTaskName.trimmingCharacters(in: .whitespacesAndNewlines)
                                if !name.isEmpty {
                                    Task {
                                        await service.createTask(
                                            name: name,
                                            area: newTaskArea,
                                            priority: newTaskPriority,
                                            notes: newTaskNotes
                                        )
                                    }
                                    newTaskName = ""
                                    newTaskNotes = ""
                                    showCreateModal = false
                                }
                            }
                            .disabled(newTaskName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Habits Matrix Live View
struct HabitsMatrixView: View {
    @ObservedObject var service = SupabaseService.shared
    @Binding var showAuth: Bool

    private var todayString: String {
        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        return df.string(from: Date())
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Consistency Engine")
                                .font(.headline)
                            Text("Live Supabase streak matrix")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Text("\(service.habits.count) Habits")
                            .font(.caption)
                            .fontWeight(.bold)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.green.opacity(0.15))
                            .foregroundColor(.green)
                            .cornerRadius(6)
                    }
                    .padding(.horizontal)

                    if service.habits.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "flame")
                                .font(.largeTitle)
                                .foregroundColor(.secondary)
                            Text("No habits configured yet")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            if !service.isAuthenticated {
                                Button("Sign In to Sync Habits") {
                                    showAuth = true
                                }
                                .font(.caption)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Color(red: 0.06, green: 0.73, blue: 0.51))
                                .foregroundColor(.white)
                                .cornerRadius(8)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                    } else {
                        VStack(spacing: 12) {
                            ForEach(service.habits) { habit in
                                HabitCard(habit: habit, todayStr: todayString) { date in
                                    Task { await service.toggleHabitCompletion(habit: habit, date: date) }
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.top)
            }
            .navigationTitle("Habits")
        }
    }
}

struct HabitCard: View {
    let habit: HabitModel
    let todayStr: String
    let onToggle: (String) -> Void

    var isDoneToday: Bool {
        habit.completedDates.contains(todayStr)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(habit.name)
                        .font(.headline)
                    Text("\(habit.area.capitalized) • \(habit.frequency)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                Spacer()
                HStack(spacing: 4) {
                    Image(systemName: "flame.fill")
                        .foregroundColor(.orange)
                        .font(.caption)
                    Text("\(habit.streakCount)d streak")
                        .font(.caption)
                        .fontWeight(.bold)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.orange.opacity(0.1))
                .cornerRadius(6)
            }

            Button(action: { onToggle(todayStr) }) {
                HStack {
                    Image(systemName: isDoneToday ? "checkmark.circle.fill" : "circle")
                        .foregroundColor(isDoneToday ? .white : Color(red: 0.06, green: 0.73, blue: 0.51))
                    Text(isDoneToday ? "Completed Today" : "Check In Today")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(isDoneToday ? Color(red: 0.06, green: 0.73, blue: 0.51) : Color(red: 0.06, green: 0.73, blue: 0.51).opacity(0.1))
                .foregroundColor(isDoneToday ? .white : Color(red: 0.06, green: 0.73, blue: 0.51))
                .cornerRadius(8)
            }
        }
        .padding()
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(14)
    }
}

// MARK: - Planner Live View
struct PlannerView: View {
    @ObservedObject var service = SupabaseService.shared
    @Binding var showAuth: Bool

    var body: some View {
        NavigationView {
            List {
                if service.calendarItems.isEmpty {
                    VStack(alignment: .center, spacing: 8) {
                        Text("No schedule blocks loaded")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Text("Connected to calendar_items table")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 20)
                } else {
                    ForEach(service.calendarItems) { item in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.title)
                                    .font(.headline)
                                Text(item.kind.capitalized)
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            if !item.startsAt.isEmpty {
                                Text(item.startsAt)
                                    .font(.caption)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.blue.opacity(0.1))
                                    .foregroundColor(.blue)
                                    .cornerRadius(6)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .listStyle(InsetGroupedListStyle())
            .navigationTitle("Planner")
        }
    }
}

// MARK: - Vault Live View (Sticky Notes)
struct VaultView: View {
    @ObservedObject var service = SupabaseService.shared
    @Binding var showAuth: Bool
    @State private var showCreateNote = false
    @State private var newNoteTitle = ""
    @State private var newNoteBody = ""
    @State private var newNoteColor = "yellow"

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Text("Knowledge & Sticky Vault")
                            .font(.headline)
                        Spacer()
                        Button(action: {
                            if !service.isAuthenticated { showAuth = true } else { showCreateNote = true }
                        }) {
                            HStack(spacing: 4) {
                                Image(systemName: "plus")
                                Text("New Note")
                            }
                            .font(.caption)
                            .fontWeight(.bold)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Color(red: 0.06, green: 0.73, blue: 0.51))
                            .foregroundColor(.white)
                            .cornerRadius(8)
                        }
                    }
                    .padding(.horizontal)

                    if service.stickyNotes.isEmpty {
                        VStack(spacing: 8) {
                            Image(systemName: "note.text")
                                .font(.largeTitle)
                                .foregroundColor(.secondary)
                            Text("No sticky notes in vault")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                    } else {
                        VStack(spacing: 12) {
                            ForEach(service.stickyNotes) { note in
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Text(note.title)
                                            .font(.headline)
                                        Spacer()
                                        Button(action: {
                                            Task { await service.togglePinNote(note: note) }
                                        }) {
                                            Image(systemName: note.pinned ? "pin.fill" : "pin")
                                                .foregroundColor(note.pinned ? .orange : .secondary)
                                        }
                                    }
                                    if !note.body.isEmpty {
                                        Text(note.body)
                                            .font(.body)
                                            .foregroundColor(.secondary)
                                    }
                                }
                                .padding()
                                .background(noteBackgroundColor(note.color))
                                .cornerRadius(12)
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.top)
            }
            .navigationTitle("Vault")
            .sheet(isPresented: $showCreateNote) {
                NavigationView {
                    Form {
                        Section(header: Text("Note Info")) {
                            TextField("Title", text: $newNoteTitle)
                            TextEditor(text: $newNoteBody)
                                .frame(height: 120)
                        }
                        Section(header: Text("Color Tag")) {
                            Picker("Color", selection: $newNoteColor) {
                                Text("Yellow").tag("yellow")
                                Text("Blue").tag("blue")
                                Text("Green").tag("green")
                                Text("Pink").tag("pink")
                            }
                            .pickerStyle(SegmentedPickerStyle())
                        }
                    }
                    .navigationTitle("New Sticky Note")
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Cancel") { showCreateNote = false }
                        }
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Save") {
                                Task {
                                    await service.createStickyNote(
                                        title: newNoteTitle,
                                        body: newNoteBody,
                                        color: newNoteColor
                                    )
                                }
                                newNoteTitle = ""
                                newNoteBody = ""
                                showCreateNote = false
                            }
                        }
                    }
                }
            }
        }
    }

    private func noteBackgroundColor(_ color: String) -> Color {
        switch color.lowercased() {
        case "yellow": return Color.yellow.opacity(0.15)
        case "blue": return Color.blue.opacity(0.15)
        case "green": return Color.green.opacity(0.15)
        case "pink": return Color.pink.opacity(0.15)
        default: return Color(UIColor.secondarySystemBackground)
        }
    }
}

// MARK: - Auth Sheet Modal
struct AuthSheetView: View {
    @Environment(\.presentationMode) var presentationMode
    @ObservedObject var service = SupabaseService.shared
    @State private var email = SupabaseConfig.ownerEmail
    @State private var password = ""
    @State private var errorMessage = ""
    @State private var isLoading = false

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("LifeOS Supabase Credentials")) {
                    TextField("Email", text: $email)
                        .autocapitalization(.none)
                        .keyboardType(.emailAddress)
                    SecureField("Password", text: $password)
                }

                if !errorMessage.isEmpty {
                    Section {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }

                Section {
                    Button(action: handleSignIn) {
                        HStack {
                            Spacer()
                            if isLoading {
                                ProgressView()
                            } else {
                                Text("Sign In with Supabase")
                                    .fontWeight(.bold)
                            }
                            Spacer()
                        }
                    }
                    .disabled(isLoading || email.isEmpty || password.isEmpty)
                }

                Section(footer: Text("LifeOS connects to Supabase with secure authenticated RLS policies.")) {
                    EmptyView()
                }
            }
            .navigationTitle("Supabase Auth")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { presentationMode.wrappedValue.dismiss() }
                }
            }
        }
    }

    private func handleSignIn() {
        isLoading = true
        errorMessage = ""
        Task {
            let result = await service.signIn(email: email, pass: password)
            await MainActor.run {
                isLoading = false
                switch result {
                case .success:
                    presentationMode.wrappedValue.dismiss()
                case .failure(let error):
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
}
