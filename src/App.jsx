import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React from "react";
import { RepoProvider } from "./context/RepoContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useTheme } from "./context/ThemeContext";
import Navbar from "./components/Navbar/Navbar";
import Home from "./pages/Home";
import UploadSrs from "./pages/upload_srs";
import UploadSourceCode from "./pages/upload_code";
import SignUp from "./pages/SignUp";
import Login from "./pages/login";
import ResetPassword from "./pages/ResetPassword";
import ReportDetail from "./pages/ReportDetail";
// import Extractedreq from "./pages/extractedreq";
import UserProfile from "./pages/UserProfile";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminPerformance from "./pages/AdminPerformance";
import AdminSettings from "./pages/AdminSettings";
import Upload from "./pages/Upload";
import Dashboarddmalak from "./pages/Dashboarddmalak";
import RepoDetails from "./pages/RepoDetails"; 
import RepoHistory from "./pages/Repohistory";
import Allrepos from "./pages/Allrepos";
import All from "./pages/All";
import RequestPage from"./pages/Requestpage";
import GoogleSuccess from "./pages/GoogleSuccess";
import StepUpload from "./pages/StepUpload";
import Report from "./pages/Report";
import ChangePassword from "./pages/ChangePassword";
import AdminAddUser from "./pages/AdminAddUser";  
import AdminEditUser from "./pages/AdminEditUser";
import AdminRepositories from './pages/AdminRepositories'; 
import ManageAdmins from "./pages/ManageAdmins";
import RepoSettings from './pages/RepoSettings/RepoSettings';
import InvitationResponse from './pages/InvitationResponse';
import NewPassword from "./pages/NewPassword";

// Wrap the app content in a theme-aware component
const ThemedApp = () => {
  const { darkMode } = useTheme();

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <Navbar />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/Upload" element={<Upload />} />
          <Route path="/All" element={<All />} />
          <Route path="/Allrepos" element={<Allrepos />} />
          <Route path="/Requestpage" element={<RequestPage />} />
          <Route path="/Dashboarddmalak" element={<Dashboarddmalak />} />
          <Route path="/upload-srs" element={<UploadSrs />} />
          <Route path="/repo/:repoId" element={<RepoDetails />} />
          <Route path="/repo-history/:repoId" element={<RepoHistory />} />
          <Route path="/upload-code" element={<UploadSourceCode />} />
          
          {/* Auth Pages */}
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reset-password/:token" element={<NewPassword />} />
          <Route path="/ReportDetail" element={<ReportDetail />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/AdminDashboard" element={<AdminDashboard />} />
          <Route path="/AdminUsers" element={<AdminUsers />} />
          <Route path="/AdminPerformance" element={<AdminPerformance />} />
          <Route path="/AdminSettings" element={<AdminSettings />} />
          <Route path="/google-login-success" element={<GoogleSuccess />} />
          <Route path="/step-upload" element={<StepUpload />} />
          <Route path="/report/:repoId" element={<Report />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/AdminAddUser" element={<AdminAddUser />} />
          <Route path="/admin/users/edit/:id" element={<AdminEditUser />} />
          <Route path="/AdminRepositories" element={<AdminRepositories />} />
          <Route path="/admin/manage-admins" element={<ManageAdmins />} />
          <Route path="/repo/:repoId/settings/*" element={<RepoSettings />} />
          <Route path="/repo/:repoId/invitation" element={<InvitationResponse />} />
        </Routes>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <RepoProvider>
        <NotificationsProvider>
          <Router>
            <ThemedApp />
          </Router>
        </NotificationsProvider>
      </RepoProvider>
    </ThemeProvider>
  );
};

export default App;
