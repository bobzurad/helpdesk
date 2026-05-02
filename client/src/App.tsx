import { Route, Routes } from "react-router";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { NavBar } from "./components/NavBar";
import { RequireAuth } from "./components/RequireAuth";

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
      </Route>
    </Routes>
  );
}
