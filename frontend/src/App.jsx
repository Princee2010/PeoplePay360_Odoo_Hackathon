import { useState } from 'react'
import { BarChart3, CalendarDays, ChevronDown, FileUser, LayoutDashboard, LogOut, ShieldCheck, Timer, UserRound, UsersRound, WalletCards } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import EmployeeManagement from './pages/EmployeeManagement'
import ContractManagement from './pages/ContractManagement'
import AttendanceManagement from './pages/AttendanceManagement'
import TimeOffManagement from './pages/TimeOffManagement'
import PayrollManagement from './pages/PayrollManagement'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import DemoCredentials from './pages/DemoCredentials'
import Reports from './pages/Reports'
import { getStoredUser, logoutUser } from './services/authService'
import './App.css'

function RoleRoute({ user, roles, children }) {
  return roles.includes(user.role) ? children : <Navigate to="/" replace />;
}

function App() {
  const [user, setUser] = useState(getStoredUser);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();

  const navigationItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/",
      roles: [
        "Employee",
        "HR Manager",
        "HR Payroll User",
        "HR Payroll Manager",
        "Admin",
      ],
    },
    {
      label: "Employees",
      icon: UsersRound,
      path: "/employees",
      roles: ["HR Manager", "HR Payroll User", "HR Payroll Manager", "Admin"],
    },
    {
      label: "Contracts",
      icon: FileUser,
      path: "/contracts",
      roles: ["HR Manager", "HR Payroll User", "HR Payroll Manager", "Admin"],
    },
    {
      label: "Attendance",
      icon: Timer,
      path: "/attendance",
      roles: [
        "Employee",
        "HR Manager",
        "HR Payroll User",
        "HR Payroll Manager",
        "Admin",
      ],
    },
    {
      label: "Time Off",
      icon: CalendarDays,
      path: "/time-off",
      roles: [
        "Employee",
        "HR Manager",
        "HR Payroll User",
        "HR Payroll Manager",
        "Admin",
      ],
    },
    {
      label: "Payroll",
      icon: WalletCards,
      path: "/payroll",
      roles: ["HR Payroll User", "HR Payroll Manager", "Admin"],
    },
    {
      label: "Reports",
      icon: BarChart3,
      path: "/reports",
      roles: [
        "Employee",
        "HR Manager",
        "HR Payroll User",
        "HR Payroll Manager",
        "Admin",
      ],
    },
    // navigationItems — new sidebar entry, Employee-only
    {
      label: "Profile",
      icon: UserRound,
      path: "/profile",
      roles: ["Employee"],
    },
  ];

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    toast.success("You have been signed out");
  };

  const isActive = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  if (!user) {
    return (
      <>
        <Routes>
          <Route path="/login" element={<Login onLogin={setUser} />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/demo-credentials" element={<DemoCredentials />} />
          <Route path="*" element={<Home />} />
        </Routes>
        <Toaster position="top-right" />
      </>
    );
  }

  if (location.pathname === "/login") return <Navigate to="/" replace />;

  const visibleNavigationItems = navigationItems.filter(({ roles }) =>
    roles.includes(user.role),
  );

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <span className="brand-mark small">P</span> PeoplePay360
        </div>
        <div className="user-menu-wrap">
          <button
            type="button"
            className="user-menu-button"
            aria-expanded={isUserMenuOpen}
            onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
          >
            <span className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span>{user.name}</span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          {isUserMenuOpen && (
            <div className="user-menu" role="menu">
              <button type="button" onClick={handleLogout} role="menuitem">
                <LogOut size={16} aria-hidden="true" /> Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <div className="dashboard-body">
        <aside className="dashboard-sidebar" aria-label="Main navigation">
          <nav>
            {visibleNavigationItems.map(({ label, icon: Icon, path }) =>
              path ? (
                <Link
                  className={`nav-item${isActive(path) ? " active" : ""}`}
                  key={label}
                  to={path}
                  aria-current={isActive(path) ? "page" : undefined}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              ) : (
                <span className="nav-item nav-item-disabled" key={label}>
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </span>
              ),
            )}
          </nav>
        </aside>
        <section
          className="dashboard-content"
          aria-labelledby="dashboard-title"
        >
          <div className="content-heading">
            <div>
              <p className="eyebrow">{user.role}</p>
              <h1 id="dashboard-title">
                {location.pathname.startsWith("/profile")
                  ? "My Profile"
                  : location.pathname.startsWith("/employees")
                    ? "Employees"
                    : location.pathname.startsWith("/contracts")
                      ? "Contracts"
                      : location.pathname.startsWith("/employees")
                        ? "Employees"
                        : location.pathname.startsWith("/contracts")
                          ? "Contracts"
                          : location.pathname.startsWith("/attendance")
                            ? "Attendance"
                            : location.pathname.startsWith("/time-off")
                              ? "Time Off"
                              : location.pathname.startsWith("/payroll")
                                ? "Payroll"
                                : location.pathname.startsWith("/reports")
                                  ? "Reports"
                                  : "Dashboard"}
              </h1>
              <p>
                {location.pathname.startsWith("/profile")
                  ? "View your employment details and keep your contact info up to date."
                  : location.pathname.startsWith("/employees")
                    ? "Manage your people and their employment details."
                    : location.pathname.startsWith("/employees")
                      ? "Manage your people and their employment details."
                      : location.pathname.startsWith("/contracts")
                        ? "Manage historical employee contracts and payroll applicability."
                        : location.pathname.startsWith("/attendance")
                          ? "Track check-ins, check-outs, hours worked, and attendance status."
                          : location.pathname.startsWith("/time-off")
                            ? "Plan leave, manage balances, and review requests."
                            : location.pathname.startsWith("/payroll")
                              ? "Review the contract and salary selected for each payroll period."
                              : location.pathname.startsWith("/reports")
                                ? "Review your attendance and time off history."
                                : `Welcome back, ${user.name}.`}
              </p>
            </div>
            <div className="welcome-icon">
              <ShieldCheck size={26} aria-hidden="true" />
            </div>
          </div>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route
              path="/profile"
              element={
                <RoleRoute user={user} roles={["Employee"]}>
                  <EmployeeManagement mode="profile" />
                </RoleRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <RoleRoute
                  user={user}
                  roles={[
                    "HR Manager",
                    "HR Payroll User",
                    "HR Payroll Manager",
                    "Admin",
                  ]}
                >
                  <EmployeeManagement mode="list" />
                </RoleRoute>
              }
            />
            <Route
              path="/employees/new"
              element={
                <RoleRoute user={user} roles={["HR Manager", "Admin"]}>
                  <EmployeeManagement mode="new" />
                </RoleRoute>
              }
            />
            <Route
              path="/employees/:id"
              element={
                <RoleRoute
                  user={user}
                  roles={[
                    "HR Manager",
                    "HR Payroll User",
                    "HR Payroll Manager",
                    "Admin",
                  ]}
                >
                  <EmployeeManagement mode="detail" />
                </RoleRoute>
              }
            />
            <Route
              path="/employees/:id/edit"
              element={
                <RoleRoute user={user} roles={["HR Manager", "Admin"]}>
                  <EmployeeManagement mode="edit" />
                </RoleRoute>
              }
            />
            <Route
              path="/contracts"
              element={
                <RoleRoute
                  user={user}
                  roles={[
                    "HR Manager",
                    "HR Payroll User",
                    "HR Payroll Manager",
                    "Admin",
                  ]}
                >
                  <ContractManagement />
                </RoleRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <RoleRoute
                  user={user}
                  roles={[
                    "Employee",
                    "HR Manager",
                    "HR Payroll User",
                    "HR Payroll Manager",
                    "Admin",
                  ]}
                >
                  <AttendanceManagement />
                </RoleRoute>
              }
            />
            <Route path="/time-off" element={<TimeOffManagement />} />
            <Route
              path="/payroll"
              element={
                <RoleRoute
                  user={user}
                  roles={["HR Payroll User", "HR Payroll Manager", "Admin"]}
                >
                  <PayrollManagement />
                </RoleRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <RoleRoute
                  user={user}
                  roles={[
                    "Employee",
                    "HR Manager",
                    "HR Payroll User",
                    "HR Payroll Manager",
                    "Admin",
                  ]}
                >
                  <Reports />
                </RoleRoute>
              }
            />
          </Routes>
        </section>
      </div>
      <Toaster position="top-right" />
    </main>
  );
}

export default App;