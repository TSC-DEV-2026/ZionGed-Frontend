import { Routes, Route, Navigate } from "react-router-dom";
import { UserProvider, useUser } from "@/contexts/UserContext";

import Home from "@/pages/publicHome/page";
import HomeSecurity from "@/pages/home/page";
import Login from "@/pages/login/page";
import Cadastro from "@/pages/register/page";

import { PublicRoute } from "./lib/PublicRoute";
import { ProtectedRoute } from "./lib/ProtectedRoute";
import LoadingScreen from "@/components/LoadingScreen";
import DocumentEditPage from "@/pages/Docs/EditDocument";
import DocumentCreatePage from "@/pages/Docs/CreateDocument";
import ListRules from "@/pages/Rules/ListRules";
import CreateRule from "@/pages/Rules/CreateRule";
import EditRule from "@/pages/Rules/EditRule";
import { Toaster } from "sonner";

function RootRoute() {
  const { user, loading } = useUser();
  const isAuthenticated = !!user;

  if (loading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return <Home />;
}

function App() {
  return (
    <UserProvider>
      <>
        <Routes>
          <Route path="/" element={<RootRoute />} />

          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Cadastro />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<HomeSecurity />} />
            <Route
              path="/documents/:uuid/edit"
              element={<DocumentEditPage />}
            />
            <Route path="/documents/create" element={<DocumentCreatePage />} />
            <Route path="/rules" element={<ListRules />} />
            <Route path="/rules/create" element={<CreateRule />} />
            <Route path="/rules/:id/edit" element={<EditRule />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster richColors />
      </>
    </UserProvider>
  );
}

export default App;