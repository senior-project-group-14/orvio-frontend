import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "@/app/routes";

export default function App() {
  useEffect(() => {
    // Keep the user in the QR flow and block browser back navigation.
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      window.history.go(1);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return <RouterProvider router={router} />;
}
