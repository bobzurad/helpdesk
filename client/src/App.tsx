import { Route, Routes } from "react-router";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { UsersPage } from "./pages/UsersPage";
import { NavBar } from "./components/NavBar";
import { RequireAuth } from "./components/RequireAuth";
import { RequireAdmin } from "./components/RequireAdmin";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route
          path="/"
          element={
            <>
              <NavBar />
              <HomePage />
            </>
          }
        />
        <Route element={<RequireAdmin />}>
          <Route
            path="/users"
            element={
              <>
                <NavBar />
                <UsersPage />
              </>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
