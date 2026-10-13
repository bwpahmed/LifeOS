import SwiftUI

struct ContentView: View {
    @State private var selectedTab = 0
    @State private var syncStatusText = "Connected to Supabase"
    @State private var accountEmail = "LifeOS User"
    
    var body: some View {
        TabView(selection: $selectedTab) {
            CockpitView()
                .tabItem {
                    Label("Cockpit", systemImage: "safari")
                }
                .tag(0)
            
            TasksView()
                .tabItem {
                    Label("Tasks", systemImage: "checklist")
                }
                .tag(1)
            
            HabitsMatrixView()
                .tabItem {
                    Label("Habits", systemImage: "chart.bar.fill")
                }
                .tag(2)
            
            PlannerView()
                .tabItem {
                    Label("Planner", systemImage: "calendar")
                }
                .tag(3)
            
            VaultView()
                .tabItem {
                    Label("Vault", systemImage: "lock.shield")
                }
                .tag(4)
        }
        .accentColor(Color(red: 0.06, green: 0.73, blue: 0.51)) // LifeOS Emerald
    }
}

struct CockpitView: View {
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        VStack(alignment: .leading) {
                            Text("LifeOS System")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(Color(red: 0.06, green: 0.73, blue: 0.51))
                            Text("Personal Command Center")
                                .font(.title2)
                                .fontWeight(.heavy)
                        }
                        Spacer()
                        Image(systemName: "cloud.fill")
                            .foregroundColor(Color(red: 0.06, green: 0.73, blue: 0.51))
                    }
                    .padding()
                    .background(Color(UIColor.secondarySystemBackground))
                    .cornerRadius(12)
                    
                    Text("Daily Alignment")
                        .font(.headline)
                        .padding(.horizontal)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Supabase Cloud Sync")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            Spacer()
                            Text("Active RLS")
                                .font(.caption2)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.green.opacity(0.2))
                                .foregroundColor(.green)
                                .cornerRadius(6)
                        }
                        Text("Connected to fdtbftuxziicubztgcde.supabase.co")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color(UIColor.secondarySystemBackground))
                    .cornerRadius(12)
                    .padding(.horizontal)
                }
                .padding(.top)
            }
            .navigationTitle("Cockpit")
        }
    }
}

struct TasksView: View {
    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Today's Top Priority")) {
                    Text("Deep Work: LifeOS Habit Matrix")
                    Text("Review Q3 Architecture & Milestone Targets")
                }
                Section(header: Text("Inbox")) {
                    Text("Setup Supabase realtime websocket triggers")
                    Text("Sync health routines and diet plan logs")
                }
            }
            .navigationTitle("Tasks")
        }
    }
}

struct HabitsMatrixView: View {
    var body: some View {
        NavigationView {
            VStack {
                Text("7-Day Habit Tracker Grid")
                    .font(.headline)
                    .padding()
                Text("Cross-platform synchronization via Supabase backend")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
            }
            .navigationTitle("Habits")
        }
    }
}

struct PlannerView: View {
    var body: some View {
        NavigationView {
            List {
                Text("08:00 AM - 10:30 AM: Deep Work Block")
                Text("12:00 PM - 12:45 PM: Nutritional Lunch")
                Text("01:30 PM - 02:30 PM: Cardio & Mobility")
            }
            .navigationTitle("Planner")
        }
    }
}

struct VaultView: View {
    var body: some View {
        NavigationView {
            List {
                Text("Life Pillars: Health, Work, Growth, Personal, Finance")
                Text("Knowledge Notes & Architectural Decision Records")
            }
            .navigationTitle("Vault")
        }
    }
}
