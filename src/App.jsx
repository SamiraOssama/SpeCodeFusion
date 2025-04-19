import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React from "react";
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
 // Fixed casing

function App() {
  return (
    <Router>
      <main className="overflow-x-hidden bg-white">
        <Routes>
          {/* Public Routes with Navbar */}
          <Route 
            path="/" 
            element={
              <>
                <Navbar />
                <Home />
              </>
            } 
          />
          <Route 
            path="/Upload" 
            element={
              <>
                <Navbar />
                <Upload />
              </>
            } 
          />
            <Route 
            path="/All" 
            element={
              <>
                <Navbar />
                <All />
              </>
            } 
          />
          
            <Route 
            path="/Allrepos" 
            element={
              <>
                <Navbar />
                <Allrepos />
              </>
            } 
          />
             <Route 
            path="/Requestpage" 
            element={
              <>
                <Navbar />
                <RequestPage />
              </>
            } 
          />
            <Route 
            path="/Dashboarddmalak" 
            element={
              <>
                <Navbar />
                <Dashboarddmalak />
              </>
            } 
          />
          <Route 
            path="/upload-srs" 
            element={
              <>
                <Navbar />
                <UploadSrs />
              </>
            } 
          />
                 <Route 
            path="/repo/:repoId" 
            element={
              <>
                <Navbar />
                <RepoDetails />
              </>
            } 
          />
          <Route path="/repo-history/:repoId" element={<RepoHistory />} />

          {/* <Route 
            path="/Extractedreq" 
            element={
              <>
                <Navbar />
                <Extractedreq />
              </>
            } 
          /> */}

          <Route 
            path="/upload-code" 
            element={
              <>
                <Navbar />
                <UploadSourceCode />
              </>
            } 
          />

          {/* Auth Pages (No Navbar) */}
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/ResetPassword" element={<ResetPassword />} />
          <Route path="/ReportDetail" element={<ReportDetail />} />
          <Route path="/UserProfile" element={<UserProfile />} />
          <Route path="/AdminDashboard" element={<AdminDashboard />} />
          <Route path="/AdminUsers" element={<AdminUsers />} />
          <Route path="/AdminPerformance" element={<AdminPerformance />} />
           <Route path="/AdminSettings" element={<AdminSettings />}/>
           <Route path="/Upload" element={<Upload />}/>
           <Route path="/Dashboarddmalak" element={<Dashboarddmalak />}/>
           <Route path="/RepoDetails" element={<RepoDetails />}/>
           <Route path="/Allrepos" element={<Allrepos />}/>
           <Route path="/All" element={<All />}/>
           <Route path="/Requestpage" element={<RequestPage />}/>

           
        </Routes>
      </main>
    </Router>
  );
}

export default App;
